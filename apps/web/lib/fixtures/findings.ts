/**
 * Hallazgos de ejemplo. Pasan por los mismos tipos que usará Supabase, así que
 * conectar la BD no toca ningún componente. El conjunto completo del tenant
 * (14 abiertos, 3 resueltos) se arma en el bloque del portal.
 */
import type { Finding, RuleRemediation } from "@eventreport/schema";

export const DEMO_FINDINGS: Finding[] = [
  {
    id: "fnd-001",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-001",
    assetKey: "wan1",
    assetLabel: "Interfaz wan1",
    status: "open",
    severity: "critical",
    firstSeen: "2026-06-14T09:12:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Interfaz", value: "wan1 · 190.85.44.12" },
      { label: "Protocolos habilitados", value: "https, ssh, ping" },
      { label: "Intentos de acceso en 30 días", value: "4.812" },
    ],
  },
  {
    id: "fnd-002",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-011",
    assetKey: "sslvpn",
    assetLabel: "Portal SSL-VPN",
    status: "open",
    severity: "high",
    firstSeen: "2026-06-14T09:12:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Tipo", value: "ssl · tls 1.2" },
      { label: "Usuarios habilitados", value: "38" },
      { label: "Segundo factor", value: "no configurado" },
    ],
  },
  {
    id: "fnd-003",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-008",
    assetKey: "policy:14",
    assetLabel: "Política 14 — LAN a internet",
    status: "open",
    severity: "medium",
    firstSeen: "2026-07-02T11:40:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Política", value: "id 14 · LAN_to_WAN" },
      { label: "Registro", value: "log=none" },
      { label: "Sesiones en 30 días", value: "1.204.881" },
    ],
  },
  {
    id: "fnd-004",
    firewallId: "fw-xgs-01",
    ruleCode: "FW-014",
    assetKey: "snmp",
    assetLabel: "Servicio SNMP",
    status: "open",
    severity: "low",
    firstSeen: "2026-08-03T15:05:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Versión", value: "v2c" },
      { label: "Comunidad", value: "public" },
    ],
  },
  {
    id: "fnd-005",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-013",
    assetKey: "cert:portal",
    assetLabel: "Certificado del portal",
    status: "resolved",
    severity: "medium",
    firstSeen: "2026-05-20T08:00:00Z",
    lastSeen: "2026-08-11T06:00:00Z",
    resolvedAt: "2026-08-12T14:22:00Z",
    evidence: [
      { label: "Emisor", value: "Let's Encrypt R11" },
      { label: "Vence", value: "2026-11-09" },
    ],
  },
];

/** `Remediation(ruleCode)` del adaptador: pasos concretos de la marca (§4.3). */
export const DEMO_REMEDIATIONS: RuleRemediation[] = [
  {
    ruleCode: "FW-001",
    brand: "fortigate",
    steps: [
      "Entra a Network › Interfaces y abre wan1.",
      "En Administrative Access desmarca HTTPS, SSH y PING.",
      "Si necesitas administrar desde fuera, deja solo HTTPS y agrega las IP de administración en System › Admin › Trusted Hosts.",
      "Confirma por CLI: config system interface, edit wan1, unset allowaccess.",
    ],
  },
  {
    ruleCode: "FW-011",
    brand: "fortigate",
    steps: [
      "Crea el servidor de segundo factor en User & Authentication › FortiToken o RADIUS.",
      "Asigna el token a cada usuario del grupo de VPN.",
      "En VPN › SSL-VPN Settings exige el grupo con MFA en Authentication/Portal Mapping.",
      "Prueba con una cuenta antes de cerrar el acceso al resto.",
    ],
  },
];
