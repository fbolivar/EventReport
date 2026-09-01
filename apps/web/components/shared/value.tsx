import { cn } from "@/lib/utils/cn";

/**
 * A literal read from the firewall: IP, rule id, hash, log line, CIS item.
 * Mono is a contract with the reader: what is in mono comes from the device,
 * what is in sans is what EventReport says about it (design-notes §6).
 */
export function Value({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("value", className)} {...props}>
      {children}
    </span>
  );
}
