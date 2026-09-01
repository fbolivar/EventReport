/**
 * Hallazgos del tenant de ejemplo: 14 abiertos y 3 resueltos, repartidos entre
 * los dos firewalls. Pasan por los mismos tipos que usará Supabase, así que
 * conectar la BD no toca ningún componente.
 */
import type { Finding, RuleRemediation, Severity } from "@eventreport/schema";

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
    ruleCode: "FW-006",
    assetKey: "policy:3",
    assetLabel: "Política 3 — Servidores",
    status: "open",
    severity: "critical",
    firstSeen: "2026-07-19T18:03:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Política", value: "id 3 · SRV_ANY" },
      { label: "Origen y destino", value: "any → any" },
      { label: "Servicios", value: "ALL" },
      { label: "Creada por", value: 'admin desde 10.10.0.34' },
    ],
  },
  {
    id: "fnd-004",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-002",
    assetKey: "admin:soporte",
    assetLabel: "Cuenta soporte",
    status: "open",
    severity: "high",
    firstSeen: "2026-05-18T14:30:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Cuenta", value: "soporte · perfil super_admin" },
      { label: "Último ingreso", value: "2026-08-29 08:11" },
      { label: "Segundo factor", value: "deshabilitado" },
    ],
  },
  {
    id: "fnd-005",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-010",
    assetKey: "nat:vip-rdp",
    assetLabel: "NAT entrante a escritorio remoto",
    status: "open",
    severity: "high",
    firstSeen: "2026-06-30T11:47:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Publicado", value: "190.85.44.12:3389 → 10.10.0.42:3389" },
      { label: "Origen permitido", value: "0.0.0.0/0" },
      { label: "Intentos fallidos en 30 días", value: "27.940" },
    ],
  },
  {
    id: "fnd-006",
    firewallId: "fw-xgs-01",
    ruleCode: "FW-005",
    assetKey: "firmware",
    assetLabel: "Firmware del equipo",
    status: "open",
    severity: "high",
    firstSeen: "2026-08-02T05:00:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Versión instalada", value: "19.5.3 MR-3" },
      { label: "CVE conocido", value: "CVE-2026-3199 · 8.8" },
      { label: "Versión con parche", value: "20.0.2 MR-2" },
    ],
  },
  {
    id: "fnd-007",
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
    id: "fnd-008",
    firewallId: "fw-xgs-01",
    ruleCode: "FW-009",
    assetKey: "policy:7",
    assetLabel: "Regla 7 — Planta a internet",
    status: "open",
    severity: "medium",
    firstSeen: "2026-06-21T09:00:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Regla", value: "id 7 · PLANTA_OUT" },
      { label: "Perfiles aplicados", value: "ninguno" },
      { label: "Tráfico en 30 días", value: "412 GB" },
    ],
  },
  {
    id: "fnd-009",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-007",
    assetKey: "policies:stale",
    assetLabel: "11 políticas sin tráfico",
    status: "open",
    severity: "medium",
    firstSeen: "2026-05-18T14:30:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Políticas", value: "id 8, 12, 19, 21, 22, 27, 31, 33, 36, 40, 44" },
      { label: "Último tráfico", value: "sin registros en 90 días" },
    ],
  },
  {
    id: "fnd-010",
    firewallId: "fw-xgs-01",
    ruleCode: "FW-016",
    assetKey: "license:webprotection",
    assetLabel: "Licencia de protección web",
    status: "open",
    severity: "medium",
    firstSeen: "2026-08-14T00:00:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Módulo", value: "Web Protection" },
      { label: "Vence", value: "2026-09-22" },
      { label: "Estado", value: "expiring" },
    ],
  },
  {
    id: "fnd-011",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-012",
    assetKey: "ipsec:sucursal",
    assetLabel: "Túnel IPsec a la planta",
    status: "open",
    severity: "medium",
    firstSeen: "2026-05-18T14:30:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Túnel", value: "VPN_MDE · peer 200.31.7.88" },
      { label: "Propuesta", value: "IKEv1 · 3DES · SHA1 · DH group 2" },
    ],
  },
  {
    id: "fnd-012",
    firewallId: "fw-fgt-01",
    ruleCode: "OP-002",
    assetKey: "critical-events",
    assetLabel: "Eventos críticos sin cerrar",
    status: "open",
    severity: "medium",
    firstSeen: "2026-08-21T10:00:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Eventos sin tratamiento", value: "6" },
      { label: "Más antiguo", value: "2026-08-21 10:42" },
    ],
  },
  {
    id: "fnd-013",
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
    id: "fnd-014",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-017",
    assetKey: "syslog-targets",
    assetLabel: "Destinos de registro",
    status: "open",
    severity: "low",
    firstSeen: "2026-05-18T14:30:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Destinos configurados", value: "10.10.0.9 (colector)" },
      { label: "Destino secundario", value: "ninguno" },
    ],
  },
  {
    id: "fnd-015",
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
  {
    id: "fnd-016",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-003",
    assetKey: "admin:admin",
    assetLabel: "Cuenta admin",
    status: "resolved",
    severity: "high",
    firstSeen: "2026-05-18T14:30:00Z",
    lastSeen: "2026-07-27T09:00:00Z",
    resolvedAt: "2026-07-28T15:10:00Z",
    evidence: [{ label: "Hosts de confianza", value: "10.10.0.0/24, 190.85.44.8/29" }],
  },
  {
    id: "fnd-017",
    firewallId: "fw-xgs-01",
    ruleCode: "FW-015",
    assetKey: "ntp",
    assetLabel: "Sincronización de reloj",
    status: "resolved",
    severity: "low",
    firstSeen: "2026-06-05T00:00:00Z",
    lastSeen: "2026-08-05T00:00:00Z",
    resolvedAt: "2026-08-06T11:00:00Z",
    evidence: [
      { label: "Servidores NTP", value: "co.pool.ntp.org, 1.co.pool.ntp.org" },
      { label: "Desfase actual", value: "3 s" },
    ],
  },
];

