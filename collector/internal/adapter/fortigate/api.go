package fortigate

import (
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/fbolivar/eventreport/collector/internal/normalize"
)

// FortiGate REST API (design section 3): configuration is pulled every 4 to 24
// hours, and immediately when a change event arrives over syslog.
//
// The token stays in this process. What leaves is the normalized configuration
// with no secrets in it.

// HTTPClient is injected so tests can answer without a real firewall.
type HTTPClient interface {
	Do(request *http.Request) (*http.Response, error)
}

func (a *Adapter) client() HTTPClient {
	if a.HTTP != nil {
		return a.HTTP
	}

	transport := http.DefaultTransport.(*http.Transport).Clone()
	if a.Insecure {
		// Solo cuando el operador lo pidió: el certificado del equipo es
		// autofirmado y no hay forma de validarlo. La conexión sigue cifrada;
		// lo que se pierde es la garantía de con quién se está hablando, y por
		// eso conviene que el colector y el firewall estén en la misma red.
		transport.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	}

	return &http.Client{Timeout: 30 * time.Second, Transport: transport}
}

func (a *Adapter) get(ctx context.Context, path string, out any) error {
	endpoint := fmt.Sprintf("%s/api/v2/%s", strings.TrimRight(a.Host, "/"), strings.TrimLeft(path, "/"))

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+a.Token)

	response, err := a.client().Do(request)
	if err != nil {
		return fmt.Errorf("consultar %s: %w", path, err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("%s respondió %d", path, response.StatusCode)
	}

	return json.NewDecoder(response.Body).Decode(out)
}

// TestConnection checks credentials before enrolment finishes.
func (a *Adapter) TestConnection(ctx context.Context) error {
	var status struct {
		Results struct {
			Hostname string `json:"hostname"`
		} `json:"results"`
	}

	if err := a.get(ctx, "monitor/system/status", &status); err != nil {
		return err
	}
	if status.Results.Hostname == "" {
		return fmt.Errorf("el equipo respondió sin hostname: ¿es un FortiGate?")
	}
	return nil
}

// Wire shapes of the endpoints this adapter reads. Only the fields the rules
// need are modelled; the rest of the response is ignored on purpose.
// systemStatus refleja la respuesta real de `monitor/system/status`.
//
// FortiOS devuelve la **serie y la versión en la raíz** de la respuesta, no
// dentro de `results`. Un FortiGate 40F de verdad se registró sin serie ni
// firmware por leerlos en el sitio equivocado, y las pruebas no lo vieron
// porque el simulador los ponía donde el código los esperaba. Se leen de los
// dos lugares: distintas versiones y modelos difieren.
type systemStatus struct {
	Serial  string `json:"serial"`
	Version string `json:"version"`
	Build   int    `json:"build"`
	Results struct {
		Hostname string `json:"hostname"`
		Serial   string `json:"serial"`
		Model    string `json:"model"`
		Version  string `json:"version"`
		Uptime   int64  `json:"uptime"`
		HAMode   string `json:"ha_mode"`
	} `json:"results"`
}

// serial y firmware prefieren la raíz y caen a `results` si no está.
func (s systemStatus) serial() string {
	if s.Serial != "" {
		return s.Serial
	}
	return s.Results.Serial
}

func (s systemStatus) firmware() string {
	if s.Version != "" {
		return s.Version
	}
	return s.Results.Version
}

type adminAccount struct {
	Name          string `json:"name"`
	Accprofile    string `json:"accprofile"`
	TwoFactor     string `json:"two-factor"`
	TrustedHosts  string `json:"trusthost1"`
	TrustedHosts2 string `json:"trusthost2"`
}

type systemInterface struct {
	Name        string `json:"name"`
	IP          string `json:"ip"`
	Role        string `json:"role"`
	AllowAccess string `json:"allowaccess"`
	VLANID      int    `json:"vlanid"`
}

