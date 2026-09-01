// Package normalize holds the multi-brand contract: every adapter maps its
// brand-specific data onto these types before anything else touches it.
//
// It mirrors packages/schema on the TypeScript side (design section 4). The
// JSON tags are the wire format the Edge Functions receive, so a change here
// is a change to the shared contract and bumps its version.
package normalize

import "time"

// EventType classifies a syslog line once it is parsed (section 4.2).
type EventType string

const (
	EventTraffic EventType = "traffic"
	EventIPS     EventType = "ips"
	EventAV      EventType = "av"
	EventWeb     EventType = "web"
	EventApp     EventType = "app"
	EventVPN     EventType = "vpn"
	EventAdmin   EventType = "admin"
	EventSystem  EventType = "system"
)

// EventAction is what the firewall did about it.
type EventAction string

const (
	ActionAllow EventAction = "allow"
	ActionDeny  EventAction = "deny"
	ActionBlock EventAction = "block"
	ActionAlert EventAction = "alert"
)

// Event is a syslog line from any brand, normalized. Fields a brand does not
// provide stay empty; aggregation and rules tolerate absence.
type Event struct {
	Timestamp  time.Time   `json:"ts"`
	Type       EventType   `json:"type"`
	Action     EventAction `json:"action"`
	SrcIP      string      `json:"srcIp,omitempty"`
	SrcCountry string      `json:"srcCountry,omitempty"`
	SrcZone    string      `json:"srcZone,omitempty"`
	DstIP      string      `json:"dstIp,omitempty"`
	DstPort    int         `json:"dstPort,omitempty"`
	DstZone    string      `json:"dstZone,omitempty"`
	Proto      string      `json:"proto,omitempty"`
	PolicyID   string      `json:"policyId,omitempty"`
	User       string      `json:"user,omitempty"`
	App        string      `json:"app,omitempty"`
	Category   string      `json:"category,omitempty"`
	ThreatName string      `json:"threatName,omitempty"`
	Severity   string      `json:"severity,omitempty"`
	BytesIn    int64       `json:"bytesIn,omitempty"`
	BytesOut   int64       `json:"bytesOut,omitempty"`

	// DeviceID identifies which firewall sent the line when several share a
	// collector (section 6.6).
	DeviceID string `json:"deviceId,omitempty"`
}

// Capabilities declares what an adapter can fill in. It travels with the
// configuration so the cloud knows which rules are evaluable for this brand
// and can say "not assessable" instead of assuming a pass (section 15.4).
type Capabilities struct {
	Config           bool     `json:"config"`
	PolicyHitCount   bool     `json:"policyHitCount"`
	UTMProfiles      bool     `json:"utmProfiles"`
	Licenses         bool     `json:"licenses"`
	AdminMFA         bool     `json:"adminMfa"`
	VPNRemote        bool     `json:"vpnRemote"`
	Certificates     bool     `json:"certificates"`
	TrafficBytes     bool     `json:"trafficBytes"`
	Identity         bool     `json:"identity"`
	Geo              bool     `json:"geo"`
	UnevaluableRules []string `json:"unevaluableRules"`
}

// Device, Admin, Policy and the rest mirror section 4.1. Only what the rules
// engine reads is modelled; anything else would be dead weight on the wire.
type Device struct {
	Brand         string `json:"brand"`
	Model         string `json:"model"`
	Serial        string `json:"serial"`
	Firmware      string `json:"firmware"`
	Hostname      string `json:"hostname"`
	HAMode        string `json:"haMode"`
	HAState       string `json:"haState,omitempty"`
	UptimeSeconds int64  `json:"uptimeSeconds"`
}

type Admin struct {
	Name         string   `json:"name"`
	Profile      string   `json:"profile"`
	MFA          bool     `json:"mfa"`
	TrustedHosts []string `json:"trustedHosts"`
	LastLogin    string   `json:"lastLogin,omitempty"`
}

type ManagementAccess struct {
	InterfaceName string   `json:"interfaceName"`
	IsWAN         bool     `json:"isWan"`
	Protocols     []string `json:"protocols"`
}

