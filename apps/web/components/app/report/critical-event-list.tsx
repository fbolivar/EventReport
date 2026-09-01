import type { CriticalEvent } from "@eventreport/schema";

import { SeverityBadge } from "@/components/app/findings/severity-badge";
import { Value } from "@/components/shared/value";
import { formatDateTime } from "@/lib/utils/format";
import { firewallById } from "@/lib/fixtures/tenant";

/**
 * Eventos críticos recientes (§6.4). Los que no tienen fecha de tratamiento
 * son los que abren OP-002 a los siete días.
 */
export function CriticalEventList({ events }: { events: CriticalEvent[] }) {
  return (
    <ul className="divide-y divide-line">
      {events.map((event) => {
        const firewall = firewallById(event.firewallId);
        return (
          <li key={event.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
            <Value className="w-32 shrink-0 text-micro text-ink-soft">
              {formatDateTime(event.ts)}
            </Value>
            <SeverityBadge severity={event.severity} />
            <div className="min-w-0 flex-1">
              <p className="text-small">{event.title}</p>
              <p className="mt-0.5 text-micro text-ink-soft">
                {event.detail} · <Value>{firewall?.hostname ?? event.firewallId}</Value>
              </p>
            </div>
            <span className="text-micro text-ink-soft">
              {event.acknowledgedAt ? "Atendido" : "Sin atender"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
