import type { ComplianceAssessment, Control, FrameworkCode } from "@eventreport/schema";

import { ControlStatus } from "@/components/app/compliance/control-status";
import { ScopeDecision } from "@/components/app/compliance/scope-decision";
import { Value } from "@/components/shared/value";
import { cn } from "@/lib/utils/cn";

/**
 * Matriz de controles de un marco. El código del control va en mono: es el
 * número que el auditor reconoce, no una etiqueta nuestra.
 */
export function ControlMatrix({
  controls,
  assessments,
  className,
  compact = false,
  tenantId,
}: {
  controls: Control[];
  assessments: ComplianceAssessment[];
  className?: string;
  compact?: boolean;
  /** When present, each control can be declared out of scope (§15.5). */
  tenantId?: string;
}) {
  const byCode = new Map(assessments.map((item) => [item.controlCode, item]));

  return (
    <table className={cn("w-full text-left", className)}>
      <caption className="sr-only">Estado de los controles evaluables desde el firewall</caption>
      <thead>
        <tr className="border-b border-line text-micro text-ink-soft">
          <th scope="col" className="py-2 pr-4 font-medium">
            Control
          </th>
          {!compact && (
            <th scope="col" className="py-2 pr-4 font-medium">
              Evidencia
            </th>
          )}
          <th scope="col" className="py-2 text-right font-medium">
            Estado
          </th>
        </tr>
      </thead>
      <tbody>
        {controls.map((control) => {
          const assessment = byCode.get(control.code);
          return (
            <tr key={control.code} className="border-b border-line last:border-0 align-top">
              <th scope="row" className="py-3 pr-4 font-normal">
                <Value className="text-small text-ink-soft">{control.code}</Value>
                <span className="ml-2 text-small">{control.title}</span>
                {assessment?.justification ? (
                  <span className="mt-1 block max-w-prose text-micro text-ink-soft">
                    {assessment.justification}
                  </span>
                ) : null}
              </th>
              {!compact && (
                <td className="py-3 pr-4 text-small text-ink-soft">
                  {assessment && assessment.evidenceFindingIds.length > 0
                    ? `${assessment.evidenceFindingIds.length} hallazgo${assessment.evidenceFindingIds.length === 1 ? "" : "s"}`
                    : "—"}
                </td>
              )}
              <td className="py-3 text-right">
                {assessment ? <ControlStatus status={assessment.status} /> : null}
                {tenantId && assessment ? (
                  <div className="mt-1 flex justify-end">
                    <ScopeDecision
                      tenantId={tenantId}
                      framework={control.frameworkCode as FrameworkCode}
                      control={control.code}
                      status={assessment.status}
                    />
                  </div>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
