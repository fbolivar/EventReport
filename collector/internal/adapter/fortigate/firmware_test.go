package fortigate

import "testing"

// El alcance de lo probado es una afirmación del producto, no un detalle.
func TestClasificaLaVersionDelFirmware(t *testing.T) {
	casos := map[string]string{
		"v7.4.12": FirmwareVerified, // el equipo contra el que se probó
		"7.4.0":   FirmwareVerified,
		"v7.6.1":  FirmwareExpected, // misma generación de API, sin verificar
		"v7.0.14": FirmwareExpected,
		"v6.4.9":  FirmwareUntested, // otra generación: campos renombrados
		"v8.0.0":  FirmwareUntested,
		"":        FirmwareUntested,
		"raro":    FirmwareUntested,
	}

	for version, esperado := range casos {
		if got := firmwareSupport(version); got != esperado {
			t.Errorf("%q: esperaba %q, obtuvo %q", version, esperado, got)
		}
	}
}

// Y viaja en el snapshot, que es lo que lee el portal.
func TestElSnapshotDiceHastaDondeSeProbo(t *testing.T) {
	adapter := &Adapter{Host: "https://192.168.0.1", Token: "x", HTTP: firewallCompleto()}

	config, err := adapter.FetchConfig(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if config.Capabilities.FirmwareSupport != FirmwareVerified {
		t.Errorf("alcance = %q", config.Capabilities.FirmwareSupport)
	}
}
