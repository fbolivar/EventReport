import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";

/**
 * Text only: no arrow, no icon at the end (docs/design-notes.md §7).
 * `signal` is the only saturated colour here; severity never becomes an action.
 */
const button = cva(
  "inline-flex items-center justify-center rounded-control font-medium transition-colors duration-[var(--er-duration-fast)] ease-er disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-signal text-paper hover:bg-signal-hover",
        secondary: "border border-line bg-paper text-ink hover:bg-mist",
        ghost: "text-ink hover:bg-mist",
        onInk: "bg-paper text-ink hover:bg-on-ink",
        onInkGhost: "border border-ink-line text-on-ink hover:bg-ink-raised",
      },
      size: {
        sm: "h-8 px-3 text-small",
        md: "h-10 px-4 text-small",
        lg: "h-12 px-5 text-body",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonVariants = VariantProps<typeof button>;

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonVariants & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}

export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ButtonVariants & React.ComponentPropsWithoutRef<typeof Link>) {
  return <Link className={cn(button({ variant, size }), className)} {...props} />;
}
