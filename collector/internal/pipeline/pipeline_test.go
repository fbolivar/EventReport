package pipeline

import (
	"compress/gzip"
	"context"
	"encoding/json"
	"github.com/fbolivar/eventreport/collector/internal/normalize"
	"io"
	"log/slog"
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/fbolivar/eventreport/collector/internal/adapter/fortigate"
	"github.com/fbolivar/eventreport/collector/internal/aggregate"
	"github.com/fbolivar/eventreport/collector/internal/buffer"
	"github.com/fbolivar/eventreport/collector/internal/syslog"
	"github.com/fbolivar/eventreport/collector/internal/vault"
)

const line = `date=2026-09-01 time=10:15:22 devid="FGT60FTK21089123" type="traffic" subtype="forward" ` +
	`srcip=10.10.0.42 srcintf="lan" dstip=20.190.160.14 dstport=443 dstintf="wan1" policyid=14 ` +
	`action="accept" app="Microsoft.365" sentbyte=48211 rcvdbyte=98123`

func newPipeline(t *testing.T) (*Pipeline, string, string) {
	t.Helper()

	vaultDir := filepath.Join(t.TempDir(), "vault")
	bufferDir := filepath.Join(t.TempDir(), "buffer")

	pending, err := buffer.New(bufferDir)
	if err != nil {
		t.Fatal(err)
	}

	pipeline := New(
		syslog.New("127.0.0.1:0"),
		vault.New(vaultDir, 30, 0),
		aggregate.New(),
		pending,
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		[]Device{{FirewallID: "fw-1", SourceIP: "10.10.0.1", Adapter: &fortigate.Adapter{}}},
	)

	// Windows refuses to delete an open file, so the vault must be closed
	// before the temp directory is cleaned up.
	t.Cleanup(func() { _ = pipeline.Vault.Close() })

	return pipeline, vaultDir, bufferDir
}

func TestRawLineIsVaultedBeforeParsing(t *testing.T) {
	pipeline, vaultDir, _ := newPipeline(t)

	// A line no adapter understands still has to reach the vault.
	pipeline.handle(syslog.Line{
		Received: time.Date(2026, 9, 1, 10, 20, 0, 0, time.UTC),
		Source:   net.ParseIP("10.10.0.1"),
		Data:     []byte("%ASA-6-302013: formato ajeno"),
	})
	if err := pipeline.Vault.Close(); err != nil {
		t.Fatal(err)
	}

	path := filepath.Join(vaultDir, "fw-1", "2026-09-01", "10.log.gz")
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("la línea no reconocida debería estar en la bóveda: %v", err)
	}
	defer file.Close()

	reader, err := gzip.NewReader(file)
	if err != nil {
		t.Fatal(err)
	}
	content, _ := io.ReadAll(reader)

	if !strings.Contains(string(content), "formato ajeno") {
		t.Fatalf("contenido = %q", content)
	}
}

func TestUnparsedLineIsCounted(t *testing.T) {
	pipeline, _, _ := newPipeline(t)

	pipeline.handle(syslog.Line{
		Received: time.Date(2026, 9, 1, 10, 20, 0, 0, time.UTC),
		Source:   net.ParseIP("10.10.0.1"),
		Data:     []byte("texto sin key=value"),
	})

	hours := pipeline.Aggregator.CloseBefore(time.Date(2026, 9, 1, 11, 0, 0, 0, time.UTC))
	if len(hours) != 1 || hours[0].Unparsed != 1 {
		t.Fatalf("horas = %+v", hours)
	}
}

func TestEventIsTaggedWithOurFirewallIdNotTheBrands(t *testing.T) {
	pipeline, _, _ := newPipeline(t)

	pipeline.handle(syslog.Line{
		Received: time.Date(2026, 9, 1, 10, 20, 0, 0, time.UTC),
		Source:   net.ParseIP("10.10.0.1"),
		Data:     []byte(line),
	})

	hours := pipeline.Aggregator.CloseBefore(time.Date(2026, 9, 1, 11, 0, 0, 0, time.UTC))
	if len(hours) != 1 {
		t.Fatalf("horas = %d", len(hours))
	}
	if hours[0].DeviceID != "fw-1" {
		t.Fatalf("deviceId = %s: la nube guarda nuestro id, no el serial de la marca", hours[0].DeviceID)
	}
}

