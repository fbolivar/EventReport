import type { CollectorHealth } from "@eventreport/schema";

import { COLLECTOR_STATUS_LABELS } from "@/content/labels";
import { Value } from "@/components/shared/value";
import { cn } from "@/lib/utils/cn";

const STATUS_DOT: Record<CollectorHealth["status"], string> = {
  active: "bg-resolved",
  measuring: "bg-medium",
  stale: "bg-high",
  offline: "bg-critical",
};

/**
 * Estado del colector con los datos del heartbeat (§6.7). Los descartes son
 * calidad del dato, no un detalle técnico: si suben del 1 %, el informe de
 * actividad cuenta menos de lo que pasó y FW-019 se abre.
 */
export function CollectorStatus({
  name,
  health,
  measuringSince,
  className,
}: {
  name: string;
  health: CollectorHealth;
  /** Cuándo se enroló, para decir cuánto le falta de medición. */
  measuringSince?: string;
  className?: string;
}) {
  // Un estado en ámbar sin explicación se lee como avería. El modo medición
  // dura 24 h (§5) y termina solo: decir cuándo evita la llamada de soporte.
  const measuringEndsIn =
    health.status === "measuring" && measuringSince
      ? Math.max(
          0,
          Math.ceil(
            (Date.parse(measuringSince) + 24 * 3_600_000 - Date.now()) / 3_600_000,
          ),
        )
      : undefined;

  return (
    <div className={cn("", className)}>
      <div className="flex items-center gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[health.status])} />
        <span className="text-small font-medium">{name}</span>
        <span className="text-micro text-ink-soft">
          {COLLECTOR_STATUS_LABELS[health.status]}
          {measuringEndsIn !== undefined
            ? ` · empieza a vigilar en ${measuringEndsIn} h`
            : ""}
        </span>
      </div>

      {health.eps === 0 && health.status !== "offline" ? (
        // Un colector vivo con cero eventos por segundo no está roto: es que el
        // firewall no le está enviando sus registros. Sin decirlo, el cliente ve
        // "Actividad" vacía y culpa al producto.
        <p className="mt-2 text-micro text-high">
          No está llegando syslog. Apunta el firewall a este colector para ver actividad y eventos.
        </p>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
        <Metric label="Eventos por segundo" value={health.eps.toLocaleString("es-CO")} />
        <Metric
          label="Descartes"
          value={health.droppedPct.toFixed(1)}
          unit="%"
          alert={health.droppedPct > 1}
        />
        <Metric
          label="Bóveda"
          value={health.vaultDays === 0 ? "—" : String(health.vaultDays)}
          unit={health.vaultDays === 0 ? "sin bóveda" : "días"}
        />
        <Metric
          label="Disco libre"
          value={String(health.diskFreeGb)}
          unit="GB"
          alert={health.diskFreeGb < 10}
        />
        <Metric
          label="Desfase de reloj"
          value={String(health.clockSkewSeconds)}
          unit="s"
          alert={health.clockSkewSeconds > 60}
        />
        <Metric label="Versión" value={health.version} />
      </dl>
    </div>
  );
}

/** El número viene del equipo y va en mono; la unidad es palabra nuestra. */
function Metric({
  label,
  value,
  unit,
  alert = false,
}: {
  label: string;
  value: string;
  unit?: string;
  alert?: boolean;
}) {
  return (
    <div>
      <dt className="text-micro text-ink-soft">{label}</dt>
      <dd className={cn("text-small", alert && "text-high")}>
        <Value>{value}</Value>
        {unit ? <span className="ml-1 text-ink-soft">{unit}</span> : null}
      </dd>
    </div>
  );
}
