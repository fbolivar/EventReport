// Package pipeline wires the collector together: receive, vault, parse,
// aggregate, close the hour, upload (design section 6.6).
//
// The order is deliberate. The raw line is written to the vault BEFORE being
// parsed, so a format the adapter does not understand is still kept and can be
// investigated. Only after that does it become an event.
package pipeline

import (
	"context"
	"log/slog"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/fbolivar/eventreport/collector/internal/adapter"
	"github.com/fbolivar/eventreport/collector/internal/aggregate"
	"github.com/fbolivar/eventreport/collector/internal/buffer"
	"github.com/fbolivar/eventreport/collector/internal/normalize"
	"github.com/fbolivar/eventreport/collector/internal/syslog"
	"github.com/fbolivar/eventreport/collector/internal/vault"
)

// Device links a source IP to the firewall it belongs to and its adapter.
type Device struct {
	FirewallID string
	SourceIP   string
	Adapter    adapter.Adapter
}

// Pipeline consumes the listener and produces closed hours.
type Pipeline struct {
	Listener   *syslog.Listener
	Vault      *vault.Vault
	Aggregator *aggregate.Aggregator
	Buffer     *buffer.Buffer
	Logger     *slog.Logger

	// Devices resolved by source IP: a collector serves several firewalls of
	// the same site (section 6.6).
	devices map[string]Device
	unknown Device

	// Eventos críticos a la espera del próximo envío, y la calidad del dato
	// acumulada desde el último latido.
	mu      sync.Mutex
	events  []pendingEvent
	quality qualityCounter

	wg sync.WaitGroup
}

// qualityCounter acumula lo que el latido reporta: líneas no entendidas y el
// peor desfase de reloj visto. Se vacía al leerlo, así cada latido habla del
// intervalo que le corresponde y no del total desde el arranque.
type qualityCounter struct {
	mu        sync.Mutex
	unparsed  int64
	worstSkew int
}

func (q *qualityCounter) record(unparsed int64, skewSeconds int) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.unparsed += unparsed
	if skewSeconds > q.worstSkew || -skewSeconds > q.worstSkew {
		if skewSeconds < 0 {
			skewSeconds = -skewSeconds
		}
		q.worstSkew = skewSeconds
	}
}

func (q *qualityCounter) take() (int64, int) {
	q.mu.Lock()
	defer q.mu.Unlock()
	unparsed, skew := q.unparsed, q.worstSkew
	q.unparsed, q.worstSkew = 0, 0
	return unparsed, skew
}

func New(listener *syslog.Listener, store *vault.Vault, aggregator *aggregate.Aggregator, pending *buffer.Buffer, logger *slog.Logger, devices []Device) *Pipeline {
	byIP := make(map[string]Device, len(devices))
	for _, device := range devices {
		byIP[device.SourceIP] = device
	}

	pipeline := &Pipeline{
		Listener:   listener,
		Vault:      store,
		Aggregator: aggregator,
		Buffer:     pending,
		Logger:     logger,
		devices:    byIP,
	}
	if len(devices) > 0 {
		// Lines from an unregistered IP still get parsed with the first
		// adapter; they are counted under its device so nothing is silently
		// lost while the operator finishes the onboarding.
		pipeline.unknown = devices[0]
	}

	return pipeline
}

// Run consumes lines until the context is cancelled.
func (p *Pipeline) Run(ctx context.Context, workers int) {
	if workers < 1 {
		workers = 2
	}

	for range workers {
		p.wg.Add(1)
		go p.worker(ctx)
	}
}

func (p *Pipeline) resolve(source net.IP) (Device, bool) {
	if source == nil {
		return p.unknown, p.unknown.Adapter != nil
	}
	if device, ok := p.devices[source.String()]; ok {
		return device, true
	}
	return p.unknown, p.unknown.Adapter != nil
}

