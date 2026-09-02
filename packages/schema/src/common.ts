/**
 * Shared primitives of the normalized multi-brand contract.
 * Design reference: docs/diseno-tecnico.md sections 4 and 5.
 */

/** Schema version. A breaking change bumps the major (see CLAUDE.md). */
export const SCHEMA_VERSION = "1.0.0" as const;

/** ISO 8601 timestamp, always UTC. */
export type Timestamp = string;

/** Brands with an adapter, planned or released (section 5). */
export const BRANDS = [
  "fortigate",
  "sophos_xg",
  "sonicwall",
  "mikrotik",
  "panos",
  "pfsense",
  "watchguard",
  "cisco_asa",
  "checkpoint",
  "generic",
] as const;

export type Brand = (typeof BRANDS)[number];

/**
 * What an adapter can fill in. Drives which rules are evaluable and, by
 * transitivity, which controls can be assessed (section 15.4).
 */
export interface Capabilities {
  config: boolean;
  policyHitCount: boolean;
  utmProfiles: boolean;
  licenses: boolean;
  adminMfa: boolean;
  vpnRemote: boolean;
  certificates: boolean;
  trafficBytes: boolean;
  identity: boolean;
  geo: boolean;
  /** Rule codes this brand cannot evaluate at all. */
  unevaluableRules: string[];
  /**
   * Hasta dónde llega lo comprobado contra hardware real para esta versión de
   * firmware. `expected` significa misma generación de API sin verificar;
   * `untested`, que los campos pueden haber cambiado de nombre —y un campo
   * renombrado no falla: se lee vacío, que es como aprobar sin mirar—.
   */
  firmwareSupport?: "verified" | "expected" | "untested";
}

export type Severity = "critical" | "high" | "medium" | "low";

export const SEVERITY_ORDER: readonly Severity[] = ["critical", "high", "medium", "low"];

/** Weights of the configuration component of the posture score (section 11). */
export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 1,
};
