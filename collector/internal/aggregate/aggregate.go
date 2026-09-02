// Package aggregate turns a stream of events into what actually travels to
// the cloud: counters and top-N per hour (design section 6.2).
//
// This is the reason the product works without a SIEM. A firewall generating
// 30 GB of logs a day leaves here as less than 1 MB: between 15 and 40 KB per
// hour per device.
package aggregate

import (
	"sort"
	"sync"
	"time"

	"github.com/fbolivar/eventreport/collector/internal/normalize"
)

// TopNLimit is the cap per dimension and hour (section 6.2).
const TopNLimit = 50

// Dimension is what a top-N list ranks.
type Dimension string

const (
	DimSrcCountry   Dimension = "src_country"
	DimSrcIPDenied  Dimension = "src_ip_denied"
	DimDstIP        Dimension = "dst_ip"
	DimDstPort      Dimension = "dst_port"
	DimApp          Dimension = "app"
	DimWebCategory  Dimension = "web_category"
	DimVPNUser      Dimension = "vpn_user"
	DimIPSSignature Dimension = "ips_signature"
	DimPolicy       Dimension = "policy"
)

// Counter is one row of rollups_hourly.
type Counter struct {
	Type     normalize.EventType   `json:"type"`
	Action   normalize.EventAction `json:"action"`
	Count    int64                 `json:"count"`
	BytesIn  int64                 `json:"bytesIn"`
	BytesOut int64                 `json:"bytesOut"`
}

// TopEntry is one row of rollups_topn.
type TopEntry struct {
	Dimension Dimension `json:"dimension"`
	Key       string    `json:"key"`
	Count     int64     `json:"count"`
	Bytes     int64     `json:"bytes"`
}

// Hour is a closed hour, ready to be uploaded.
type Hour struct {
	DeviceID string     `json:"deviceId"`
	Hour     time.Time  `json:"hour"`
	Counters []Counter  `json:"counters"`
	TopN     []TopEntry `json:"topn"`
	// Identities es la actividad atribuida a cada persona, equipo o dirección.
	Identities []Identity `json:"identities"`
	// Events the parser did not recognise. Reported as data quality, never
	// silently dropped (section 6.2).
	Unparsed int64 `json:"unparsed"`
	// ClockSkewSeconds is the worst gap between the device clock and ours.
	ClockSkewSeconds int `json:"clockSkewSeconds"`
}

type counterKey struct {
	kind   normalize.EventType
	action normalize.EventAction
}

type topKey struct {
	dimension Dimension
	key       string
}

type bucket struct {
	counters   map[counterKey]*Counter
	top        map[topKey]*TopEntry
	identities map[string]*identityBucket
	unparsed   int64
	// maxSkew is the largest gap seen between the device's own timestamp and
	// the moment the line arrived. Past 60 s it opens FW-015.
	maxSkew time.Duration
}

// Aggregator accumulates events per device and hour. Safe for concurrent use:
// the syslog workers write from several goroutines.
type Aggregator struct {
	mu      sync.Mutex
	buckets map[string]map[time.Time]*bucket
}

func New() *Aggregator {
	return &Aggregator{buckets: make(map[string]map[time.Time]*bucket)}
}

func (a *Aggregator) bucketFor(deviceID string, hour time.Time) *bucket {
	hours, ok := a.buckets[deviceID]
	if !ok {
		hours = make(map[time.Time]*bucket)
		a.buckets[deviceID] = hours
	}

	current, ok := hours[hour]
	if !ok {
		current = &bucket{
			counters:   make(map[counterKey]*Counter),
			top:        make(map[topKey]*TopEntry),
			identities: make(map[string]*identityBucket),
		}
		hours[hour] = current
	}

	return current
}

// Add accumulates one event.
//
// Bucketing is by RECEPTION hour, not by the device's timestamp (section 6.6).
// A firewall with a drifting clock would otherwise scatter its traffic across
// hours that never close, and the report would show holes that are not real.
// The gap between both clocks is kept as the skew that FW-015 watches.
func (a *Aggregator) Add(event *normalize.Event, received time.Time) {
	hour := received.UTC().Truncate(time.Hour)

	a.mu.Lock()
	defer a.mu.Unlock()

	current := a.bucketFor(event.DeviceID, hour)

	if !event.Timestamp.IsZero() {
		skew := event.Timestamp.Sub(received)
		if skew < 0 {
			skew = -skew
		}
		if skew > current.maxSkew {
			current.maxSkew = skew
		}
	}

	key := counterKey{kind: event.Type, action: event.Action}
	counter, ok := current.counters[key]
	if !ok {
		counter = &Counter{Type: event.Type, Action: event.Action}
		current.counters[key] = counter
	}
	counter.Count++
	counter.BytesIn += event.BytesIn
	counter.BytesOut += event.BytesOut

	bytes := event.BytesIn + event.BytesOut
	add := func(dimension Dimension, value string) {
		if value == "" {
			return
		}
		entryKey := topKey{dimension: dimension, key: value}
		entry, ok := current.top[entryKey]
		if !ok {
			entry = &TopEntry{Dimension: dimension, Key: value}
			current.top[entryKey] = entry
		}
		entry.Count++
		entry.Bytes += bytes
	}

	add(DimSrcCountry, event.SrcCountry)
	add(DimDstIP, event.DstIP)
	add(DimApp, event.App)
	add(DimWebCategory, event.Category)
	add(DimIPSSignature, event.ThreatName)
	add(DimPolicy, event.PolicyID)

	if event.DstPort > 0 {
		add(DimDstPort, itoa(event.DstPort))
	}
	// Denied sources are the interesting ones: an allowed IP is just traffic.
	if event.Action == normalize.ActionDeny || event.Action == normalize.ActionBlock {
		add(DimSrcIPDenied, event.SrcIP)
	}
	if event.Type == normalize.EventVPN {
		add(DimVPNUser, event.User)
	}

	// Y a quién se le atribuye, que es lo que convierte un contador en algo
	// sobre lo que alguien puede actuar.
	current.identity(event)
}

