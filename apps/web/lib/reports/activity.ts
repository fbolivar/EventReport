import type { TopNDimension } from "@eventreport/schema";

import { activitySeries, topN } from "@/lib/data/activity";
import { getTenant, listFirewalls } from "@/lib/data/tenant";
import { hourOfDayAverage, toDaily } from "@/lib/fixtures/activity";

/**
 * Informe de actividad de red (§8, mensual).
 *
 * Todo sale de `rollups_hourly` y `rollups_topn`: contadores por hora que sube
 * el colector. Ninguna línea de log cruda existe en la nube, así que este
 * informe dice cuánto y de qué tipo, nunca "esta persona entró a este sitio".
 * Esa frontera es del producto, no una limitación técnica.
 *
 * Sin modelo: son cifras y listas. Lo que un gerente necesita interpretado ya
 * está en el informe ejecutivo.
 */
export interface ActivityReportInput {
  tenant: { name: string };
  period: { start: string; end: string; days: number };
  totals: {
    allowed: number;
    denied: number;
    blockedIps: number;
    blockedWeb: number;
    vpnSessions: number;
    bytesLabel: string;
    deniedShare: number;
  };
  /** Un renglón por día, para ver la forma del período sin necesidad de gráfico. */
  daily: Array<{ date: string; allowed: number; denied: number; bytesLabel: string }>;
  /** Promedio de sesiones permitidas por hora del día: revela actividad fuera de horario. */
  byHour: number[];
  tops: Array<{ dimension: TopNDimension; title: string; entries: Array<{ key: string; count: number }> }>;
  devices: Array<{ hostname: string; brand: string; firmware: string }>;
}

const DIMENSIONS: Array<{ dimension: TopNDimension; title: string }> = [
  { dimension: "app", title: "Aplicaciones con más tráfico" },
  { dimension: "web_category", title: "Categorías web más visitadas" },
  { dimension: "src_country", title: "Países de origen" },
  { dimension: "src_ip_denied", title: "Direcciones de origen más rechazadas" },
  { dimension: "dst_port", title: "Puertos destino" },
  { dimension: "vpn_user", title: "Usuarios de VPN" },
];

export async function buildActivityInput(
  tenantSlug: string,
  periodStart: string,
  periodEnd: string,
  formatBytes: (bytes: number) => string,
): Promise<ActivityReportInput | undefined> {
  const days = Math.max(
    1,
    Math.round((Date.parse(periodEnd) - Date.parse(periodStart)) / 86_400_000),
  );

  const [tenant, firewalls, series] = await Promise.all([
    getTenant(tenantSlug),
    listFirewalls(),
    activitySeries(days),
  ]);
  if (!tenant) return undefined;

  const tops = await Promise.all(
    DIMENSIONS.map(async ({ dimension, title }) => ({
      dimension,
      title,
      entries: (await topN(dimension, days, 8)).map((entry) => ({
        key: entry.key,
        count: entry.count,
      })),
    })),
  );

  const totals = series.reduce(
    (sum, point) => ({
      allowed: sum.allowed + point.allowed,
      denied: sum.denied + point.denied,
      blockedIps: sum.blockedIps + point.blockedIps,
      blockedWeb: sum.blockedWeb + point.blockedWeb,
      vpnSessions: sum.vpnSessions + point.vpnSessions,
      bytes: sum.bytes + point.bytes,
    }),
    { allowed: 0, denied: 0, blockedIps: 0, blockedWeb: 0, vpnSessions: 0, bytes: 0 },
  );

  const attempts = totals.allowed + totals.denied;

  return {
    tenant: { name: tenant.name },
    period: { start: periodStart, end: periodEnd, days },
    totals: {
      allowed: totals.allowed,
      denied: totals.denied,
      blockedIps: totals.blockedIps,
      blockedWeb: totals.blockedWeb,
      vpnSessions: totals.vpnSessions,
      bytesLabel: formatBytes(totals.bytes),
      deniedShare: attempts === 0 ? 0 : Math.round((totals.denied / attempts) * 100),
    },
    daily: toDaily(series).map((day) => ({
      date: day.date,
      allowed: day.allowed,
      denied: day.denied,
      bytesLabel: formatBytes(day.bytes),
    })),
    byHour: hourOfDayAverage(series),
    // Una dimensión sin datos no se imprime: una tabla vacía en un informe hace
    // dudar de todas las demás.
    tops: tops.filter((top) => top.entries.length > 0),
    devices: firewalls.map((firewall) => ({
      hostname: firewall.hostname,
      brand: firewall.brand,
      firmware: firewall.firmware,
    })),
  };
}
