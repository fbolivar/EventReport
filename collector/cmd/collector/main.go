// Command collector is the agent that runs inside the customer's network.
//
//	collector enroll   registers against the SaaS with a single-use token
//	collector run      receives syslog, aggregates and uploads
//	collector test     checks it can reach the firewall's API
//	collector vault    queries the local raw-log vault
//
// Design reference: docs/diseno-tecnico.md section 6.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/fbolivar/eventreport/collector/internal/adapter"
	"github.com/fbolivar/eventreport/collector/internal/adapter/fortigate"
	"github.com/fbolivar/eventreport/collector/internal/aggregate"
	"github.com/fbolivar/eventreport/collector/internal/buffer"
	"github.com/fbolivar/eventreport/collector/internal/config"
	"github.com/fbolivar/eventreport/collector/internal/pipeline"
	"github.com/fbolivar/eventreport/collector/internal/syslog"
	"github.com/fbolivar/eventreport/collector/internal/transport"
	"github.com/fbolivar/eventreport/collector/internal/vault"
)

// version is stamped into the heartbeat so the portal can offer updates.
const version = "0.1.0"

const usage = `EventReport collector

Uso:
  collector enroll -token <token> -url <url-supabase>   registra este colector
  collector run                                          recibe, agrega y envía
  collector test                                         prueba la API del firewall
  collector vault -device <id> -from <fecha> -to <fecha> consulta la bóveda local

Opciones comunes:
  -config <ruta>   archivo de configuración (por defecto ./collector.json)
`

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo}))

	if len(os.Args) < 2 {
		fmt.Print(usage)
		os.Exit(2)
	}

	command := os.Args[1]
	args := os.Args[2:]

	var err error
	switch command {
	case "enroll":
		err = runEnroll(args, logger)
	case "run":
		err = runCollector(args, logger)
	case "test":
		err = runTest(args, logger)
	case "vault":
		err = runVault(args, logger)
	case "-h", "--help", "help":
		fmt.Print(usage)
		return
	default:
		fmt.Print(usage)
		os.Exit(2)
	}

	if err != nil {
		logger.Error("el comando falló", "comando", command, "error", err)
		os.Exit(1)
	}
}

func configFlag(set *flag.FlagSet) *string {
	return set.String("config", "collector.json", "archivo de configuración")
}

// runEnroll registers the collector: it generates the Ed25519 pair, sends the
// public half with the single-use token, and stores what comes back. The
// private key is written here and never leaves.
func runEnroll(args []string, logger *slog.Logger) error {
	set := flag.NewFlagSet("enroll", flag.ExitOnError)
	path := configFlag(set)
	token := set.String("token", "", "token de un solo uso entregado por el portal")
	baseURL := set.String("url", "", "URL del proyecto Supabase")
	hostname := set.String("hostname", "", "nombre de este equipo (por defecto, el del sistema)")
	if err := set.Parse(args); err != nil {
		return err
	}

	if *token == "" || *baseURL == "" {
		return fmt.Errorf("faltan -token y -url")
	}

	name := *hostname
	if name == "" {
		name, _ = os.Hostname()
	}

	seed, public, err := config.NewSigningKey()
	if err != nil {
		return err
	}

	// The enrolment call is the only one without a signature: there is no
	// identity yet, and the single-use token is what authenticates it.
	logger.Info("enrolando", "url", *baseURL, "hostname", name)

	answer, err := postEnrolment(*baseURL, map[string]any{
		"token":     *token,
		"publicKey": public,
		"hostname":  name,
		"version":   version,
	})
	if err != nil {
		// Si la nube no responde, el operador todavía puede registrar la clave a
		// mano desde el portal. La mitad privada no viaja en ningún caso.
		logger.Warn("no se pudo completar el enrolamiento", "detalle", err)
		fmt.Printf("clave pública del colector: %s\n", public)
		fmt.Println("regístrala en el portal para completar el enrolamiento")
	}

	syslogAddr := answer.Config.SyslogAddr
	if syslogAddr == "" {
		syslogAddr = "0.0.0.0:514"
	}

	file := &config.File{
		CollectorID: answer.CollectorID,
		BaseURL:     *baseURL,
		PrivateKey:  seed,
		SyslogAddr:  syslogAddr,
		VaultDir:    filepath.Join(filepath.Dir(*path), "vault"),
		BufferDir:   filepath.Join(filepath.Dir(*path), "buffer"),
		// Los días de bóveda los decide el plan, no el archivo local.
		VaultDays: answer.Config.VaultDays,
	}

	if err := config.Save(*path, file); err != nil {
		return err
	}

	if answer.CollectorID != "" {
		logger.Info("colector enrolado",
			"id", answer.CollectorID,
			"boveda_dias", answer.Config.VaultDays,
			"snapshots_por_dia", answer.Config.SnapshotsPerDay,
			"rollup_minutos", answer.Config.RollupMinutes)
	}
	return nil
}

