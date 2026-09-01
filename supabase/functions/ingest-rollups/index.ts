/**
 * POST /ingest/rollups — closed hours, gzipped (section 6.7).
 *
 * Idempotent by design: the upsert key is (firewall_id, hour, type, action),
 * so a late correction overwrites instead of duplicating, and a retry after a
 * disconnection is harmless.
 */
import { handler, json } from "../_shared/collector-auth.ts";

interface RollupsBody {
  firewallId: string;
  hours: Array<{
    hour: string;
    counters: Array<{ type: string; action: string; count: number; bytesIn: number; bytesOut: number }>;
    topn: Array<{ dimension: string; key: string; count: number; bytes: number }>;
  }>;
}

function isRollupsBody(value: unknown): value is RollupsBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.firewallId === "string" && Array.isArray(body.hours);
}

Deno.serve(
  handler(async (context) => {
    if (!isRollupsBody(context.body)) return json({ error: "invalid rollups payload" }, 400);

    // TODO(fase 1): verificar que el firewall pertenece al tenant del colector,
    // hacer upsert en `rollups_hourly` y `rollups_topn`, y responder con la
    // última hora aceptada para que el colector pueda purgar su buffer.
    return json({ error: "not implemented" }, 501);
  }),
);
