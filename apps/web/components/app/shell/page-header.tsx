import { cn } from "@/lib/utils/cn";

/** Encabezado de cada vista del portal: título, contexto y acción principal. */
export function PageHeader({
  title,
  meta,
  action,
  className,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5",
        className,
      )}
    >
      <div>
        <h1 className="text-h1">{title}</h1>
        {meta ? <p className="mt-1.5 text-small text-ink-soft">{meta}</p> : null}
      </div>
      {action}
    </header>
  );
}
