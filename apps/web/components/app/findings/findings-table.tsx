import Link from "next/link";
import type { Finding, FindingRule, Firewall } from "@eventreport/schema";

import { SeverityBadge } from "@/components/app/findings/severity-badge";
import { Value } from "@/components/shared/value";
import { BRAND_LABELS } from "@/content/labels";
import { formatDateShort } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * Tabla de hallazgos. Cada fila es un enlace que abre el detalle en la misma
 * URL, así que el estado es compartible y no hay JavaScript de por medio.
 */
export function FindingsTable({
  findings,
  rules,
  firewalls,
  selectedId,
  hrefFor,
}: {
  findings: Finding[];
  rules: Record<string, FindingRule>;
  firewalls: Firewall[];
  selectedId?: string;
  hrefFor: (findingId: string) => string;
}) {
  return (
    <table className="w-full text-left">
      <caption className="sr-only">Hallazgos del tenant</caption>
      <thead>
        <tr className="border-b border-line text-micro text-ink-soft">
          <th scope="col" className="py-2 pr-4 font-medium">
            Severidad
          </th>
          <th scope="col" className="py-2 pr-4 font-medium">
            Hallazgo
          </th>
          <th scope="col" className="hidden py-2 pr-4 font-medium md:table-cell">
            Equipo
          </th>
          <th scope="col" className="hidden py-2 text-right font-medium whitespace-nowrap sm:table-cell">
            Visto
          </th>
        </tr>
      </thead>
      <tbody>
        {findings.map((finding) => {
          const rule = rules[finding.ruleCode];
          const firewall = firewalls.find((item) => item.id === finding.firewallId);
          const isSelected = finding.id === selectedId;

          return (
            <tr
              key={finding.id}
              className={cn(
                "border-b border-line last:border-0 transition-colors duration-[var(--er-duration-fast)]",
                isSelected ? "bg-mist" : "hover:bg-mist",
              )}
            >
              <td className="py-3 pr-4 align-top">
                <SeverityBadge
                  severity={finding.severity}
                  resolved={finding.status === "resolved"}
                />
              </td>
              <td className="py-3 pr-4 align-top">
                <Link href={hrefFor(finding.id)} className="rounded-control">
                  <span className="text-small">{rule?.title ?? finding.ruleCode}</span>
                  <span className="mt-0.5 block text-micro text-ink-soft">
                    <Value>{finding.ruleCode}</Value> · {finding.assetLabel}
                  </span>
                </Link>
              </td>
              <td className="hidden py-3 pr-4 align-top whitespace-nowrap md:table-cell">
                <Value className="text-small">{firewall?.hostname ?? "—"}</Value>
                <span className="mt-0.5 block text-micro text-ink-soft">
                  {firewall ? BRAND_LABELS[firewall.brand] : ""}
                </span>
              </td>
              <td className="hidden py-3 text-right align-top whitespace-nowrap sm:table-cell">
                <Value className="text-micro text-ink-soft">
                  {formatDateShort(finding.lastSeen)}
                </Value>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