type firewallPolicy struct {
	PolicyID int    `json:"policyid"`
	Name     string `json:"name"`
	Status   string `json:"status"`
	Action   string `json:"action"`
	Logtraf  string `json:"logtraffic"`
	SrcIntf  []struct {
		Name string `json:"name"`
	} `json:"srcintf"`
	DstIntf []struct {
		Name string `json:"name"`
	} `json:"dstintf"`
	SrcAddr []struct {
		Name string `json:"name"`
	} `json:"srcaddr"`
	DstAddr []struct {
		Name string `json:"name"`
	} `json:"dstaddr"`
	Service []struct {
		Name string `json:"name"`
	} `json:"service"`

	IPSSensor    string `json:"ips-sensor"`
	AVProfile    string `json:"av-profile"`
	WebFilter    string `json:"webfilter-profile"`
	AppList      string `json:"application-list"`
	SSLSSHProfil string `json:"ssl-ssh-profile"`
}

func yes(value string) bool { return value == "enable" }

// splitList devuelve **siempre** una lista, nunca nil.
//
// En Go una lista nil se serializa como `null`, y del otro lado el motor de
// reglas hacía `.length` sobre eso: la evaluación entera reventaba porque un
// administrador no tenía hosts de confianza. Una lista vacía y la ausencia de
// lista significan lo mismo aquí, así que solo debe viajar una de las dos.
func splitList(value string) []string {
	if value == "" {
		return []string{}
	}
	parts := strings.Fields(value)
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}

// names devuelve siempre una lista: ver el comentario de splitList.
func names(list []struct {
	Name string `json:"name"`
}) []string {
	out := make([]string, 0, len(list))
	for _, item := range list {
		out = append(out, item.Name)
	}
	return out
}

// interfaceRole maps FortiGate's role onto the normalized one.
func interfaceRole(role, name string) string {
	switch role {
	case "wan":
		return "wan"
	case "lan":
		return "lan"
	case "dmz":
		return "dmz"
	}
	if strings.HasPrefix(name, "wan") || strings.HasPrefix(name, "ppp") {
		return "wan"
	}
	return "lan"
}