func (p *Pipeline) worker(ctx context.Context) {
	defer p.wg.Done()

	for {
		select {
		case <-ctx.Done():
			return
		case line, ok := <-p.Listener.Lines():
			if !ok {
				return
			}
			p.handle(line)
		}
	}
}

func (p *Pipeline) handle(line syslog.Line) {
	device, ok := p.resolve(line.Source)
	if !ok {
		return
	}

	// Vault first: an unrecognised format must not be lost.
	if err := p.Vault.Write(device.FirewallID, line.Received, line.Data); err != nil {
		p.Logger.Error("no se pudo escribir en la bóveda", "error", err)
	}

	event, parsed := device.Adapter.ParseLog(line.Data)
	if !parsed {
		p.Aggregator.AddUnparsed(device.FirewallID, line.Received)
		return
	}

	// The device id inside the line is the brand's; what the cloud stores is
	// our firewall id, so it is overwritten here.
	event.DeviceID = device.FirewallID
	p.Aggregator.Add(event, line.Received)

	if title, severity, ok := criticalEvent(event); ok {
		p.mu.Lock()
		// Un firewall enloquecido no puede llenar la memoria del colector: lo
		// que pase de este tope se cuenta como descarte y se deja ir.
		if len(p.events) < maxPendingEvents {
			p.events = append(p.events, pendingEvent{
				firewallID: device.FirewallID,
				event: CriticalEvent{
					Severity: severity,
					Ts:       event.Timestamp.UTC().Format(time.RFC3339),
					Title:    title,
					Detail:   detailOf(event),
					Payload: map[string]any{
						"srcIp":    event.SrcIP,
						"user":     event.User,
						"policyId": event.PolicyID,
					},
				},
			})
		}
		p.mu.Unlock()
	}
}

// detailOf describe el evento sin adjuntar la línea cruda: la línea se queda
// en la bóveda del cliente, y lo que viaja es lo que se puede leer sin ella.
func detailOf(event *normalize.Event) string {
	parts := []string{}
	if event.SrcIP != "" {
		parts = append(parts, "origen "+event.SrcIP)
	}
	if event.SrcCountry != "" {
		parts = append(parts, "país "+event.SrcCountry)
	}
	if event.User != "" {
		parts = append(parts, "usuario "+event.User)
	}
	if event.PolicyID != "" {
		parts = append(parts, "política "+event.PolicyID)
	}
	return strings.Join(parts, " · ")
}

// maxPendingEvents acota lo que cabe entre dos envíos.
const maxPendingEvents = 2000

type pendingEvent struct {
	firewallID string
	event      CriticalEvent
}

// criticalEvent decide qué línea merece llegar como evento, con qué nombre y
// con qué severidad.
//
// **La severidad la decide EventReport, no el fabricante.** El campo `severity`
// de un FortiGate viene vacío en la mitad de las líneas que importan —un
// ingreso administrativo no trae ninguno—, y copiarlo tal cual hacía que el
// evento se descartara del otro lado sin que nadie se enterara. Lo que
// interrumpe a una persona lo define el producto.
//
// La lista es deliberadamente corta: se amplía a propósito, no por acumulación.
func criticalEvent(event *normalize.Event) (title string, severity string, ok bool) {
	switch {
	case event.Type == normalize.EventAdmin && event.Action == normalize.ActionAllow:
		return "Ingreso administrativo al firewall", "high", true
	case event.Severity == "critical":
		if event.ThreatName != "" {
			return "Amenaza crítica bloqueada: " + event.ThreatName, "critical", true
		}
		return "Evento crítico en el perímetro", "critical", true
	case event.Type == normalize.EventVPN && event.Action == normalize.ActionDeny:
		return "Intento fallido de VPN", "medium", true
	default:
		return "", "", false
	}
}

