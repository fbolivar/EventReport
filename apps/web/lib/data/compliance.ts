import { cache } from "react";
import type {
  ComplianceAssessment,
  Control,
  Framework,
  FrameworkCode,
  FrameworkCoverage,
  RuleControl,
} from "@eventreport/schema";

import { coverageFrom, deriveAssessments } from "@/lib/compliance/derive";
import { listFindings } from "@/lib/data/findings";
import { listFirewalls } from "@/lib/data/tenant";
import { createClient } from "@/lib/supabase/server";

export const listFrameworks = cache(async (): Promise<Framework[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("frameworks")
    .select("code, name, version, log_retention_days, total_controls, scope_note");

  return (data ?? []).map((row) => ({
    code: row.code,
    name: row.name,
    version: row.version,
    logRetentionDays: row.log_retention_days,
    totalControls: row.total_controls,
    scopeNote: row.scope_note,
  }));
});

export const controlsFor = cache(async (frameworkCode: FrameworkCode): Promise<Control[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("controls")
    .select("framework_code, code, title, domain")
    .eq("framework_code", frameworkCode);

  return (data ?? [])
    .map((row) => ({
      frameworkCode: row.framework_code,
      code: row.code,
      title: row.title,
      domain: row.domain ?? "",
    }))
    .sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));
});

export const listRuleControls = cache(async (): Promise<RuleControl[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rule_controls")
    .select("rule_code, framework_code, control_code");

  return (data ?? []).map((row) => ({
    ruleCode: row.rule_code,
    frameworkCode: row.framework_code,
    controlCode: row.control_code,
  }));
});

/**
 * Estados ya guardados por el cliente: hoy solo los controles declarados fuera
 * de alcance, que son una decisión suya y no se derivan de los hallazgos.
 */
const notApplicableFor = cache(
  async (frameworkCode: FrameworkCode): Promise<Record<string, string>> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("compliance_assessments")
      .select("control_code, justification")
      .eq("framework_code", frameworkCode)
      .eq("status", "not_applicable");

    return Object.fromEntries(
      (data ?? [])
        .filter((row) => row.justification)
        .map((row) => [row.control_code, row.justification as string]),
    );
  },
);

export const assessmentsFor = cache(
  async (frameworkCode: FrameworkCode): Promise<ComplianceAssessment[]> => {
    const [controls, ruleControls, findings, firewalls, notApplicable] = await Promise.all([
      controlsFor(frameworkCode),
      listRuleControls(),
      listFindings(),
      listFirewalls(),
      notApplicableFor(frameworkCode),
    ]);

    return deriveAssessments({
      frameworkCode,
      controls,
      ruleControls,
      findings,
      firewalls,
      notApplicable,
      assessedAt: new Date().toISOString(),
    });
  },
);

export const coverageFor = cache(
  async (frameworkCode: FrameworkCode): Promise<FrameworkCoverage | undefined> => {
    const frameworks = await listFrameworks();
    const framework = frameworks.find((item) => item.code === frameworkCode);
    if (!framework) return undefined;

    return coverageFrom(framework, await assessmentsFor(frameworkCode));
  },
);
