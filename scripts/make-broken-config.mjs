/**
 * Builds an `ingest-config` payload from a deliberately broken firewall:
 * management exposed on the WAN, an any→any policy with no logging, remote
 * desktop published, and an admin with no second factor.
 *
 * Used to prove the rules engine end to end against the deployed function.
 */
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { cleanConfig } = await import(
  pathToFileURL(join(here, "../packages/rules/src/fixture.ts")).href
);

const config = cleanConfig();

config.mgmtAccess[0].protocols = ["https", "ssh", "ping"];
config.policies.push({
  id: "3",
  name: "SRV_ANY",
  position: 2,
  enabled: true,
  srcZones: ["lan"],
  dstZones: ["wan"],
  src: ["any"],
  dst: ["any"],
  services: ["ALL"],
  action: "allow",
  log: "none",
  profiles: { ips: false, av: false, web: false, appCtl: false, sslInspect: false },
  hitCount: 88_112,
  lastHit: new Date().toISOString(),
});
config.nat.push({
  id: "vip-rdp",
  type: "dnat",
  external: "190.85.44.12:3389",
  internal: "10.10.0.42:3389",
  ports: ["3389"],
});
config.admins.push({
  name: "soporte",
  profile: "super",
  mfa: false,
  trustedHosts: [],
  lastLogin: "2026-08-29T08:11:00Z",
});

const payload = {
  firewallId: process.argv[2] ?? "a0000000-0000-4000-8000-000000000031",
  collectedAt: new Date().toISOString(),
  sha256: "a".repeat(64),
  config,
};

const out = process.argv[3] ?? join(here, "../.tmp-config.json");
writeFileSync(out, JSON.stringify(payload), "utf8");
console.log(`payload escrito en ${out} (${JSON.stringify(payload).length} bytes)`);
