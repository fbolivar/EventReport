import type { MsspRow } from "@/lib/data/mssp";

/**
 * Por qué hay que atender a un cliente hoy.
 *
 * Un tablero multicliente ordenado solo por puntaje obliga a abrir cada
 * empresa para entender qué pasa. El proveedor necesita lo contrario: una
 * frase por cliente que diga qué hacer, y un orden que ponga primero lo que se
 * puede perder.
 *
 * La prioridad no es el puntaje. Un colector caído deja al cliente sin datos
 * —el informe del mes saldrá incompleto y nadie se entera hasta abrirlo—, así
 * que va antes que cualquier hallazgo. Después los eventos sin atender, que
 * son los que ya ocurrieron. El puntaje bajo es una condición, no una urgencia.
 */
export type AttentionLevel = "urgent" | "watch" | "calm";

export interface Attention {
  level: AttentionLevel;
  reason: string;
  /** Orden dentro del tablero: menor primero. */
  rank: number;
}

const days = (value: number) => (value === 1 ? "1 día" : `${value} días`);

export function attentionFor(row: MsspRow, now: Date = new Date()): Attention {
  if (row.collectorStatus === "offline") {
    const since = row.lastSeenAt
      ? Math.floor((now.getTime() - Date.parse(row.lastSeenAt)) / 86_400_000)
      : undefined;
    return {
      level: "urgent",
      reason: since
        ? `Colector sin conexión hace ${days(since)}: no hay datos nuevos`
        : "Colector sin conexión: no hay datos nuevos",
      rank: 0,
    };
  }

  // Siete días es el umbral de OP-002: pasado eso, el evento ya es un hallazgo.
  if (row.untreatedEvents > 0 && (row.oldestUntreatedDays ?? 0) >= 7) {
    return {
      level: "urgent",
      reason: `${row.untreatedEvents} evento${row.untreatedEvents === 1 ? "" : "s"} crítico${
        row.untreatedEvents === 1 ? "" : "s"
      } sin atender, el más viejo hace ${days(row.oldestUntreatedDays ?? 0)}`,
      rank: 1,
    };
  }

  if (row.critical > 0) {
    return {
      level: "urgent",
      reason: `${row.critical} hallazgo${row.critical === 1 ? "" : "s"} crítico${
        row.critical === 1 ? "" : "s"
      } abierto${row.critical === 1 ? "" : "s"}`,
      rank: 2,
    };
  }

  if (row.scoreDelta < -5) {
    return {
      level: "watch",
      reason: `La postura bajó ${Math.abs(row.scoreDelta)} puntos`,
      rank: 3,
    };
  }

  if (row.untreatedEvents > 0) {
    return {
      level: "watch",
      reason: `${row.untreatedEvents} evento${
        row.untreatedEvents === 1 ? "" : "s"
      } crítico${row.untreatedEvents === 1 ? "" : "s"} sin atender`,
      rank: 4,
    };
  }

  if (row.collectorStatus === "stale") {
    return { level: "watch", reason: "El colector lleva horas sin reportar", rank: 5 };
  }

  if (row.high > 0) {
    return {
      level: "watch",
      reason: `${row.high} hallazgo${row.high === 1 ? "" : "s"} de severidad alta`,
      rank: 6,
    };
  }

  return { level: "calm", reason: "Sin novedades: nada que hacer hoy", rank: 7 };
}

/** Ordena por urgencia y, dentro de la misma urgencia, por peor postura. */
export function byAttention(rows: MsspRow[], now: Date = new Date()): Array<MsspRow & Attention> {
  return rows
    .map((row) => ({ ...row, ...attentionFor(row, now) }))
    .sort((a, b) => a.rank - b.rank || a.score - b.score);
}
