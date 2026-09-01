import type { ScorePoint } from "@eventreport/schema";

import { cn } from "@/lib/utils/cn";

/**
 * Tendencia del score. SVG en línea: sin librería de gráficas, para que el
 * mismo componente sirva en el portal, en la landing y en el PDF.
 * La serie principal usa `signal`; el riesgo no colorea la línea.
 */
export function TrendChart({
  points,
  height = 120,
  className,
  label = "Tendencia del score de postura",
}: {
  points: ScorePoint[];
  height?: number;
  className?: string;
  label?: string;
}) {
  if (points.length < 2) return null;

  const width = 640;
  const padding = 4;
  const min = 0;
  const max = 100;
  const stepX = (width - padding * 2) / (points.length - 1);

  const toY = (value: number) =>
    padding + (1 - (value - min) / (max - min)) * (height - padding * 2);

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${padding + index * stepX} ${toY(point.value)}`)
    .join(" ");

  const area = `${line} L${padding + (points.length - 1) * stepX} ${height - padding} L${padding} ${height - padding} Z`;

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label}: de ${first?.value ?? 0} a ${last?.value ?? 0} puntos`}
        className="h-auto w-full"
        style={{ height }}
      >
        {[25, 50, 75].map((value) => (
          <line
            key={value}
            x1={padding}
            x2={width - padding}
            y1={toY(value)}
            y2={toY(value)}
            stroke="var(--er-line)"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill="var(--er-signal)" opacity="0.06" />
        <path
          d={line}
          fill="none"
          stroke="var(--er-signal)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </figure>
  );
}
