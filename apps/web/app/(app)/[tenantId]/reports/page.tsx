import type { Metadata } from "next";

import { FindingCard } from "@/components/app/findings/finding-card";
import { PostureScore } from "@/components/app/report/posture-score";
import { SeverityBreakdown } from "@/components/app/report/severity-breakdown";
import { PageHeader } from "@/components/app/shell/page-header";
import { Button, ButtonLink } from "@/components/shared/button";
import { Skeleton } from "@/components/shared/states";
import { Surface, SurfaceBody, SurfaceHeader } from "@/components/shared/surface";
import { Value } from "@/components/shared/value";
import { FRAMEWORK_SHORT_LABELS, REPORT_TYPE_LABELS } from "@/content/labels";
import { DEMO_REPORTS } from "@/lib/fixtures/events";
import { openCountsBySeverity, findingById, remediationFor } from "@/lib/fixtures/findings";
import { DEMO_SCORE } from "@/lib/fixtures/posture";
import { RULES_BY_CODE } from "@/lib/fixtures/rules";
import { DEMO_TENANT } from "@/lib/fixtures/tenant";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Informes" };

const preview = findingById("fnd-001");

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Informes"
        meta="Se generan solos según tu plan; también puedes pedirlos cuando quieras."
        action={<Button>Generar informe</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <Surface>
          <SurfaceHeader title="Generados" meta={`${DEMO_REPORTS.length} disponibles`} />
          <SurfaceBody className="py-0">
            <ul className="divide-y divide-line">
              {DEMO_REPORTS.map((report) => (
                <li key={report.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-small font-medium">
                      {REPORT_TYPE_LABELS[report.type]}
                      {report.frameworkCode
                        ? ` · ${FRAMEWORK_SHORT_LABELS[report.frameworkCode]}`
                        : ""}
                    </p>
                    <p className="mt-0.5 text-micro text-ink-soft">
                      {formatDate(report.periodStart)} — {formatDate(report.periodEnd)}
                    </p>
                  </div>

                  {report.status === "ready" ? (
                    <>
                      <span className="text-micro text-ink-soft">
                        <Value>{report.pages}</Value> páginas ·{" "}
                        <Value>{report.sizeKb}</Value> KB
                      </span>
                      <ButtonLink
                        href={`/${tenantId}/reports`}
                        variant="secondary"
                        size="sm"
                      >
                        Descargar PDF
                      </ButtonLink>
                    </>
                  ) : (
                    <span className="flex items-center gap-2 text-micro text-ink-soft">
                      <Skeleton className="h-2 w-24" /> generándose
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceHeader
            title="Vista previa"
            meta={`Ejecutivo de ${DEMO_TENANT.name} · agosto 2026`}
          />
          <SurfaceBody className="space-y-5">
            <PostureScore score={DEMO_SCORE} />
            <div className="border-t border-line pt-4">
              <p className="text-micro text-ink-soft">Hallazgos abiertos</p>
              <SeverityBreakdown counts={openCountsBySeverity()} className="mt-3" />
            </div>
            {preview ? (
              <div className="border-t border-line pt-4">
                <p className="text-micro text-ink-soft">Riesgo principal</p>
                <FindingCard
                  finding={preview}
                  rule={RULES_BY_CODE[preview.ruleCode]!}
                  brand="fortigate"
                  remediation={remediationFor(preview.ruleCode, "fortigate")}
                  className="mt-3"
                />
              </div>
            ) : null}
          </SurfaceBody>
        </Surface>
      </div>
    </div>
  );
}
