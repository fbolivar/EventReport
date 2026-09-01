import { Logo } from "@/components/shared/logo";
import { footer } from "@/content/marketing";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink">
      <div className="mx-auto max-w-marketing px-6 py-14">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Logo onInk />
            <p className="mt-3 text-small text-on-ink-soft">{footer.tagline}</p>
          </div>

          <div className="flex gap-12">
            {footer.columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="text-micro text-on-ink-soft">{column.title}</p>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-small text-on-ink transition-colors duration-[var(--er-duration-fast)] hover:text-on-ink-soft"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <p className="mt-12 border-t border-ink-line pt-6 text-micro text-on-ink-soft">
          {footer.legal} · {year}
        </p>
      </div>
    </footer>
  );
}
