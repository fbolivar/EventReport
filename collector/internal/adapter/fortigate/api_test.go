package fortigate

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
)

// stubHTTP answers each API path with a canned FortiGate response, so the
// adapter can be exercised without a firewall.
type stubHTTP struct {
	responses map[string]string
}

func (s *stubHTTP) Do(request *http.Request) (*http.Response, error) {
	body, ok := s.responses[request.URL.Path]
	if !ok {
		return &http.Response{StatusCode: 404, Body: io.NopCloser(strings.NewReader(`{}`))}, nil
	}

	return &http.Response{
		StatusCode: 200,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     http.Header{"Content-Type": []string{"application/json"}},
	}, nil
}

func newStub() *stubHTTP {
	return &stubHTTP{responses: map[string]string{
		"/api/v2/monitor/system/status": `{"results":{"hostname":"FGT60F-BOG","serial":"FGT60FTK21089123",
			"model":"FortiGate-60F","version":"v7.4.4","uptime":1200000,"ha_mode":"standalone"}}`,
		"/api/v2/cmdb/system/admin": `{"results":[
			{"name":"admin","accprofile":"super_admin","two-factor":"fortitoken","trusthost1":"10.10.0.0 255.255.255.0"},
			{"name":"soporte","accprofile":"super_admin","two-factor":"disable","trusthost1":"0.0.0.0 0.0.0.0"}
		]}`,
		"/api/v2/cmdb/system/interface": `{"results":[
			{"name":"wan1","ip":"190.85.44.12 255.255.255.248","role":"wan","allowaccess":"ping https ssh"},
			{"name":"lan","ip":"10.10.0.1 255.255.255.0","role":"lan","allowaccess":"ping https"}
		]}`,
		"/api/v2/cmdb/firewall/policy": `{"results":[
			{"policyid":14,"name":"LAN_to_WAN","status":"enable","action":"accept","logtraffic":"all",
			 "srcintf":[{"name":"lan"}],"dstintf":[{"name":"wan1"}],
			 "srcaddr":[{"name":"LAN"}],"dstaddr":[{"name":"all"}],"service":[{"name":"HTTPS"}],
			 "ips-sensor":"default","av-profile":"default","webfilter-profile":"default","application-list":"default"},
			{"policyid":3,"name":"SRV_ANY","status":"enable","action":"accept","logtraffic":"disable",
			 "srcintf":[{"name":"lan"}],"dstintf":[{"name":"wan1"}],
			 "srcaddr":[{"name":"all"}],"dstaddr":[{"name":"all"}],"service":[{"name":"ALL"}]}
		]}`,
	}}
}

func TestFetchConfigNormalizesTheDevice(t *testing.T) {
	adapter := &Adapter{Host: "https://10.10.0.1", Token: "secreto", HTTP: newStub()}

	config, err := adapter.FetchConfig(context.Background())
	if err != nil {
		t.Fatalf("FetchConfig: %v", err)
	}

	if config.Device.Brand != "fortigate" || config.Device.Firmware != "v7.4.4" {
		t.Fatalf("dispositivo = %+v", config.Device)
	}
	if config.Device.HAMode != "standalone" {
		t.Fatalf("modo HA = %s", config.Device.HAMode)
	}
	if config.SchemaVersion == "" || config.SHA256 == "" {
		t.Fatal("el snapshot viaja con versión de esquema y huella")
	}
}

func TestTrustHostAnywhereCountsAsNoRestriction(t *testing.T) {
	adapter := &Adapter{Host: "https://10.10.0.1", HTTP: newStub()}

	config, err := adapter.FetchConfig(context.Background())
	if err != nil {
		t.Fatal(err)
	}

	var admin, soporte int
	for _, account := range config.Admins {
		switch account.Name {
		case "admin":
			admin = len(account.TrustedHosts)
			if !account.MFA {
				t.Fatal("admin tiene FortiToken: debería contar como MFA")
			}
		case "soporte":
			soporte = len(account.TrustedHosts)
			if account.MFA {
				t.Fatal("soporte tiene two-factor=disable")
			}
		}
	}

	if admin == 0 {
		t.Fatal("admin sí tiene hosts de confianza")
	}
	if soporte != 0 {
		t.Fatal("0.0.0.0 0.0.0.0 es «desde cualquier parte»: no es una restricción")
	}
}

