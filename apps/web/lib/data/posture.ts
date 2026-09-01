import { cache } from "react";
import type { CriticalEvent, PostureScore, Report, ScorePoint } from "@eventreport/schema";

import { createClient } from "@/lib/supabase/server";

/**
 * Score del tenant: promedio ponderado de sus firewalls en el último cálculo
 * (§11). La serie de tendencia es el mismo promedio por día.
 */
export const postureScore = cache(async (): Promise<PostureScore | undefined> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posture_scores")
    .select("computed_at, value, configuration, operation")
    .order("computed_at", { ascending: false })
    .limit(256);

  if (!data || data.length === 0) return undefined;

  const latestAt = data[0]!.computed_at;
  const latest = data.filter((row) => row.computed_at === latestAt);
  const average = (values: number[]) =>
    Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));

  // La comparación es contra hace un mes, no contra ayer: el informe es
  // mensual y un delta diario no dice nada.
  const monthAgo = new Date(new Date(latestAt).getTime() - 30 * 86_400_000).toISOString();
  const previousAt = data.find((row) => row.computed_at <= monthAgo)?.computed_at;
  const previous = previousAt ? data.filter((row) => row.computed_at === previousAt) : [];

  return {
    value: average(latest.map((row) => row.value)),
    configuration: average(latest.map((row) => row.configuration)),
    operation: average(latest.map((row) => row.operation)),
    previousValue: previous.length > 0 ? average(previous.map((row) => row.value)) : undefined,
    computedAt: latestAt,
  };
});

export const postureTrend = cache(async (days = 90): Promise<ScorePoint[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posture_scores")
    .select("computed_at, value")
    .order("computed_at", { ascending: true })
    .limit(days * 8);

  const byDay = new Map<string, number[]>();
  for (const row of data ?? []) {
    const day = row.computed_at.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), row.value]);
  }

  return [...byDay.entries()].map(([day, values]) => ({
    date: `${day}T00:00:00Z`,
    value: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
  }));
});

export const listCriticalEvents = cache(async (limit = 8): Promise<CriticalEvent[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("critical_events")
    .select("id, firewall_id, rule_code, severity, ts, title, detail, acknowledged_at")
    .order("ts", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    firewallId: row.firewall_id,
    ruleCode: row.rule_code ?? "",
    severity: row.severity,
    ts: row.ts,
    title: row.title,
    detail: row.detail ?? "",
    acknowledgedAt: row.acknowledged_at ?? undefined,
  }));
});

export const listReports = cache(async (): Promise<Report[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, tenant_id, type, framework_code, period_start, period_end, status, generated_at, pages, size_kb",
    )
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    frameworkCode: row.framework_code ?? undefined,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    generatedAt: row.generated_at ?? undefined,
    pages: row.pages,
    sizeKb: row.size_kb,
  }));
});
