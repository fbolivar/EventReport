/**
 * POST /ingest/events — eventos críticos, en lotes cada 10 s (§6.4).
 *
 * Sujeto al tope diario del plan: un firewall con una regla ruidosa puede
 * generar miles de eventos por hora, y sin tope eso se convierte en la factura
 * de otro. Al llegar al límite se responde 429 y el colector deja de insistir.
 *
 * Los duplicados son la norma, no la excepción: el colector reenvía su búfer
 * cuando vuelve el enlace. La clave (firewall, regla, instante) los absorbe.
 */
import { handler, json, withinQuota } from "../_shared/collector-auth.ts";
import { firewallOfCollector, isResponse } from "../_shared/firewall.ts";

interface EventsBody {
  firewallId: string;
  events: Array<{
    ruleCode: string;
    severity: string;
    ts: string;
    title: string;
    detail?: string;
    payload?: Record<string, unknown>;
  }>;
}

function isEventsBody(value: unknown): value is EventsBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.firewallId === "string" && Array.isArray(body.events);
}

const SEVERITIES = new Set(["critical", "high", "medium", "low"]);
const MAX_EVENTS_PER_REQUEST = 500;

Deno.serve(
  handler(async (context) => {
    if (!isEventsBody(context.body)) return json({ error: "invalid events payload" }, 400);
    const body = context.body;

    const firewall = await firewallOfCollector(context, body.firewallId);
    if (isResponse(firewall)) return firewall;

    if (body.events.length > MAX_EVENTS_PER_REQUEST) {
      return json({ error: "too many events in one request" }, 413);
    }

    const count = body.events.length;
    if (count === 0) return json({ stored: 0 });

    if (!(await withinQuota(context, "critical_events", "critical_events_per_day", count))) {
      return json({ error: "daily critical event quota reached" }, 429);
    }

    const rows = body.events
      // Una severidad desconocida se descarta en vez de tumbar el lote entero:
      // el colector de un cliente puede ir una versión por detrás.
      .filter((event) => SEVERITIES.has(event.severity) && typeof event.ts === "string")
      .map((event) => ({
        tenant_id: context.tenantId,
        firewall_id: firewall.id,
        rule_code: event.ruleCode || null,
        severity: event.severity,
        ts: event.ts,
        title: event.title.slice(0, 300),
        detail: event.detail?.slice(0, 2000) ?? null,
        payload: event.payload ?? {},
      }));

    if (rows.length === 0) return json({ stored: 0, ignored: count });

    const { error } = await context.admin
      .from("critical_events")
      .upsert(rows, { onConflict: "firewall_id,rule_code,ts", ignoreDuplicates: true });

    if (error) return json({ error: "could not store events", detail: error.message }, 500);

    await context.admin
      .from("collectors")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", context.collectorId);

    return json({ stored: rows.length, ignored: count - rows.length });
  }),
);
