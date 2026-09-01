/**
 * Contract of the rules engine (docs/diseno-tecnico.md section 7).
 *
 * A rule reads the normalized configuration and a handful of operational
 * signals, and returns one hit per affected asset. It never reads the brand:
 * that is the whole point of the normalized model. What the brand cannot
 * provide is declared in `Capabilities`, and the engine marks those rules as
 * not evaluable instead of assuming they pass.
 */
import type { Capabilities, FirewallConfig, Severity } from "../schema/index.ts";

/** Signals that do not live in the configuration (OP-xxx and FW-015/019). */
export interface OperationalSignals {
  /** Percentage of syslog lines the collector dropped (FW-019). */
  droppedPct: number;
  /** Days of raw logs kept in the local vault. */
  vaultDays: number;
  /** Retention the active frameworks demand, in days (OP-003). */
  requiredRetentionDays: number;
  /** Critical events with no treatment for over seven days (OP-002). */
  untreatedCriticalEvents: number;
  /** When the last hardening report was approved (OP-001). */
  lastHardeningReportAt?: string;
  /** Configuration changes with no identified actor (OP-004). */
  changesWithoutActor: number;
}

/** Firmware advisory, fed from the brand's feed (FW-005). */
export interface FirmwareAdvisory {
  brand: string;
  /** Affected versions, matched exactly against `device.firmware`. */
  versions: string[];
  cve: string;
  cvss: number;
  fixedIn: string;
}

/** Outbound traffic to countries with no relation to the business (FW-020). */
export interface HighRiskDestination {
  country: string;
  sessions: number;
}

export interface EvaluationInput {
  config: FirewallConfig;
  signals: OperationalSignals;
  /** Evaluation instant; injected so results are reproducible in tests. */
  now: string;
  advisories?: FirmwareAdvisory[];
  highRiskTraffic?: HighRiskDestination[];
}

/** A rule firing on one asset: a policy, an admin account, an interface. */
export interface RuleHit {
  assetKey: string;
  assetLabel: string;
  evidence: Array<{ label: string; value: string }>;
}

export interface Rule {
  code: string;
  severity: Severity;
  /** Capability the brand needs for this rule to mean anything. */
  requires?: (capabilities: Capabilities) => boolean;
  evaluate: (input: EvaluationInput) => RuleHit[];
}

/** Outcome of one rule over one firewall. */
export interface RuleResult {
  code: string;
  severity: Severity;
  /** `false` when the brand cannot answer: the report says so, it does not pass it. */
  evaluable: boolean;
  hits: RuleHit[];
}

export const DAY_MS = 86_400_000;

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS);
}
