/**
 * Score de postura y tendencia (docs/diseno-tecnico.md §11).
 * La serie es determinista: la misma curva en cada render y en cada captura,
 * para poder comparar iteraciones de diseño.
 */
import type { PostureScore, ScorePoint, Severity } from "@eventreport/schema";

export const DEMO_SCORE: PostureScore = {
  value: 74,
  configuration: 71,
  operation: 81,
  previousValue: 65,
  computedAt: "2026-08-31T02:00:00Z",
};

/**
 * 90 días con la forma real del servicio: línea base baja al enrolar, saltos
 * cuando el cliente cierra hallazgos, una caída cuando aparece uno nuevo.
 */
export function buildTrend(days = 90, endIso = "2026-08-31T00:00:00Z"): ScorePoint[] {
  const end = new Date(endIso).getTime();
  const dayMs = 86_400_000;
  const points: ScorePoint[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const dayIndex = days - 1 - i;
    let value = 52;
    if (dayIndex > 12) value = 58; // primer hardening: cierre de NAT expuesto
    if (dayIndex > 27) value = 61;
    if (dayIndex > 41) value = 57; // firmware nuevo con CVE publicado
    if (dayIndex > 48) value = 65;
    if (dayIndex > 63) value = 69; // MFA en administradores
    if (dayIndex > 74) value = 72;
    if (dayIndex > 83) value = 74;
    // Oscilación diaria del componente de operación, no ruido decorativo.
    const wobble = ((dayIndex * 7) % 5) - 2;
    points.push({
      date: new Date(end - i * dayMs).toISOString(),
      value: Math.max(0, Math.min(100, value + wobble)),
    });
  }

  return points;
}

export const DEMO_TREND = buildTrend();

export const DEMO_SEVERITY_COUNTS: Record<Severity, number> = {
  critical: 2,
  high: 4,
  medium: 6,
  low: 2,
};
