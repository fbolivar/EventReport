/**
 * POST /evidence/{id} — the result of an on-demand query the collector ran
 * against its own vault (section 6.3). The raw lines never travel: only the
 * capped result does, and it expires in 30 days.
 */
import { handler, json } from "../_shared/collector-auth.ts";

interface EvidenceBody {
  requestId: string;
  rows: unknown[];
  truncated: boolean;
}

function isEvidenceBody(value: unknown): value is EvidenceBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.requestId === "string" && Array.isArray(body.rows);
}

Deno.serve(
  handler(async (context) => {
    if (!isEvidenceBody(context.body)) return json({ error: "invalid evidence payload" }, 400);

    // TODO(fase 5): verificar que la solicitud pertenece al tenant, recortar a
    // `usage_quotas.evidence_rows` y guardar el resultado con su expiración.
    return json({ error: "not implemented" }, 501);
  }),
);
