import Link from "next/link";

import { ButtonLink } from "@/components/shared/button";
import { Logo } from "@/components/shared/logo";
import { nav } from "@/content/marketing";

/**
 * Barra superior sobre tinta. Se funde con el hero: la parte alta del sitio es
 * un solo bloque oscuro, y el resto de la página es papel.
 */
export function SiteNav() {
  return (
    <header className="bg-ink">
      <div className="mx-auto flex max-w-marketing items-center justify-between gap-6 px-6 py-5">
        <Link href="/" className="rounded-control">
          <span className="sr-only">EventReport, inicio</span>
          <Logo onInk />
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-7">
            {nav.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-small text-on-ink-soft transition-colors duration-[var(--er-duration-fast)] hover:text-on-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <ButtonLink href={nav.cta.href} variant="onInk" size="sm">
          {nav.cta.label}
        </ButtonLink>
      </div>
    </header>
  );
}
