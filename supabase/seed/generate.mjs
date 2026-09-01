/**
 * Generates supabase/seed/seed.sql from the catalogue that the portal already
 * uses. One source of truth: if a rule, a control or a mapping changes in
 * apps/web/lib/fixtures, the seed changes with it and nobody transcribes SQL
 * by hand.
 *
 * Run with Node 20+ (type stripping): node supabase/seed/generate.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "../../apps/web/lib/fixtures");

/** Windows absolute paths need a file:// URL for dynamic import. */
const load = (file) => import(pathToFileURL(join(fixtures, file)).href);

const { FINDING_RULES } = await load("rules.ts");
const { RULE_CONTROLS } = await load("rule-controls.ts");
const { DEMO_FRAMEWORKS, controlsFor } = await load("catalog.ts");
const { DEMO_REMEDIATIONS } = await load("findings.ts");

/** Postgres string literal, escaping single quotes. */
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const array = (values) => `array[${values.map(q).join(",")}]`;

/** One INSERT per table with every row, so the seed applies in one round trip. */
function insert(table, columns, rows, conflict) {
  return [
    `insert into public.${table} (${columns.join(", ")}) values`,
    rows.map((row) => `  (${row})`).join(",\n"),
    conflict,
    "",
  ].join("\n");
}

const controls = DEMO_FRAMEWORKS.flatMap((framework) => controlsFor(framework.code));

const sql = [
  "-- EventReport — catalogue seed (rules, frameworks, controls, mapping).",
  "-- GENERATED FILE: do not edit by hand.",
  "-- Source: apps/web/lib/fixtures (rules, rule-controls, catalog, findings).",
  "-- Regenerate with: node supabase/seed/generate.mjs",
  "",
  "begin;",
  "",
  insert(
    "finding_rules",
    ["code", "severity", "domain", "title", "description"],
    FINDING_RULES.map(
      (rule) =>
        `${q(rule.code)}, ${q(rule.severity)}, ${q(rule.domain)}, ${q(rule.title)}, ${q(rule.description)}`,
    ),
    "on conflict (code) do update set severity = excluded.severity, domain = excluded.domain, title = excluded.title, description = excluded.description;",
  ),
  insert(
    "frameworks",
    ["code", "name", "version", "log_retention_days", "total_controls", "scope_note"],
    DEMO_FRAMEWORKS.map(
      (f) =>
        `${q(f.code)}, ${q(f.name)}, ${q(f.version)}, ${f.logRetentionDays}, ${f.totalControls}, ${q(f.scopeNote)}`,
    ),
    "on conflict (code) do update set name = excluded.name, version = excluded.version, log_retention_days = excluded.log_retention_days, total_controls = excluded.total_controls, scope_note = excluded.scope_note;",
  ),
  insert(
    "controls",
    ["framework_code", "code", "title", "domain"],
    controls.map(
      (c) => `${q(c.frameworkCode)}, ${q(c.code)}, ${q(c.title)}, ${q(c.domain)}`,
    ),
    "on conflict (framework_code, code) do update set title = excluded.title, domain = excluded.domain;",
  ),
  insert(
    "rule_controls",
    ["rule_code", "framework_code", "control_code"],
    RULE_CONTROLS.map(
      (r) => `${q(r.ruleCode)}, ${q(r.frameworkCode)}, ${q(r.controlCode)}`,
    ),
    "on conflict do nothing;",
  ),
  insert(
    "rule_remediations",
    ["rule_code", "brand", "steps"],
    DEMO_REMEDIATIONS.map((r) => `${q(r.ruleCode)}, ${q(r.brand)}, ${array(r.steps)}`),
    "on conflict (rule_code, brand) do update set steps = excluded.steps;",
  ),
  "commit;",
  "",
].join("\n");

writeFileSync(join(here, "seed.sql"), sql, "utf8");

console.log(
  `seed.sql written (${sql.length} bytes): ${FINDING_RULES.length} rules, ` +
    `${DEMO_FRAMEWORKS.length} frameworks, ${controls.length} controls, ` +
    `${RULE_CONTROLS.length} mappings, ${DEMO_REMEDIATIONS.length} remediations`,
);
