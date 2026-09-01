import { Value } from "@/components/shared/value";
import type { TopEntry } from "@/lib/fixtures/activity";
import { formatBytes, formatNumber } from "@/lib/utils/format";

/**
 * Top-N de una dimensión. La barra es proporcional al primero: importa el
 * orden de magnitud, no el porcentaje exacto.
 */
export function TopList({
  entries,
  unit = "eventos",
}: {
  entries: TopEntry[];
  unit?: string;
}) {
  const max = Math.max(...entries.map((entry) => entry.count), 1);

  return (
    <ol className="space-y-2.5">
      {entries.map((entry) => (
        <li key={entry.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-small">{entry.key}</span>
            <span className="shrink-0 text-micro text-ink-soft">
              <Value>{formatNumber(entry.count)}</Value> {unit}
              {entry.bytes ? (
                <>
                  {" · "}
                  <Value>{formatBytes(entry.bytes)}</Value>
                </>
              ) : null}
            </span>
          </div>
          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-mist">
            <span
              className="block h-full rounded-full bg-signal opacity-70"
              style={{ width: `${(entry.count / max) * 100}%` }}
            />
          </span>
        </li>
      ))}
    </ol>
  );
}
