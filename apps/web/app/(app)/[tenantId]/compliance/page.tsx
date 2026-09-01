import type { Metadata } from "next";
import type { FrameworkCode } from "@eventreport/schema";
import { FRAMEWORKS } from "@eventreport/schema";

import { ControlMatrix } from "@/components/app/compliance/control-matrix";
import { ScopeNote } from "@/components/app/compliance/scope-note";
import { FilterLinks } from "@/components/app/shell/filter-links";
import { PageHeader } from "@/components/app/shell/page-header";
import { ButtonLink } from "@/components/shared/button";
import { Surface, SurfaceBody, SurfaceHeader } from "@/components/shared/surface";
import { FRAMEWORK_SHORT_LABELS } from "@/content/labels";
import { assessmentsFor, controlsFor, coverageFor, listFrameworks } from "@/lib/data/compliance";
import { getTenant } from "@/lib/data/tenant";

export const metadata: Metadata = { title: "Cumplimiento" };

function isFrameworkCode(value: string | undefined): value is FrameworkCode {
  return FRAMEWORKS.includes((value ?? "") as FrameworkCode);
}

export default async function CompliancePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ framework?: string }>;
}) {
  const { tenantId } = await params;
  const { framework: requested } = await searchParams;

  // Solo los marcos que el tenant declaró aplicables (§15.5).
  const tenant = await getTenant(tenantId);
  const active = tenant?.frameworks ?? [];
  const current: FrameworkCode =
    isFrameworkCode(requested) && active.includes(requested) ? requested : (active[0] ?? "iso27001");

  const [frameworks, controls, assessments, coverage] = await Promise.all([
    listFrameworks(),
    controlsFor(current),
    assessmentsFor(current),
    coverageFor(current),
  ]);
  const framework = frameworks.find((item) => item.code === current);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cumplimiento"
        meta="Evidencia técnica del perímetro. No es una certificación."
        action={
          <ButtonLink href={`/${tenantId}/reports`} variant="secondary">
            Generar informe del marco
          </ButtonLink>
        }
      />

      <FilterLinks
        label="Marco"
        param="framework"
        basePath={`/${tenantId}/compliance`}
        searchParams={{}}
        current={current}
        options={active.map((code) => ({
          value: code,
          label: FRAMEWORK_SHORT_LABELS[code],
        }))}
      />

      <Surface>
        <SurfaceHeader
          title={framework?.name ?? current}
          meta={`Versión ${framework?.version ?? ""}`}
        />
        <SurfaceBody className="space-y-6">
          {coverage ? (
            <ScopeNote
              frameworkName={framework?.name ?? current}
              coverage={coverage}
              note={framework?.scopeNote ?? ""}
            />
          ) : null}
          <ControlMatrix controls={controls} assessments={assessments} tenantId={tenantId} />
        </SurfaceBody>
      </Surface>

      <p className="max-w-prose text-small text-ink-soft">
        Los controles fuera de alcance requieren justificación escrita y quedan en el historial con
        fecha y usuario. Los no evaluables dependen de lo que la marca expone: el informe lo declara
        en lugar de darlos por correctos.
      </p>
    </div>
  );
}
