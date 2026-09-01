/**
 * Generates supabase/seed/demo.sql: the example tenant (Acme) as real rows.
 *
 * Same source as the portal fixtures, so what the browser shows and what the
 * database stores cannot drift. The hourly rollups are NOT emitted row by row:
 * the traffic profile is ported to SQL over `generate_series`, which keeps the
 * file readable and applies in one statement.
 *
 * Run: node supabase/seed/demo.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "../../apps/web/lib/fixtures");
const load = (file) => import(pathToFileURL(join(fixtures, file)).href);

const { DEMO_FINDINGS } = await load("findings.ts");
const { DEMO_CRITICAL_EVENTS, DEMO_REPORTS } = await load("events.ts");
const { DEMO_TOPN } = await load("activity.ts");
const { DEMO_SITES, DEMO_FIREWALLS, DEMO_COLLECTORS, DEMO_TENANT, NOW } = await load("tenant.ts");

const q = (value) =>
  value === undefined || value === null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;

/** Stable uuids derived from the fixture ids, so re-running is idempotent. */
const UUID = {
  tenant: "a0000000-0000-4000-8000-000000000001",
  "site-bog": "a0000000-0000-4000-8000-000000000011",
  "site-mde": "a0000000-0000-4000-8000-000000000012",
  "col-bog": "a0000000-0000-4000-8000-000000000021",
  "col-mde": "a0000000-0000-4000-8000-000000000022",
  "fw-fgt-01": "a0000000-0000-4000-8000-000000000031",
  "fw-xgs-01": "a0000000-0000-4000-8000-000000000032",
};

/** The last uuid group must be exactly 12 hex digits: 8 of prefix plus 4 of index. */
const rowUuid = (prefix, id) =>
  `a0000000-0000-4000-8000-${prefix}${String(Number(id.split("-")[1])).padStart(4, "0")}`;
const findingUuid = (id) => rowUuid("00000001", id);
const eventUuid = (id) => rowUuid("00000002", id);
const reportUuid = (id) => rowUuid("00000003", id);

const T = UUID.tenant;
const lines = [];

