import { cn } from "@/lib/utils/cn";

/**
 * Ritmo vertical común de la landing. Las secciones no son tarjetas: son
 * bloques separados por espacio, con la jerarquía en el tamaño del texto.
 */
export function MarketingSection({
  id,
  title,
  subtitle,
  children,
  className,
  tone = "paper",
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  tone?: "paper" | "mist";
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-6 py-[var(--er-section-y)] lg:py-[var(--er-section-y-lg)]",
        tone === "mist" && "bg-mist",
        className,
      )}
    >
      <div className="mx-auto max-w-marketing px-6">
        <h2 className="max-w-prose text-h1 text-balance">{title}</h2>
        {subtitle ? (
          <p className="mt-4 max-w-prose text-body text-ink-soft">{subtitle}</p>
        ) : null}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
