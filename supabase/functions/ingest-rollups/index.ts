/**
 * POST /ingest/rollups — horas cerradas (§6.7).
 *
 * Idempotente por diseño: la clave del upsert es (firewall, hora, tipo,
 * acción), así que una corrección tardía sobrescribe en vez de duplicar y un
 * reintento tras una desconexión no hace daño. El colector puede reenviar todo
 * su búfer sin miedo, que es justo lo que hace cuando vuelve el enlace.
 *
 * Aquí no llega ni una línea de registro: solo contadores por hora. Esa
 * frontera es del producto (§4), no una limitación técnica.
 */
import { handler, json } from "../_shared/collector-auth.ts";
import { firewallOfCollector, isResponse } from "../_shared/firewall.ts";

interface Counter {
  type: string;
  action: string;
  count: number;
  bytesIn: number;
  bytesOut: number;
}

interface TopEntry {
  dimension: string;
  key: string;
  count: number;
  bytes: number;
}

interface RollupsBody {
  firewallId: string;
  hours: Array<{ hour: string; counters: Counter[]; topn: TopEntry[] }>;
}

function isRollupsBody(value: unknown): value is RollupsBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.firewallId === "string" && Array.isArray(body.hours);
}

/** Un top-N sin tope es una vía para llenar la tabla desde el colector. */
const MAX_TOPN_PER_HOUR = 500;
const MAX_HOURS_PER_REQUEST = 720; // 30 días: lo que cabe en el búfer del colector

Deno.serve(
  handler(async (context) => {
    if (!isRollupsBody(context.body)) return json({ error: "invalid rollups payload" }, 400);
    const body = context.body;

    const firewall = await firewallOfCollector(context, body.firewallId);
    if (isResponse(firewall)) return firewall;

    if (body.hours.length > MAX_HOURS_PER_REQUEST) {
      return json({ error: "too many hours in one request" }, 413);
    }

    const counters = body.hours.flatMap((hour) =>
      (hour.counters ?? []).map((counter) => ({
        tenant_id: context.tenantId,
        firewall_id: firewall.id,
        hour: hour.hour,
        type: counter.type,
        action: counter.action,
        count: Math.max(0, Math.trunc(counter.count)),
        bytes_in: Math.max(0, Math.trunc(counter.bytesIn)),
        bytes_out: Math.max(0, Math.trunc(counter.bytesOut)),
      })),
    );

    const tops = body.hours.flatMap((hour) =>
      (hour.topn ?? []).slice(0, MAX_TOPN_PER_HOUR).map((entry) => ({
        tenant_id: context.tenantId,
        firewall_id: firewall.id,
        hour: hour.hour,
        dimension: entry.dimension,
        key: entry.key.slice(0, 200),
        count: Math.max(0, Math.trunc(entry.count)),
        bytes: Math.max(0, Math.trunc(entry.bytes)),
      })),
    );

    if (counters.length > 0) {
      const { error } = await context.admin
        .from("rollups_hourly")
        .upsert(counters, { onConflict: "firewall_id,hour,type,action" });
      if (error) return json({ error: "could not store counters", detail: error.message }, 500);
    }

    if (tops.length > 0) {
      const { error } = await context.admin
        .from("rollups_topn")
        .upsert(tops, { onConflict: "firewall_id,hour,dimension,key" });
      if (error) return json({ error: "could not store top-n", detail: error.message }, 500);
    }

    // La última hora aceptada es lo que el colector necesita para purgar su
    // búfer: sin ese dato tendría que adivinar hasta dónde llegó.
    const acceptedThrough = body.hours
      .map((hour) => hour.hour)
      .sort()
      .at(-1);

    await context.admin
      .from("collectors")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", context.collectorId);

    return json({ acceptedThrough, counters: counters.length, topn: tops.length });
  }),
);
