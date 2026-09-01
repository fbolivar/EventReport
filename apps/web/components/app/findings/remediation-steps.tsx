import type { Brand } from "@eventreport/schema";

import { BRAND_LABELS } from "@/content/labels";
import { Value } from "@/components/shared/value";
import { cn } from "@/lib/utils/cn";

/**
 * Pasos de remediación específicos de la marca (`Remediation(ruleCode)`, §4.3).
 * Numerados porque son una secuencia real, que es la única excusa para numerar.
 * Los comandos van en mono: vienen del equipo, no de EventReport.
 */
export function RemediationSteps({
  brand,
  steps,
  className,
}: {
  brand: Brand;
  steps: string[];
  className?: string;
}) {
  return (
    <div className={cn("", className)}>
      <p className="text-micro text-ink-soft">Cómo se corrige en {BRAND_LABELS[brand]}</p>
      <ol className="mt-2 space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-small">
            <Value className="mt-0.5 shrink-0 text-ink-soft">{index + 1}.</Value>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
