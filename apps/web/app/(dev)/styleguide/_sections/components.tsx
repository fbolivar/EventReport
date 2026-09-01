import { SEVERITY_ORDER } from "@eventreport/schema";

import { CollectorStatus } from "@/components/app/collector/collector-status";
import { ControlMatrix } from "@/components/app/compliance/control-matrix";
import { ControlStatus } from "@/components/app/compliance/control-status";
import { ScopeNote } from "@/components/app/compliance/scope-note";
import { FindingCard } from "@/components/app/findings/finding-card";
import { SeverityBadge } from "@/components/app/findings/severity-badge";
import { PostureScore } from "@/components/app/report/posture-score";
import { SeverityBreakdown } from "@/components/app/report/severity-breakdown";
import { TrendChart } from "@/components/app/report/trend-chart";
import { Button, ButtonLink } from "@/components/shared/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/shared/states";
import { Surface, SurfaceBody, SurfaceHeader } from "@/components/shared/surface";
import { CONTROL_STATUSES } from "@eventreport/schema";
import { DEMO_COLLECTOR_DEGRADED, DEMO_COLLECTOR_HEALTH } from "@/lib/fixtures/collector";
import {
  DEMO_FRAMEWORKS,
  DEMO_ISO_ASSESSMENTS,
  DEMO_ISO_CONTROLS,
  DEMO_ISO_COVERAGE,
} from "@/lib/fixtures/compliance";
import { DEMO_FINDINGS, DEMO_REMEDIATIONS } from "@/lib/fixtures/findings";
import { DEMO_SCORE, DEMO_SEVERITY_COUNTS, DEMO_TREND } from "@/lib/fixtures/posture";
import { RULES_BY_CODE } from "@/lib/fixtures/rules";
import { Row, Section } from "./shell";

const iso = DEMO_FRAMEWORKS[0];
const criticalFinding = DEMO_FINDINGS[0];
const resolvedFinding = DEMO_FINDINGS[4];

export function ComponentSections() {
  return (
    <>
      <Section id="controles" title="Controles" description="Botones sin flecha ni icono al final.">
        <Row label="Botones" hint="primary · secondary · ghost">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Generar informe</Button>
            <Button variant="secondary">Ver detalle</Button>
            <Button variant="ghost">Descartar</Button>
            <ButtonLink href="/styleguide" variant="secondary" size="sm">
              Enlace con forma de botón
            </ButtonLink>
            <Button disabled>Deshabilitado</Button>
          </div>
        </Row>
        <Row label="Sobre tinta" hint="hero y sidebar">
          <div className="flex flex-wrap items-center gap-3 rounded-surface bg-ink p-4">
            <Button variant="onInk">Solicitar demo</Button>
            <Button variant="onInkGhost">Ver un informe</Button>
          </div>
        </Row>
        <Row label="Severidades" hint="SeverityBadge">
          <div className="flex flex-wrap gap-2">
            {SEVERITY_ORDER.map((severity) => (
              <SeverityBadge key={severity} severity={severity} />
            ))}
            <SeverityBadge severity="medium" resolved />
          </div>
        </Row>
        <Row label="Estados de control" hint="ControlStatus · los cinco del §15.2">
          <div className="flex flex-wrap gap-2">
            {CONTROL_STATUSES.map((status) => (
              <ControlStatus key={status} status={status} />
            ))}
          </div>
        </Row>
      </Section>

      <Section
        id="informe"
        title="Componentes de informe"
        description="Los mismos que usa la landing y los que irán al PDF. Cambiar un token los cambia en los tres sitios."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Surface>
            <SurfaceHeader title="Postura" meta="Calculado el 31 de agosto de 2026" />
            <SurfaceBody>
              <PostureScore score={DEMO_SCORE} />
            </SurfaceBody>
          </Surface>

          <Surface>
            <SurfaceHeader title="Tendencia" meta="90 días" />
            <SurfaceBody>
              <TrendChart points={DEMO_TREND} />
            </SurfaceBody>
          </Surface>

          <Surface>
            <SurfaceHeader title="Hallazgos abiertos" meta="14 en total" />
            <SurfaceBody>
              <SeverityBreakdown counts={DEMO_SEVERITY_COUNTS} />
            </SurfaceBody>
          </Surface>

          <Surface>
            <SurfaceHeader title="Colector" meta="Sede principal" />
            <SurfaceBody className="space-y-6">
              <CollectorStatus name="FGT60F · Bogotá" health={DEMO_COLLECTOR_HEALTH} />
              <CollectorStatus name="XGS116 · Medellín" health={DEMO_COLLECTOR_DEGRADED} />
            </SurfaceBody>
          </Surface>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {criticalFinding ? (
            <FindingCard
              finding={criticalFinding}
              rule={RULES_BY_CODE[criticalFinding.ruleCode]!}
              brand="fortigate"
              remediation={DEMO_REMEDIATIONS[0]?.steps}
            />
          ) : null}
          {resolvedFinding ? (
            <FindingCard
              finding={resolvedFinding}
              rule={RULES_BY_CODE[resolvedFinding.ruleCode]!}
            />
          ) : null}
        </div>

        <Surface className="mt-6">
          <SurfaceHeader title={iso?.name ?? ""} meta="Controles evaluables desde el firewall" />
          <SurfaceBody className="space-y-5">
            <ScopeNote
              frameworkName={iso?.name ?? ""}
              coverage={DEMO_ISO_COVERAGE}
              note={iso?.scopeNote ?? ""}
            />
            <ControlMatrix controls={DEMO_ISO_CONTROLS} assessments={DEMO_ISO_ASSESSMENTS} />
          </SurfaceBody>
        </Surface>
      </Section>

      <Section
        id="estados"
        title="Estados"
        description="Cada vista del portal tiene los cuatro: con datos, cargando, vacío y error. Un estado vacío sin acción siguiente es un callejón sin salida."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Surface>
            <SurfaceHeader title="Cargando" />
            <SurfaceBody className="space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </SurfaceBody>
          </Surface>
          <Surface>
            <SurfaceHeader title="Vacío" />
            <EmptyState
              title="Todavía no hay hallazgos"
              description="El colector envió su primer resumen hace menos de una hora. La línea base aparece cuando llegue el primer snapshot de configuración."
              action={
                <ButtonLink href="/styleguide" variant="secondary" size="sm">
                  Ver estado del colector
                </ButtonLink>
              }
            />
          </Surface>
          <Surface>
            <SurfaceHeader title="Error" />
            <ErrorState
              title="No pudimos cargar los hallazgos"
              description="La consulta a la base de datos falló. Los datos siguen guardados; vuelve a intentarlo en un momento."
              action={
                <ButtonLink href="/styleguide" variant="secondary" size="sm">
                  Reintentar
                </ButtonLink>
              }
            />
          </Surface>
        </div>
      </Section>
    </>
  );
}
