package pipeline

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net"
	"path/filepath"
	"testing"
	"time"

	"github.com/fbolivar/eventreport/collector/internal/adapter/fortigate"
	"github.com/fbolivar/eventreport/collector/internal/aggregate"
	"github.com/fbolivar/eventreport/collector/internal/buffer"
	"github.com/fbolivar/eventreport/collector/internal/syslog"
	"github.com/fbolivar/eventreport/collector/internal/vault"
)

// TestEndToEndFromSyslogToPendingRollup is the closest thing to a real run:
// a firewall sends syslog over UDP, the collector vaults it, parses it,
// aggregates it, closes the hour and leaves a payload ready to upload.
func TestEndToEndFromSyslogToPendingRollup(t *testing.T) {
	root := t.TempDir()

	pending, err := buffer.New(filepath.Join(root, "buffer"))
	if err != nil {
		t.Fatal(err)
	}

	listener := syslog.New("127.0.0.1:0")
	store := vault.New(filepath.Join(root, "vault"), 30, 0)

	worker := New(
		listener,
		store,
		aggregate.New(),
		pending,
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		// The source is loopback: that is the "firewall" in this test.
		[]Device{{FirewallID: "fw-1", SourceIP: "127.0.0.1", Adapter: &fortigate.Adapter{}}},
	)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := listener.Start(ctx); err != nil {
		t.Fatal(err)
	}
	// Windows will not delete an open file when the temp dir is cleaned up.
	t.Cleanup(func() { _ = store.Close() })
	worker.Run(ctx, 2)

	target := listener.Addr()
	conn, err := net.Dial("udp", target)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()

	lines := []string{
		`date=2026-09-01 time=10:15:22 devid="FGT60F" type="traffic" subtype="forward" srcip=10.10.0.42 ` +
			`dstip=20.190.160.14 dstport=443 dstintf="wan1" policyid=14 action="accept" app="Microsoft.365" ` +
			`sentbyte=48211 rcvdbyte=98123`,
		`date=2026-09-01 time=10:16:02 devid="FGT60F" type="traffic" subtype="forward" srcip=45.155.205.7 ` +
			`dstip=190.85.44.12 dstport=22 action="deny" srccountry="Netherlands"`,
		`%ASA-6-302013: una línea de otra marca`,
	}
	for _, line := range lines {
		if _, err := conn.Write([]byte(line)); err != nil {
			t.Fatal(err)
		}
	}

	// Give the workers a moment to drain the queue.
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if listener.Stats().Received >= int64(len(lines)) && listener.Stats().Queued == 0 {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}

	// Hours are bucketed by reception, so the cutoff has to be relative to the
	// real clock, not to the timestamps inside the log lines.
	closed, err := worker.CloseHours(time.Now().UTC().Add(2 * time.Hour))
	if err != nil {
		t.Fatal(err)
	}
	if closed == 0 {
		t.Fatal("no se cerró ninguna hora")
	}

	items, err := pending.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(items) == 0 {
		t.Fatal("no quedó nada pendiente de enviar")
	}

	// Lo que queda en el búfer es la forma del contrato (§6.7), no la
	// estructura interna del agregador: si alguien cambia una sin la otra, este
	// asercion falla antes de que falle un cliente.
	var payload RollupsPayload
	if err := json.Unmarshal(items[0].Payload, &payload); err != nil {
		t.Fatal(err)
	}

	if payload.FirewallID != "fw-1" {
		t.Fatalf("firewallId = %s", payload.FirewallID)
	}
	if len(payload.Hours) != 1 {
		t.Fatalf("horas = %d", len(payload.Hours))
	}
	hour := payload.Hours[0]

	// Las líneas no reconocidas no viajan en los contadores: van en el latido,
	// como calidad del dato (§6.2).
	if unparsed, _ := worker.Quality(); unparsed != 1 {
		t.Fatalf("no reconocidas = %d: la línea ajena se cuenta", unparsed)
	}

	var allowed, denied int64
	for _, counter := range hour.Counters {
		switch counter.Action {
		case "allow":
			allowed += counter.Count
		case "deny":
			denied += counter.Count
		}
	}
	if allowed != 1 || denied != 1 {
		t.Fatalf("permitidos/denegados = %d/%d", allowed, denied)
	}

	// What travels is the aggregate, never the raw line: this is the promise
	// the product is sold on.
	if string(items[0].Payload) == "" {
		t.Fatal("payload vacío")
	}
	for _, line := range lines {
		if contains(string(items[0].Payload), line) {
			t.Fatal("una línea cruda no puede aparecer en lo que se envía a la nube")
		}
	}

	cancel()
	listener.Close()
	worker.Wait()
}

func contains(haystack, needle string) bool {
	return len(needle) > 0 && len(haystack) >= len(needle) && indexOf(haystack, needle) >= 0
}

func indexOf(haystack, needle string) int {
	for index := 0; index+len(needle) <= len(haystack); index++ {
		if haystack[index:index+len(needle)] == needle {
			return index
		}
	}
	return -1
}
