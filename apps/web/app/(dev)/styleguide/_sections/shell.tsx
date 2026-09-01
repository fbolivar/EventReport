import { cn } from "@/lib/utils/cn";

/** Andamiaje de la guía de estilo. No forma parte del producto. */
export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-line pt-10">
      <h2 className="text-h2">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-prose text-small text-ink-soft">{description}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Row({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 py-4 md:grid-cols-[13rem_1fr] md:gap-6", className)}>
      <div>
        <p className="text-small font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-micro text-ink-soft">{hint}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
