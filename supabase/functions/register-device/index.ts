/**
 * POST /register-device — el colector da de alta el firewall que va a vigilar.
 *
 * Lo llama `collector device add`, después de haber hablado con el equipo. Lo
 * que sube es lo que el firewall dice de sí mismo —marca, modelo, serie,
 * versión, hostname— y nada más: **el token de la API se queda cifrado en la
 * máquina del cliente** y no aparece en esta petición ni en ninguna otra.
 *
 * El tenant y la sede salen del colector autenticado, nunca del cuerpo: un
 * colector no puede registrar un equipo en otra empresa.
 */
import { handler, json } from "../_shared/collector-auth.ts";

interface DeviceBody {
  brand: string;
  hostname: string;
  model: string;
  serial: string;
  firmware: string;
  capabilities?: Record<string, unknown>;
}

function isDeviceBody(value: unknown): value is DeviceBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.brand === "string" &&
    typeof body.hostname === "string" &&
    typeof body.serial === "string"
  );
}

Deno.serve(
  handler(async (context) => {
    if (!isDeviceBody(context.body)) return json({ error: "invalid device payload" }, 400);
    const body = context.body;

    const { data: collector } = await context.admin
      .from("collectors")
      .select("id, site_id")
      .eq("id", context.collectorId)
      .maybeSingle();

    if (!collector) return json({ error: "unknown collector" }, 403);

    // La serie identifica al equipo: si ya está registrado, esto es una
    // actualización de firmware o de nombre, no un equipo nuevo, y no consume
    // cupo. Sin esta comprobación, reinstalar el colector duplicaría firewalls.
    const { data: existing } = await context.admin
      .from("firewalls")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("serial", body.serial)
      .maybeSingle();

    if (!existing) {
      const { count } = await context.admin
        .from("firewalls")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", context.tenantId);

      const { data: quota } = await context.admin
        .from("usage_quotas")
        .select("firewalls")
        .eq("tenant_id", context.tenantId)
        .maybeSingle();

      if ((count ?? 0) >= (quota?.firewalls ?? 1)) {
        return json({ error: "firewall quota reached for this plan" }, 429);
      }
    }

    const row = {
      tenant_id: context.tenantId,
      site_id: collector.site_id,
      collector_id: collector.id,
      brand: body.brand,
      model: body.model || "desconocido",
      serial: body.serial,
      firmware: body.firmware || "desconocido",
      hostname: body.hostname,
      ha_role: "standalone",
      // Lo que la marca permite evaluar lo decide el colector, que es quien
      // habló con el equipo; el catálogo de reglas lo usa para no dar por
      // incumplido lo que no se puede ni mirar (§15.2).
      capabilities: body.capabilities ?? {},
    };

    // Alta o actualización, según si ya conocíamos la serie. Se escriben por
    // separado en vez de con un upsert para no tener que inventar una clave que
    // el esquema no declara.
    const saved = existing
      ? await context.admin.from("firewalls").update(row).eq("id", existing.id).select("id").single()
      : await context.admin.from("firewalls").insert(row).select("id").single();

    if (saved.error || !saved.data) {
      return json({ error: "could not register the firewall" }, 500);
    }

    // El alta cuenta como actividad del colector: si esto funcionó, está vivo.
    await context.admin
      .from("collectors")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", collector.id);

    return json({ firewallId: saved.data.id, isNew: !existing });
  }),
);
