/**
 * POST /heartbeat — every 5 minutes (section 6.7). Reports health and receives
 * pending orders: evidence requests, frequency changes, `update_to`.
 *
 * Skeleton: writes nothing yet, but the signature check and the tenant
 * resolution already run.
 */
import { handler, json } from "../_shared/collector-auth.ts";

interface HeartbeatBody {
  version: string;
  eps: number;
  droppedPct: number;
  queueDepth: number;
  diskFreeGb: number;
  clockSkewSeconds: number;
}

function isHeartbeatBody(value: unknown): value is HeartbeatBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.version === "string" && typeof body.eps === "number";
}

Deno.serve(
  handler(async (context) => {
    if (!isHeartbeatBody(context.body)) return json({ error: "invalid heartbeat payload" }, 400);

    // TODO(fase 1): insertar en `collector_heartbeats`, actualizar
    // `collectors.last_seen_at` y `status`, y devolver las órdenes pendientes.
    return json({ error: "not implemented" }, 501);
  }),
);