// CloseHours moves every hour older than the cutoff into the send buffer.
// Called at minute 05 (section 6.6).
//
// Lo que se encola es **la forma del contrato** (§6.7), no la estructura
// interna del agregador: `{firewallId, hours: [...]}`. Encolar la estructura
// interna acopla el formato del disco con el de la API, y el día que una
// cambie la otra se rompe en silencio.
func (p *Pipeline) CloseHours(now time.Time) (int, error) {
	closed := p.Aggregator.CloseBefore(now.Add(-5 * time.Minute))

	for _, hour := range closed {
		payload := RollupsPayload{
			FirewallID: hour.DeviceID,
			Hours: []RollupHour{{
				Hour:     hour.Hour.UTC().Format(time.RFC3339),
				Counters: hour.Counters,
				TopN:     hour.TopN,
			}},
		}
		if err := p.Buffer.Enqueue("rollups", payload); err != nil {
			return 0, err
		}

		// La calidad del dato viaja aparte, en el latido: cuántas líneas no se
		// entendieron y cuánto se desvía el reloj del equipo. En los rollups no
		// cabe —son contadores— y perderla sería mentir por omisión (§6.2).
		p.quality.record(hour.Unparsed, hour.ClockSkewSeconds)
	}

	return len(closed), nil
}

// SendOpenHours encola la hora en curso sin cerrarla.
//
// La actividad se ve así a los pocos minutos de instalar, en vez de esperar a
// que termine la hora. Cuando la hora cierre se enviará completa y sobrescribirá
// a esta: la clave del upsert lo garantiza.
func (p *Pipeline) SendOpenHours() (int, error) {
	open := p.Aggregator.Open()

	for _, hour := range open {
		payload := RollupsPayload{
			FirewallID: hour.DeviceID,
			Hours: []RollupHour{{
				Hour:     hour.Hour.UTC().Format(time.RFC3339),
				Counters: hour.Counters,
				TopN:     hour.TopN,
			}},
		}
		if err := p.Buffer.Enqueue("rollups", payload); err != nil {
			return 0, err
		}
	}

	return len(open), nil
}

// RollupsPayload is the wire shape of `POST /ingest/rollups`.
type RollupsPayload struct {
	FirewallID string       `json:"firewallId"`
	Hours      []RollupHour `json:"hours"`
}

type RollupHour struct {
	Hour     string               `json:"hour"`
	Counters []aggregate.Counter  `json:"counters"`
	TopN     []aggregate.TopEntry `json:"topn"`
}

// EventsPayload is the wire shape of `POST /ingest/events`.
type EventsPayload struct {
	FirewallID string          `json:"firewallId"`
	Events     []CriticalEvent `json:"events"`
}

type CriticalEvent struct {
	RuleCode string         `json:"ruleCode,omitempty"`
	Severity string         `json:"severity"`
	Ts       string         `json:"ts"`
	Title    string         `json:"title"`
	Detail   string         `json:"detail,omitempty"`
	Payload  map[string]any `json:"payload,omitempty"`
}

// FlushEvents encola los eventos críticos acumulados. Se llama con el mismo
// pulso que cierra horas: agrupar es lo que evita una petición por evento
// cuando el firewall se pone ruidoso.
func (p *Pipeline) FlushEvents() (int, error) {
	p.mu.Lock()
	pending := p.events
	p.events = nil
	p.mu.Unlock()

	byDevice := map[string][]CriticalEvent{}
	for _, event := range pending {
		byDevice[event.firewallID] = append(byDevice[event.firewallID], event.event)
	}

	for firewallID, events := range byDevice {
		if err := p.Buffer.Enqueue("events", EventsPayload{FirewallID: firewallID, Events: events}); err != nil {
			return 0, err
		}
	}

	return len(pending), nil
}

// Quality devuelve y reinicia lo acumulado desde el último latido.
func (p *Pipeline) Quality() (unparsed int64, clockSkewSeconds int) {
	return p.quality.take()
}

// Wait blocks until the workers finish.
func (p *Pipeline) Wait() { p.wg.Wait() }
