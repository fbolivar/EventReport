package fortigate

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/fbolivar/eventreport/collector/internal/normalize"
)

// Lo que el adaptador no pedía, y por eso cinco reglas aprobaban a ciegas.
//
// El snapshot llevaba `certs`, `licenses`, `nat`, `vpn` y `dns/ntp` siempre
// vacíos —nadie los consultaba— y FW-010, FW-011, FW-012, FW-013 y FW-016
// evaluaban listas vacías: ningún hallazgo, ningún aviso, un aprobado limpio en
// el informe. Es el mismo fallo que las cuentas de administrador ocultas, cinco
// veces.
//
// Cada consulta va por separado y ninguna tumba el snapshot: un firewall que no
// deja leer sus certificados sigue aportando su configuración de políticas. Lo
// que no se pudo leer se declara en `UnevaluableRules`, no se da por bueno.

// fetchServices lee DNS y NTP.
func (a *Adapter) fetchServices(ctx context.Context) ([]string, []string) {
	dns := []string{}
	ntp := []string{}

	var dnsSetting struct {
		Results struct {
			Primary   string `json:"primary"`
			Secondary string `json:"secondary"`
		} `json:"results"`
	}
	if err := a.get(ctx, "cmdb/system/dns", &dnsSetting); err == nil {
		for _, server := range []string{dnsSetting.Results.Primary, dnsSetting.Results.Secondary} {
			if server != "" && server != "0.0.0.0" {
				dns = append(dns, server)
			}
		}
	}

	var ntpSetting struct {
		Results struct {
			Sync      string `json:"ntpsync"`
			Type      string `json:"type"`
			NTPServer []struct {
				Server string `json:"server"`
			} `json:"ntpserver"`
		} `json:"results"`
	}
	if err := a.get(ctx, "cmdb/system/ntp", &ntpSetting); err == nil {
		for _, server := range ntpSetting.Results.NTPServer {
			if server.Server != "" {
				ntp = append(ntp, server.Server)
			}
		}
		// FortiGuard es el servicio de hora del propio fabricante: sincroniza sin
		// que aparezca ningún servidor en la lista. Sin esta línea, un equipo con
		// la hora perfectamente sincronizada se reportaba como "sin NTP".
		if len(ntp) == 0 && strings.EqualFold(ntpSetting.Results.Sync, "enable") &&
			strings.EqualFold(ntpSetting.Results.Type, "fortiguard") {
			ntp = append(ntp, "fortiguard")
		}
	}

	return dns, ntp
}

// fetchIPsec lee los túneles y con qué se cifran.
func (a *Adapter) fetchIPsec(ctx context.Context) ([]normalize.IPsecTunnel, bool) {
	var phase1 struct {
		Results []struct {
			Name       string `json:"name"`
			RemoteGW   string `json:"remote-gw"`
			IKEVersion string `json:"ike-version"`
			AuthMethod string `json:"authmethod"`
			Proposal   string `json:"proposal"`
			DHGroup    string `json:"dhgrp"`
		} `json:"results"`
	}
	if err := a.get(ctx, "cmdb/vpn.ipsec/phase1-interface", &phase1); err != nil {
		return []normalize.IPsecTunnel{}, false
	}

	tunnels := make([]normalize.IPsecTunnel, 0, len(phase1.Results))
	for _, entry := range phase1.Results {
		tunnels = append(tunnels, normalize.IPsecTunnel{
			Name:       entry.Name,
			Peer:       entry.RemoteGW,
			IKEVersion: atoiDefault(entry.IKEVersion, 1),
			// La propuesta viene como "aes256-sha256 aes128-sha1": interesa la
			// primera, que es la que el equipo prefiere.
			Encryption: primero(entry.Proposal),
			DHGroup:    atoiDefault(primero(entry.DHGroup), 0),
			Auth:       entry.AuthMethod,
		})
	}
	return tunnels, true
}

// fetchRemoteVPN lee el acceso remoto por SSL.
func (a *Adapter) fetchRemoteVPN(ctx context.Context) *normalize.RemoteVPN {
	var settings struct {
		Results struct {
			Status        string `json:"status"`
			MinProtoVer   string `json:"ssl-min-proto-ver"`
			ReqClientCert string `json:"reqclientcert"`
			AuthRule      []struct {
				Groups []struct {
					Name string `json:"name"`
				} `json:"groups"`
			} `json:"authentication-rule"`
		} `json:"results"`
	}
	if err := a.get(ctx, "cmdb/vpn.ssl/settings", &settings); err != nil {
		return nil
	}
	if !strings.EqualFold(settings.Results.Status, "enable") {
		return nil
	}

	groups := []string{}
	for _, rule := range settings.Results.AuthRule {
		for _, group := range rule.Groups {
			groups = append(groups, group.Name)
		}
	}

	return &normalize.RemoteVPN{
		Type:   "ssl",
		TLSMin: settings.Results.MinProtoVer,
		// El certificado de cliente es lo único que la API expone como segundo
		// factor de verdad. El token de FortiToken vive en el grupo de usuarios y
		// se declara no evaluable en vez de suponer que no existe.
		MFA:    strings.EqualFold(settings.Results.ReqClientCert, "enable"),
		Groups: groups,
	}
}

