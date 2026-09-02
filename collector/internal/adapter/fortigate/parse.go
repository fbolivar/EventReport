// Package fortigate is the FortiGate adapter: the MVP brand (design section 5).
package fortigate

import (
	"strconv"
	"strings"
	"time"

	"github.com/fbolivar/eventreport/collector/internal/normalize"
)

// Adapter implements adapter.Adapter for FortiGate.
type Adapter struct {
	// Host and Token are used by the API side; parsing needs neither.
	Host  string
	Token string
	// Insecure skips TLS verification. A FortiGate out of the box answers with
	// a self-signed certificate, so this is on for many real installations —
	// but it is opt-in and never the default: the operator has to say it, and
	// the collector says it back in the log every time it connects.
	Insecure bool
	// HTTP is injected in tests so the adapter can be exercised without a
	// firewall on the other end.
	HTTP HTTPClient
}

func (a *Adapter) Brand() string { return "fortigate" }

// adminRules son las reglas que no se pueden juzgar sin ver las cuentas de
// administrador: MFA, hosts de confianza y número de superadministradores.
var adminRules = []string{"FW-002", "FW-003", "FW-004"}

// capabilitiesFor declara qué se pudo mirar de verdad en este firewall.
//
// Cuando el usuario de API no alcanza a ver los administradores, esas reglas
// salen como "no evaluable" y el informe lo dice, en vez de dar por bueno lo
// que nadie miró.
func (a *Adapter) capabilitiesFor(adminsOcultos bool) normalize.Capabilities {
	capabilities := a.Capabilities()
	if adminsOcultos {
		capabilities.AdminMFA = false
		capabilities.UnevaluableRules = append(capabilities.UnevaluableRules, adminRules...)
	}
	return capabilities
}

// Capabilities: FortiGate answers all 20 rules (section 15.4).
func (a *Adapter) Capabilities() normalize.Capabilities {
	return normalize.Capabilities{
		Config:           true,
		PolicyHitCount:   true,
		UTMProfiles:      true,
		Licenses:         true,
		AdminMFA:         true,
		VPNRemote:        true,
		Certificates:     true,
		TrafficBytes:     true,
		Identity:         true,
		Geo:              true,
		UnevaluableRules: []string{},
	}
}

// parseKeyValue splits a FortiGate log line into its key=value pairs.
//
// FortiGate quotes values that contain spaces and leaves the rest bare, so a
// naive split on spaces tears apart `msg="admin login failed"`. This walks the
// line once and respects the quotes.
func parseKeyValue(line string) map[string]string {
	fields := make(map[string]string, 24)

	for index := 0; index < len(line); {
		// Skip separators.
		for index < len(line) && line[index] == ' ' {
			index++
		}
		if index >= len(line) {
			break
		}

		equals := strings.IndexByte(line[index:], '=')
		if equals < 0 {
			break
		}
		key := line[index : index+equals]
		index += equals + 1

		var value string
		if index < len(line) && line[index] == '"' {
			index++
			end := strings.IndexByte(line[index:], '"')
			if end < 0 {
				value = line[index:]
				index = len(line)
			} else {
				value = line[index : index+end]
				index += end + 1
			}
		} else {
			end := strings.IndexByte(line[index:], ' ')
			if end < 0 {
				value = line[index:]
				index = len(line)
			} else {
				value = line[index : index+end]
				index += end
			}
		}

		fields[key] = value
	}

	return fields
}

// eventType maps FortiGate's own taxonomy onto ours.
func eventType(fields map[string]string) normalize.EventType {
	switch fields["type"] {
	case "traffic":
		return normalize.EventTraffic
	case "utm":
		switch fields["subtype"] {
		case "ips":
			return normalize.EventIPS
		case "virus":
			return normalize.EventAV
		case "webfilter":
			return normalize.EventWeb
		case "app-ctrl":
			return normalize.EventApp
		}
		return normalize.EventIPS
	case "event":
		switch fields["subtype"] {
		case "vpn":
			return normalize.EventVPN
		case "user":
			return normalize.EventVPN
		case "system":
			// FortiGate mete en "system" tanto un reinicio como el ingreso de
			// un administrador. Para el producto no es lo mismo: quién entra a
			// configurar el firewall es de las pocas cosas que interrumpen a
			// una persona (§6.4), y por eso se separa aquí.
			if isAdminActivity(fields) {
				return normalize.EventAdmin
			}
			return normalize.EventSystem
		}
		return normalize.EventSystem
	}
	return normalize.EventSystem
}

