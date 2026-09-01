/**
 * POST /enroll — token de un solo uso más la clave pública Ed25519 del
 * colector (§6.7). Responde con el id del colector y su configuración.
 *
 * Es la única llamada sin firma: el colector todavía no tiene identidad, y el
 * token es lo que lo autentica. Por eso el token se compara **hasheado** contra
 * la tabla, se marca usado en el mismo instante en que se acepta, y todo lo
 * demás —tenant, sede, plan— sale de la base, nunca del cuerpo de la petición.
 * Un colector no puede elegir de qué empresa es.
 */
import { adminClient, json } from "../_shared/collector-auth.ts";

interface EnrollBody {
  token: string;
  publicKey: string;
  hostname: string;
  version: string;
}

function isEnrollBody(value: unknown): value is EnrollBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.token === "string" &&
    typeof body.publicKey === "string" &&
    typeof body.hostname === "string" &&
    typeof body.version === "string"
  );
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** El token se escribe con guiones para poder dictarlo; se comparan solo los datos. */
const normalize = (token: string) => token.trim().toUpperCase().replaceAll("-", "");

/**
 * Configuración que el colector recibe al enrolarse, derivada del plan (§10).
 * Se calcula aquí y no en el colector: el cliente no debe poder subirse el
 * cupo editando un archivo local.
 */
function collectorConfig(plan: string, snapshotsPerDay: number, eventsPerDay: number) {
  const rollupMinutes = plan === "premium" ? 60 : plan === "standard" ? 240 : 1440;
  const vaultDays = plan === "premium" ? 30 : plan === "standard" ? 7 : 0;

  return {
    snapshotsPerDay,
    rollupMinutes,
    vaultDays,
    criticalEventsPerDay: eventsPerDay,
    syslogAddr: "0.0.0.0:514",
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "body is not valid json" }, 400);
  }

  if (!isEnrollBody(body)) return json({ error: "invalid enrolment payload" }, 400);
  if (body.publicKey.length < 40) return json({ error: "invalid public key" }, 400);

  const admin = adminClient();
  const hash = await sha256Hex(normalize(body.token));

  const { data: enrolment } = await admin
    .from("collector_enrolments")
    .select("id, tenant_id, site_id, label, expires_at, used_at")
    .eq("token_hash", hash)
    .maybeSingle();

  // Un token inválido, usado o vencido responde lo mismo: no se le dice a quien
  // prueba tokens cuál de las tres cosas acertó.
  if (!enrolment || enrolment.used_at || new Date(enrolment.expires_at) < new Date()) {
    return json({ error: "enrolment token is not valid" }, 401);
  }

  const [{ data: tenant }, { data: quota }] = await Promise.all([
    admin.from("tenants").select("plan").eq("id", enrolment.tenant_id).maybeSingle(),
    admin
      .from("usage_quotas")
      .select("config_snapshots_per_day, critical_events_per_day")
      .eq("tenant_id", enrolment.tenant_id)
      .maybeSingle(),
  ]);

  const config = collectorConfig(
    tenant?.plan ?? "basic",
    quota?.config_snapshots_per_day ?? 1,
    quota?.critical_events_per_day ?? 50,
  );

  const { data: collector, error: insertError } = await admin
    .from("collectors")
    .insert({
      tenant_id: enrolment.tenant_id,
      site_id: enrolment.site_id,
      name: enrolment.label ?? body.hostname,
      public_key: body.publicKey,
      version: body.version,
      // Arranca midiendo, no vigilando: los primeros días sirven para conocer
      // el tráfico normal antes de empezar a llamar la atención (§5).
      status: "measuring",
      config,
      vault_days: config.vaultDays,
      last_seen_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !collector) {
    return json({ error: "could not register the collector" }, 500);
  }

  // El token se quema aquí. La condición `used_at is null` hace que dos
  // enrolamientos simultáneos con el mismo token no puedan ganar los dos.
  const { data: burned } = await admin
    .from("collector_enrolments")
    .update({ used_at: new Date().toISOString(), collector_id: collector.id })
    .eq("id", enrolment.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (!burned) {
    await admin.from("collectors").delete().eq("id", collector.id);
    return json({ error: "enrolment token is not valid" }, 401);
  }

  return json({ collectorId: collector.id, config });
});