// enrolmentAnswer is what the cloud sends back: the collector's identity and
// the operating parameters derived from the customer's plan. They are decided
// there and not here on purpose — a customer must not raise their own quota by
// editing a local file.
type enrolmentAnswer struct {
	CollectorID string `json:"collectorId"`
	Config      struct {
		SnapshotsPerDay      int    `json:"snapshotsPerDay"`
		RollupMinutes        int    `json:"rollupMinutes"`
		VaultDays            int    `json:"vaultDays"`
		CriticalEventsPerDay int    `json:"criticalEventsPerDay"`
		SyslogAddr           string `json:"syslogAddr"`
	} `json:"config"`
}

// postEnrolment performs the unsigned enrolment call and returns what the cloud
// assigns to this collector.
func postEnrolment(baseURL string, payload map[string]any) (enrolmentAnswer, error) {
	var answer enrolmentAnswer

	body, err := json.Marshal(payload)
	if err != nil {
		return answer, err
	}

	response, err := http.Post(
		strings.TrimRight(baseURL, "/")+"/functions/v1/enroll",
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return answer, err
	}
	defer response.Body.Close()

	raw, _ := io.ReadAll(response.Body)
	if response.StatusCode != http.StatusOK {
		return answer, fmt.Errorf("enroll respondió %d: %s", response.StatusCode, raw)
	}

	if err := json.Unmarshal(raw, &answer); err != nil {
		return answer, err
	}
	return answer, nil
}

func buildAdapter(device config.Device, passphrase string) (adapter.Adapter, error) {
	token := ""
	if device.TokenEncrypted != "" && passphrase != "" {
		opened, err := config.Decrypt(device.TokenEncrypted, passphrase)
		if err != nil {
			return nil, err
		}
		token = opened
	}

	switch device.Brand {
	case "fortigate":
		return &fortigate.Adapter{Host: device.Host, Token: token}, nil
	default:
		return nil, fmt.Errorf("marca sin adaptador todavía: %s", device.Brand)
	}
}

// runCollector is the long-running mode: listen, vault, parse, aggregate,
// close hours at minute 05 and upload what is pending.
func runCollector(args []string, logger *slog.Logger) error {
	set := flag.NewFlagSet("run", flag.ExitOnError)
	path := configFlag(set)
	passphrase := set.String("passphrase", os.Getenv("EVENTREPORT_PASSPHRASE"), "frase de paso de las credenciales")
	if err := set.Parse(args); err != nil {
		return err
	}

	file, err := config.Load(*path)
	if err != nil {
		return err
	}

	key, err := file.SigningKey()
	if err != nil {
		return err
	}

	devices := make([]pipeline.Device, 0, len(file.Devices))
	for _, device := range file.Devices {
		built, err := buildAdapter(device, *passphrase)
		if err != nil {
			return err
		}
		devices = append(devices, pipeline.Device{
			FirewallID: device.FirewallID,
			SourceIP:   device.SourceIP,
			Adapter:    built,
		})
	}
	if len(devices) == 0 {
		return fmt.Errorf("no hay firewalls configurados: agrégalos con el asistente del portal")
	}

	listener := syslog.New(file.SyslogAddr)
	store := vault.New(file.VaultDir, file.VaultDays, int64(file.VaultQuotaGB)*1024*1024*1024)
	pending, err := buffer.New(file.BufferDir)
	if err != nil {
		return err
	}

	worker := pipeline.New(listener, store, aggregate.New(), pending, logger, devices)
	client := transport.New(file.BaseURL, file.CollectorID, key)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := listener.Start(ctx); err != nil {
		return fmt.Errorf("abrir el receptor de syslog: %w", err)
	}
	worker.Run(ctx, 4)

	logger.Info("colector en marcha", "syslog", file.SyslogAddr, "firewalls", len(devices), "bóveda", file.VaultDays)

	flush := time.NewTicker(time.Minute)
	defer flush.Stop()
	upload := time.NewTicker(5 * time.Minute)
	defer upload.Stop()

	for {
		select {
		case <-ctx.Done():
			logger.Info("deteniendo el colector")
			listener.Close()
			worker.Wait()
			return store.Close()

		case <-flush.C:
			// Persist the vault every minute: a power cut must not cost more
			// than a minute of raw logs.
			if err := store.Flush(); err != nil {
				logger.Error("no se pudo vaciar la bóveda", "error", err)
			}
			if _, err := worker.CloseHours(time.Now().UTC()); err != nil {
				logger.Error("no se pudieron cerrar horas", "error", err)
			}

		case <-upload.C:
			sendPending(ctx, client, pending, listener, logger)
			if _, err := store.Rotate(time.Now()); err != nil {
				logger.Error("no se pudo rotar la bóveda", "error", err)
			}
			if _, err := pending.Prune(time.Now()); err != nil {
				logger.Error("no se pudo limpiar el buffer", "error", err)
			}
		}
	}
}

