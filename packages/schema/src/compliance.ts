/**
 * Compliance model (docs/diseno-tecnico.md section 15).
 * The product never claims "cumple ISO 27001": it reports how many controls are
 * assessable from the firewall and the state of each one.
 */
import type { Brand, Timestamp } from "./common";
import type { RuleCode } from "./findings";

export const FRAMEWORKS = ["iso27001", "cis_v8", "pci_dss", "hipaa"] as const;

export type FrameworkCode = (typeof FRAMEWORKS)[number];

export interface Framework {
  code: FrameworkCode;
  name: string;
  version: string;
  /** Retention the framework demands, in days. 0 = not prescribed. */
  logRetentionDays: number;
  /** Total controls in the framework, for the coverage statement (section 15.1). */
  totalControls: number;
  scopeNote: string;
}

export interface Control {
  frameworkCode: FrameworkCode;
  code: string;
  title: string;
  domain: string;
}

export interface RuleControl {
  ruleCode: RuleCode;
  frameworkCode: FrameworkCode;
  controlCode: string;
}

export const CONTROL_STATUSES = [
  "compliant",
  "non_compliant",
  "partial",
  "not_assessable",
  "not_applicable",
] as const;

export type ControlStatus = (typeof CONTROL_STATUSES)[number];

export const CONTROL_STATUS_LABELS: Record<ControlStatus, string> = {
  compliant: "Cumple",
  non_compliant: "No cumple",
  partial: "Parcial",
  not_assessable: "No evaluable",
  not_applicable: "Fuera de alcance",
};

export interface ComplianceAssessment {
  frameworkCode: FrameworkCode;
  controlCode: string;
  status: ControlStatus;
  /** Findings that justify the state; empty when not assessable. */
  evidenceFindingIds: string[];
  /** Required when the tenant marks a control out of scope. */
  justification?: string;
  assessedAt: Timestamp;
}

/** Coverage headline of the compliance report (section 15.1). */
export interface FrameworkCoverage {
  frameworkCode: FrameworkCode;
  totalControls: number;
  assessableControls: number;
  compliant: number;
  nonCompliant: number;
  partial: number;
  notAssessable: number;
  notApplicable: number;
}

/** CIS Benchmark item mapped to a generic rule (section 15.3). */
export interface BrandBenchmarkItem {
  brand: Brand;
  benchmarkVersion: string;
  itemCode: string;
  itemTitle: string;
  ruleCode: RuleCode;
}