type Interface struct {
	Name string `json:"name"`
	Zone string `json:"zone"`
	Role string `json:"role"`
	IP   string `json:"ip,omitempty"`
	VLAN int    `json:"vlan,omitempty"`
}

type SecurityProfiles struct {
	IPS        bool `json:"ips"`
	AV         bool `json:"av"`
	Web        bool `json:"web"`
	AppCtl     bool `json:"appCtl"`
	SSLInspect bool `json:"sslInspect"`
}

type Policy struct {
	ID       string           `json:"id"`
	Name     string           `json:"name"`
	Position int              `json:"position"`
	Enabled  bool             `json:"enabled"`
	SrcZones []string         `json:"srcZones"`
	DstZones []string         `json:"dstZones"`
	Src      []string         `json:"src"`
	Dst      []string         `json:"dst"`
	Services []string         `json:"services"`
	Action   string           `json:"action"`
	Log      string           `json:"log"`
	Profiles SecurityProfiles `json:"profiles"`
	HitCount *int64           `json:"hitCount,omitempty"`
	LastHit  string           `json:"lastHit,omitempty"`
}

type NATRule struct {
	ID       string   `json:"id"`
	Type     string   `json:"type"`
	External string   `json:"external"`
	Internal string   `json:"internal"`
	Ports    []string `json:"ports"`
}

type IPsecTunnel struct {
	Name       string `json:"name"`
	Peer       string `json:"peer"`
	IKEVersion int    `json:"ikeVersion"`
	Encryption string `json:"encryption"`
	DHGroup    int    `json:"dhGroup"`
	Auth       string `json:"auth"`
}

type RemoteVPN struct {
	Type               string   `json:"type"`
	TLSMin             string   `json:"tlsMin,omitempty"`
	MFA                bool     `json:"mfa"`
	Users              int      `json:"users"`
	Groups             []string `json:"groups"`
	IdleTimeoutMinutes int      `json:"idleTimeoutMinutes,omitempty"`
}

type VPN struct {
	IPsec  []IPsecTunnel `json:"ipsec"`
	Remote *RemoteVPN    `json:"remote,omitempty"`
}

type Certificate struct {
	Name       string `json:"name"`
	Subject    string `json:"subject"`
	Issuer     string `json:"issuer"`
	NotAfter   string `json:"notAfter"`
	SelfSigned bool   `json:"selfSigned"`
	InUse      bool   `json:"inUse"`
}

type SNMP struct {
	Version          string `json:"version"`
	DefaultCommunity bool   `json:"defaultCommunity"`
}

type Services struct {
	NTP              []string `json:"ntp"`
	DNS              []string `json:"dns"`
	SyslogTargets    []string `json:"syslogTargets"`
	SNMP             *SNMP    `json:"snmp,omitempty"`
	ClockSkewSeconds int      `json:"clockSkewSeconds,omitempty"`
}

type License struct {
	Feature   string `json:"feature"`
	ExpiresAt string `json:"expiresAt"`
	Status    string `json:"status"`
}

// Config is the normalized configuration that travels to the cloud. It never
// carries credentials, pre-shared keys or SNMP communities: only whether they
// are weak (design rule, section 6.7).
type Config struct {
	SchemaVersion string             `json:"schemaVersion"`
	CollectedAt   string             `json:"collectedAt"`
	SHA256        string             `json:"sha256"`
	Capabilities  Capabilities       `json:"capabilities"`
	Device        Device             `json:"device"`
	Admins        []Admin            `json:"admins"`
	MgmtAccess    []ManagementAccess `json:"mgmtAccess"`
	Interfaces    []Interface        `json:"interfaces"`
	Policies      []Policy           `json:"policies"`
	NAT           []NATRule          `json:"nat"`
	VPN           VPN                `json:"vpn"`
	Certs         []Certificate      `json:"certs"`
	Services      Services           `json:"services"`
	Licenses      []License          `json:"licenses"`
}

// SchemaVersion of the contract this collector speaks.
const SchemaVersion = "1.0.0"
