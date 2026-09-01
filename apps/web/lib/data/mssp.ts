import { cache } from "react";
import type { CollectorHealth, PlanCode } from "@eventreport/schema";

import { createClient } from "@/lib/supabase/server";

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
  lastReport?: string;
}

/**
 * Vista de proveedor de servicio. No hay filtro por usuario en la consulta:
 * RLS devuelve exactamente los tenants de los que este usuario es miembro, así
 * que un MSSP ve a sus clientes y un cliente se ve solo a sí mismo.
 */
export const listMsspRows = cache(async (): Promise<MsspRow[]> => {
  const supabase = await createClient();

  const [tenants, findings, firewalls, collectors, scores, reports] = await Promise.all([
    supabase.from("tenants").select("id, slug, name, plan"),
    supabase.from("findings").select("tenant_id, severity, status").eq("status", "open"),
    supabase.from("firewalls").select("tenant_id"),
    supabase.from("collectors").select("tenant_id, status"),
    supabase
      .from("posture_scores")
      .select("tenant_id, computed_at, value")
      .order("computed_at", { ascending: false })
      .limit(400),
    supabase
      .from("reports")
      .select("tenant_id, generated_at")
      .not("generated_at", "is", null)
      .order("generated_at", { ascending: false }),
  ]);

  const worstStatus = (statuses: CollectorHealth["status"][]): CollectorHealth["status"] => {
    const order: CollectorHealth["status"][] = ["offline", "stale", "measuring", "active"];
    return order.find((status) => statuses.includes(status)) ?? "offline";
  };

  return (tenants.data ?? []).map((tenant) => {
    const tenantScores = (scores.data ?? []).filter((row) => row.tenant_id === tenant.id);
    const latestAt = tenantScores[0]?.computed_at;
    const latest = tenantScores.filter((row) => row.computed_at === latestAt);
    const previousAt = tenantScores.find((row) => row.computed_at !== latestAt)?.computed_at;
    const previous = tenantScores.filter((row) => row.computed_at === previousAt);
    const average = (values: number[]) =>
      values.length === 0
        ? 0
        : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

    const score = average(latest.map((row) => row.value));
    const previousScore = average(previous.map((row) => row.value));

    const open = (findings.data ?? []).filter((row) => row.tenant_id === tenant.id);
    const tenantCollectors = (collectors.data ?? [])
      .filter((row) => row.tenant_id === tenant.id)
      .map((row) => row.status);

    return {
      tenantId: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      score,
      scoreDelta: previous.length > 0 ? score - previousScore : 0,
      critical: open.filter((row) => row.severity === "critical").length,
      high: open.filter((row) => row.severity === "high").length,
      firewalls: (firewalls.data ?? []).filter((row) => row.tenant_id === tenant.id).length,
      collectorStatus: worstStatus(tenantCollectors),
      lastReport:
        (reports.data ?? []).find((row) => row.tenant_id === tenant.id)?.generated_at ?? undefined,
    };
  });
});