export const OPEN_FINDINGS = DEMO_FINDINGS.filter((finding) => finding.status === "open");

export function findingById(id: string): Finding | undefined {
  return DEMO_FINDINGS.find((finding) => finding.id === id);
}

export function openCountsBySeverity(): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of OPEN_FINDINGS) counts[finding.severity] += 1;
  return counts;
}

/** `Remediation(ruleCode)` del adaptador: pasos concretos de la marca (§4.3). */
export const DEMO_REMEDIATIONS: RuleRemediation[] = [
  {
    ruleCode: "FW-001",
    brand: "fortigate",
    steps: [
      "Entra a Network › Interfaces y abre la interfaz WAN señalada en el hallazgo.",
      "En Administrative Access desmarca HTTPS, SSH y PING.",
      "Si necesitas administrar desde fuera, deja solo HTTPS y agrega las IP de administración en System › Admin › Trusted Hosts.",
      "Confirma por CLI: config system interface, edit <interfaz>, unset allowaccess.",
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
  {
    ruleCode: "FW-006",
    brand: "fortigate",
    steps: [
      "Abre Policy & Objects › Firewall Policy y localiza la política señalada en el hallazgo.",
      "Reemplaza el origen y el destino any por los grupos de direcciones reales.",
      "Cambia el servicio ALL por los puertos que la aplicación necesita.",
      "Deja la política deshabilitada un día y revisa el contador de aciertos antes de borrarla.",
    ],
  },
  {
    ruleCode: "FW-009",
    brand: "sophos_xg",
    steps: [
      "Entra a Rules and policies › Firewall rules y abre la regla señalada en el hallazgo.",
      "En Security features activa IPS, protección web y control de aplicaciones.",
      "Selecciona los perfiles predeterminados de tu política de salida.",
      "Verifica el consumo de CPU la primera hora: la inspección agrega carga.",
    ],
  },
  {
    ruleCode: "FW-014",
    brand: "sophos_xg",
    steps: [
      "Ve a Administration › SNMP y elimina la comunidad public.",
      "Crea un usuario SNMPv3 con autenticación SHA y cifrado AES.",
      "Restringe el acceso a la IP del sistema de monitoreo.",
    ],
  },
];

export function remediationFor(ruleCode: string, brand: string): string[] | undefined {
  return DEMO_REMEDIATIONS.find(
    (item) => item.ruleCode === ruleCode && item.brand === brand,
  )?.steps;
}