func TestManagementAccessOnWANIsExposed(t *testing.T) {
	adapter := &Adapter{Host: "https://10.10.0.1", HTTP: newStub()}

	config, err := adapter.FetchConfig(context.Background())
	if err != nil {
		t.Fatal(err)
	}

	var isWAN bool
	var protocols []string
	for _, access := range config.MgmtAccess {
		if access.InterfaceName == "wan1" {
			isWAN = access.IsWAN
			protocols = access.Protocols
		}
	}

	if !isWAN {
		t.Fatal("wan1 debe marcarse como interfaz WAN: es lo que mira FW-001")
	}
	if len(protocols) != 3 {
		t.Fatalf("protocolos = %v", protocols)
	}
}

func TestPolicyWithoutProfilesIsReportedAsSuch(t *testing.T) {
	adapter := &Adapter{Host: "https://10.10.0.1", HTTP: newStub()}

	config, err := adapter.FetchConfig(context.Background())
	if err != nil {
		t.Fatal(err)
	}

	for _, policy := range config.Policies {
		switch policy.ID {
		case "14":
			if !policy.Profiles.IPS || policy.Log != "all" {
				t.Fatalf("política 14 = %+v", policy)
			}
		case "3":
			if policy.Profiles.IPS || policy.Profiles.AV || policy.Log != "none" {
				t.Fatalf("política 3 debería quedar sin inspección ni registro: %+v", policy)
			}
			if len(policy.Src) != 1 || policy.Src[0] != "all" {
				t.Fatalf("origen = %v", policy.Src)
			}
		}
	}
}

func TestFingerprintIgnoresCollectionTime(t *testing.T) {
	adapter := &Adapter{Host: "https://10.10.0.1", HTTP: newStub()}

	first, err := adapter.FetchConfig(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	second, err := adapter.FetchConfig(context.Background())
	if err != nil {
		t.Fatal(err)
	}

	if first.SHA256 != second.SHA256 {
		t.Fatal("dos lecturas iguales deben dar la misma huella: si no, se sube el cuerpo cada vez")
	}
}

func TestTestConnectionFailsOnNonFortigate(t *testing.T) {
	stub := newStub()
	stub.responses["/api/v2/monitor/system/status"] = `{"results":{}}`

	adapter := &Adapter{Host: "https://10.10.0.1", HTTP: stub}
	if err := adapter.TestConnection(context.Background()); err == nil {
		t.Fatal("una respuesta sin hostname no puede darse por buena")
	}
}

func TestConfigNeverCarriesNilLists(t *testing.T) {
	// En Go una lista nil se serializa como `null`, y el motor de reglas de la
	// nube hacía `.length` sobre eso: la evaluación entera reventaba por un
	// firewall sin túneles VPN. Esta prueba mira el JSON, que es lo que viaja.
	// Un equipo recién sacado de la caja: responde el estado y nada más. Es el
	// caso que rompía la nube, porque todo lo demás llegaba vacío.
	adapter := &Adapter{Host: "https://fw", Token: "t", HTTP: &bareHTTP{}}

	config, err := adapter.FetchConfig(context.Background())
	if err != nil {
		t.Fatal(err)
	}

	raw, err := json.Marshal(config)
	if err != nil {
		t.Fatal(err)
	}

	if strings.Contains(string(raw), ":null") {
		t.Fatalf("el snapshot contiene null: %s", raw)
	}
}

// bareHTTP imita un equipo recién configurado: responde el estado y devuelve
// listas vacías en todo lo demás, que es lo que hace un FortiGate de verdad
// —no un 404—.
type bareHTTP struct{}

func (b *bareHTTP) Do(request *http.Request) (*http.Response, error) {
	body := `{"results":[]}`
	if strings.HasSuffix(request.URL.Path, "monitor/system/status") {
		body = `{"results":{"hostname":"FGT40F-NEW","serial":"FGT40FTK00000001",` +
			`"model":"FortiGate-40F","version":"v7.4.4","ha_mode":"standalone"}}`
	}
	if strings.Contains(request.URL.Path, "vpn.ssl/settings") ||
		strings.Contains(request.URL.Path, "system/ntp") ||
		strings.Contains(request.URL.Path, "log/setting") {
		body = `{"results":{}}`
	}

	return &http.Response{
		StatusCode: 200,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     http.Header{"Content-Type": []string{"application/json"}},
	}, nil
}
