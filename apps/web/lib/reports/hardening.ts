import type { Brand, Severity } from "@eventreport/schema";

import { listFindings, remediationFor, rulesByCode } from "@/lib/data/findings";
import { getTenant, listFirewalls } from "@/lib/data/tenant";

/**
 * Informe de hardening (docs/diseno-tecnico.md §8): todos los hallazgos con su
 * evidencia y la remediación de la marca.
 *
 * A diferencia del ejecutivo, aquí **no interviene el modelo**. El destinatario
 * es quien va a ejecutar los pasos en el equipo, y esos pasos vienen del
 * catálogo `rule_remediations` tal como están escritos: un procedimiento que
 * cambia de redacción entre dos informes no se puede auditar ni seguir.
 */
export interface HardeningItem {
  code: string;
  severity: Severity;
  title: string;
  description: string;
  asset: string;
  brand: Brand;
  firstSeen: string;
  evidence: Array<{ label: string; value: string }>;
  /** Pasos de la marca. Vacío cuando el catálogo todavía no la cubre. */
  steps: string[];
}

export interface HardeningInput {
  tenant: { name: string };
  period: { start: string; end: string };
  counts: Record<Severity, number>;
  items: HardeningItem[];
  /** Equipos incluidos, para que el técnico sepa a qué se aplica. */
  devices: Array<{ hostname: string; brand: Brand; firmware: string }>;
}

const ORDER: Severity[] = ["critical", "high", "medium", "low"];

export async function buildHardeningInput(
  tenantSlug: string,
  periodStart: string,
  periodEnd: string,
): Promise<HardeningInput | undefined> {
  const [tenant, findings, rules, firewalls] = await Promise.all([
    getTenant(tenantSlug),
    listFindings(),
    rulesByCode(),
    listFirewalls(),
  ]);
  if (!tenant) return undefined;

  const open = findings
    .filter((finding) => finding.status === "open")
    .sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));

  const items = await Promise.all(
    open.map(async (finding) => {
      const firewall = firewalls.find((item) => item.id === finding.firewallId);
      const brand: Brand = firewall?.brand ?? "fortigate";
      const rule = rules[finding.ruleCode];

      return {
        code: finding.ruleCode,
        severity: finding.severity,
        title: rule?.title ?? finding.ruleCode,
        description: rule?.description ?? "",
        asset: finding.assetLabel,
        brand,
        firstSeen: finding.firstSeen,
        evidence: finding.evidence,
        steps: (await remediationFor(finding.ruleCode, brand)) ?? [],
      };
    }),
  );

  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const item of items) counts[item.severity] += 1;

  return {
    tenant: { name: tenant.name },
    period: { start: periodStart, end: periodEnd },
    counts,
    items,
    devices: firewalls.map((firewall) => ({
      hostname: firewall.hostname,
      brand: firewall.brand,
      firmware: firewall.firmware,
    })),
  };
}
