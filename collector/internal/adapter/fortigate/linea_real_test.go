package fortigate

import "testing"

// Una línea tal cual la envía un FortiGate 40F con FortiOS 7.4.12.
const lineaReal = `<189>date=2026-09-01 time=19:34:04 devname="FW-GVM" devid="FGT40FTK2209B6QD" eventtime=1788309244137136078 tz="-0500" logid="0000000013" type="traffic" subtype="forward" level="notice" vd="root" srcip=192.168.2.11 srcport=36736 srcintf="lan3" srcintfrole="lan" dstip=13.107.228.24 dstport=443 dstintf="wan1" dstintfrole="wan" policyid=3 action="accept" sentbyte=1024 rcvdbyte=2048 service="HTTPS"`

func TestParseLogEntiendeUnaLineaDeVerdad(t *testing.T) {
	a := &Adapter{}
	event, ok := a.ParseLog([]byte(lineaReal))
	if !ok {
		t.Fatal("el parser no entendió una línea real de un FortiGate 7.4.12")
	}
	t.Logf("tipo=%q accion=%q src=%s dst=%s bytes=%d/%d",
		event.Type, event.Action, event.SrcIP, event.DstIP, event.BytesIn, event.BytesOut)
	if event.Type == "" {
		t.Error("sin tipo: no cuenta para ningún contador")
	}
}
