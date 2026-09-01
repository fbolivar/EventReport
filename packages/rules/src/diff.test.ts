import assert from "node:assert/strict";
import { test } from "node:test";
import type { FirewallConfig } from "@eventreport/schema";

import { diffConfigs } from "./diff.ts";
import { cleanConfig } from "./fixture.ts";

const clone = (config: FirewallConfig): FirewallConfig =>
  JSON.parse(JSON.stringify(config)) as FirewallConfig;

test("dos snapshots iguales no producen cambios", () => {
  assert.deepEqual(diffConfigs(cleanConfig(), cleanConfig()), []);
});

test("reordenar las políticas no es un cambio", () => {
  const next = clone(cleanConfig());
  next.policies.reverse();
  next.policies.forEach((policy, index) => (policy.position = index + 1));
  assert.deepEqual(diffConfigs(cleanConfig(), next), []);
});

test("una política nueva se reporta como alta", () => {
  const previous = cleanConfig();
  const next = clone(previous);
  const first = previous.policies[0]!;
  next.policies.push({ ...first, id: "999", name: "TEMP_ANY", position: 99 });

  const changes = diffConfigs(previous, next);
  assert.equal(changes.length, 1);
  assert.equal(changes[0]!.kind, "added");
  assert.match(changes[0]!.target, /999/);
});

test("abrir el destino de una política se reporta campo por campo", () => {
  const previous = cleanConfig();
  const next = clone(previous);
  next.policies[0]!.dst = ["any"];
  next.policies[0]!.services = ["ALL"];

  const [change] = diffConfigs(previous, next);
  assert.equal(change?.kind, "modified");
  assert.deepEqual(
    change?.fields.map((field) => field.field).sort(),
    ["Destino", "Servicios"],
  );
  assert.equal(change?.fields.find((field) => field.field === "Servicios")?.after, "ALL");
});

test("quitar el segundo factor de un administrador se ve", () => {
  const previous = cleanConfig();
  const next = clone(previous);
  next.admins[0]!.mfa = !previous.admins[0]!.mfa;

  const [change] = diffConfigs(previous, next);
  assert.equal(change?.section, "admins");
  assert.equal(change?.fields[0]?.field, "Segundo factor");
});

test("un administrador eliminado se reporta como baja", () => {
  const previous = cleanConfig();
  const next = clone(previous);
  const removed = next.admins.pop()!;

  const changes = diffConfigs(previous, next);
  assert.equal(changes.length, 1);
  assert.equal(changes[0]!.kind, "removed");
  assert.match(changes[0]!.target, new RegExp(removed.name));
});

test("el diff nunca contiene una credencial", () => {
  const previous = cleanConfig();
  const next = clone(previous);
  next.vpn.ipsec[0]!.encryption = "3des";
  next.vpn.ipsec[0]!.auth = "psk";

  const serialized = JSON.stringify(diffConfigs(previous, next));
  for (const secret of ["psk:", "secret", "password", "community"]) {
    assert.ok(!serialized.toLowerCase().includes(secret), `${secret} no debe viajar en el diff`);
  }
});

test("el orden de los perfiles de inspección no es un cambio", () => {
  const previous = cleanConfig();
  const next = clone(previous);
  const profiles = next.policies[0]!.profiles;
  next.policies[0]!.profiles = {
    web: profiles.web,
    ips: profiles.ips,
    appCtl: profiles.appCtl,
    av: profiles.av,
    sslInspect: profiles.sslInspect,
  };

  assert.deepEqual(diffConfigs(previous, next), []);
});

test("mover una política de posición sí es un cambio", () => {
  const previous = cleanConfig();
  const next = clone(previous);
  next.policies[0]!.position = 99;

  const [change] = diffConfigs(previous, next);
  assert.equal(change?.fields[0]?.field, "Posición");
});
