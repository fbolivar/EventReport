import { cn } from "@/lib/utils/cn";

/**
 * Brand mark: a filled square holding three lines of a report, the top one in
 * `signal`. It reads at 16px, which is the size that matters (a favicon and a
 * sidebar). Wordmark is always "EventReport", never with a tagline.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cn("size-5", className)}>
      <rect width="20" height="20" rx="5" fill="currentColor" />
      <rect x="4.5" y="6" width="11" height="1.75" rx="0.875" fill="var(--er-signal)" />
      <rect x="4.5" y="9.5" width="8" height="1.75" rx="0.875" fill="var(--er-paper)" opacity="0.9" />
      <rect x="4.5" y="13" width="5" height="1.75" rx="0.875" fill="var(--er-paper)" opacity="0.55" />
    </svg>
  );
}

export function Logo({
  className,
  onInk = false,
}: {
  className?: string;
  onInk?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={onInk ? "text-ink-raised" : "text-ink"} />
      <span
        className={cn(
          "text-body font-semibold tracking-[-0.02em]",
          onInk ? "text-on-ink" : "text-ink",
        )}
      >
        EventReport
      </span>
    </span>
  );
}
