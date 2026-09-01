import assert from "node:assert/strict";
import { test } from "node:test";
import type { Finding } from "@eventreport/schema";

import { evaluate, reconcile, toFindings } from "./engine.ts";
import { cleanInput, NOW } from "./fixture.ts";
import { score } from "./score.ts";
import type { EvaluationInput } from "./types.ts";

/** Rule codes that fired for a given input. */
function fired(input: EvaluationInput): string[] {
  return toFindings(evaluate(input)).map((finding) => finding.ruleCode);
}

test("a clean configuration fires no rule", () => {
  assert.deepEqual(fired(cleanInput()), []);
});

test("FW-001 fires when management answers on the WAN interface", () => {
  const input = cleanInput();
  input.config.mgmtAccess[0]!.protocols = ["https", "ssh", "ping"];

  const hits = toFindings(evaluate(input)).filter((finding) => finding.ruleCode === "FW-001");
  assert.equal(hits.length, 1);
  assert.equal(hits[0]!.assetKey, "wan1");
  // The evidence carries the literal values read from the device.
  assert.ok(hits[0]!.evidence.some((item) => item.value.includes("190.85.44.12")));
});

test("FW-001 ignores management on an internal interface", () => {
  const input = cleanInput();
  input.config.mgmtAccess[1]!.protocols = ["https", "ssh"];
  assert.ok(!fired(input).includes("FW-001"));
});

test("FW-006 fires only when source, destination and services are all open", () => {
  const input = cleanInput();
  const policy = input.config.policies[0]!;

  policy.src = ["any"];
  assert.ok(!fired(input).includes("FW-006"), "solo el origen abierto no basta");

  policy.dst = ["any"];
  policy.services = ["ALL"];
  assert.ok(fired(input).includes("FW-006"));
});

test("FW-006 ignores a disabled policy", () => {
  const input = cleanInput();
  Object.assign(input.config.policies[0]!, {
    enabled: false,
    src: ["any"],
    dst: ["any"],
    services: ["ALL"],
  });
  assert.ok(!fired(input).includes("FW-006"));
});

test("FW-009 fires on outbound traffic with no inspection profile", () => {
  const input = cleanInput();
  input.config.policies[0]!.profiles = {
    ips: false,
    av: false,
    web: false,
    appCtl: false,
    sslInspect: false,
  };
  assert.ok(fired(input).includes("FW-009"));
});

test("a rule the brand cannot evaluate is not a pass", () => {
  const input = cleanInput();
  input.config.capabilities.utmProfiles = false;
  input.config.policies[0]!.profiles = {
    ips: false,
    av: false,
    web: false,
    appCtl: false,
    sslInspect: false,
  };

  const result = evaluate(input).find((item) => item.code === "FW-009")!;
  assert.equal(result.evaluable, false);
  assert.equal(result.hits.length, 0);
});

test("FW-010 fires when remote desktop is published to the internet", () => {
  const input = cleanInput();
  input.config.nat.push({
    id: "vip-rdp",
    type: "dnat",
    external: "190.85.44.12:3389",
    internal: "10.10.0.42:3389",
    ports: ["3389"],
  });

  const hits = toFindings(evaluate(input)).filter((finding) => finding.ruleCode === "FW-010");
  assert.equal(hits.length, 1);
  assert.ok(hits[0]!.evidence.some((item) => item.value.includes("Escritorio remoto")));
});

test("FW-012 fires on IKEv1 and on weak ciphers", () => {
  const input = cleanInput();
  input.config.vpn.ipsec[0]!.ikeVersion = 1;
  assert.ok(fired(input).includes("FW-012"));

  const other = cleanInput();
  other.config.vpn.ipsec[0]!.encryption = "3DES-SHA1";
  assert.ok(fired(other).includes("FW-012"));
});

test("FW-013 fires when the certificate expires within a month", () => {
  const input = cleanInput();
  input.config.certs[0]!.notAfter = "2026-09-20T00:00:00Z";
  assert.ok(fired(input).includes("FW-013"));
});

test("OP-003 compares retention against what the framework demands", () => {
  const input = cleanInput();
  input.signals.requiredRetentionDays = 365;

  const hits = toFindings(evaluate(input)).filter((finding) => finding.ruleCode === "OP-003");
  assert.equal(hits.length, 1);
  assert.ok(hits[0]!.evidence.some((item) => item.value === "365 días"));
});

test("reconcile keeps what persists, opens what is new and closes what disappeared", () => {
  const existing: Finding[] = [
    {
      id: "fnd-1",
      firewallId: "fw-1",
      ruleCode: "FW-001",
      assetKey: "wan1",
      assetLabel: "Interfaz wan1",
      status: "open",
      severity: "critical",
      firstSeen: "2026-06-01T00:00:00Z",
      lastSeen: "2026-08-31T00:00:00Z",
      evidence: [],
    },
    {
      id: "fnd-2",
      firewallId: "fw-1",
      ruleCode: "FW-014",
      assetKey: "snmp",
      assetLabel: "Servicio SNMP",
      status: "open",
      severity: "low",
      firstSeen: "2026-07-01T00:00:00Z",
      lastSeen: "2026-08-31T00:00:00Z",
      evidence: [],
    },
  ];

  const input = cleanInput();
  input.config.mgmtAccess[0]!.protocols = ["https"];

  const { opened, updated, resolved } = reconcile(existing, toFindings(evaluate(input)));

  assert.deepEqual(
    updated.map((item) => item.id),
    ["fnd-1"],
    "el hallazgo que sigue vivo conserva su id y su primera detección",
  );
  assert.deepEqual(opened, []);
  assert.deepEqual(
    resolved.map((finding) => finding.id),
    ["fnd-2"],
    "el que ya no aparece se resuelve, no se borra",
  );
});

test("the score falls with severity and recovers when findings are closed", () => {
  const healthy = score({
    configurationFindings: [],
    operationFindings: [],
    policies: 40,
    admins: 3,
    droppedPct: 0.2,
    expiredLicenses: 0,
    haDegraded: false,
    untreatedCriticalEvents: 0,
  });
  assert.equal(healthy.value, 100);

  const damaged = score({
    configurationFindings: [{ severity: "critical" }, { severity: "high" }],
    operationFindings: [{ severity: "medium" }],
    policies: 40,
    admins: 3,
    droppedPct: 2.7,
    expiredLicenses: 1,
    haDegraded: true,
    untreatedCriticalEvents: 6,
  });

  assert.ok(damaged.value < healthy.value);
  assert.ok(damaged.configuration > damaged.operation, "la operación pesa menos pero cae más rápido");
});

test("the evaluation instant is injected, so results are reproducible", () => {
  const input = cleanInput();
  input.now = NOW;
  assert.deepEqual(fired(input), fired(input));
});

test("the score never bottoms out: it still separates bad from catastrophic", () => {
  const base = {
    operationFindings: [],
    policies: 2,
    admins: 2,
    droppedPct: 0,
    expiredLicenses: 0,
    haDegraded: false,
    untreatedCriticalEvents: 0,
  };

  const bad = score({ ...base, configurationFindings: [{ severity: "critical" }] });
  const worse = score({
    ...base,
    configurationFindings: [
      { severity: "critical" },
      { severity: "critical" },
      { severity: "high" },
      { severity: "high" },
    ],
  });

  assert.ok(worse.value < bad.value, "más hallazgos, menos score");
  assert.ok(worse.value > 0, "un firewall pequeño y roto no marca cero: seguiría sin poder mejorar");
});
