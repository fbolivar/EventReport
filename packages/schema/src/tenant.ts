/**
 * Tenant-side entities of the portal (docs/diseno-tecnico.md sections 9 and 10).
 */
import type { Brand, Capabilities, Timestamp } from "./common";
import type { CollectorHealth } from "./event";
import type { FrameworkCode } from "./compliance";

export type PlanCode = "basic" | "standard" | "premium";

export interface Plan {
  code: PlanCode;
  name: string;
  firewalls: number;
  configSnapshotsPerDay: number;
  rollupInterval: "daily" | "4h" | "hourly";
  criticalEventsPerDay: number;
  vaultDays: 0 | 7 | 30;
  evidenceRows: number;
  claudeTokensPerMonth: number;
  reports: string[];
}

export type MemberRole = "mssp_admin" | "client_admin" | "client_viewer";

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  mssp_admin: "Administrador MSSP",
  client_admin: "Administrador",
  client_viewer: "Lectura",
};

export interface Tenant {
  id: string;
  name: string;
  plan: PlanCode;
  frameworks: FrameworkCode[];
  createdAt: Timestamp;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: MemberRole;
  lastSeenAt?: Timestamp;
}

export interface Site {
  id: string;
  tenantId: string;
  name: string;
  city: string;
}

export interface Collector {
  id: string;
  siteId: string;
  name: string;
  health: CollectorHealth;
}

export interface Firewall {
  id: string;
  siteId: string;
  collectorId: string;
  brand: Brand;
  model: string;
  serial: string;
  firmware: string;
  hostname: string;
  haRole: "standalone" | "primary" | "secondary";
  capabilities: Capabilities;
}

export const REPORT_TYPES = [
  "executive",
  "hardening",
  "activity",
  "threats",
  "changes",
  "compliance",
  "critical_events",
  "baseline",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

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

export interface Report {
  id: string;
  tenantId: string;
  type: ReportType;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  status: "ready" | "generating" | "failed";
  generatedAt?: Timestamp;
  frameworkCode?: FrameworkCode;
  pages: number;
  sizeKb: number;
}
