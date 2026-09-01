import assert from "node:assert/strict";
import { test } from "node:test";

import { dueReports, previousMonth, previousQuarter } from "./schedule.ts";

const now = new Date("2026-09-01T06:00:00Z");

test("el período mensual es el mes calendario cerrado anterior", () => {
  assert.deepEqual(previousMonth(now), { start: "2026-08-01", end: "2026-08-31" });
  assert.deepEqual(previousMonth(new Date("2026-01-03T00:00:00Z")), {
    start: "2025-12-01",
    end: "2025-12-31",
  });
});

test("el período trimestral es el trimestre cerrado anterior", () => {
  assert.deepEqual(previousQuarter(now), { start: "2026-04-01", end: "2026-06-30" });
  assert.deepEqual(previousQuarter(new Date("2026-02-10T00:00:00Z")), {
    start: "2025-10-01",
    end: "2025-12-31",
  });
});

test("el plan básico solo recibe el ejecutivo", () => {
  const jobs = dueReports({ now, plan: "basic", frameworks: ["iso27001"], existing: [] });
  assert.deepEqual(
    jobs.map((job) => job.type),
    ["executive"],
  );
});

test("el plan estándar agrega hardening y actividad; el premium, cumplimiento por marco", () => {
  const standard = dueReports({ now, plan: "standard", frameworks: ["iso27001"], existing: [] });
  assert.deepEqual(
    standard.map((job) => job.type),
    ["executive", "hardening", "activity"],
  );

  const premium = dueReports({
    now,
    plan: "premium",
    frameworks: ["iso27001", "pci_dss"],
    existing: [],
  });
  assert.deepEqual(
    premium.map((job) => `${job.type}${job.framework ? `:${job.framework}` : ""}`),
    ["executive", "hardening", "activity", "compliance:iso27001", "compliance:pci_dss"],
  );
});

test("no repite un informe que ya existe para ese período", () => {
  const jobs = dueReports({
    now,
    plan: "premium",
    frameworks: ["iso27001"],
    existing: [
      { type: "executive", periodStart: "2026-08-01T00:00:00Z" },
      { type: "compliance", framework: "iso27001", periodStart: "2026-04-01T00:00:00Z" },
    ],
  });
  assert.deepEqual(
    jobs.map((job) => job.type),
    ["hardening", "activity"],
  );
});

test("un informe del mismo tipo pero de otro marco no cuenta como hecho", () => {
  const jobs = dueReports({
    now,
    plan: "premium",
    frameworks: ["iso27001", "pci_dss"],
    existing: [{ type: "compliance", framework: "pci_dss", periodStart: "2026-04-01" }],
  });
  assert.ok(jobs.some((job) => job.type === "compliance" && job.framework === "iso27001"));
  assert.ok(!jobs.some((job) => job.framework === "pci_dss"));
});
