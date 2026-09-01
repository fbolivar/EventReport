/**
 * POST /ingest/config — normalized FirewallConfig plus its sha256 (section 4.1).
 *
 * This is where a snapshot becomes a report: it stores the configuration,
 * evaluates the 24 rules, reconciles the findings against what the database
 * already had and recomputes the posture score. The engine is the same code
 * `packages/rules` covers with tests; `_shared/generated` is a copy made by
 * `build-shared.mjs`, never edited by hand.
 *
 * Credentials, PSKs and SNMP communities are never part of this payload.
 */
import type { FirewallConfig } from "../_shared/generated/schema/index.ts";
import { evaluate, reconcile, toFindings } from "../_shared/generated/rules/engine.ts";
import { score } from "../_shared/generated/rules/score.ts";
import type { OperationalSignals } from "../_shared/generated/rules/types.ts";
import { handler, json, withinQuota, type CollectorContext } from "../_shared/collector-auth.ts";

interface ConfigBody {
  firewallId: string;
  collectedAt: string;
  sha256: string;
  config?: FirewallConfig;
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

/** Signals that do not live in the configuration (OP-xxx, FW-019). */
async function operationalSignals(
  context: CollectorContext,
  firewallId: string,
): Promise<OperationalSignals> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [collector, frameworks, untreated, hardening, changes] = await Promise.all([
    context.admin
      .from("collectors")
      .select("vault_days, collector_heartbeats(ts, dropped_pct)")
      .eq("id", context.collectorId)
      .maybeSingle(),
    context.admin
      .from("tenant_frameworks")
      .select("frameworks(log_retention_days)")
      .eq("tenant_id", context.tenantId),
    context.admin
      .from("critical_events")
      .select("id", { count: "exact", head: true })
      .eq("firewall_id", firewallId)
      .is("acknowledged_at", null)
      .lt("ts", sevenDaysAgo),
    context.admin
      .from("reports")
      .select("generated_at")
      .eq("tenant_id", context.tenantId)
      .eq("type", "hardening")
      .eq("status", "ready")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    context.admin
      .from("config_changes")
      .select("id", { count: "exact", head: true })
      .eq("firewall_id", firewallId)
      .is("actor", null),
  ]);

  const beats = (collector.data?.collector_heartbeats ?? []) as Array<{
    ts: string;
    dropped_pct: number;
  }>;
  const latestBeat = beats.sort((a, b) => b.ts.localeCompare(a.ts))[0];

  // PostgREST types the embedded relation as an array; normalize either shape.
  const retentions = (frameworks.data ?? []).flatMap((row) => {
    const embedded = row.frameworks as
      | { log_retention_days: number }
      | Array<{ log_retention_days: number }>
      | null;
    if (!embedded) return [];
    return Array.isArray(embedded)
      ? embedded.map((item) => item.log_retention_days)
      : [embedded.log_retention_days];
  });

  return {
    droppedPct: latestBeat?.dropped_pct ?? 0,
    vaultDays: collector.data?.vault_days ?? 0,
    requiredRetentionDays: retentions.length > 0 ? Math.max(...retentions) : 0,
    untreatedCriticalEvents: untreated.count ?? 0,
    lastHardeningReportAt: hardening.data?.generated_at ?? undefined,
    changesWithoutActor: changes.count ?? 0,
  };
}

