import { SEVERITY_ORDER, type Severity } from "@eventreport/schema";

import { SEVERITY_LABELS } from "@/content/labels";
import { cn } from "@/lib/utils/cn";
import { SEVERITY_CLASSES } from "@/lib/utils/severity";

/**
 * Hallazgos abiertos por severidad. Barra proporcional al mayor valor, no al
 * total: lo que importa es comparar entre severidades de un vistazo.
 */
export function SeverityBreakdown({
  counts,
  className,
}: {
  counts: Record<Severity, number>;
  className?: string;
}) {
  const total = SEVERITY_ORDER.reduce((sum, key) => sum + counts[key], 0);
  const max = Math.max(...SEVERITY_ORDER.map((key) => counts[key]), 1);

  if (total === 0) {
    return (
      <p className={cn("text-small text-ink-soft", className)}>
        Sin hallazgos abiertos en este período.
      </p>
    );
  }

  return (
    <ul className={cn("space-y-2.5", className)}>
      {SEVERITY_ORDER.map((key) => (
        <li key={key} className="flex items-center gap-3">
          <span className="w-16 text-micro text-ink-soft">{SEVERITY_LABELS[key]}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
            <span
              className={cn("block h-full rounded-full", SEVERITY_CLASSES[key].fill)}
              style={{ width: `${(counts[key] / max) * 100}%` }}
            />
          </span>
          <span data-numeric className="w-6 text-right text-small tabular-nums">
            {counts[key]}
          </span>
        </li>
      ))}
    </ul>
  );
}
