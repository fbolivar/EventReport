import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Logo } from "@/components/shared/logo";
import { ComponentSections } from "./_sections/components";
import { FoundationsSections } from "./_sections/foundations";

export const metadata: Metadata = {
  title: "Guía de estilo",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "#paleta", label: "Paleta" },
  { href: "#tipografia", label: "Tipografía" },
  { href: "#forma", label: "Espaciado y forma" },
  { href: "#controles", label: "Controles" },
  { href: "#informe", label: "Componentes de informe" },
  { href: "#estados", label: "Estados" },
];

/**
 * Guía de estilo. Solo en desarrollo: es la mesa de trabajo donde se itera la
 * estética, no una página del producto.
 */
export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="mx-auto max-w-app px-6 py-12 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-6 pb-10">
        <div>
          <Logo />
          <h1 className="mt-5 text-h1">Guía de estilo</h1>
          <p className="mt-2 max-w-prose text-small text-ink-soft">
            Todos los tokens y todos los componentes en sus estados. Las razones de cada decisión
            están en <span className="value">docs/design-notes.md</span>; los valores, en{" "}
            <span className="value">styles/tokens.css</span>.
          </p>
        </div>
        <nav aria-label="Secciones de la guía">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-small text-signal hover:underline">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="space-y-12">
        <FoundationsSections />
        <ComponentSections />
      </div>
    </div>
  );
}
