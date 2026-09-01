import { cn } from "@/lib/utils/cn";

/**
 * The report card. Separated by line and space, never by shadow: that is the
 * difference between a document and a generic dashboard (design-notes §4).
 */
export function Surface({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-surface border border-line bg-paper", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function SurfaceHeader({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h3 className="text-h3">{title}</h3>
        {meta ? <p className="mt-1 text-micro text-ink-soft">{meta}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SurfaceBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}
