package aggregate

import (
	"testing"
	"time"

	"github.com/fbolivar/eventreport/collector/internal/normalize"
)

func sesion(event *normalize.Event) *normalize.Event {
	if event.Type == "" {
		event.Type = normalize.EventTraffic
	}
	if event.Action == "" {
		event.Action = normalize.ActionAllow
	}
	return event
}

// La escalera de atribución: cada escalón se usa solo si falta el anterior, y
// el resultado dice en cuál se quedó. Sin esto, el informe llamaría "usuario" a
// una dirección IP.
func TestLaIdentidadBajaPorLaEscalera(t *testing.T) {
	casos := []struct {
		nombre string
		event  *normalize.Event
		kind   IdentityKind
		label  string
	}{
		{
			"con sesión iniciada manda el usuario",
			&normalize.Event{User: "jperez", SrcName: "PC-01", SrcMAC: "aa:bb", SrcIP: "192.168.2.11"},
			KindUser, "jperez",
		},
		{
			"sin usuario, el nombre del equipo",
			&normalize.Event{SrcName: "PC-CONTABILIDAD", SrcMAC: "aa:bb", SrcIP: "192.168.2.11"},
			KindHost, "PC-CONTABILIDAD",
		},
		{
			"sin nombre, la huella con su sistema operativo",
			&normalize.Event{SrcMAC: "aa:bb:cc:dd:ee:ff", OSName: "Windows", SrcIP: "192.168.2.11"},
			KindPrint, "Windows · aa:bb:cc:dd:ee:ff",
		},
		{
			"al final, la dirección",
			&normalize.Event{SrcIP: "192.168.2.11"},
			KindAddress, "192.168.2.11",
		},
	}

	for _, caso := range casos {
		t.Run(caso.nombre, func(t *testing.T) {
			kind, _, label, ok := identityOf(caso.event)
			if !ok {
				t.Fatal("no atribuyó nada")
			}
			if kind != caso.kind {
				t.Errorf("escalón: esperaba %q, obtuvo %q", caso.kind, kind)
			}
			if label != caso.label {
				t.Errorf("etiqueta: esperaba %q, obtuvo %q", caso.label, label)
			}
		})
	}
}

// Un registro del propio firewall no es actividad de nadie.
func TestSinOrigenNoSeAtribuyeANadie(t *testing.T) {
	if _, _, _, ok := identityOf(&normalize.Event{Type: normalize.EventSystem}); ok {
		t.Fatal("atribuyó a alguien una línea sin origen")
	}
}

func TestAcumulaPermitidoDenegadoYBytesPorIdentidad(t *testing.T) {
	a := New()
	ahora := time.Date(2026, 9, 2, 14, 30, 0, 0, time.UTC)

	a.Add(sesion(&normalize.Event{DeviceID: "fw", User: "jperez", App: "HTTPS", BytesIn: 100, BytesOut: 50}), ahora)
	a.Add(sesion(&normalize.Event{DeviceID: "fw", User: "jperez", App: "HTTPS", BytesIn: 10, BytesOut: 5}), ahora)
	a.Add(sesion(&normalize.Event{DeviceID: "fw", User: "jperez", App: "DNS", Action: normalize.ActionDeny}), ahora)
	a.Add(sesion(&normalize.Event{DeviceID: "fw", SrcIP: "192.168.2.50", BytesIn: 1, BytesOut: 1}), ahora)

	horas := a.Open()
	if len(horas) != 1 {
		t.Fatalf("esperaba una hora, obtuvo %d", len(horas))
	}

	identidades := horas[0].Identities
	if len(identidades) != 2 {
		t.Fatalf("esperaba dos identidades, obtuvo %d", len(identidades))
	}

	// Ordenadas por tráfico: jperez primero.
	primera := identidades[0]
	if primera.Label != "jperez" {
		t.Fatalf("esperaba jperez primero, obtuvo %q", primera.Label)
	}
	if primera.Sessions != 3 || primera.Allowed != 2 || primera.Denied != 1 {
		t.Errorf("sesiones %d permitidas %d denegadas %d", primera.Sessions, primera.Allowed, primera.Denied)
	}
	if primera.BytesIn != 110 || primera.BytesOut != 55 {
		t.Errorf("bytes %d/%d", primera.BytesIn, primera.BytesOut)
	}

	var https bool
	for _, entry := range primera.Top {
		if entry.Dimension == DimApp && entry.Key == "HTTPS" && entry.Count == 2 {
			https = true
		}
	}
	if !https {
		t.Errorf("faltó el detalle de aplicaciones: %+v", primera.Top)
	}
}

// Una red ruidosa no puede inflar el envío sin límite.
func TestSeQuedanLasIdentidadesDeMasTrafico(t *testing.T) {
	a := New()
	ahora := time.Date(2026, 9, 2, 14, 0, 0, 0, time.UTC)

	for i := 0; i < IdentitiesPerHour+50; i++ {
		a.Add(sesion(&normalize.Event{
			DeviceID: "fw",
			SrcIP:    "10.0.0." + itoa(i),
			BytesIn:  int64(i),
		}), ahora)
	}

	identidades := a.Open()[0].Identities
	if len(identidades) != IdentitiesPerHour {
		t.Fatalf("esperaba %d identidades, obtuvo %d", IdentitiesPerHour, len(identidades))
	}
	if identidades[0].BytesIn != int64(IdentitiesPerHour+49) {
		t.Errorf("no conservó las de más tráfico: la primera trae %d bytes", identidades[0].BytesIn)
	}
}
