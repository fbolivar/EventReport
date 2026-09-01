/**
 * Comprobación manual de la redacción del informe (§8), con datos de ejemplo.
 * No entra en el build ni en las pruebas: gasta una llamada real al modelo.
 *
 *   node --experimental-strip-types --env-file=.env.local scripts/probe-report.ts
 *
 * Sin ANTHROPIC_API_KEY imprime la versión de plantilla, que es justamente lo
 * que se quiere comparar.
 */
import type { ReportInput } from "../lib/reports/input.ts";
import { writeSections } from "../lib/reports/sections.ts";

const input: ReportInput = {
  tenant: { name: "ACME Manufacturas", plan: "essential" },
  period: { start: "2026-08-02", end: "2026-09-01" },
  score: { value: 62, configuration: 55, operation: 71, delta: -4 },
  findings: {
    open: 12,
    bySeverity: { critical: 2, high: 5, medium: 4, low: 1 },
    resolvedInPeriod: 3,
    top: [
      {
        code: "FW-001",
        severity: "critical",
        title: "Administración expuesta en interfaz WAN",
        asset: "FGT60F-BOG",
        firstSeen: "2026-08-04T10:00:00Z",
        evidence: [{ label: "Interfaz", value: "wan1" }],
      },
      {
        code: "FW-006",
        severity: "critical",
        title: "Política de origen y destino abiertos con todos los servicios",
        asset: "FGT60F-BOG",
        firstSeen: "2026-08-06T10:00:00Z",
        evidence: [{ label: "Política", value: "3 — SRV_ANY" }],
      },
    ],
  },
  activity: {
    days: 30,
    allowed: 1284322,
    denied: 48211,
    blockedIps: 912,
    blockedWeb: 4310,
    bytes: 812000000000,
    bytesLabel: "756 GB",
  },
  compliance: [
    {
      framework: "iso27001",
      name: "ISO/IEC 27001:2022 Anexo A",
      totalControls: 93,
      assessable: 13,
      compliant: 8,
      nonCompliant: 5,
      partial: 0,
      notAssessable: 0,
    },
  ],
  criticalEvents: [
    {
      ts: "2026-08-31T02:42:00Z",
      severity: "critical",
      title: "Ingreso administrativo fuera de horario",
      treated: false,
    },
  ],
  devices: [{ hostname: "FGT60F-BOG", brand: "fortigate", firmware: "7.4.4", unevaluableRules: [] }],
};

console.log(JSON.stringify(await writeSections(input), null, 2));
