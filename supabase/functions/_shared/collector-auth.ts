/**
 * Shared plumbing for every collector-facing Edge Function (section 6.7).
 *
 * The contract with the collector: each request carries `x-collector-id` and
 * `x-signature`, the Ed25519 signature of the raw body made with the private
 * key that never leaves the customer's machine. The public key was registered
 * at enrolment. Nothing is written before the signature checks out and the
 * quota allows it.
 *
 * These are skeletons: shape, validation and error handling are real, the
 * business logic lands with the collector in phase 1.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface CollectorContext {
  collectorId: string;
  tenantId: string;
  /** service_role client: bypasses RLS, so the tenant is resolved here, once. */
  admin: SupabaseClient;
  body: unknown;
}

export class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    // Never exposed to the browser: only Edge Functions hold this key.
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

/** Ed25519 verification over the raw body, using the enrolled public key. */
async function verifySignature(
  publicKeyBase64: string,
  signatureBase64: string,
  raw: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      Uint8Array.from(atob(publicKeyBase64), (char) => char.charCodeAt(0)),
      { name: "Ed25519" },
      false,
      ["verify"],
    );

    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      Uint8Array.from(atob(signatureBase64), (char) => char.charCodeAt(0)),
      new TextEncoder().encode(raw),
    );
  } catch {
    return false;
  }
}

/**
 * Authenticates the collector and resolves its tenant. The tenant is never
 * taken from the payload: a compromised collector must not be able to write
 * into somebody else's data by changing a field.
 */
export async function authenticateCollector(request: Request): Promise<CollectorContext> {
  const collectorId = request.headers.get("x-collector-id");
  const signature = request.headers.get("x-signature");
  if (!collectorId || !signature) throw new RequestError(401, "missing collector credentials");

  const raw = await request.text();
  const admin = adminClient();

  const { data: collector } = await admin
    .from("collectors")
    .select("id, tenant_id, public_key")
    .eq("id", collectorId)
    .maybeSingle();

  if (!collector?.public_key) throw new RequestError(401, "unknown collector");
  if (!(await verifySignature(collector.public_key, signature, raw))) {
    throw new RequestError(401, "invalid signature");
  }

  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    throw new RequestError(400, "body is not valid json");
  }

  return { collectorId: collector.id, tenantId: collector.tenant_id, admin, body };
}

/**
 * Daily quota per tenant and metric (section 10). Counting happens before the
 * write: a runaway collector must cost the customer nothing.
 */
export async function withinQuota(
  context: CollectorContext,
  metric: string,
  limitColumn: "critical_events_per_day" | "config_snapshots_per_day",
  increment = 1,
): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: quota } = await context.admin
    .from("usage_quotas")
    .select("critical_events_per_day, config_snapshots_per_day")
    .eq("tenant_id", context.tenantId)
    .maybeSingle();

  const limit = Number(quota?.[limitColumn] ?? 0);

  const { data: counter } = await context.admin
    .from("usage_counters")
    .select("value")
    .eq("tenant_id", context.tenantId)
    .eq("metric", metric)
    .eq("period", today)
    .maybeSingle();

  const used = counter?.value ?? 0;
  if (used + increment > limit) return false;

  await context.admin.from("usage_counters").upsert(
    { tenant_id: context.tenantId, metric, period: today, value: used + increment },
    { onConflict: "tenant_id,metric,period" },
  );

  return true;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Wraps a handler so every function answers errors the same way. */
export function handler(
  fn: (context: CollectorContext) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

    try {
      return await fn(await authenticateCollector(request));
    } catch (error) {
      if (error instanceof RequestError) return json({ error: error.message }, error.status);
      console.error(error);
      return json({ error: "internal error" }, 500);
    }
  };
}
