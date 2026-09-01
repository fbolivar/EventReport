/**
 * Normalized event and hourly aggregates (docs/diseno-tecnico.md sections 4.2 and 6.2).
 * Raw syslog lines never leave the collector; only these aggregates travel.
 */
import type { Severity, Timestamp } from "./common";

export const EVENT_TYPES = [
  "traffic",
  "ips",
  "av",
  "web",
  "app",
  "vpn",
  "admin",
  "system",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

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

export type EventAction = "allow" | "deny" | "block" | "alert";

export interface FirewallEvent {
  ts: Timestamp;
  type: EventType;
  action: EventAction;
  srcIp?: string;
  srcCountry?: string;
  srcZone?: string;
  dstIp?: string;
  dstPort?: number;
  dstZone?: string;
  proto?: string;
  policyId?: string;
  user?: string;
  app?: string;
  category?: string;
  threatName?: string;
  severity?: Severity;
  bytesIn?: number;
  bytesOut?: number;
  rawHash?: string;
}

/** One row of `rollups_hourly`: counters per type x action. */
export interface HourlyRollup {
  firewallId: string;
  /** Start of the hour, UTC. */
  hour: Timestamp;
  type: EventType;
  action: EventAction;
  count: number;
  bytesIn: number;
  bytesOut: number;
}

export const TOPN_DIMENSIONS = [
  "src_country",
  "src_ip_denied",
  "dst_ip",
  "dst_port",
  "app",
  "web_category",
  "vpn_user",
  "ips_signature",
  "policy",
] as const;

export type TopNDimension = (typeof TOPN_DIMENSIONS)[number];

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

/** One row of `rollups_topn`. */
export interface TopNRollup {
  firewallId: string;
  hour: Timestamp;
  dimension: TopNDimension;
  key: string;
  count: number;
  bytes: number;
}

/** Data-quality counters reported by the collector heartbeat (section 6.7). */
export interface CollectorHealth {
  version: string;
  lastSeenAt: Timestamp;
  status: "active" | "stale" | "offline" | "measuring";
  eps: number;
  droppedPct: number;
  queueDepth: number;
  diskFreeGb: number;
  clockSkewSeconds: number;
  vaultDays: 0 | 7 | 15 | 30;
}
