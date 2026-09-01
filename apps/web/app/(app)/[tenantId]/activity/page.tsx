import type { Metadata } from "next";

import { ActivityChart, HourProfileChart } from "@/components/app/activity/activity-chart";
import { TopList } from "@/components/app/activity/top-list";
import { FilterLinks } from "@/components/app/shell/filter-links";
import { PageHeader } from "@/components/app/shell/page-header";
import { Surface, SurfaceBody, SurfaceHeader } from "@/components/shared/surface";
import { Value } from "@/components/shared/value";
import { TOPN_DIMENSION_LABELS } from "@/content/labels";
import { hourOfDayAverage, toDaily } from "@/lib/fixtures/activity";
import { activitySeries, topN } from "@/lib/data/activity";
import { formatBytes, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Actividad" };

const RANGES = [
  { value: "30", label: "30 días" },
  { value: "14", label: "14 días" },
  { value: "7", label: "7 días" },
];

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { tenantId } = await params;
  const { range } = await searchParams;
  const days = Number(range) || 30;

  const [hourly, apps, countries, categories, deniedIps, vpnUsers] = await Promise.all([
    activitySeries(days),
    topN("app", days),
    topN("src_country", days),
    topN("web_category", days),
    topN("src_ip_denied", days),
    topN("vpn_user", days),
  ]);
  const daily = toDaily(hourly);
  const hours = hourOfDayAverage(hourly);

  const totals = hourly.reduce(
    (acc, point) => ({
      allowed: acc.allowed + point.allowed,
      denied: acc.denied + point.denied,
      blockedIps: acc.blockedIps + point.blockedIps,
      blockedWeb: acc.blockedWeb + point.blockedWeb,
      bytes: acc.bytes + point.bytes,
    }),
    { allowed: 0, denied: 0, blockedIps: 0, blockedWeb: 0, bytes: 0 },
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Actividad"
        meta="Agregados por hora que envía el colector. Las líneas crudas se quedan en tu red."
        action={
          <FilterLinks
            label="Rango"
            param="range"
            basePath={`/${tenantId}/activity`}
            searchParams={{}}
            current={String(days)}
            options={RANGES}
          />
        }
      />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-line pb-6 lg:grid-cols-5">
        <Metric label="Sesiones permitidas" value={formatNumber(totals.allowed)} />
        <Metric label="Sesiones denegadas" value={formatNumber(totals.denied)} />
        <Metric label="Bloqueos de IPS" value={formatNumber(totals.blockedIps)} />
        <Metric label="Bloqueos web" value={formatNumber(totals.blockedWeb)} />
        <Metric label="Tráfico" value={formatBytes(totals.bytes)} />
      </dl>

      <Surface>
        <SurfaceHeader title="Sesiones por día" meta={`Últimos ${days} días`} />
        <SurfaceBody>
          <ActivityChart points={daily} />
        </SurfaceBody>
      </Surface>

      <div className="grid gap-6 lg:grid-cols-2">
        <Surface>
          <SurfaceHeader
            title="Horario real de la empresa"
            meta="Promedio de sesiones por hora del día (UTC)"
          />
          <SurfaceBody>
            <HourProfileChart hours={hours} />
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceHeader title={TOPN_DIMENSION_LABELS.app} meta="Por número de sesiones" />
          <SurfaceBody>
            <TopList entries={apps} unit="sesiones" />
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceHeader title={TOPN_DIMENSION_LABELS.src_country} meta="Origen del tráfico" />
          <SurfaceBody>
            <TopList entries={countries} unit="eventos" />
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceHeader title={TOPN_DIMENSION_LABELS.web_category} meta="Categorías web" />
          <SurfaceBody>
            <TopList entries={categories} unit="solicitudes" />
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceHeader
            title={TOPN_DIMENSION_LABELS.src_ip_denied}
            meta="Lo que el firewall bloqueó en el borde"
          />
          <SurfaceBody>
            <TopList entries={deniedIps} unit="intentos" />
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceHeader title={TOPN_DIMENSION_LABELS.vpn_user} meta="Sesiones de VPN" />
          <SurfaceBody>
            <TopList entries={vpnUsers} unit="conexiones" />
          </SurfaceBody>
        </Surface>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-micro text-ink-soft">{label}</dt>
      <dd className="mt-1 text-h3">
        <Value>{value}</Value>
      </dd>
    </div>
  );
}
