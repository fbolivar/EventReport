package aggregate

import (
	"testing"
	"time"

	"github.com/fbolivar/eventreport/collector/internal/normalize"
)

// add accumulates using the event's own timestamp as the reception moment,
// which is the case where both clocks agree.
func add(aggregator *Aggregator, item *normalize.Event) {
	aggregator.Add(item, item.Timestamp)
}

func event(hour int, kind normalize.EventType, action normalize.EventAction) *normalize.Event {
	return &normalize.Event{
		DeviceID:  "FGT60F",
		Timestamp: time.Date(2026, 9, 1, hour, 30, 0, 0, time.UTC),
		Type:      kind,
		Action:    action,
		SrcIP:     "45.155.205.7",
		DstIP:     "10.10.0.20",
		DstPort:   443,
		BytesIn:   100,
		BytesOut:  200,
	}
}

func TestCountersGroupByTypeAndAction(t *testing.T) {
	aggregator := New()

	for range 3 {
		add(aggregator, event(10, normalize.EventTraffic, normalize.ActionAllow))
	}
	add(aggregator, event(10, normalize.EventTraffic, normalize.ActionDeny))

	hours := aggregator.CloseBefore(time.Date(2026, 9, 1, 11, 0, 0, 0, time.UTC))
	if len(hours) != 1 {
		t.Fatalf("horas cerradas = %d", len(hours))
	}

	var allow, deny Counter
	for _, counter := range hours[0].Counters {
		switch counter.Action {
		case normalize.ActionAllow:
			allow = counter
		case normalize.ActionDeny:
			deny = counter
		}
	}

	if allow.Count != 3 || deny.Count != 1 {
		t.Fatalf("permitidos/denegados = %d/%d", allow.Count, deny.Count)
	}
	if allow.BytesIn != 300 || allow.BytesOut != 600 {
		t.Fatalf("bytes = %d/%d", allow.BytesIn, allow.BytesOut)
	}
}

func TestOnlyDeniedSourcesEnterTheTopList(t *testing.T) {
	aggregator := New()

	add(aggregator, event(10, normalize.EventTraffic, normalize.ActionAllow))
	add(aggregator, event(10, normalize.EventTraffic, normalize.ActionDeny))

	hours := aggregator.CloseBefore(time.Date(2026, 9, 1, 11, 0, 0, 0, time.UTC))

	var denied int64
	for _, entry := range hours[0].TopN {
		if entry.Dimension == DimSrcIPDenied {
			denied += entry.Count
		}
	}

	if denied != 1 {
		t.Fatalf("orígenes denegados = %d: una IP permitida es solo tráfico", denied)
	}
}

func TestOpenHourIsNotClosed(t *testing.T) {
	aggregator := New()
	add(aggregator, event(10, normalize.EventTraffic, normalize.ActionAllow))

	// Cutoff inside the same hour: nothing may leave yet.
	if hours := aggregator.CloseBefore(time.Date(2026, 9, 1, 10, 59, 0, 0, time.UTC)); len(hours) != 0 {
		t.Fatalf("cerró %d horas: la hora en curso no se envía", len(hours))
	}

	if hours := aggregator.CloseBefore(time.Date(2026, 9, 1, 11, 5, 0, 0, time.UTC)); len(hours) != 1 {
		t.Fatalf("cerró %d horas tras el corte", len(hours))
	}
}

func TestLateEventReopensAsCorrectiveHour(t *testing.T) {
	aggregator := New()
	add(aggregator, event(10, normalize.EventTraffic, normalize.ActionAllow))
	aggregator.CloseBefore(time.Date(2026, 9, 1, 11, 5, 0, 0, time.UTC))

	// A line that arrives late for an hour already sent.
	add(aggregator, event(10, normalize.EventTraffic, normalize.ActionAllow))
	hours := aggregator.CloseBefore(time.Date(2026, 9, 1, 11, 10, 0, 0, time.UTC))

	if len(hours) != 1 || hours[0].Counters[0].Count != 1 {
		t.Fatalf("el evento tardío debe producir un rollup correctivo: %+v", hours)
	}
}

func TestTopListIsCapped(t *testing.T) {
	aggregator := New()

	for index := range 120 {
		item := event(10, normalize.EventTraffic, normalize.ActionDeny)
		item.SrcIP = "10.0.0." + itoa(index)
		// The most frequent source must survive the cap.
		repeats := 1
		if index == 0 {
			repeats = 5
		}
		for range repeats {
			add(aggregator, item)
		}
	}

	hours := aggregator.CloseBefore(time.Date(2026, 9, 1, 11, 0, 0, 0, time.UTC))

	var denied []TopEntry
	for _, entry := range hours[0].TopN {
		if entry.Dimension == DimSrcIPDenied {
			denied = append(denied, entry)
		}
	}

	if len(denied) != TopNLimit {
		t.Fatalf("entradas = %d, se esperaba el tope de %d", len(denied), TopNLimit)
	}
	if denied[0].Key != "10.0.0.0" || denied[0].Count != 5 {
		t.Fatalf("el recorte debe conservar los mayores, no los primeros: %+v", denied[0])
	}
}

func TestUnparsedLinesAreCountedNotLost(t *testing.T) {
	aggregator := New()
	aggregator.AddUnparsed("FGT60F", time.Date(2026, 9, 1, 10, 5, 0, 0, time.UTC))
	aggregator.AddUnparsed("FGT60F", time.Date(2026, 9, 1, 10, 45, 0, 0, time.UTC))

	hours := aggregator.CloseBefore(time.Date(2026, 9, 1, 11, 0, 0, 0, time.UTC))
	if hours[0].Unparsed != 2 {
		t.Fatalf("líneas no reconocidas = %d: son calidad del dato, no basura", hours[0].Unparsed)
	}
}

func TestSeparateDevicesDoNotMix(t *testing.T) {
	aggregator := New()

	first := event(10, normalize.EventTraffic, normalize.ActionAllow)
	second := event(10, normalize.EventTraffic, normalize.ActionAllow)
	second.DeviceID = "XGS116"

	add(aggregator, first)
	add(aggregator, second)

	hours := aggregator.CloseBefore(time.Date(2026, 9, 1, 11, 0, 0, 0, time.UTC))
	if len(hours) != 2 {
		t.Fatalf("horas = %d: un colector atiende varios equipos y no debe sumarlos", len(hours))
	}
}

func TestBucketsByReceptionNotByDeviceClock(t *testing.T) {
	aggregator := New()

	// The device thinks it is 08:00; the line actually arrives at 10:30.
	item := event(8, normalize.EventTraffic, normalize.ActionAllow)
	received := time.Date(2026, 9, 1, 10, 30, 0, 0, time.UTC)
	aggregator.Add(item, received)

	hours := aggregator.CloseBefore(time.Date(2026, 9, 1, 11, 0, 0, 0, time.UTC))
	if len(hours) != 1 {
		t.Fatalf("horas = %d", len(hours))
	}

	if hours[0].Hour.Hour() != 10 {
		t.Fatalf("hora = %d: se agrupa por recepción, no por el reloj del equipo", hours[0].Hour.Hour())
	}
	// The gap is what FW-015 reads: two hours, far past the 60 s threshold.
	if hours[0].ClockSkewSeconds != 7200 {
		t.Fatalf("desfase = %d s: el desajuste de reloj se reporta, no se ignora", hours[0].ClockSkewSeconds)
	}
}
