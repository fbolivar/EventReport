import { cache } from "react";
import type { TopNDimension } from "@eventreport/schema";

import { createClient } from "@/lib/supabase/server";
import type { ActivitySeriesPoint, TopEntry } from "@/lib/fixtures/activity";

/**
 * Actividad reconstruida desde `rollups_hourly`, que es lo único que el
 * colector sube: contadores por hora, tipo y acción. Las líneas crudas se
 * quedan en la red del cliente.
 */
export const activitySeries = cache(async (days = 30): Promise<ActivitySeriesPoint[]> => {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data } = await supabase
    .from("rollups_hourly")
    .select("hour, type, action, count, bytes_in, bytes_out")
    .gte("hour", since)
    .order("hour");

  const byHour = new Map<string, ActivitySeriesPoint>();

  for (const row of data ?? []) {
    const point = byHour.get(row.hour) ?? {
      hour: row.hour,
      allowed: 0,
      denied: 0,
      blockedIps: 0,
      blockedWeb: 0,
      vpnSessions: 0,
      bytes: 0,
    };

    if (row.type === "traffic" && row.action === "allow") {
      point.allowed += row.count;
      point.bytes += row.bytes_in + row.bytes_out;
    } else if (row.type === "traffic" && row.action === "deny") {
      point.denied += row.count;
    } else if (row.type === "ips") {
      point.blockedIps += row.count;
    } else if (row.type === "web") {
      point.blockedWeb += row.count;
    } else if (row.type === "vpn") {
      point.vpnSessions += row.count;
    }

    byHour.set(row.hour, point);
  }

  return [...byHour.values()].sort((a, b) => a.hour.localeCompare(b.hour));
});

/** Top-N por dimensión, sumando las horas del período. */
export const topN = cache(
  async (dimension: TopNDimension, days = 30, limit = 6): Promise<TopEntry[]> => {
    const supabase = await createClient();
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    const { data } = await supabase
      .from("rollups_topn")
      .select("key, count, bytes")
      .eq("dimension", dimension)
      .gte("hour", since);

    const totals = new Map<string, TopEntry>();
    for (const row of data ?? []) {
      const current = totals.get(row.key) ?? { key: row.key, count: 0, bytes: 0 };
      current.count += row.count;
      current.bytes = (current.bytes ?? 0) + row.bytes;
      totals.set(row.key, current);
    }

    return [...totals.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((entry) => (entry.bytes ? entry : { key: entry.key, count: entry.count }));
  },
);