// sendPending uploads queued payloads in order and reports health.
func sendPending(ctx context.Context, client *transport.Client, pending *buffer.Buffer, listener *syslog.Listener, logger *slog.Logger) {
	stats := listener.Stats()

	heartbeat := map[string]any{
		"version":          version,
		"eps":              0,
		"droppedPct":       listener.DroppedPercent(),
		"queueDepth":       stats.Queued,
		"diskFreeGb":       0,
		"clockSkewSeconds": 0,
	}
	if _, err := client.Post(ctx, "heartbeat", heartbeat); err != nil {
		logger.Warn("heartbeat sin respuesta", "error", err)
	}

	items, err := pending.List()
	if err != nil {
		logger.Error("no se pudo leer el buffer", "error", err)
		return
	}

	for _, item := range items {
		var payload any
		if err := json.Unmarshal(item.Payload, &payload); err != nil {
			logger.Error("payload ilegible, se descarta", "archivo", item.Path)
			_ = pending.Ack(item.Path)
			continue
		}

		function := "ingest-" + item.Kind
		response, err := client.Post(ctx, function, payload)
		if err != nil {
			// No connection: stop here and keep the order for the next round.
			logger.Warn("envío pendiente", "función", function, "error", err)
			return
		}
		if response.Status >= 400 {
			logger.Error("la nube rechazó el envío", "función", function, "estado", response.Status, "respuesta", string(response.Body))
			// A rejected payload will not become valid by retrying it forever.
			_ = pending.Ack(item.Path)
			continue
		}

		_ = pending.Ack(item.Path)
	}
}

// runTest verifies the collector can reach each firewall's API.
func runTest(args []string, logger *slog.Logger) error {
	set := flag.NewFlagSet("test", flag.ExitOnError)
	path := configFlag(set)
	passphrase := set.String("passphrase", os.Getenv("EVENTREPORT_PASSPHRASE"), "frase de paso de las credenciales")
	if err := set.Parse(args); err != nil {
		return err
	}

	file, err := config.Load(*path)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	for _, device := range file.Devices {
		built, err := buildAdapter(device, *passphrase)
		if err != nil {
			return err
		}
		if err := built.TestConnection(ctx); err != nil {
			logger.Error("sin conexión con el firewall", "firewall", device.FirewallID, "error", err)
			continue
		}
		logger.Info("conexión correcta", "firewall", device.FirewallID, "marca", device.Brand)
	}

	return nil
}

// runVault is the local query over the raw logs: the portal reaches it through
// an evidence order in phase 5; the CLI is what exists in phase 1.
func runVault(args []string, logger *slog.Logger) error {
	set := flag.NewFlagSet("vault", flag.ExitOnError)
	path := configFlag(set)
	device := set.String("device", "", "identificador del firewall")
	if err := set.Parse(args); err != nil {
		return err
	}

	file, err := config.Load(*path)
	if err != nil {
		return err
	}

	store := vault.New(file.VaultDir, file.VaultDays, 0)
	used, err := store.UsedBytes()
	if err != nil {
		return err
	}

	logger.Info("bóveda local",
		"directorio", file.VaultDir,
		"retención", file.VaultDays,
		"ocupado_mb", used/1024/1024,
		"firewall", *device,
	)

	// TODO(fase 5): filtrar por IP, usuario y rango, y devolver como máximo N
	// filas según el plan.
	return nil
}
