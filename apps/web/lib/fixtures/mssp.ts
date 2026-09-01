/**
 * Vista de proveedor de servicio: los clientes de un MSSP en una tabla.
 * Solo lo que necesita alguien que administra varias empresas a la vez.
 */
import type { CollectorHealth, PlanCode } from "@eventreport/schema";

import { DEMO_SCORE } from "./posture.ts";
import { openCountsBySeverity } from "./findings.ts";

export interface MsspRow {
  tenantId: string;
  name: string;
  plan: PlanCode;
  score: number;
  scoreDelta: number;
  critical: number;
  high: number;
  firewalls: number;
  collectorStatus: CollectorHealth["status"];
  lastReport: string;
}

const counts = openCountsBySeverity();

export const DEMO_MSSP_ROWS: MsspRow[] = [
  {
    tenantId: "acme",
    name: "Acme S.A.S.",
    plan: "premium",
    score: DEMO_SCORE.value,
    scoreDelta: DEMO_SCORE.value - (DEMO_SCORE.previousValue ?? DEMO_SCORE.value),
    critical: counts.critical,
    high: counts.high,
    firewalls: 2,
    collectorStatus: "stale",
    lastReport: "2026-08-31T03:00:00Z",
  },
  {
    tenantId: "textiles-andinas",
    name: "Textiles Andinas",
    plan: "standard",
    score: 88,
    scoreDelta: 4,
    critical: 0,
    high: 1,
    firewalls: 1,
    collectorStatus: "active",
    lastReport: "2026-08-31T02:10:00Z",
  },
  {
    tenantId: "clinica-norte",
    name: "Clínica del Norte",
    plan: "premium",
    score: 61,
    scoreDelta: -3,
    critical: 3,
    high: 5,
    firewalls: 3,
    collectorStatus: "active",
    lastReport: "2026-08-31T02:22:00Z",
  },
  {
    tenantId: "log-express",
    name: "LogExpress Carga",
    plan: "basic",
    score: 47,
    scoreDelta: 0,
    critical: 4,
    high: 6,
    firewalls: 1,
    collectorStatus: "offline",
    lastReport: "2026-08-24T03:00:00Z",
  },
  {
    tenantId: "constructora-sur",
    name: "Constructora del Sur",
    plan: "standard",
    score: 72,
    scoreDelta: 11,
    critical: 1,
    high: 2,
    firewalls: 2,
    collectorStatus: "measuring",
    lastReport: "2026-08-31T01:48:00Z",
  },
];
