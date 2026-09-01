import { Value } from "@/components/shared/value";
import type { DailyPoint } from "@/lib/fixtures/activity";
import { formatDateShort, formatNumber } from "@/lib/utils/format";

/**
 * Tráfico por día: permitido en la serie de marca, denegado en severidad baja.
 * SVG en línea, sin librería, para que la misma gráfica entre al PDF.
 */
export function ActivityChart({ points }: { points: DailyPoint[] }) {
  const max = Math.max(...points.map((point) => point.allowed + point.denied), 1);
  const width = 720;
  const height = 180;
  const gap = 2;
  const barWidth = (width - gap * (points.length - 1)) / points.length;

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Sesiones por día, del ${first ? formatDateShort(first.date) : ""} al ${last ? formatDateShort(last.date) : ""}`}
        className="w-full"
        style={{ height }}
      >
        {points.map((point, index) => {
          const x = index * (barWidth + gap);
          const total = point.allowed + point.denied;
          const totalHeight = (total / max) * height;
          const deniedHeight = (point.denied / max) * height;
          return (
            <g key={point.date}>
              <rect
                x={x}
                y={height - totalHeight}
                width={barWidth}
                height={totalHeight - deniedHeight}
                fill="var(--er-signal)"
                opacity="0.75"
              />
              <rect
                x={x}
                y={height - deniedHeight}
                width={barWidth}
                height={deniedHeight}
                fill="var(--er-sev-low)"
              />
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-3 text-micro text-ink-soft">
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-signal opacity-75" /> permitido
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-low" /> denegado
          </span>
        </span>
        <span>
          <Value>{first ? formatDateShort(first.date) : ""}</Value> —{" "}
          <Value>{last ? formatDateShort(last.date) : ""}</Value> · máximo{" "}
          <Value>{formatNumber(max)}</Value> sesiones al día
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * Promedio por hora del día. Es la gráfica que le muestra al gerente que su
 * empresa trabaja de 8 a 6 y que lo de la madrugada no es su gente.
 */
export function HourProfileChart({ hours }: { hours: number[] }) {
  const max = Math.max(...hours, 1);

  return (
    <figure>
      <ol className="flex h-32 items-end gap-1" aria-label="Sesiones promedio por hora del día">
        {hours.map((value, hour) => (
          <li
            key={hour}
            className="flex-1 rounded-t-[2px] bg-signal opacity-75"
            style={{ height: `${Math.max(2, (value / max) * 100)}%` }}
            title={`${String(hour).padStart(2, "0")}:00 · ${formatNumber(value)} sesiones`}
          />
        ))}
      </ol>
      <figcaption className="mt-2 flex justify-between text-micro text-ink-soft">
        <Value>00:00</Value>
        <Value>08:00</Value>
        <Value>16:00</Value>
        <Value>23:00</Value>
      </figcaption>
    </figure>
  );
}