// AddUnparsed counts a line the adapter did not recognise.
func (a *Aggregator) AddUnparsed(deviceID string, when time.Time) {
	hour := when.UTC().Truncate(time.Hour)

	a.mu.Lock()
	defer a.mu.Unlock()
	a.bucketFor(deviceID, hour).unparsed++
}

// CloseBefore removes and returns every hour older than the cutoff.
//
// Called at minute 05 for the previous hour (section 6.6). Late events land in
// an hour that was already closed and produce a corrective rollup; the cloud
// upserts by (firewall, hour, type, action), so the correction overwrites.
// Open devuelve una copia de las horas todavía abiertas, **sin cerrarlas**.
//
// Sirve para que la actividad se vea sin esperar a que termine la hora. La
// escritura en la nube es idempotente por (firewall, hora, tipo, acción), así
// que enviar la hora a medias y volver a enviarla completa después sobrescribe
// en vez de duplicar: eso es lo que hace seguro este adelanto.
func (a *Aggregator) Open() []Hour {
	a.mu.Lock()
	defer a.mu.Unlock()

	var open []Hour
	for deviceID, hours := range a.buckets {
		for hour, current := range hours {
			open = append(open, Hour{
				DeviceID:         deviceID,
				Hour:             hour,
				Counters:         sortedCounters(current),
				TopN:             cappedTop(current),
				Identities:       identitiesOf(current),
				Unparsed:         current.unparsed,
				ClockSkewSeconds: int(current.maxSkew.Seconds()),
			})
		}
	}
	return open
}

func (a *Aggregator) CloseBefore(cutoff time.Time) []Hour {
	cutoff = cutoff.UTC().Truncate(time.Hour)

	a.mu.Lock()
	defer a.mu.Unlock()

	var closed []Hour

	for deviceID, hours := range a.buckets {
		for hour, current := range hours {
			if !hour.Before(cutoff) {
				continue
			}

			closed = append(closed, Hour{
				DeviceID:         deviceID,
				Hour:             hour,
				Counters:         sortedCounters(current),
				TopN:             cappedTop(current),
				Identities:       identitiesOf(current),
				Unparsed:         current.unparsed,
				ClockSkewSeconds: int(current.maxSkew.Seconds()),
			})
			delete(hours, hour)
		}
		if len(hours) == 0 {
			delete(a.buckets, deviceID)
		}
	}

	sort.Slice(closed, func(i, j int) bool {
		if closed[i].DeviceID != closed[j].DeviceID {
			return closed[i].DeviceID < closed[j].DeviceID
		}
		return closed[i].Hour.Before(closed[j].Hour)
	})

	return closed
}

func sortedCounters(current *bucket) []Counter {
	counters := make([]Counter, 0, len(current.counters))
	for _, counter := range current.counters {
		counters = append(counters, *counter)
	}

	sort.Slice(counters, func(i, j int) bool {
		if counters[i].Type != counters[j].Type {
			return counters[i].Type < counters[j].Type
		}
		return counters[i].Action < counters[j].Action
	})

	return counters
}

// cappedTop keeps the TopNLimit largest entries per dimension. Without the cap
// a single scan with thousands of unique sources would blow up the payload.
func cappedTop(current *bucket) []TopEntry {
	byDimension := make(map[Dimension][]TopEntry)
	for _, entry := range current.top {
		byDimension[entry.Dimension] = append(byDimension[entry.Dimension], *entry)
	}

	var result []TopEntry
	for _, entries := range byDimension {
		sort.Slice(entries, func(i, j int) bool {
			if entries[i].Count != entries[j].Count {
				return entries[i].Count > entries[j].Count
			}
			return entries[i].Key < entries[j].Key
		})
		if len(entries) > TopNLimit {
			entries = entries[:TopNLimit]
		}
		result = append(result, entries...)
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Dimension != result[j].Dimension {
			return result[i].Dimension < result[j].Dimension
		}
		return result[i].Count > result[j].Count
	})

	return result
}

func itoa(value int) string {
	if value == 0 {
		return "0"
	}

	var digits [20]byte
	position := len(digits)
	for value > 0 {
		position--
		digits[position] = byte('0' + value%10)
		value /= 10
	}

	return string(digits[position:])
}
