import type { ChangeKind, ChangeSection } from "@eventreport/rules";

import { listConfigChanges } from "@/lib/data/changes";
import { getTenant, listFirewalls } from "@/lib/data/tenant";

/**
 * Informe de cambios de configuración (§8).
 *
 * Lo que un auditor pregunta primero: qué se tocó en el firewall durante el
 * período, cuándo y quién. Guardábamos snapshots desde el primer día sin
 * compararlos nunca; esto es lo que los vuelve evidencia.
 *
 * Sin modelo, como el hardening y el cumplimiento: es un registro, y un
 * registro que se redacta distinto cada vez no sirve de registro.
 */
export interface ChangeLine {
  ts: string;
  device: string;
  section: ChangeSection;
  kind: ChangeKind;
  target: string;
  fields: Array<{ field: string; before: string; after: string }>;
  actor?: string;
}

export interface ChangesReportInput {
  tenant: { name: string };
  period: { start: string; end: string };
  totals: { changes: number; withoutActor: number; bySection: Record<string, number> };
  lines: ChangeLine[];
  devices: Array<{ hostname: string; brand: string; firmware: string }>;
}

export async function buildChangesInput(
  tenantSlug: string,
  periodStart: string,
  periodEnd: string,
): Promise<ChangesReportInput | undefined> {
  const [tenant, firewalls, changes] = await Promise.all([
    getTenant(tenantSlug),
    listFirewalls(),
    listConfigChanges(periodStart, periodEnd),
  ]);
  if (!tenant) return undefined;

  const byId = new Map(firewalls.map((firewall) => [firewall.id, firewall]));

  const lines: ChangeLine[] = changes.map((change) => ({
    ts: change.ts,
    device: byId.get(change.firewallId)?.hostname ?? "equipo desconocido",
    section: change.section,
    kind: change.kind,
    target: change.target,
    fields: change.fields,
    actor: change.actor,
  }));

  const bySection: Record<string, number> = {};
  for (const line of lines) bySection[line.section] = (bySection[line.section] ?? 0) + 1;

  return {
    tenant: { name: tenant.name },
    period: { start: periodStart, end: periodEnd },
    totals: {
      changes: lines.length,
      withoutActor: lines.filter((line) => !line.actor).length,
      bySection,
    },
    lines,
    devices: firewalls.map((firewall) => ({
      hostname: firewall.hostname,
      brand: firewall.brand,
      firmware: firewall.firmware,
    })),
  };
}
