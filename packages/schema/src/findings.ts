/**
 * Rule catalog and finding lifecycle (docs/diseno-tecnico.md sections 7, 9 and 11).
 */
import type { Brand, Severity, Timestamp } from "./common";

export type RuleCode = string;

export type FindingStatus = "open" | "resolved" | "accepted";

export interface FindingRule {
  code: RuleCode;
  severity: Severity;
  title: string;
  description: string;
  /** Domain used to break the posture score down in the dashboard. */
  domain: RuleDomain;
}

export const RULE_DOMAINS = ["access", "policy", "vpn", "crypto", "logging", "maintenance"] as const;

export type RuleDomain = (typeof RULE_DOMAINS)[number];

export interface RuleRemediation {
  ruleCode: RuleCode;
  brand: Brand;
  steps: string[];
}

export interface Finding {
  id: string;
  firewallId: string;
  ruleCode: RuleCode;
  /** What the finding is about: a policy id, an admin name, an interface. */
  assetKey: string;
  assetLabel: string;
  status: FindingStatus;
  severity: Severity;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
  resolvedAt?: Timestamp;
  /** Literal values taken from the device; always rendered in mono. */
  evidence: FindingEvidence[];
}

export interface FindingEvidence {
  label: string;
  value: string;
}

export interface CriticalEvent {
  id: string;
  firewallId: string;
  ruleCode: RuleCode;
  severity: Severity;
  ts: Timestamp;
  title: string;
  detail: string;
  acknowledgedAt?: Timestamp;
}

/** Posture score: 70% configuration, 30% operation (section 11). */
export interface PostureScore {
  value: number;
  configuration: number;
  operation: number;
  previousValue?: number;
  computedAt: Timestamp;
}

export interface ScorePoint {
  date: Timestamp;
  value: number;
}
