import type { Severity } from "@eventreport/schema";

import { RESOLVED_LABEL, SEVERITY_LABELS } from "@/content/labels";
import { cn } from "@/lib/utils/cn";
import { SEVERITY_CLASSES, type SeverityKey } from "@/lib/utils/severity";

/**
 * Chip de severidad. El punto sólido lo hace legible en escala de grises y para
 * quien no distingue rojo de verde: el color nunca es el único portador.
 */
export function SeverityBadge({
  severity,
  resolved = false,
  className,
}: {
  severity: Severity;
  resolved?: boolean;
  className?: string;
}) {
  const key: SeverityKey = resolved ? "resolved" : severity;
  const label = resolved ? RESOLVED_LABEL : SEVERITY_LABELS[severity];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-control px-2 py-0.5 text-micro font-medium",
        SEVERITY_CLASSES[key].chip,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", SEVERITY_CLASSES[key].fill)} />
      {label}
    </span>
  );
}
