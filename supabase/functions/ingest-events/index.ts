/**
 * POST /ingest/events — critical events, batched every 10 s (section 6.4).
 * Subject to the per-tenant daily cap of the plan.
 */
import { handler, json, withinQuota } from "../_shared/collector-auth.ts";

interface EventsBody {
  firewallId: string;
  events: Array<{ ruleCode: string; severity: string; ts: string; title: string; detail?: string }>;
}

function isEventsBody(value: unknown): value is EventsBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.firewallId === "string" && Array.isArray(body.events);
}

Deno.serve(
  handler(async (context) => {
    if (!isEventsBody(context.body)) return json({ error: "invalid events payload" }, 400);

    const count = context.body.events.length;
    if (!(await withinQuota(context, "critical_events", "critical_events_per_day", count))) {
      return json({ error: "daily critical event quota reached" }, 429);
    }

    // TODO(fase 1): insertar en `critical_events` y disparar la notificación.
    return json({ error: "not implemented" }, 501);
  }),
);
