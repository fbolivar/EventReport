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
  /** IPs de la máquina del colector: el portal las muestra para el syslog. */
  addresses?: string[];
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

    // Modo medición: 24 h desde el enrolamiento (§5). Durante ese tiempo el
    // colector cuenta para saber qué retención de bóveda cabe, y no se le pide
    // que alerte de nada. Cumplidas las 24 h, el latido lo pasa a activo.
    //
    // Sin esto el colector se quedaba "en medición" para siempre: el diseño lo
    // decía y nadie lo implementaba, así que el cliente veía un ámbar eterno.
    const { data: current } = await context.admin
      .from("collectors")
      .select("status, created_at")
      .eq("id", context.collectorId)
      .maybeSingle();

    // Si el operador ya lo activó a mano desde el portal, el latido no lo
    // devuelve a medición: la decisión de una persona pesa más que el reloj.
    const measuringSince = current?.created_at ? Date.parse(current.created_at) : Date.now();
    const stillMeasuring = Date.now() - measuringSince < 24 * 60 * 60 * 1000;
    const status = current?.status === "measuring" && stillMeasuring ? "measuring" : "active";

    // Las direcciones viajan en el latido y se guardan en `config`: el portal
    // las usa para decirle al técnico a dónde apuntar el syslog del firewall.
    const addresses = Array.isArray(body.addresses)
      ? body.addresses.filter((item) => typeof item === "string").slice(0, 8)
      : undefined;

    await context.admin
      .from("collectors")
      .update({
        last_seen_at: now,
        version: body.version,
        status,
        ...(addresses ? { config: { syslogTargets: addresses } } : {}),
      })
      .eq("id", context.collectorId);

    // Las órdenes llegan en la fase 5 (evidencia bajo demanda, cambio de
    // frecuencia, actualización). El contrato ya existe para que el colector
    // no tenga que cambiar cuando aparezcan.
    return json({ orders: [], serverTime: now });
  }),
);