// FetchConfig pulls the configuration and normalizes it (section 4.1).
func (a *Adapter) FetchConfig(ctx context.Context) (*normalize.Config, error) {
	var status systemStatus
	if err := a.get(ctx, "monitor/system/status", &status); err != nil {
		return nil, err
	}

	var admins struct {
		Results []adminAccount `json:"results"`
	}
	if err := a.get(ctx, "cmdb/system/admin", &admins); err != nil {
		return nil, err
	}

	var interfaces struct {
		Results []systemInterface `json:"results"`
	}
	if err := a.get(ctx, "cmdb/system/interface", &interfaces); err != nil {
		return nil, err
	}

	var policies struct {
		Results []firewallPolicy `json:"results"`
	}
	if err := a.get(ctx, "cmdb/firewall/policy", &policies); err != nil {
		return nil, err
	}

	// Las listas arrancan vacías, no nil: en Go una lista nil se serializa como
	// `null` y el otro lado espera un arreglo. Un firewall sin túneles VPN debe
	// enviar `[]`, no `null`.
	config := &normalize.Config{
		SchemaVersion: normalize.SchemaVersion,
		CollectedAt:   time.Now().UTC().Format(time.RFC3339),
		Capabilities:  a.Capabilities(),
		Admins:        []normalize.Admin{},
		MgmtAccess:    []normalize.ManagementAccess{},
		Interfaces:    []normalize.Interface{},
		Policies:      []normalize.Policy{},
		NAT:           []normalize.NATRule{},
		Certs:         []normalize.Certificate{},
		Licenses:      []normalize.License{},
		VPN:           normalize.VPN{IPsec: []normalize.IPsecTunnel{}},
		Services: normalize.Services{
			NTP:           []string{},
			DNS:           []string{},
			SyslogTargets: []string{},
		},
		Device: normalize.Device{
			Brand:         a.Brand(),
			Model:         status.Results.Model,
			Serial:        status.serial(),
			Firmware:      status.firmware(),
			Hostname:      status.Results.Hostname,
			HAMode:        haMode(status.Results.HAMode),
			UptimeSeconds: status.Results.Uptime,
		},
	}

	for _, admin := range admins.Results {
		trusted := append(splitList(admin.TrustedHosts), splitList(admin.TrustedHosts2)...)
		// 0.0.0.0 0.0.0.0 is FortiGate's way of saying "from anywhere", which
		// is exactly what FW-003 looks for: it is not a restriction.
		if len(trusted) > 0 && trusted[0] == "0.0.0.0" {
			trusted = nil
		}

		config.Admins = append(config.Admins, normalize.Admin{
			Name:         admin.Name,
			Profile:      profile(admin.Accprofile),
			MFA:          admin.TwoFactor != "" && admin.TwoFactor != "disable",
			TrustedHosts: trusted,
		})
	}

	for _, iface := range interfaces.Results {
		role := interfaceRole(iface.Role, iface.Name)
		protocols := splitList(strings.ReplaceAll(iface.AllowAccess, ",", " "))

		config.Interfaces = append(config.Interfaces, normalize.Interface{
			Name: iface.Name,
			Zone: role,
			Role: role,
			IP:   firstField(iface.IP),
			VLAN: iface.VLANID,
		})
		config.MgmtAccess = append(config.MgmtAccess, normalize.ManagementAccess{
			InterfaceName: iface.Name,
			IsWAN:         role == "wan",
			Protocols:     protocols,
		})
	}

	for position, policy := range policies.Results {
		config.Policies = append(config.Policies, normalize.Policy{
			ID:       fmt.Sprintf("%d", policy.PolicyID),
			Name:     policy.Name,
			Position: position + 1,
			Enabled:  yes(policy.Status),
			SrcZones: names(policy.SrcIntf),
			DstZones: names(policy.DstIntf),
			Src:      names(policy.SrcAddr),
			Dst:      names(policy.DstAddr),
			Services: names(policy.Service),
			Action:   policyAction(policy.Action),
			Log:      logMode(policy.Logtraf),
			Profiles: normalize.SecurityProfiles{
				IPS:        policy.IPSSensor != "",
				AV:         policy.AVProfile != "",
				Web:        policy.WebFilter != "",
				AppCtl:     policy.AppList != "",
				SSLInspect: policy.SSLSSHProfil != "" && policy.SSLSSHProfil != "no-inspection",
			},
		})
	}

	config.SHA256 = fingerprint(config)
	return config, nil
}

func haMode(value string) string {
	switch value {
	case "a-p", "active-passive":
		return "active_passive"
	case "a-a", "active-active":
		return "active_active"
	}
	return "standalone"
}

func profile(value string) string {
	switch value {
	case "super_admin", "prof_admin":
		return "super"
	case "readonly", "read":
		return "readonly"
	}
	return "readwrite"
}

func policyAction(value string) string {
	if value == "accept" {
		return "allow"
	}
	return "deny"
}

func logMode(value string) string {
	switch value {
	case "all":
		return "all"
	case "utm":
		return "security"
	}
	return "none"
}

// fingerprint is the sha256 the cloud compares to decide whether it needs the
// body at all (section 6.7). Computed over the normalized shape, so a cosmetic
// difference in the brand's response does not look like a change.
func fingerprint(config *normalize.Config) string {
	copy := *config
	copy.CollectedAt = ""
	copy.SHA256 = ""

	raw, err := json.Marshal(copy)
	if err != nil {
		return ""
	}

	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

// firstField takes the address out of FortiGate's "ip mask" pair, tolerating
// an empty value on an interface with no address.
func firstField(value string) string {
	fields := strings.Fields(value)
	if len(fields) == 0 {
		return ""
	}
	return fields[0]
}