Deno.serve(
  handler(async (context) => {
    if (!isConfigBody(context.body)) return json({ error: "invalid config payload" }, 400);
    const { firewallId, collectedAt, sha256, config } = context.body;

    // The firewall must belong to the collector's tenant. Resolved here, not
    // trusted from the payload.
    const { data: firewall } = await context.admin
      .from("firewalls")
      .select("id, tenant_id")
      .eq("id", firewallId)
      .eq("tenant_id", context.tenantId)
      .maybeSingle();

    if (!firewall) return json({ error: "unknown firewall for this collector" }, 403);

    // Nothing changed: the collector saves the upload and we save the storage.
    const { data: known } = await context.admin
      .from("config_snapshots")
      .select("id")
      .eq("firewall_id", firewallId)
      .eq("sha256", sha256)
      .limit(1)
      .maybeSingle();

    if (known && !config) return json({ needsBody: false, evaluated: false });
    if (!config) return json({ needsBody: true });

    if (!(await withinQuota(context, "config_snapshots", "config_snapshots_per_day"))) {
      return json({ error: "daily snapshot quota reached" }, 429);
    }

    await context.admin.from("config_snapshots").upsert(
      { tenant_id: context.tenantId, firewall_id: firewallId, collected_at: collectedAt, config, sha256 },
      { onConflict: "firewall_id,sha256,collected_at" },
    );

    const signals = await operationalSignals(context, firewallId);
    const now = new Date().toISOString();
    const results = evaluate({ config, signals, now });
    const current = toFindings(results);

    const { data: stored } = await context.admin
      .from("findings")
      .select("id, rule_code, asset_key, status, severity, first_seen, last_seen")
      .eq("firewall_id", firewallId);

    const existing = (stored ?? []).map((row) => ({
      id: row.id,
      firewallId,
      ruleCode: row.rule_code,
      assetKey: row.asset_key,
      assetLabel: "",
      status: row.status,
      severity: row.severity,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
      evidence: [],
    }));

    const { opened, updated, resolved } = reconcile(existing, current);

    if (opened.length > 0) {
      await context.admin.from("findings").insert(
        opened.map((finding) => ({
          tenant_id: context.tenantId,
          firewall_id: firewallId,
          rule_code: finding.ruleCode,
          asset_key: finding.assetKey,
          asset_label: finding.assetLabel,
          severity: finding.severity,
          status: "open" as const,
          first_seen: now,
          last_seen: now,
          evidence: finding.evidence,
        })),
      );
    }

    for (const { id, finding } of updated) {
      // A finding the customer accepted as a risk stays accepted: the engine
      // refreshes the evidence, it does not overrule a human decision.
      await context.admin
        .from("findings")
        .update({ last_seen: now, evidence: finding.evidence, asset_label: finding.assetLabel })
        .eq("id", id)
        .neq("status", "accepted");
    }

    for (const finding of resolved) {
      await context.admin
        .from("findings")
        .update({ status: "resolved", resolved_at: now })
        .eq("id", finding.id);
    }

    const openNow = [
      ...opened,
      ...updated.map((item) => item.finding),
    ];
    const isOperational = (code: string) => code.startsWith("OP-") || code === "FW-019";

    const breakdown = score({
      configurationFindings: openNow.filter((finding) => !isOperational(finding.ruleCode)),
      operationFindings: openNow.filter((finding) => isOperational(finding.ruleCode)),
      policies: config.policies.length,
      admins: config.admins.length,
      droppedPct: signals.droppedPct,
      expiredLicenses: config.licenses.filter((license) => license.status === "expired").length,
      haDegraded: config.device.haMode !== "standalone" && config.device.haState !== "healthy",
      untreatedCriticalEvents: signals.untreatedCriticalEvents,
    });

    await context.admin.from("posture_scores").upsert(
      {
        tenant_id: context.tenantId,
        firewall_id: firewallId,
        computed_at: new Date(now.slice(0, 10) + "T00:00:00Z").toISOString(),
        value: breakdown.value,
        configuration: breakdown.configuration,
        operation: breakdown.operation,
      },
      { onConflict: "tenant_id,firewall_id,computed_at" },
    );

    return json({
      needsBody: false,
      evaluated: true,
      opened: opened.length,
      updated: updated.length,
      resolved: resolved.length,
      notAssessable: results.filter((result) => !result.evaluable).map((result) => result.code),
      score: breakdown,
    });
  }),
);
