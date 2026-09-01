/**
 * Copies packages/schema and packages/rules into supabase/functions/_shared/,
 * rewriting the workspace import specifier to a relative path.
 *
 * Edge Functions run on Deno and are deployed on their own: they cannot resolve
 * a pnpm workspace. Copying beats duplicating — the copy is generated, never
 * edited, so the engine that runs in the cloud is byte for byte the one the
 * tests cover.
 *
 * Run: node supabase/functions/build-shared.mjs
 */
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const target = join(here, "_shared/generated");

rmSync(target, { recursive: true, force: true });

/**
 * Only the part of the contract the rules engine needs travels to the edge:
 * the device configuration and the finding lifecycle. Tenants, reports and
 * activity are portal concerns and would only make the deploy heavier.
 */
const SCHEMA_SUBSET = ["common.ts", "config.ts", "findings.ts"];

mkdirSync(join(target, "schema"), { recursive: true });
for (const file of SCHEMA_SUBSET) {
  cpSync(join(root, "packages/schema/src", file), join(target, "schema", file));
}
writeFileSync(
  join(target, "schema/index.ts"),
  SCHEMA_SUBSET.map((file) => `export * from "./${file}";\n`).join(""),
  "utf8",
);

cpSync(join(root, "packages/rules/src"), join(target, "rules"), { recursive: true });

/** Walk the copy and rewrite the workspace specifier plus drop the tests. */
function fix(dir, depth) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      fix(path, depth + 1);
      continue;
    }

    if (entry.endsWith(".test.ts") || entry === "fixture.ts") {
      rmSync(path);
      continue;
    }

    // The copy lives at _shared/generated/<pkg>/..., so a file at depth 0
    // inside `rules/` still needs one hop up to reach `schema/`.
    const up = "../".repeat(depth + 1);
    const source = readFileSync(path, "utf8").replaceAll(
      '"@eventreport/schema"',
      `"${up}schema/index.ts"`,
    );
    writeFileSync(path, source, "utf8");
  }
}

fix(join(target, "schema"), 0);
fix(join(target, "rules"), 0);

writeFileSync(
  join(target, "README.md"),
  [
    "# Generado — no editar",
    "",
    "Copia de `packages/schema` y `packages/rules` para que las Edge Functions,",
    "que corren en Deno y se despliegan solas, usen exactamente el mismo motor",
    "que cubren las pruebas.",
    "",
    "Regenerar con `node supabase/functions/build-shared.mjs`.",
    "",
  ].join("\n"),
  "utf8",
);

console.log("copiado a supabase/functions/_shared/generated (schema + rules)");
