/**
 * POST /enroll — one-time token plus the collector's Ed25519 public key
 * (section 6.7). Answers with the collector id and its configuration.
 *
 * Skeleton: validates the shape and the token, does not yet issue config.
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

Deno.serve(async (request) => {
  // Enrolment is the one call without a signature: the collector has no
  // identity yet. The single-use token is what authenticates it.
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "body is not valid json" }, 400);
  }

  if (!isEnrollBody(body)) return json({ error: "invalid enrolment payload" }, 400);

  const admin = adminClient();
  void admin;

  // TODO(fase 1): validar el token de un solo uso, guardar la clave pública en
  // `collectors`, marcar el token como usado y devolver la configuración del
  // plan (frecuencias, retención de bóveda, tope de eventos).
  return json({ error: "not implemented" }, 501);
});
