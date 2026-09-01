/**
 * POST /ingest/config — normalized FirewallConfig plus its sha256 (section 4.1).
 *
 * If only the hash changed the collector sends just the hash; the cloud
 * answers whether it needs the body. Credentials, PSKs and SNMP communities
 * are never part of this payload.
 */
import { handler, json, withinQuota } from "../_shared/collector-auth.ts";

interface ConfigBody {
  firewallId: string;
  collectedAt: string;
  sha256: string;
  config?: unknown;
}

function isConfigBody(value: unknown): value is ConfigBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.firewallId === "string" &&
    typeof body.collectedAt === "string" &&
    typeof body.sha256 === "string"
  );
}

Deno.serve(
  handler(async (context) => {
    if (!isConfigBody(context.body)) return json({ error: "invalid config payload" }, 400);

    if (!(await withinQuota(context, "config_snapshots", "config_snapshots_per_day"))) {
      return json({ error: "daily snapshot quota reached" }, 429);
    }

    // TODO(fase 1): si el sha256 ya existe responder {needsBody:false}; si no,
    // guardar el snapshot, calcular el diff contra el anterior en
    // `config_changes` y disparar la evaluación de reglas.
    return json({ error: "not implemented" }, 501);
  }),
);
