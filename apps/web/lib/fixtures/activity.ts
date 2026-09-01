/**
 * Rollups horarios sintéticos con la forma real del tráfico de una PYME:
 * jornada laboral de lunes a viernes, caída en la madrugada, VPN de noche y
 * ráfagas de IPS. Deterministas: la misma curva en cada render.
 *
 * Estructura idéntica a `rollups_hourly` y `rollups_topn` (§9).
 */
import type { EventType, HourlyRollup, TopNDimension } from "@eventreport/schema";

import { NOW } from "./tenant.ts";

const HOUR_MS = 3_600_000;

/** Perfil de actividad por hora del día, 0 a 1. */
function dayProfile(hour: number): number {
  if (hour >= 8 && hour <= 12) return 1;
  if (hour >= 13 && hour <= 18) return 0.92;
  if (hour >= 6 && hour < 8) return 0.45;
  if (hour > 18 && hour <= 21) return 0.35;
  return 0.12;
}

/** Ruido determinista: mismo valor para la misma hora, sin Math.random. */
function jitter(seed: number, amplitude: number): number {
  const value = Math.sin(seed * 12.9898) * 43_758.5453;
  return (value - Math.floor(value) - 0.5) * 2 * amplitude;
}

export interface ActivitySeriesPoint {
  hour: string;
  allowed: number;
  denied: number;
  blockedIps: number;
  blockedWeb: number;
  vpnSessions: number;
  bytes: number;
}

/**
 * Serie por hora de los últimos `days` días para un firewall.
 * `scale` distingue la sede principal de la planta sin duplicar la lógica.
 */
export function buildActivitySeries(days = 30, scale = 1): ActivitySeriesPoint[] {
  const end = new Date(NOW).setUTCMinutes(0, 0, 0);
  const points: ActivitySeriesPoint[] = [];

  for (let i = days * 24 - 1; i >= 0; i -= 1) {
    const ts = end - i * HOUR_MS;
    const date = new Date(ts);
    const hour = date.getUTCHours();
    const weekday = date.getUTCDay();
    const isWorkday = weekday >= 1 && weekday <= 5;

    const base = dayProfile(hour) * (isWorkday ? 1 : 0.22) * scale;
    const seed = ts / HOUR_MS;

    const allowed = Math.max(0, Math.round(base * 5_400 + jitter(seed, 320)));
    const denied = Math.max(0, Math.round(base * 780 + jitter(seed + 1, 90)));
    // Las ráfagas de IPS no siguen la jornada: llegan de afuera a cualquier hora.
    const burst = seed % 53 === 0 ? 240 : 0;
    const blockedIps = Math.max(0, Math.round(base * 46 + burst + jitter(seed + 2, 12)));
    const blockedWeb = Math.max(0, Math.round(base * 210 + jitter(seed + 3, 30)));
    // La VPN se usa fuera de horario: es su razón de existir.
    const vpnSessions = Math.max(
      0,
      Math.round((hour >= 19 || hour <= 6 ? 14 : 5) * scale + jitter(seed + 4, 3)),
    );
    const bytes = Math.round((allowed * 41_000 + denied * 900) * (0.9 + jitter(seed + 5, 0.1)));

    points.push({
      hour: date.toISOString(),
      allowed,
      denied,
      blockedIps,
      blockedWeb,
      vpnSessions,
      bytes,
    });
  }

  return points;
}

export const DEMO_ACTIVITY: Record<string, ActivitySeriesPoint[]> = {
  "fw-fgt-01": buildActivitySeries(30, 1),
  "fw-xgs-01": buildActivitySeries(30, 0.38),
};

/** Suma de todos los firewalls del tenant, hora por hora. */
export function tenantActivity(days = 30): ActivitySeriesPoint[] {
  const series = Object.values(DEMO_ACTIVITY).map((points) => points.slice(-days * 24));
  const first = series[0];
  if (!first) return [];

  return first.map((point, index) => {
    const totals = { ...point };
    for (const other of series.slice(1)) {
      const match = other[index];
      if (!match) continue;
      totals.allowed += match.allowed;
      totals.denied += match.denied;
      totals.blockedIps += match.blockedIps;
      totals.blockedWeb += match.blockedWeb;
      totals.vpnSessions += match.vpnSessions;
      totals.bytes += match.bytes;
    }
    return totals;
  });
}

export interface DailyPoint {
  date: string;
  allowed: number;
  denied: number;
  blockedIps: number;
  bytes: number;
}

/** Agregación diaria, que es la que se lee en una gráfica de 30 días. */
export function toDaily(points: ActivitySeriesPoint[]): DailyPoint[] {
  const byDay = new Map<string, DailyPoint>();

  for (const point of points) {
    const day = point.hour.slice(0, 10);
    const current = byDay.get(day) ?? { date: day, allowed: 0, denied: 0, blockedIps: 0, bytes: 0 };
    current.allowed += point.allowed;
    current.denied += point.denied;
    current.blockedIps += point.blockedIps;
    current.bytes += point.bytes;
    byDay.set(day, current);
  }

  return [...byDay.values()];
}

