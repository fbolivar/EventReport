import type { Metadata } from "next";

import { CollectorStatus } from "@/components/app/collector/collector-status";
import { CriticalEventList } from "@/components/app/report/critical-event-list";
import { PostureScore } from "@/components/app/report/posture-score";
import { SeverityBreakdown } from "@/components/app/report/severity-breakdown";
import { TrendChart } from "@/components/app/report/trend-chart";
import { PageHeader } from "@/components/app/shell/page-header";
import { ButtonLink } from "@/components/shared/button";
import { Surface, SurfaceBody, SurfaceHeader } from "@/components/shared/surface";
import { Value } from "@/components/shared/value";
import { DEMO_CRITICAL_EVENTS } from "@/lib/fixtures/events";
import { openCountsBySeverity } from "@/lib/fixtures/findings";
import { DEMO_SCORE, DEMO_TREND } from "@/lib/fixtures/posture";
import { DEMO_COLLECTORS, DEMO_FIREWALLS, DEMO_TENANT, NOW, siteById } from "@/lib/fixtures/tenant";
import { formatDate, formatSince } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Resumen" };

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const counts = openCountsBySeverity();
  const openTotal = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title={DEMO_TENANT.name}
        meta={`Calculado el ${formatDate(DEMO_SCORE.computedAt)} · ${DEMO_FIREWALLS.length} firewalls`}
        action={
          <ButtonLink href={`/${tenantId}/reports`}>Generar informe</ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Surface>
          <SurfaceHeader title="Postura" meta="70 % configuración · 30 % operación" />
          <SurfaceBody>
            <PostureScore score={DEMO_SCORE} />
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceHeader title="Tendencia" meta="Últimos 90 días" />
          <SurfaceBody>
            <TrendChart points={DEMO_TREND} />
            <div className="mt-2 flex justify-between text-micro text-ink-soft">
              <Value>{formatDate(DEMO_TREND[0]?.date ?? NOW)}</Value>
              <Value>{formatDate(DEMO_TREND[DEMO_TREND.length - 1]?.date ?? NOW)}</Value>
            </div>
          </SurfaceBody>
        </Surface>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Surface>
          <SurfaceHeader
            title="Hallazgos abiertos"
            meta={`${openTotal} en total`}
            action={
              <ButtonLink href={`/${tenantId}/findings`} variant="secondary" size="sm">
                Ver todos
              </ButtonLink>
            }
          />
          <SurfaceBody>
            <SeverityBreakdown counts={counts} />
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceHeader
            title="Colectores"
            meta={`Último envío ${formatSince(DEMO_COLLECTORS[0]?.health.lastSeenAt ?? NOW, NOW)}`}
          />
          <SurfaceBody className="space-y-6">
            {DEMO_COLLECTORS.map((collector) => {
              const firewall = DEMO_FIREWALLS.find((item) => item.collectorId === collector.id);
              const site = siteById(collector.siteId);
              return (
                <CollectorStatus
                  key={collector.id}
                  name={`${firewall?.hostname ?? collector.name} · ${site?.city ?? ""}`}
                  health={collector.health}
                />
              );
            })}
          </SurfaceBody>
        </Surface>
      </div>

      <Surface>
        <SurfaceHeader
          title="Eventos críticos recientes"
          meta="Se notifican en el momento; el informe los agrupa"
        />
        <SurfaceBody className="py-0">
          <CriticalEventList events={DEMO_CRITICAL_EVENTS} />
        </SurfaceBody>
      </Surface>
    </div>
  );
}
