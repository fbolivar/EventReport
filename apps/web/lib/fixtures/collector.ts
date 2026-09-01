/**
 * Estado del colector tal como llega en el heartbeat (§6.7).
 */
import type { CollectorHealth } from "@eventreport/schema";

export const DEMO_COLLECTOR_HEALTH: CollectorHealth = {
  version: "0.4.2",
  lastSeenAt: "2026-08-31T02:56:00Z",
  status: "active",
  eps: 118,
  droppedPct: 0.2,
  queueDepth: 1_240,
  diskFreeGb: 62,
  clockSkewSeconds: 3,
  vaultDays: 30,
};

export const DEMO_COLLECTOR_DEGRADED: CollectorHealth = {
  version: "0.4.1",
  lastSeenAt: "2026-08-30T18:10:00Z",
  status: "stale",
  eps: 0,
  droppedPct: 2.7,
  queueDepth: 50_000,
  diskFreeGb: 3,
  clockSkewSeconds: 94,
  vaultDays: 7,
};
