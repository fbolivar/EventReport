import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectorStatus } from "@/components/app/collector/collector-status";
import { CriticalEventList } from "@/components/app/report/critical-event-list";
import { PostureScore } from "@/components/app/report/posture-score";
import { SeverityBreakdown } from "@/components/app/report/severity-breakdown";
import { TrendChart } from "@/components/app/report/trend-chart";
import { PageHeader } from "@/components/app/shell/page-header";
import { ButtonLink } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/states";
import { Surface, SurfaceBody, SurfaceHeader } from "@/components/shared/surface";
import { Value } from "@/components/shared/value";
import { countsBySeverity, listFindings } from "@/lib/data/findings";
import { listCriticalEvents, postureScore, postureTrend } from "@/lib/data/posture";
import { getTenant, listCollectors, listFirewalls, listSites } from "@/lib/data/tenant";
import { formatDate, formatSince } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Resumen" };

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  const [tenant, score, trend, findings, collectors, firewalls, sites, events] = await Promise.all([
    getTenant(tenantId),
    postureScore(),
    postureTrend(),
    listFindings(),
    listCollectors(),
    listFirewalls(),
    listSites(),
    listCriticalEvents(),
  ]);

  if (!tenant) notFound();

  const counts = countsBySeverity(findings);
  const openTotal = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const cityOf = (siteId: string) => sites.find((site) => site.id === siteId)?.city ?? "";

  return (
    <div className="space-y-8">
      <PageHeader
        title={tenant.name}
        meta={
          score
            ? `Calculado el ${formatDate(score.computedAt)} · ${firewalls.length} firewalls`
            : `${firewalls.length} firewalls`
        }
        action={<ButtonLink href={`/${tenantId}/reports`}>Generar informe</ButtonLink>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Surface>
          <SurfaceHeader title="Postura" meta="70 % configuración · 30 % operación" />
          <SurfaceBody>
            {score ? (
              <PostureScore score={score} />
            ) : (
              <p className="text-small text-ink-soft">
                Todavía no hay un cálculo de postura. Llega con el primer snapshot de configuración.
              </p>
            )}
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceHeader title="Tendencia" meta="Últimos 90 días" />
          <SurfaceBody>
            {trend.length > 1 ? (
              <>
                <TrendChart points={trend} />
                <div className="mt-2 flex justify-between text-micro text-ink-soft">
                  <Value>{formatDate(trend[0]!.date)}</Value>
                  <Value>{formatDate(trend[trend.length - 1]!.date)}</Value>
                </div>
              </>
            ) : (
              <p className="text-small text-ink-soft">
                La tendencia aparece cuando haya al menos dos días de historia.
              </p>
            )}
          </SurfaceBody>
        </Surface>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
            meta={
              collectors[0]?.health.lastSeenAt
                ? `Último envío ${formatSince(collectors[0].health.lastSeenAt, new Date().toISOString())}`
                : undefined
            }
          />
          <SurfaceBody className="space-y-6">
            {collectors.map((collector) => {
              const firewall = firewalls.find((item) => item.collectorId === collector.id);
              return (
                <CollectorStatus
                  key={collector.id}
                  name={`${firewall?.hostname ?? collector.name} · ${cityOf(collector.siteId)}`}
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
          {events.length > 0 ? (
            <CriticalEventList events={events} firewalls={firewalls} />
          ) : (
            <EmptyState
              title="Sin eventos críticos"
              description="No hubo nada urgente en el período. Los eventos críticos llegan en el momento en que ocurren."
            />
          )}
        </SurfaceBody>
      </Surface>
    </div>
  );
}
