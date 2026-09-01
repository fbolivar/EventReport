import type { FrameworkCoverage } from "@eventreport/schema";

import { cn } from "@/lib/utils/cn";

/**
 * Honestidad de alcance (§15.1). Va siempre junto a la matriz y encabeza el
 * informe de cumplimiento: el producto nunca afirma que el cliente "cumple".
 */
export function ScopeNote({
  frameworkName,
  coverage,
  note,
  className,
}: {
  frameworkName: string;
  coverage: FrameworkCoverage;
  note: string;
  className?: string;
}) {
  return (
    <div className={cn("border-l-2 border-line pl-4", className)}>
      <p className="max-w-prose text-small">
        De los <strong className="font-semibold">{coverage.totalControls}</strong> controles de{" "}
        {frameworkName}, <strong className="font-semibold">{coverage.assessableControls}</strong>{" "}
        son evaluables desde el firewall: {coverage.compliant} cumplen, {coverage.nonCompliant} no
        cumplen, {coverage.partial} quedan parciales, {coverage.notAssessable} no son evaluables en
        esta marca y {coverage.notApplicable} están fuera de alcance.
      </p>
      <p className="mt-2 max-w-prose text-small text-ink-soft">{note}</p>
    </div>
  );
}
