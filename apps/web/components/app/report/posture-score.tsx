import type { PostureScore as PostureScoreData } from "@eventreport/schema";

import { cn } from "@/lib/utils/cn";
import { scoreKey, SEVERITY_CLASSES } from "@/lib/utils/severity";

/**
 * Score de postura 0–100 (§11): 70 % configuración, 30 % operación.
 * El número lleva el color del riesgo, no el de la marca: es una lectura, no
 * una acción.
 */
export function PostureScore({
  score,
  onInk = false,
  className,
}: {
  score: PostureScoreData;
  onInk?: boolean;
  className?: string;
}) {
  const key = scoreKey(score.value);
  const delta =
    score.previousValue === undefined ? undefined : score.value - score.previousValue;

  return (
    <div className={cn("flex items-start gap-5", className)}>
      <div
        className={cn(
          "flex size-24 shrink-0 items-center justify-center rounded-surface border",
          onInk ? "border-ink-line" : "border-line",
        )}
      >
        <span
          data-numeric
          className={cn(
            "text-[2.75rem] leading-none font-semibold tracking-[-0.03em]",
            onInk ? SEVERITY_CLASSES[key].onInk : SEVERITY_CLASSES[key].text,
          )}
        >
          {score.value}
        </span>
      </div>

      <div className="min-w-0 pt-1">
        <p className={cn("text-h3", onInk && "text-on-ink")}>Postura del perímetro</p>
        {delta !== undefined ? (
          <p className={cn("mt-1 text-small", onInk ? "text-on-ink-soft" : "text-ink-soft")}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} puntos frente al período anterior
          </p>
        ) : null}

        <dl className="mt-4 space-y-2">
          <ScoreComponent
            label="Configuración"
            weight="70 %"
            value={score.configuration}
            onInk={onInk}
          />
          <ScoreComponent
            label="Operación"
            weight="30 %"
            value={score.operation}
            onInk={onInk}
          />
        </dl>
      </div>
    </div>
  );
}

function ScoreComponent({
  label,
  weight,
  value,
  onInk,
}: {
  label: string;
  weight: string;
  value: number;
  onInk: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <dt
        className={cn(
          "w-36 shrink-0 text-micro whitespace-nowrap",
          onInk ? "text-on-ink-soft" : "text-ink-soft",
        )}
      >
        {label} <span className="opacity-70">{weight}</span>
      </dt>
      <dd className="flex flex-1 items-center gap-2">
        <div
          className={cn(
            "h-1.5 w-full max-w-40 overflow-hidden rounded-full",
            onInk ? "bg-ink-line" : "bg-line",
          )}
        >
          <div
            className={cn("h-full rounded-full", SEVERITY_CLASSES[scoreKey(value)].fill)}
            style={{ width: `${value}%` }}
          />
        </div>
        <span
          data-numeric
          className={cn("text-small tabular-nums", onInk ? "text-on-ink" : "text-ink")}
        >
          {value}
        </span>
      </dd>
    </div>
  );
}