// fetchNAT lee las publicaciones hacia dentro (VIP).
func (a *Adapter) fetchNAT(ctx context.Context) ([]normalize.NATRule, bool) {
	var vips struct {
		Results []struct {
			Name     string `json:"name"`
			Type     string `json:"type"`
			ExtIP    string `json:"extip"`
			ExtPort  string `json:"extport"`
			MappedIP []struct {
				Range string `json:"range"`
			} `json:"mappedip"`
			MappedPort  string `json:"mappedport"`
			PortForward string `json:"portforward"`
		} `json:"results"`
	}
	if err := a.get(ctx, "cmdb/firewall/vip", &vips); err != nil {
		return []normalize.NATRule{}, false
	}

	rules := make([]normalize.NATRule, 0, len(vips.Results))
	for _, entry := range vips.Results {
		internal := ""
		if len(entry.MappedIP) > 0 {
			internal = entry.MappedIP[0].Range
		}

		ports := []string{}
		if strings.EqualFold(entry.PortForward, "enable") && entry.ExtPort != "" {
			ports = append(ports, entry.ExtPort)
		}

		rules = append(rules, normalize.NATRule{
			ID:       entry.Name,
			Type:     entry.Type,
			External: entry.ExtIP,
			Internal: internal,
			Ports:    ports,
		})
	}
	return rules, true
}

// fetchCertificates lee los certificados del equipo.
//
// Solo los que no vienen de fábrica: los de Fortinet existen en todos los
// equipos, nadie los renueva y llenarían el informe de ruido.
func (a *Adapter) fetchCertificates(ctx context.Context) ([]normalize.Certificate, bool) {
	var available struct {
		Results []struct {
			Name      string `json:"name"`
			Source    string `json:"source"`
			ValidTo   any    `json:"valid_to"`
			Issuer    string `json:"issuer"`
			Subject   string `json:"subject"`
			IsBuiltIn bool   `json:"is_built_in"`
			Status    string `json:"status"`
		} `json:"results"`
	}
	if err := a.get(ctx, "monitor/system/available-certificates", &available); err != nil {
		return []normalize.Certificate{}, false
	}

	certs := make([]normalize.Certificate, 0, len(available.Results))
	for _, entry := range available.Results {
		if entry.IsBuiltIn || strings.EqualFold(entry.Source, "factory") {
			continue
		}
		certs = append(certs, normalize.Certificate{
			Name:     entry.Name,
			Subject:  entry.Subject,
			Issuer:   entry.Issuer,
			NotAfter: epochToDate(entry.ValidTo),
			// Un certificado cuyo emisor es él mismo es autofirmado: el navegador
			// del cliente avisará, y en un portal público eso es un hallazgo.
			SelfSigned: entry.Issuer != "" && entry.Issuer == entry.Subject,
			InUse:      true,
		})
	}
	return certs, true
}

// fetchLicenses lee el estado de las suscripciones de seguridad.
func (a *Adapter) fetchLicenses(ctx context.Context) ([]normalize.License, bool) {
	var status struct {
		Results map[string]struct {
			Status  string `json:"status"`
			Expires any    `json:"expires"`
		} `json:"results"`
	}
	if err := a.get(ctx, "monitor/license/status", &status); err != nil {
		return []normalize.License{}, false
	}

	licenses := make([]normalize.License, 0, len(status.Results))
	for feature, entry := range status.Results {
		if entry.Status == "" {
			continue
		}
		licenses = append(licenses, normalize.License{
			Feature:   feature,
			ExpiresAt: epochToDate(entry.Expires),
			Status:    entry.Status,
		})
	}
	return licenses, true
}

func primero(value string) string {
	fields := strings.Fields(strings.ReplaceAll(value, "-", " "))
	if len(fields) == 0 {
		return value
	}
	return fields[0]
}

func atoiDefault(value string, fallback int) int {
	number, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return fallback
	}
	return number
}

// epochToDate normaliza la fecha, que FortiOS devuelve como número de segundos
// unas veces y como texto otras.
func epochToDate(value any) string {
	switch v := value.(type) {
	case float64:
		if v <= 0 {
			return ""
		}
		return time.Unix(int64(v), 0).UTC().Format("2006-01-02")
	case string:
		return v
	default:
		return ""
	}
}
