import assert from "node:assert/strict";
import { test } from "node:test";

import type { MsspRow } from "@/lib/data/mssp";
import { attentionFor, byAttention } from "./attention.ts";

const now = new Date("2026-09-01T12:00:00Z");

const row = (overrides: Partial<MsspRow> = {}): MsspRow => ({
  tenantId: "acme",
  name: "Acme S.A.S.",
  plan: "premium",
  score: 80,
  scoreDelta: 0,
  critical: 0,
  high: 0,
  firewalls: 1,
  collectorStatus: "active",
  untreatedEvents: 0,
  ...overrides,
});

test("un colector caído manda sobre cualquier hallazgo", () => {
  const attention = attentionFor(
    row({
      collectorStatus: "offline",
      lastSeenAt: "2026-08-29T12:00:00Z",
      critical: 9,
      score: 20,
    }),
    now,
  );

  assert.equal(attention.level, "urgent");
  assert.equal(attention.rank, 0);
  assert.match(attention.reason, /sin conexión hace 3 días/);
});

test("un evento sin atender de más de siete días pesa más que un hallazgo crítico", () => {
  const attention = attentionFor(
    row({ untreatedEvents: 2, oldestUntreatedDays: 9, critical: 3 }),
    now,
  );

  assert.equal(attention.rank, 1);
  assert.match(attention.reason, /2 eventos críticos sin atender/);
  assert.match(attention.reason, /9 días/);
});

test("un evento reciente sin atender es vigilancia, no urgencia", () => {
  const attention = attentionFor(row({ untreatedEvents: 1, oldestUntreatedDays: 2 }), now);
  assert.equal(attention.level, "watch");
  assert.equal(attention.reason, "1 evento crítico sin atender");
});

test("una caída de postura mayor a cinco puntos se señala", () => {
  assert.match(attentionFor(row({ scoreDelta: -12 }), now).reason, /bajó 12 puntos/);
  assert.equal(attentionFor(row({ scoreDelta: -3 }), now).level, "calm");
});

test("un cliente sin novedades lo dice, en vez de dejar la celda vacía", () => {
  const attention = attentionFor(row(), now);
  assert.equal(attention.level, "calm");
  assert.equal(attention.reason, "Sin novedades: nada que hacer hoy");
});

test("el orden pone la urgencia primero y la peor postura dentro de cada grupo", () => {
  const ordered = byAttention(
    [
      row({ tenantId: "tranquilo", score: 40 }),
      row({ tenantId: "critico-alto", critical: 1, score: 90 }),
      row({ tenantId: "critico-bajo", critical: 1, score: 55 }),
      row({ tenantId: "caido", collectorStatus: "offline", score: 95 }),
    ],
    now,
  );

  assert.deepEqual(
    ordered.map((item) => item.tenantId),
    ["caido", "critico-bajo", "critico-alto", "tranquilo"],
  );
});
