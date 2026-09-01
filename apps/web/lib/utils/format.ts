/**
 * Formato de valores para la interfaz. Todo en es-CO y en UTC, para que las
 * capturas y los informes no cambien según la máquina que los genere.
 */

const DATE_TIME = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const DATE = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "31 ago": sin "de" y sin punto, para que quepa en una celda de tabla. */
const DAY = new Intl.DateTimeFormat("es-CO", { day: "2-digit", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" });

const NUMBER = new Intl.NumberFormat("es-CO");

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

export function formatDateShort(iso: string): string {
  const date = new Date(iso);
  return `${DAY.format(date)} ${MONTH.format(date).replace(".", "")}`;
}

export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

/** Bytes en la unidad que un gerente lee sin traducir. */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/** "hace 4 minutos", para el estado del colector. */
export function formatSince(iso: string, now: string): string {
  const diffMinutes = Math.round((new Date(now).getTime() - new Date(iso).getTime()) / 60_000);
  if (diffMinutes < 1) return "hace menos de un minuto";
  if (diffMinutes < 60) return `hace ${diffMinutes} minuto${diffMinutes === 1 ? "" : "s"}`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `hace ${hours} hora${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `hace ${days} día${days === 1 ? "" : "s"}`;
}
