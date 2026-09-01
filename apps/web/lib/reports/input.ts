import type { FrameworkCode } from "@eventreport/schema";

import { coverageFrom } from "@/lib/compliance/derive";
import { activitySeries } from "@/lib/data/activity";
import { assessmentsFor, listFrameworks } from "@/lib/data/compliance";
import { countsBySeverity, listFindings, rulesByCode } from "@/lib/data/findings";
import { listCriticalEvents, postureScore, postureTrend } from "@/lib/data/posture";
import { getTenant, listFirewalls } from "@/lib/data/tenant";
import { formatBytes } from "@/lib/utils/format";

/**
 * The structured input of the report pipeline (docs/diseno-tecnico.md §8).
 *
 * Everything the model is allowed to talk about is here, already computed by
 * us. Claude writes the prose; it never invents a number, because it is not
 * given the freedom to compute one.
 */
export interface ReportInput {
  tenant: { name: string; plan: string };
  period: { start: string; end: string };
  score?: { value: number; configuration: number; operation: number; delta?: number };
  findings: {
    open: number;
    bySeverity: Record<string, number>;
    resolvedInPeriod: number;
    top: Array<{
      code: string;
      severity: string;
      title: string;
      asset: string;
      firstSeen: string;
      evidence: Array<{ label: string; value: string }>;
    }>;
  };
  activity: {
    days: number;
    allowed: number;
    denied: number;
    blockedIps: number;
    blockedWeb: number;
    bytes: number;
    /**
     * El mismo volumen ya legible ("812 GB"). Convertir bytes es calcular, y el
     * modelo no calcula: si solo recibe el número crudo lo escribe tal cual y
     * el informe dice "812.000.000.000 bytes".
     */
    bytesLabel: string;
  };
  compliance: Array<{
    framework: string;
    name: string;
    totalControls: number;
    assessable: number;
    compliant: number;
    nonCompliant: number;
    partial: number;
    notAssessable: number;
  }>;
  criticalEvents: Array<{ ts: string; severity: string; title: string; treated: boolean }>;
  devices: Array<{ hostname: string; brand: string; firmware: string; unevaluableRules: string[] }>;
}

/** Assembles the input from the same data layer the portal renders. */
export async function buildReportInput(
  tenantSlug: string,
  periodStart: string,
  periodEnd: string,
): Promise<ReportInput | undefined> {
  const [tenant, score, trend, findings, rules, firewalls, frameworks, events, hourly] =
    await Promise.all([
      getTenant(tenantSlug),
      postureScore(),
      postureTrend(),
      listFindings(),
      rulesByCode(),
      listFirewalls(),
      listFrameworks(),
      listCriticalEvents(20),
      activitySeries(30),
    ]);

  if (!tenant) return undefined;

  const open = findings.filter((finding) => finding.status === "open");
  const resolvedInPeriod = findings.filter(
    (finding) =>
      finding.status === "resolved" &&
      finding.resolvedAt !== undefined &&
      finding.resolvedAt >= periodStart &&
      finding.resolvedAt <= periodEnd,
  );

  const severityRank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  const top = [...open]
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, 5)
    .map((finding) => ({
      code: finding.ruleCode,
      severity: finding.severity,
      title: rules[finding.ruleCode]?.title ?? finding.ruleCode,
      asset: finding.assetLabel,
      firstSeen: finding.firstSeen,
      evidence: finding.evidence,
    }));

  const activity = hourly.reduce(
    (totals, point) => ({
      days: totals.days,
      allowed: totals.allowed + point.allowed,
      denied: totals.denied + point.denied,
      blockedIps: totals.blockedIps + point.blockedIps,
      blockedWeb: totals.blockedWeb + point.blockedWeb,
      bytes: totals.bytes + point.bytes,
    }),
    { days: 30, allowed: 0, denied: 0, blockedIps: 0, blockedWeb: 0, bytes: 0 },
  );

  const compliance = await Promise.all(
    tenant.frameworks.map(async (code: FrameworkCode) => {
      const framework = frameworks.find((item) => item.code === code);
      const assessments = await assessmentsFor(code);
      const coverage = framework
        ? coverageFrom(framework, assessments)
        : undefined;

      return {
        framework: code,
        name: framework?.name ?? code,
        totalControls: coverage?.totalControls ?? 0,
        assessable: coverage?.assessableControls ?? 0,
        compliant: coverage?.compliant ?? 0,
        nonCompliant: coverage?.nonCompliant ?? 0,
        partial: coverage?.partial ?? 0,
        notAssessable: coverage?.notAssessable ?? 0,
      };
    }),
  );

  const monthAgo = trend.find((point) => point.date <= periodStart)?.value;

  return {
    tenant: { name: tenant.name, plan: tenant.plan },
    period: { start: periodStart, end: periodEnd },
    score: score
      ? {
          value: score.value,
          configuration: score.configuration,
          operation: score.operation,
          delta: monthAgo === undefined ? undefined : score.value - monthAgo,
        }
      : undefined,
    findings: {
      open: open.length,
      bySeverity: countsBySeverity(findings),
      resolvedInPeriod: resolvedInPeriod.length,
      top,
    },
    activity: { ...activity, bytesLabel: formatBytes(activity.bytes) },
    compliance,
    criticalEvents: events.map((event) => ({
      ts: event.ts,
      severity: event.severity,
      title: event.title,
      treated: event.acknowledgedAt !== undefined,
    })),
    devices: firewalls.map((firewall) => ({
      hostname: firewall.hostname,
      brand: firewall.brand,
      firmware: firewall.firmware,
      unevaluableRules: firewall.capabilities.unevaluableRules,
    })),
  };
}
