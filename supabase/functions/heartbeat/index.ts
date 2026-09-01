/**
 * POST /heartbeat — cada 5 minutos (§6.7). Informa salud y recibe órdenes.
 *
 * Es el latido que decide si un colector aparece **activo** o **caído** en el
 * tablero, y de ahí sale la primera línea de "qué atender hoy" del MSSP. Un
 * colector que no late no es un detalle de infraestructura: es un cliente que
 * se quedó sin datos y todavía no lo sabe.
 *
 * La respuesta lleva las órdenes pendientes. El colector nunca escucha en un
 * puerto abierto desde internet: pregunta él, y por eso las órdenes viajan de
 * vuelta en la respuesta a su propio latido.
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

const number = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback;

Deno.serve(
  handler(async (context) => {
    if (!isHeartbeatBody(context.body)) return json({ error: "invalid heartbeat payload" }, 400);
    const body = context.body;
    const now = new Date().toISOString();

    await context.admin.from("collector_heartbeats").upsert(
      {
        tenant_id: context.tenantId,
        collector_id: context.collectorId,
        ts: now,
        version: body.version,
        eps: number(body.eps),
        dropped_pct: typeof body.droppedPct === "number" ? body.droppedPct : 0,
        queue_depth: number(body.queueDepth),
        disk_free_gb: number(body.diskFreeGb),
        clock_skew_seconds: number(body.clockSkewSeconds),
      },
      { onConflict: "collector_id,ts" },
    );

    // Un colector que acaba de enrolarse sigue **en medición** hasta que ha
    // visto suficiente tráfico; el latido no lo saca de ahí. Lo que sí hace es
    // devolverlo a activo si estaba dado por caído.
    const { data: current } = await context.admin
      .from("collectors")
      .select("status")
      .eq("id", context.collectorId)
      .maybeSingle();

    const status = current?.status === "measuring" ? "measuring" : "active";

    await context.admin
      .from("collectors")
      .update({ last_seen_at: now, version: body.version, status })
      .eq("id", context.collectorId);

    // Las órdenes llegan en la fase 5 (evidencia bajo demanda, cambio de
    // frecuencia, actualización). El contrato ya existe para que el colector
    // no tenga que cambiar cuando aparezcan.
    return json({ orders: [], serverTime: now });
  }),
);
