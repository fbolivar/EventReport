import { cache } from "react";
import type { Brand, Finding, FindingEvidence, FindingRule, Severity } from "@eventreport/schema";

import { createClient } from "@/lib/supabase/server";

/** Catálogo de reglas, leído una vez por render. */
export const rulesByCode = cache(async (): Promise<Record<string, FindingRule>> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("finding_rules")
    .select("code, severity, domain, title, description")
    .order("code");

  return Object.fromEntries(
    (data ?? []).map((row) => [
      row.code,
      {
        code: row.code,
        severity: row.severity,
        domain: row.domain,
        title: row.title,
        description: row.description,
      },
    ]),
  );
});

function toEvidence(value: unknown): FindingEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const entry = item as Record<string, unknown>;
    if (typeof entry.label !== "string" || typeof entry.value !== "string") return [];
    return [{ label: entry.label, value: entry.value }];
  });
}

export const listFindings = cache(async (): Promise<Finding[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("findings")
    .select(
      "id, firewall_id, rule_code, asset_key, asset_label, status, severity, first_seen, last_seen, resolved_at, evidence, justification",
    )
    .order("severity")
    .order("last_seen", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    firewallId: row.firewall_id,
    ruleCode: row.rule_code,
    assetKey: row.asset_key,
    assetLabel: row.asset_label,
    status: row.status,
    severity: row.severity,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    resolvedAt: row.resolved_at ?? undefined,
    evidence: toEvidence(row.evidence),
    justification: row.justification ?? undefined,
  }));
});

export const findingById = cache(async (id: string): Promise<Finding | undefined> => {
  const findings = await listFindings();
  return findings.find((finding) => finding.id === id);
});

/** Pasos de corrección de la marca para una regla (`Remediation(rule)`, §4.3). */
export const remediationFor = cache(
  async (ruleCode: string, brand: Brand): Promise<string[] | undefined> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("rule_remediations")
      .select("steps")
      .eq("rule_code", ruleCode)
      .eq("brand", brand)
      .maybeSingle();

    return data?.steps;
  },
);

export function countsBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of findings) {
    if (finding.status === "open") counts[finding.severity] += 1;
  }
  return counts;
}