// isAdminActivity reconoce la actividad administrativa dentro de los eventos
// de sistema: ingreso a la consola y cambios de configuración.
func isAdminActivity(fields map[string]string) bool {
	description := strings.ToLower(fields["logdesc"])
	switch {
	case strings.Contains(description, "admin login"),
		strings.Contains(description, "admin logout"),
		strings.Contains(description, "configuration changed"),
		strings.Contains(description, "object attribute configured"):
		return true
	}
	// Algunas versiones no traen logdesc; el par (usuario, interfaz de
	// administración) es la otra señal fiable.
	return fields["user"] != "" && fields["ui"] != ""
}

// action reads `action` and, for UTM lines, `utmaction`, which is what
// actually says whether the threat was blocked.
func action(fields map[string]string) normalize.EventAction {
	if utm := fields["utmaction"]; utm != "" {
		switch utm {
		case "blocked", "block", "reset", "quarantine":
			return normalize.ActionBlock
		case "passthrough", "allow", "detected":
			return normalize.ActionAlert
		}
	}

	switch fields["action"] {
	case "accept", "allow", "start", "login", "success":
		return normalize.ActionAllow
	case "deny", "blocked", "block", "drop":
		return normalize.ActionDeny
	case "failure", "failed":
		return normalize.ActionAlert
	}

	return normalize.ActionAllow
}

// parseTime prefers the device's own timestamp; a line without one is stamped
// on reception, and the clock difference is what FW-015 watches.
func parseTime(fields map[string]string, received time.Time) time.Time {
	date, time0 := fields["date"], fields["time"]
	if date == "" || time0 == "" {
		return received
	}

	parsed, err := time.Parse("2006-01-02 15:04:05", date+" "+time0)
	if err != nil {
		return received
	}
	return parsed.UTC()
}

func atoi(value string) int {
	number, err := strconv.Atoi(value)
	if err != nil {
		return 0
	}
	return number
}

func atoi64(value string) int64 {
	number, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0
	}
	return number
}

// ParseLog turns a FortiGate syslog line into a normalized event.
//
// Returns false for anything that is not key=value with a `type` field: the
// pipeline counts those as unparsed instead of inventing an event.
func (a *Adapter) ParseLog(line []byte) (*normalize.Event, bool) {
	text := strings.TrimSpace(string(line))
	if text == "" {
		return nil, false
	}

	// Strip the syslog priority prefix ("<189>") if the sender includes it.
	if strings.HasPrefix(text, "<") {
		if end := strings.IndexByte(text, '>'); end > 0 && end < 6 {
			text = text[end+1:]
		}
	}

	fields := parseKeyValue(text)
	if fields["type"] == "" {
		return nil, false
	}

	event := &normalize.Event{
		Timestamp:  parseTime(fields, time.Now().UTC()),
		Type:       eventType(fields),
		Action:     action(fields),
		SrcIP:      fields["srcip"],
		SrcCountry: fields["srccountry"],
		SrcZone:    fields["srcintf"],
		DstIP:      fields["dstip"],
		DstPort:    atoi(fields["dstport"]),
		DstZone:    fields["dstintf"],
		Proto:      fields["proto"],
		PolicyID:   fields["policyid"],
		User:       fields["user"],
		SrcName:    fields["srcname"],
		SrcMAC:     fields["srcmac"],
		OSName:     fields["osname"],
		App:        fields["app"],
		Category:   fields["catdesc"],
		ThreatName: fields["attack"],
		Severity:   fields["severity"],
		BytesIn:    atoi64(fields["rcvdbyte"]),
		BytesOut:   atoi64(fields["sentbyte"]),
		DeviceID:   fields["devid"],
	}

	if event.ThreatName == "" {
		event.ThreatName = fields["virus"]
	}
	if event.Category == "" {
		event.Category = fields["cat"]
	}
	// `srcname` ya no se copia a `User`: era hacer pasar el nombre de un equipo
	// por una persona autenticada, y en un informe eso es una afirmación falsa.
	if event.User == "" {
		event.User = fields["unauthuser"]
	}

	return event, true
}
