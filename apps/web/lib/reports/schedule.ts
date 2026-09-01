import type { FrameworkCode, PlanCode, ReportType } from "@eventreport/schema";

/**
 * Qué informe le toca a cada cliente y cuándo (docs/diseno-tecnico.md §10).
 *
 * Función pura y sin dependencias: recibe la fecha, el plan, los marcos activos
 * y lo que ya se generó, y devuelve lo que falta. Así la política de entrega se
 * puede probar sin base de datos y sin generar un PDF, que es lo caro.
 *
 * Los períodos son **cerrados**: el ejecutivo del mes pasado, el cumplimiento
 * del trimestre pasado. Un informe mensual emitido a mitad de mes no se puede
 * comparar con el siguiente, y el cliente no sabría cuál de los dos archivar.
 */
export interface ScheduledJob {
  type: ReportType;
  framework?: FrameworkCode;
  periodStart: string;
  periodEnd: string;
}

/** Un informe ya emitido: basta el tipo, el marco y el inicio del período. */
export interface ExistingReport {
  type: ReportType;
  framework?: FrameworkCode;
  periodStart: string;
}

export interface ScheduleInput {
  now: Date;
  plan: PlanCode;
  frameworks: FrameworkCode[];
  existing: ExistingReport[];
}

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Mes calendario anterior al de `now`, en UTC. */
export function previousMonth(now: Date): { start: string; end: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return { start: iso(start), end: iso(end) };
}

/** Trimestre calendario anterior al que contiene `now`, en UTC. */
export function previousQuarter(now: Date): { start: string; end: string } {
  const quarter = Math.floor(now.getUTCMonth() / 3);
  const start = new Date(Date.UTC(now.getUTCFullYear(), quarter * 3 - 3, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), quarter * 3, 0));
  return { start: iso(start), end: iso(end) };
}

export function dueReports({ now, plan, frameworks, existing }: ScheduleInput): ScheduledJob[] {
  const month = previousMonth(now);
  const quarter = previousQuarter(now);

  const wanted: ScheduledJob[] = [
    { type: "executive", periodStart: month.start, periodEnd: month.end },
  ];

  if (plan === "standard" || plan === "premium") {
    wanted.push({ type: "hardening", periodStart: month.start, periodEnd: month.end });
  }

  if (plan === "premium") {
    for (const framework of frameworks) {
      wanted.push({
        type: "compliance",
        framework,
        periodStart: quarter.start,
        periodEnd: quarter.end,
      });
    }
  }

  const alreadyDone = new Set(
    existing.map((item) => `${item.type}:${item.framework ?? ""}:${item.periodStart.slice(0, 10)}`),
  );

  return wanted.filter(
    (job) => !alreadyDone.has(`${job.type}:${job.framework ?? ""}:${job.periodStart}`),
  );
}
