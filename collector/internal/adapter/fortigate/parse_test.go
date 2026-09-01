package fortigate

import (
	"testing"
	"time"
)

// Real FortiGate lines, as they arrive over syslog with `set format default`.
const (
	trafficLine = `<189>date=2026-09-01 time=10:15:22 devname="FGT60F-BOG" devid="FGT60FTK21089123" ` +
		`type="traffic" subtype="forward" level="notice" srcip=10.10.0.42 srcport=51514 srcintf="lan" ` +
		`dstip=20.190.160.14 dstport=443 dstintf="wan1" policyid=14 sessionid=182736 proto=6 ` +
		`action="accept" app="Microsoft.365" srccountry="Reserved" dstcountry="United States" ` +
		`sentbyte=48211 rcvdbyte=98123 user="agomez"`

	deniedLine = `date=2026-09-01 time=10:16:02 devid="FGT60FTK21089123" type="traffic" subtype="forward" ` +
		`srcip=45.155.205.7 srcintf="wan1" dstip=190.85.44.12 dstport=22 dstintf="root" policyid=0 ` +
		`proto=6 action="deny" srccountry="Netherlands" sentbyte=0 rcvdbyte=0`

	ipsLine = `date=2026-09-01 time=10:17:41 devid="FGT60FTK21089123" type="utm" subtype="ips" ` +
		`severity="critical" srcip=185.220.101.34 dstip=10.10.0.20 dstport=443 ` +
		`action="dropped" utmaction="blocked" attack="Apache.Struts.RCE" policyid=3`

	adminLine = `date=2026-09-01 time=10:18:00 devid="FGT60FTK21089123" type="event" subtype="system" ` +
		`level="alert" logdesc="Admin login successful" user="admin" ui="https(190.85.212.44)" ` +
		`action="login" status="success" msg="Administrator admin logged in successfully from https(190.85.212.44)"`
)

func TestParseTrafficLine(t *testing.T) {
	adapter := &Adapter{}

	event, ok := adapter.ParseLog([]byte(trafficLine))
	if !ok {
		t.Fatal("la línea de tráfico debería reconocerse")
	}

	if event.Type != "traffic" || event.Action != "allow" {
		t.Fatalf("tipo/acción = %s/%s, se esperaba traffic/allow", event.Type, event.Action)
	}
	if event.SrcIP != "10.10.0.42" || event.DstPort != 443 {
		t.Fatalf("origen/puerto = %s/%d", event.SrcIP, event.DstPort)
	}
	if event.BytesOut != 48211 || event.BytesIn != 98123 {
		t.Fatalf("bytes = %d/%d", event.BytesOut, event.BytesIn)
	}
	if event.App != "Microsoft.365" || event.User != "agomez" {
		t.Fatalf("app/usuario = %s/%s", event.App, event.User)
	}
	if event.DeviceID != "FGT60FTK21089123" {
		t.Fatalf("devid = %s: sin él no se sabe qué equipo lo envió", event.DeviceID)
	}

	want := time.Date(2026, 9, 1, 10, 15, 22, 0, time.UTC)
	if !event.Timestamp.Equal(want) {
		t.Fatalf("marca de tiempo = %s, se esperaba la del equipo %s", event.Timestamp, want)
	}
}

func TestParseDeniedLineWithoutPriorityPrefix(t *testing.T) {
	adapter := &Adapter{}

	event, ok := adapter.ParseLog([]byte(deniedLine))
	if !ok {
		t.Fatal("la línea denegada debería reconocerse")
	}
	if event.Action != "deny" {
		t.Fatalf("acción = %s, se esperaba deny", event.Action)
	}
	if event.SrcCountry != "Netherlands" {
		t.Fatalf("país = %s", event.SrcCountry)
	}
}

func TestParseIPSUsesUtmAction(t *testing.T) {
	adapter := &Adapter{}

	event, ok := adapter.ParseLog([]byte(ipsLine))
	if !ok {
		t.Fatal("la línea de IPS debería reconocerse")
	}
	// `action=dropped` alone would read as a denial; `utmaction=blocked` is
	// what says the threat was actually stopped.
	if event.Type != "ips" || event.Action != "block" {
		t.Fatalf("tipo/acción = %s/%s, se esperaba ips/block", event.Type, event.Action)
	}
	if event.ThreatName != "Apache.Struts.RCE" {
		t.Fatalf("firma = %s", event.ThreatName)
	}
}

func TestParseQuotedValuesWithSpaces(t *testing.T) {
	adapter := &Adapter{}

	event, ok := adapter.ParseLog([]byte(adminLine))
	if !ok {
		t.Fatal("la línea de administración debería reconocerse")
	}
	if event.Type != "system" {
		t.Fatalf("tipo = %s, se esperaba system", event.Type)
	}
	if event.User != "admin" {
		t.Fatalf("usuario = %s: un valor entrecomillado con espacios no debe romper el resto", event.User)
	}
}

func TestParseRejectsUnknownFormat(t *testing.T) {
	adapter := &Adapter{}

	for _, line := range []string{
		"",
		"   ",
		"%ASA-6-302013: Built inbound TCP connection",
		"just some text without key values",
	} {
		if _, ok := adapter.ParseLog([]byte(line)); ok {
			t.Fatalf("no debería reconocer %q: una línea ajena se cuenta, no se adivina", line)
		}
	}
}

func TestParseKeyValueHandlesTrailingQuotedValue(t *testing.T) {
	fields := parseKeyValue(`a=1 b="two words" c=3`)

	if fields["a"] != "1" || fields["b"] != "two words" || fields["c"] != "3" {
		t.Fatalf("campos = %v", fields)
	}
}
