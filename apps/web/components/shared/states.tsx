import { cn } from "@/lib/utils/cn";

/** Loading placeholder. Same footprint as the content it replaces. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-control bg-mist", className)} />;
}

/**
 * Empty state. Always names the action that fills it — an empty screen without
 * a next step is a dead end. The action arrives as a node so this stays a
 * server component: the caller decides whether it is a link or a button.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 px-5 py-10", className)}>
      <p className="text-h3">{title}</p>
      <p className="max-w-prose text-small text-ink-soft">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/**
 * Error state. Says what happened and how to continue; never a bare
 * "algo salió mal".
 */
export function ErrorState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 px-5 py-10", className)}>
      <p className="text-h3 text-critical">{title}</p>
      <p className="max-w-prose text-small text-ink-soft">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
