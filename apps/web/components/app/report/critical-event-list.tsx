import type { CriticalEvent, Firewall } from "@eventreport/schema";

import { AcknowledgeEvent } from "@/components/app/report/acknowledge-event";
import { SeverityBadge } from "@/components/app/findings/severity-badge";
import { Value } from "@/components/shared/value";
import { formatDateTime } from "@/lib/utils/format";

/**
 * Eventos críticos recientes (§6.4). Los que no tienen fecha de tratamiento
 * son los que abren OP-002 a los siete días.
 */
export function CriticalEventList({
  events,
  firewalls,
  tenantId,
}: {
  events: CriticalEvent[];
  firewalls: Firewall[];
  tenantId: string;
}) {
  return (
    <ul className="divide-y divide-line">
      {events.map((event) => {
        const firewall = firewalls.find((item) => item.id === event.firewallId);
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
            {event.acknowledgedAt ? (
              <span className="text-micro text-ink-soft">Atendido</span>
            ) : (
              <AcknowledgeEvent tenantId={tenantId} eventId={event.id} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
