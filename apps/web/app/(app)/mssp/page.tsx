import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/app/shell/page-header";
import { Logo } from "@/components/shared/logo";
import { Surface } from "@/components/shared/surface";
import { Value } from "@/components/shared/value";
import { COLLECTOR_STATUS_LABELS } from "@/content/labels";
import { listMsspRows } from "@/lib/data/mssp";
import { byAttention } from "@/lib/mssp/attention";
import { formatSince } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { scoreKey, SEVERITY_CLASSES } from "@/lib/utils/severity";

export const metadata: Metadata = { title: "Clientes" };

const STATUS_DOT = {
  active: "bg-resolved",
  measuring: "bg-medium",
  stale: "bg-high",
  offline: "bg-critical",
} as const;

/** Vista multicliente: quién necesita atención hoy, ordenado por score. */
const LEVEL_TEXT = {
  urgent: "text-critical",
  watch: "text-high",
  calm: "text-ink-soft",
} as const;

export default async function MsspPage() {
  // Ordenados por urgencia, no por puntaje: un colector caído deja al cliente
  // sin datos y eso no aparece en ningún puntaje.
  const rows = byAttention(await listMsspRows());
  const now = new Date().toISOString();
  const criticalTotal = rows.reduce((sum, row) => sum + row.critical, 0);
  const urgent = rows.filter((row) => row.level === "urgent").length;

  return (
    <>
      <header className="bg-ink">
        <div className="mx-auto max-w-app px-6 py-5 lg:px-10">
          <Logo onInk />
        </div>
      </header>

      <main className="mx-auto max-w-app px-6 py-8 lg:px-10 lg:py-10">
        <div className="space-y-8">
          <PageHeader
            title="Clientes"
            meta={[
              `${rows.length} ${rows.length === 1 ? "empresa" : "empresas"}`,
              `${urgent} ${urgent === 1 ? "necesita" : "necesitan"} atención hoy`,
              `${criticalTotal} ${criticalTotal === 1 ? "hallazgo crítico" : "hallazgos críticos"} en total`,
            ].join(" · ")}
          />

          <Surface className="px-5 py-2">
            <table className="w-full text-left">
              <caption className="sr-only">Clientes administrados</caption>
              <thead>
                <tr className="border-b border-line text-micro text-ink-soft">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Cliente
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Postura
                  </th>
                  <th scope="col" className="hidden py-2 pr-4 text-right font-medium sm:table-cell">
                    Críticos
                  </th>
                  <th scope="col" className="hidden py-2 pr-4 text-right font-medium sm:table-cell">
                    Altos
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Colector
                  </th>
                  <th scope="col" className="hidden py-2 pr-4 font-medium lg:table-cell">
                    Por qué
                  </th>
                  <th scope="col" className="hidden py-2 text-right font-medium md:table-cell">
                    Último informe
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.tenantId} className="border-b border-line last:border-0 hover:bg-mist">
                    <td className="py-3 pr-4">
                      <Link href={`/${row.tenantId}/dashboard`} className="rounded-control">
                        <span className="text-small">{row.name}</span>
                        <span className="mt-0.5 block text-micro text-ink-soft">
                          plan {row.plan} · <Value>{row.firewalls}</Value>{" "}
                          {row.firewalls === 1 ? "firewall" : "firewalls"}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Value
                        className={cn("text-h3", SEVERITY_CLASSES[scoreKey(row.score)].text)}
                      >
                        {row.score}
                      </Value>
                      <span className="mt-0.5 block text-micro text-ink-soft">
                        {row.scoreDelta === 0
                          ? "sin cambio"
                          : `${row.scoreDelta > 0 ? "▲" : "▼"} ${Math.abs(row.scoreDelta)}`}
                      </span>
                    </td>
                    <td className="hidden py-3 pr-4 text-right sm:table-cell">
                      <Value className={cn("text-small", row.critical > 0 && "text-critical")}>
                        {row.critical}
                      </Value>
                    </td>
                    <td className="hidden py-3 pr-4 text-right sm:table-cell">
                      <Value className={cn("text-small", row.high > 0 && "text-high")}>
                        {row.high}
                      </Value>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-2 text-small">
                        <span
                          className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[row.collectorStatus])}
                        />
                        {COLLECTOR_STATUS_LABELS[row.collectorStatus]}
                      </span>
                    </td>
                    <td className={cn("hidden py-3 pr-4 lg:table-cell", LEVEL_TEXT[row.level])}>
                      <span className="text-small">{row.reason}</span>
                    </td>
                    <td className="hidden py-3 text-right md:table-cell">
                      <Value className="text-micro text-ink-soft">
                        {row.lastReport ? formatSince(row.lastReport, now) : "—"}
                      </Value>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Surface>

          <p className="max-w-prose text-small text-ink-soft">
            Ordenados por urgencia: primero el cliente que se quedó sin colector —sin datos nuevos
            el informe del mes sale incompleto—, después los eventos críticos sin atender de más de
            siete días, y solo entonces la postura. La lista sale de RLS: aparecen exactamente las
            empresas de las que eres miembro.
          </p>
        </div>
      </main>
    </>
  );
}