lines.push(
  "-- EventReport — demo tenant (Acme S.A.S.).",
  "-- GENERATED FILE: do not edit by hand. Source: apps/web/lib/fixtures.",
  "-- Regenerate with: node supabase/seed/demo.mjs",
  "",
  "begin;",
  "",
  "-- ------------------------------------------------------------- tenant",
  `insert into public.tenants (id, slug, name, plan) values (${q(T)}, ${q(DEMO_TENANT.id)}, ${q(DEMO_TENANT.name)}, ${q(DEMO_TENANT.plan)})`,
  "on conflict (id) do update set name = excluded.name, plan = excluded.plan;",
  "",
  `insert into public.tenant_frameworks (tenant_id, framework_code) values`,
  DEMO_TENANT.frameworks.map((code) => `  (${q(T)}, ${q(code)})`).join(",\n"),
  "on conflict do nothing;",
  "",
  `insert into public.usage_quotas (tenant_id, firewalls, config_snapshots_per_day, critical_events_per_day, evidence_rows, claude_tokens_per_month)`,
  `values (${q(T)}, 10, 6, 500, 2000, 1500000)`,
  "on conflict (tenant_id) do nothing;",
  "",
  "-- --------------------------------------------------- sites and devices",
  "insert into public.sites (id, tenant_id, name, city) values",
  DEMO_SITES.map((site) => `  (${q(UUID[site.id])}, ${q(T)}, ${q(site.name)}, ${q(site.city)})`).join(",\n"),
  "on conflict (id) do update set name = excluded.name, city = excluded.city;",
  "",
  "insert into public.collectors (id, tenant_id, site_id, name, version, status, last_seen_at, vault_days) values",
  DEMO_COLLECTORS.map(
    (collector) =>
      `  (${q(UUID[collector.id])}, ${q(T)}, ${q(UUID[collector.siteId])}, ${q(collector.name)}, ${q(collector.health.version)}, ${q(collector.health.status)}, ${q(collector.health.lastSeenAt)}, ${collector.health.vaultDays})`,
  ).join(",\n"),
  "on conflict (id) do update set status = excluded.status, last_seen_at = excluded.last_seen_at, version = excluded.version;",
  "",
  "insert into public.collector_heartbeats (tenant_id, collector_id, ts, version, eps, dropped_pct, queue_depth, disk_free_gb, clock_skew_seconds) values",
  DEMO_COLLECTORS.map(
    (collector) =>
      `  (${q(T)}, ${q(UUID[collector.id])}, ${q(collector.health.lastSeenAt)}, ${q(collector.health.version)}, ${collector.health.eps}, ${collector.health.droppedPct}, ${collector.health.queueDepth}, ${collector.health.diskFreeGb}, ${collector.health.clockSkewSeconds})`,
  ).join(",\n"),
  "on conflict (collector_id, ts) do update set eps = excluded.eps, dropped_pct = excluded.dropped_pct;",
  "",
  "insert into public.firewalls (id, tenant_id, site_id, collector_id, brand, model, serial, firmware, hostname, ha_role, capabilities) values",
  DEMO_FIREWALLS.map(
    (firewall) =>
      `  (${q(UUID[firewall.id])}, ${q(T)}, ${q(UUID[firewall.siteId])}, ${q(UUID[firewall.collectorId])}, ${q(firewall.brand)}, ${q(firewall.model)}, ${q(firewall.serial)}, ${q(firewall.firmware)}, ${q(firewall.hostname)}, ${q(firewall.haRole)}, ${json(firewall.capabilities)})`,
  ).join(",\n"),
  "on conflict (id) do update set firmware = excluded.firmware, capabilities = excluded.capabilities;",
  "",
  "-- ----------------------------------------------------------- findings",
  "insert into public.findings (id, tenant_id, firewall_id, rule_code, asset_key, asset_label, status, severity, first_seen, last_seen, resolved_at, evidence) values",
  DEMO_FINDINGS.map(
    (finding) =>
      `  (${q(findingUuid(finding.id))}, ${q(T)}, ${q(UUID[finding.firewallId])}, ${q(finding.ruleCode)}, ${q(finding.assetKey)}, ${q(finding.assetLabel)}, ${q(finding.status)}, ${q(finding.severity)}, ${q(finding.firstSeen)}, ${q(finding.lastSeen)}, ${q(finding.resolvedAt)}, ${json(finding.evidence)})`,
  ).join(",\n"),
  "on conflict (firewall_id, rule_code, asset_key) do update set status = excluded.status, last_seen = excluded.last_seen, evidence = excluded.evidence;",
  "",
  "-- ---------------------------------------------------- critical events",
  "insert into public.critical_events (id, tenant_id, firewall_id, rule_code, severity, ts, title, detail, acknowledged_at) values",
  DEMO_CRITICAL_EVENTS.map(
    (event) =>
      `  (${q(eventUuid(event.id))}, ${q(T)}, ${q(UUID[event.firewallId])}, ${q(event.ruleCode)}, ${q(event.severity)}, ${q(event.ts)}, ${q(event.title)}, ${q(event.detail)}, ${q(event.acknowledgedAt)})`,
  ).join(",\n"),
  "on conflict (id) do update set acknowledged_at = excluded.acknowledged_at;",
  "",
  "-- ------------------------------------------------------------ reports",
  "insert into public.reports (id, tenant_id, type, framework_code, period_start, period_end, status, generated_at, pages, size_kb) values",
  DEMO_REPORTS.map(
    (report) =>
      `  (${q(reportUuid(report.id))}, ${q(T)}, ${q(report.type)}, ${q(report.frameworkCode)}, ${q(report.periodStart)}, ${q(report.periodEnd)}, ${q(report.status)}, ${q(report.generatedAt)}, ${report.pages}, ${report.sizeKb})`,
  ).join(",\n"),
  "on conflict (id) do update set status = excluded.status;",
  "",
);

// Top-N: the whole period condensed into the last closed hour, which is what
// the portal aggregates anyway.
const topRows = [];
for (const [dimension, entries] of Object.entries(DEMO_TOPN)) {
  for (const entry of entries) {
    topRows.push(
      `  (${q(T)}, ${q(UUID["fw-fgt-01"])}, date_trunc('hour', ${q(NOW)}::timestamptz), ${q(dimension)}, ${q(entry.key)}, ${entry.count}, ${entry.bytes ?? 0})`,
    );
  }
}