/** Promedio por hora del día: revela el horario real de la empresa. */
export function hourOfDayAverage(points: ActivitySeriesPoint[]): number[] {
  const sums = new Array<number>(24).fill(0);
  const counts = new Array<number>(24).fill(0);

  for (const point of points) {
    const hour = new Date(point.hour).getUTCHours();
    sums[hour] = (sums[hour] ?? 0) + point.allowed;
    counts[hour] = (counts[hour] ?? 0) + 1;
  }

  return sums.map((sum, hour) => Math.round(sum / Math.max(1, counts[hour] ?? 1)));
}

export interface TopEntry {
  key: string;
  count: number;
  bytes?: number;
}

/** Top-N por dimensión (§6.2, N = 50; aquí los que se muestran). */
export const DEMO_TOPN: Record<TopNDimension, TopEntry[]> = {
  src_country: [
    { key: "Colombia", count: 812_440 },
    { key: "Estados Unidos", count: 214_009 },
    { key: "Países Bajos", count: 38_112 },
    { key: "Rusia", count: 21_887 },
    { key: "China", count: 18_204 },
    { key: "Brasil", count: 9_640 },
  ],
  src_ip_denied: [
    { key: "45.155.205.7", count: 12_884 },
    { key: "185.220.101.34", count: 9_118 },
    { key: "193.32.162.19", count: 7_402 },
    { key: "141.98.10.212", count: 5_559 },
    { key: "89.248.165.44", count: 4_031 },
  ],
  dst_ip: [
    { key: "20.190.160.14", count: 188_402, bytes: 412_000_000_000 },
    { key: "142.250.78.14", count: 141_220, bytes: 288_000_000_000 },
    { key: "13.107.42.14", count: 98_774, bytes: 96_000_000_000 },
  ],
  dst_port: [
    { key: "443", count: 1_042_118 },
    { key: "80", count: 118_402 },
    { key: "3389", count: 27_940 },
    { key: "22", count: 12_884 },
    { key: "53", count: 9_774 },
  ],
  app: [
    { key: "Microsoft 365", count: 402_118, bytes: 512_000_000_000 },
    { key: "Google Workspace", count: 188_220, bytes: 240_000_000_000 },
    { key: "WhatsApp Web", count: 96_004, bytes: 41_000_000_000 },
    { key: "YouTube", count: 71_338, bytes: 388_000_000_000 },
    { key: "Dropbox", count: 22_119, bytes: 88_000_000_000 },
    { key: "TeamViewer", count: 8_442, bytes: 6_000_000_000 },
  ],
  web_category: [
    { key: "Negocios y economía", count: 288_114 },
    { key: "Tecnología", count: 201_009 },
    { key: "Redes sociales", count: 142_880 },
    { key: "Streaming", count: 88_402 },
    { key: "Apuestas (bloqueado)", count: 4_118 },
    { key: "Malware (bloqueado)", count: 1_402 },
  ],
  vpn_user: [
    { key: "agomez", count: 188 },
    { key: "crestrepo", count: 142 },
    { key: "jperez", count: 96 },
    { key: "soporte", count: 41 },
  ],
  ips_signature: [
    { key: "Apache.Struts.RCE", count: 1_884 },
    { key: "MS.RDP.BlueKeep", count: 1_204 },
    { key: "SSH.Brute.Force", count: 998 },
    { key: "PHPUnit.RCE", count: 412 },
  ],
  policy: [
    { key: "14 · LAN_to_WAN", count: 1_204_881, bytes: 812_000_000_000 },
    { key: "7 · PLANTA_OUT", count: 388_004, bytes: 412_000_000_000 },
    { key: "3 · SRV_ANY", count: 88_112, bytes: 96_000_000_000 },
  ],
};

/** Conteo por tipo de evento del período, para el desglose del informe. */
export const DEMO_EVENT_TYPE_TOTALS: Record<EventType, number> = {
  traffic: 2_884_112,
  ips: 41_882,
  av: 1_204,
  web: 188_402,
  app: 402_118,
  vpn: 4_118,
  admin: 312,
  system: 1_044,
};

/** Fila cruda de `rollups_hourly`, para probar el mapeo con la BD real. */
export function toHourlyRollups(
  firewallId: string,
  points: ActivitySeriesPoint[],
): HourlyRollup[] {
  return points.flatMap((point) => [
    {
      firewallId,
      hour: point.hour,
      type: "traffic" as const,
      action: "allow" as const,
      count: point.allowed,
      bytesIn: Math.round(point.bytes * 0.7),
      bytesOut: Math.round(point.bytes * 0.3),
    },
    {
      firewallId,
      hour: point.hour,
      type: "traffic" as const,
      action: "deny" as const,
      count: point.denied,
      bytesIn: 0,
      bytesOut: 0,
    },
    {
      firewallId,
      hour: point.hour,
      type: "ips" as const,
      action: "block" as const,
      count: point.blockedIps,
      bytesIn: 0,
      bytesOut: 0,
    },
  ]);
}
