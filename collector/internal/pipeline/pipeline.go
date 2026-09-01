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
	"sync"
	"time"

	"github.com/fbolivar/eventreport/collector/internal/adapter"
	"github.com/fbolivar/eventreport/collector/internal/aggregate"
	"github.com/fbolivar/eventreport/collector/internal/buffer"
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

	wg sync.WaitGroup
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
}

// CloseHours moves every hour older than the cutoff into the send buffer.
// Called at minute 05 (section 6.6).
func (p *Pipeline) CloseHours(now time.Time) (int, error) {
	closed := p.Aggregator.CloseBefore(now.Add(-5 * time.Minute))

	for _, hour := range closed {
		if err := p.Buffer.Enqueue("rollups", hour); err != nil {
			return 0, err
		}
	}

	return len(closed), nil
}

// Wait blocks until the workers finish.
func (p *Pipeline) Wait() { p.wg.Wait() }
