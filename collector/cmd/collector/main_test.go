package main

import (
	"testing"

	"github.com/fbolivar/eventreport/collector/internal/config"
)

func TestUnreadableDeviceIsSkippedNotFatal(t *testing.T) {
	// El caso real: un equipo de un intento anterior, cifrado con otra frase.
	// Antes tumbaba la recolección entera y el cliente se quedaba sin datos
	// incluso de los equipos que sí abrían.
	viejo, err := config.Encrypt("token-viejo", "frase-vieja")
	if err != nil {
		t.Fatal(err)
	}
	nuevo, err := config.Encrypt("token-nuevo", "frase-nueva")
	if err != nil {
		t.Fatal(err)
	}

	file := &config.File{
		CollectorID: "c1",
		Devices: []config.Device{
			{FirewallID: "viejo", Brand: "fortigate", Host: "https://10.0.0.1", TokenEncrypted: viejo},
			{FirewallID: "nuevo", Brand: "fortigate", Host: "https://10.0.0.2", TokenEncrypted: nuevo},
		},
	}

	abiertos := 0
	for _, device := range file.Devices {
		if _, err := buildAdapter(device, "frase-nueva"); err == nil {
			abiertos++
		}
	}

	if abiertos != 1 {
		t.Fatalf("equipos abiertos = %d: el viejo se omite, el nuevo sigue", abiertos)
	}
}