func TestCloseHoursEnqueuesForUpload(t *testing.T) {
	pipeline, _, _ := newPipeline(t)

	pipeline.handle(syslog.Line{
		Received: time.Date(2026, 9, 1, 10, 20, 0, 0, time.UTC),
		Source:   net.ParseIP("10.10.0.1"),
		Data:     []byte(line),
	})

	closed, err := pipeline.CloseHours(time.Date(2026, 9, 1, 11, 10, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	if closed != 1 {
		t.Fatalf("horas cerradas = %d", closed)
	}

	pending, err := pipeline.Buffer.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(pending) != 1 || pending[0].Kind != "rollups" {
		t.Fatalf("pendientes = %+v", pending)
	}
}

func TestPipelineStopsWithContext(t *testing.T) {
	pipeline, _, _ := newPipeline(t)

	ctx, cancel := context.WithCancel(context.Background())
	pipeline.Run(ctx, 2)
	cancel()

	done := make(chan struct{})
	go func() {
		pipeline.Wait()
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("los workers no terminaron al cancelar")
	}
}

func TestCriticalEventSeverityIsOurs(t *testing.T) {
	// Un ingreso administrativo no trae `severity` en el log del fabricante.
	// Si copiáramos ese campo vacío, la nube descartaría el evento en silencio.
	admin := &normalize.Event{Type: normalize.EventAdmin, Action: normalize.ActionAllow}
	title, severity, ok := criticalEvent(admin)
	if !ok || severity != "high" {
		t.Fatalf("ingreso administrativo = %q/%q/%v", title, severity, ok)
	}

	vpn := &normalize.Event{Type: normalize.EventVPN, Action: normalize.ActionDeny}
	if _, severity, ok := criticalEvent(vpn); !ok || severity != "medium" {
		t.Fatalf("vpn fallida = %q/%v", severity, ok)
	}

	traffic := &normalize.Event{Type: normalize.EventTraffic, Action: normalize.ActionAllow}
	if _, _, ok := criticalEvent(traffic); ok {
		t.Fatal("el tráfico normal no es un evento crítico")
	}
}

func TestOpenHoursAreSentWithoutClosingThem(t *testing.T) {
	// La actividad tiene que verse sin esperar a que termine la hora. Enviar la
	// hora en curso es seguro porque la nube la sobrescribe cuando llegue
	// completa; lo que no puede pasar es que enviarla la borre del agregador.
	aggregator := aggregate.New()
	aggregator.Add(&normalize.Event{
		Timestamp: time.Now().UTC(),
		Type:      normalize.EventTraffic,
		Action:    normalize.ActionAllow,
		DeviceID:  "fw-1",
	}, time.Now().UTC())

	if len(aggregator.Open()) != 1 {
		t.Fatal("la hora en curso debería estar abierta")
	}

	// Leerla no la cierra: sigue ahí para seguir sumando.
	if len(aggregator.Open()) != 1 {
		t.Fatal("leer la hora en curso no puede vaciarla")
	}

	// Y al cerrarla, sale con todo lo acumulado.
	closed := aggregator.CloseBefore(time.Now().UTC().Add(2 * time.Hour))
	if len(closed) != 1 {
		t.Fatalf("horas cerradas = %d", len(closed))
	}
}

// Lo que de verdad viaja al portal.
//
// El colector puede agregar la actividad por identidad perfectamente y no
// enviarla: pasó, y la nube respondía 200 con cero filas guardadas porque el
// campo no llegaba en el cuerpo. Este test mira el JSON encolado, no la
// estructura en memoria.
func TestElEnvioLlevaLaActividadPorIdentidad(t *testing.T) {
	pipeline, _, _ := newPipeline(t)

	pipeline.handle(syslog.Line{
		Received: time.Date(2026, 9, 1, 10, 20, 0, 0, time.UTC),
		Source:   net.ParseIP("10.10.0.1"),
		Data:     []byte(line),
	})

	if _, err := pipeline.SendOpenHours(); err != nil {
		t.Fatal(err)
	}

	pending, err := pipeline.Buffer.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(pending) != 1 {
		t.Fatalf("esperaba un envío encolado, hay %d", len(pending))
	}

	var payload struct {
		Hours []struct {
			Identities []struct {
				Kind  string `json:"kind"`
				Key   string `json:"key"`
				Label string `json:"label"`
			} `json:"identities"`
		} `json:"hours"`
	}
	if err := json.Unmarshal(pending[0].Payload, &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Hours) != 1 {
		t.Fatalf("horas en el cuerpo = %d", len(payload.Hours))
	}
	if len(payload.Hours[0].Identities) == 0 {
		t.Fatalf("el cuerpo viajó sin identidades: %s", pending[0].Payload)
	}
}