lines.push(
  "-- --------------------------------------------------------- top-N rows",
  "insert into public.rollups_topn (tenant_id, firewall_id, hour, dimension, key, count, bytes) values",
  topRows.join(",\n"),
  "on conflict (firewall_id, hour, dimension, key) do update set count = excluded.count, bytes = excluded.bytes;",
  "",
  "-- ----------------------------------------------------- hourly rollups",
  "-- Same shape as the fixtures: working hours, quiet weekends, night VPN and",
  "-- IPS bursts that do not follow the working day.",
  "with hours as (",
  `  select generate_series(date_trunc('hour', ${q(NOW)}::timestamptz) - interval '30 days',`,
  `                         date_trunc('hour', ${q(NOW)}::timestamptz), interval '1 hour') as hour`,
  "),",
  "shaped as (",
  "  select",
  "    hour,",
  "    case",
  "      when extract(hour from hour) between 8 and 12 then 1.0",
  "      when extract(hour from hour) between 13 and 18 then 0.92",
  "      when extract(hour from hour) between 6 and 7 then 0.45",
  "      when extract(hour from hour) between 19 and 21 then 0.35",
  "      else 0.12",
  "    end",
  "    * case when extract(isodow from hour) <= 5 then 1.0 else 0.22 end as load,",
  "    -- Deterministic wobble, so the curve is identical on every re-seed.",
  "    (abs(hashtext(hour::text)) % 100) / 100.0 as noise",
  "  from hours",
  "),",
  "devices as (",
  `  select ${q(UUID["fw-fgt-01"])}::uuid as firewall_id, 1.0 as scale`,
  `  union all select ${q(UUID["fw-xgs-01"])}::uuid, 0.38`,
  ")",
  "insert into public.rollups_hourly (tenant_id, firewall_id, hour, type, action, count, bytes_in, bytes_out)",
  "select * from (",
  `  select ${q(T)}::uuid, d.firewall_id, s.hour, 'traffic'::public.event_type, 'allow'::public.event_action,`,
  "         greatest(0, round(s.load * d.scale * 5400 * (0.9 + s.noise * 0.2)))::bigint,",
  "         greatest(0, round(s.load * d.scale * 5400 * 41000 * 0.7))::bigint,",
  "         greatest(0, round(s.load * d.scale * 5400 * 41000 * 0.3))::bigint",
  "  from shaped s cross join devices d",
  "  union all",
  `  select ${q(T)}::uuid, d.firewall_id, s.hour, 'traffic', 'deny',`,
  "         greatest(0, round(s.load * d.scale * 780 * (0.9 + s.noise * 0.2)))::bigint, 0, 0",
  "  from shaped s cross join devices d",
  "  union all",
  `  select ${q(T)}::uuid, d.firewall_id, s.hour, 'ips', 'block',`,
  "         greatest(0, round(s.load * d.scale * 46 + case when s.noise > 0.97 then 240 else 0 end))::bigint, 0, 0",
  "  from shaped s cross join devices d",
  "  union all",
  `  select ${q(T)}::uuid, d.firewall_id, s.hour, 'web', 'block',`,
  "         greatest(0, round(s.load * d.scale * 210))::bigint, 0, 0",
  "  from shaped s cross join devices d",
  "  union all",
  `  select ${q(T)}::uuid, d.firewall_id, s.hour, 'vpn', 'allow',`,
  "         greatest(0, round(case when extract(hour from s.hour) >= 19 or extract(hour from s.hour) <= 6",
  "                                then 14 else 5 end * d.scale))::bigint, 0, 0",
  "  from shaped s cross join devices d",
  ") as rows(tenant_id, firewall_id, hour, type, action, count, bytes_in, bytes_out)",
  "on conflict (firewall_id, hour, type, action) do update set count = excluded.count;",
  "",
  "-- ------------------------------------------------------ posture scores",
  "-- 90 days of the curve of a real service: low baseline at enrolment, steps",
  "-- when the customer closes findings, a dip when a new one appears.",
  "with days as (",
  `  select generate_series(date_trunc('day', ${q(NOW)}::timestamptz) - interval '89 days',`,
  `                         date_trunc('day', ${q(NOW)}::timestamptz), interval '1 day') as day`,
  "),",
  "curve as (",
  "  select day,",
  "    case",
  "      when day < now() - interval '77 days' then 52",
  "      when day < now() - interval '62 days' then 58",
  "      when day < now() - interval '48 days' then 61",
  "      when day < now() - interval '41 days' then 57",
  "      when day < now() - interval '26 days' then 65",
  "      when day < now() - interval '15 days' then 69",
  "      when day < now() - interval '6 days' then 72",
  "      else 74",
  "    end as value",
  "  from days",
  "),",
  "devices as (",
  `  select ${q(UUID["fw-fgt-01"])}::uuid as firewall_id, 0 as offset`,
  `  union all select ${q(UUID["fw-xgs-01"])}::uuid, -4`,
  ")",
  "insert into public.posture_scores (tenant_id, firewall_id, computed_at, value, configuration, operation)",
  `select ${q(T)}::uuid, d.firewall_id, c.day,`,
  "       greatest(0, least(100, c.value + d.offset)),",
  "       greatest(0, least(100, c.value + d.offset - 3)),",
  "       greatest(0, least(100, c.value + d.offset + 7))",
  "from curve c cross join devices d",
  "on conflict (tenant_id, firewall_id, computed_at) do update set value = excluded.value;",
  "",
  "commit;",
  "",
);

const sql = lines.join("\n");
writeFileSync(join(here, "demo.sql"), sql, "utf8");
console.log(
  `demo.sql written (${sql.length} bytes): ${DEMO_FINDINGS.length} findings, ` +
    `${DEMO_CRITICAL_EVENTS.length} events, ${DEMO_REPORTS.length} reports, ${topRows.length} top-N rows`,
);
