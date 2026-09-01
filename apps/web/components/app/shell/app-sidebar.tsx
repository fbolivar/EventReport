"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { Logo } from "@/components/shared/logo";
import { Value } from "@/components/shared/value";
import { COLLECTOR_STATUS_LABELS } from "@/content/labels";
import { DEMO_COLLECTORS, DEMO_TENANT } from "@/lib/fixtures/tenant";
import { cn } from "@/lib/utils/cn";

const SECTIONS = [
  { slug: "dashboard", label: "Resumen" },
  { slug: "findings", label: "Hallazgos" },
  { slug: "activity", label: "Actividad" },
  { slug: "compliance", label: "Cumplimiento" },
  { slug: "reports", label: "Informes" },
  { slug: "settings", label: "Ajustes" },
] as const;

const STATUS_DOT = {
  active: "bg-resolved",
  measuring: "bg-medium",
  stale: "bg-high",
  offline: "bg-critical",
} as const;

/**
 * Única zona oscura del portal. Ancla la navegación y deja todo el peso visual
 * al contenido claro, que es el informe.
 *
 * Es el único componente de cliente del portal, y solo para saber qué sección
 * está abierta: el resto se renderiza en el servidor.
 */
export function AppSidebar({ tenantId }: { tenantId: string }) {
  const active = useSelectedLayoutSegment();

  return (
    // El fondo tinta lo lleva la columna, que se estira con el contenido; el
    // contenido de la barra queda fijo dentro de ella.
    <aside className="bg-ink lg:w-[var(--er-sidebar)] lg:shrink-0">
      <div className="flex flex-col px-5 py-5 lg:sticky lg:top-0 lg:h-dvh">
        <Link href={`/${tenantId}/dashboard`} className="rounded-control">
          <span className="sr-only">EventReport, resumen</span>
          <Logo onInk />
        </Link>

        <nav aria-label="Secciones" className="mt-8">
          <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5 lg:overflow-visible">
            {SECTIONS.map((section) => {
              const isActive = section.slug === active;
              return (
                <li key={section.slug}>
                  <Link
                    href={`/${tenantId}/${section.slug}`}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "block rounded-control px-3 py-2 text-small whitespace-nowrap transition-colors duration-[var(--er-duration-fast)]",
                      isActive
                        ? "bg-ink-raised text-on-ink"
                        : "text-on-ink-soft hover:bg-ink-raised hover:text-on-ink",
                    )}
                  >
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto hidden border-t border-ink-line pt-4 lg:block">
          <p className="text-micro text-on-ink-soft">Colectores</p>
          <ul className="mt-2 space-y-2">
            {DEMO_COLLECTORS.map((collector) => (
              <li key={collector.id} className="flex items-center gap-2">
                <span
                  className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[collector.health.status])}
                />
                <Value className="truncate text-micro text-on-ink">{collector.name}</Value>
                <span className="ml-auto shrink-0 text-micro text-on-ink-soft">
                  {COLLECTOR_STATUS_LABELS[collector.health.status]}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-micro text-on-ink-soft">
            {DEMO_TENANT.name} · plan {DEMO_TENANT.plan}
          </p>
        </div>
      </div>
    </aside>
  );
}
