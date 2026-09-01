import type { ControlStatus as ControlStatusCode } from "@eventreport/schema";

import { CONTROL_STATUS_LABELS } from "@/content/labels";
import { cn } from "@/lib/utils/cn";
import { CONTROL_STATUS_KEY, SEVERITY_CLASSES } from "@/lib/utils/severity";

/**
 * Estado de un control (§15.2). `no evaluable` y `fuera de alcance` no llevan
 * color de riesgo: no son un fallo, son ausencia de evaluación. Se distinguen
 * por trama diagonal y por texto tachado.
 */
export function ControlStatus({
  status,
  className,
}: {
  status: ControlStatusCode;
  className?: string;
}) {
  const key = CONTROL_STATUS_KEY[status];
  const label = CONTROL_STATUS_LABELS[status];

  if (key === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-control border border-line px-2 py-0.5 text-micro text-ink-soft",
          className,
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            status === "not_assessable"
              ? "bg-[repeating-linear-gradient(45deg,var(--er-ink-soft),var(--er-ink-soft)_1px,transparent_1px,transparent_3px)]"
              : "border border-ink-soft",
          )}
        />
        <span className={cn(status === "not_applicable" && "line-through decoration-1")}>
          {label}
        </span>
      </span>
    );
  }

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
