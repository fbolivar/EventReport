/**
 * Etiquetas de interfaz para los códigos del contrato compartido.
 *
 * El paquete `@eventreport/schema` viaja al colector en Go y solo contiene
 * códigos; todo el texto en español vive aquí. Cambiar un nombre visible no
 * toca ningún componente ni el contrato.
 */
import type {
  Brand,
  ControlStatus,
  EventType,
  FrameworkCode,
  MemberRole,
  ReportType,
  RuleDomain,
  Severity,
  TopNDimension,
} from "@eventreport/schema";

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

/** Etiqueta del estado de un hallazgo resuelto; comparte color con `resolved`. */
export const RESOLVED_LABEL = "Resuelta";

export const FINDING_STATUS_LABELS = {
  open: "Abierto",
  resolved: "Resuelto",
  accepted: "Riesgo aceptado",
} as const;

export const BRAND_LABELS: Record<Brand, string> = {
  fortigate: "Fortinet FortiGate",
  sophos_xg: "Sophos XG/XGS",
  sonicwall: "SonicWall",
  mikrotik: "MikroTik RouterOS 7",
  panos: "Palo Alto PAN-OS",
  pfsense: "pfSense / OPNsense",
  watchguard: "WatchGuard Firebox",
  cisco_asa: "Cisco ASA / FTD",
  checkpoint: "Check Point",
  generic: "Genérico (configuración manual)",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  traffic: "Tráfico",
  ips: "IPS",
  av: "Antivirus",
  web: "Filtrado web",
  app: "Control de aplicaciones",
  vpn: "VPN",
  admin: "Administración",
  system: "Sistema",
};

export const TOPN_DIMENSION_LABELS: Record<TopNDimension, string> = {
  src_country: "Países de origen",
  src_ip_denied: "IP de origen denegadas",
  dst_ip: "Destinos",
  dst_port: "Puertos destino",
  app: "Aplicaciones",
  web_category: "Categorías web",
  vpn_user: "Usuarios VPN",
  ips_signature: "Firmas IPS",
  policy: "Políticas por volumen",
};

export const RULE_DOMAIN_LABELS: Record<RuleDomain, string> = {
  access: "Acceso administrativo",
  policy: "Políticas y NAT",
  vpn: "VPN y acceso remoto",
  crypto: "Cifrado y certificados",
  logging: "Registro y monitoreo",
  maintenance: "Mantenimiento y licencias",
};

export const CONTROL_STATUS_LABELS: Record<ControlStatus, string> = {
  compliant: "Cumple",
  non_compliant: "No cumple",
  partial: "Parcial",
  not_assessable: "No evaluable",
  not_applicable: "Fuera de alcance",
};

/** Qué significa cada estado, en el lenguaje del §15.2 del diseño técnico. */
export const CONTROL_STATUS_HINTS: Record<ControlStatus, string> = {
  compliant: "Todas las reglas asociadas están resueltas y son evaluables en esta marca.",
  non_compliant: "Al menos una regla asociada sigue abierta.",
  partial: "Algunas reglas están resueltas y otras no son evaluables en esta marca.",
  not_assessable: "Esta marca no expone los datos necesarios para evaluar el control.",
  not_applicable: "El cliente lo declaró fuera de alcance, con justificación registrada.",
};

export const FRAMEWORK_LABELS: Record<FrameworkCode, string> = {
  iso27001: "ISO/IEC 27001:2022",
  cis_v8: "CIS Controls v8",
  pci_dss: "PCI DSS v4.0.1",
  hipaa: "HIPAA Security Rule",
  nist_800_53: "NIST SP 800-53 Rev. 5",
  cmmc_l2: "CMMC 2.0 nivel 2",
};

export const FRAMEWORK_SHORT_LABELS: Record<FrameworkCode, string> = {
  iso27001: "ISO 27001",
  cis_v8: "CIS v8",
  pci_dss: "PCI DSS",
  hipaa: "HIPAA",
  nist_800_53: "NIST 800-53",
  cmmc_l2: "CMMC 2.0",
};

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  mssp_admin: "Administrador MSSP",
  client_admin: "Administrador",
  client_viewer: "Lectura",
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  executive: "Ejecutivo de postura",
  hardening: "Hardening del firewall",
  activity: "Actividad de red",
  threats: "Amenazas",
  changes: "Cambios de configuración",
  compliance: "Cumplimiento",
  critical_events: "Eventos críticos",
  baseline: "Línea base",
};

export const COLLECTOR_STATUS_LABELS = {
  active: "Activo",
  measuring: "En medición",
  stale: "Sin datos recientes",
  offline: "Sin conexión",
} as const;

/**
 * Cómo se atribuyó una sesión. El orden es el de la escalera del colector: de
 * la certeza mayor a la menor.
 */
export const IDENTITY_KIND_LABELS = {
  user: "Usuario con sesión iniciada",
  host: "Equipo, por su nombre en la red",
  fingerprint: "Equipo, por su huella",
  address: "Dirección de red",
} as const;
