import type { ControlStatus, Severity } from "@eventreport/schema";

/** Visual key of a severity: the same five values everywhere, plus `resolved`. */
export type SeverityKey = Severity | "resolved";

interface SeverityClasses {
  /** Text and icon colour on paper. */
  text: string;
  /** Solid fill for dots, bars and chart marks. */
  fill: string;
  /** Chip: 10% tint background with the severity as text. */
  chip: string;
  /** Same severity read over an ink surface. */
  onInk: string;
}

export const SEVERITY_CLASSES: Record<SeverityKey, SeverityClasses> = {
  critical: {
    text: "text-critical",
    fill: "bg-critical",
    chip: "bg-critical-tint text-critical",
    onInk: "text-critical-on-ink",
  },
  high: {
    text: "text-high",
    fill: "bg-high",
    chip: "bg-high-tint text-high",
    onInk: "text-high-on-ink",
  },
  medium: {
    text: "text-medium",
    fill: "bg-medium",
    chip: "bg-medium-tint text-medium",
    onInk: "text-medium-on-ink",
  },
  low: {
    text: "text-low",
    fill: "bg-low",
    chip: "bg-low-tint text-low",
    onInk: "text-low-on-ink",
  },
  resolved: {
    text: "text-resolved",
    fill: "bg-resolved",
    chip: "bg-resolved-tint text-resolved",
    onInk: "text-resolved-on-ink",
  },
};

/**
 * Control states reuse the severity scale (docs/design-notes.md §2).
 * `not_assessable` and `not_applicable` carry no risk colour on purpose: they
 * are an absence of evaluation, not a failure.
 */
export const CONTROL_STATUS_KEY: Record<ControlStatus, SeverityKey | null> = {
  compliant: "resolved",
  non_compliant: "critical",
  partial: "medium",
  not_assessable: null,
  not_applicable: null,
};

/** Colour of the posture score itself: it is a risk reading, not a brand mark. */
export function scoreKey(value: number): SeverityKey {
  if (value >= 85) return "resolved";
  if (value >= 70) return "medium";
  if (value >= 50) return "high";
  return "critical";
}
