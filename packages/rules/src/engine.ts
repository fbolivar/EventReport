/**
 * Rules engine (docs/diseno-tecnico.md sections 7 and 11).
 *
 * Two responsibilities, kept apart on purpose:
 *   `evaluate()` says what is true about the device right now.
 *   `reconcile()` turns that into the lifecycle of findings against what the
 *   database already stores, so a finding that persists keeps its `first_seen`
 *   and one that disappears is resolved instead of deleted.
 */
import type { Finding, Severity } from "@eventreport/schema";

import { FW_001, FW_002, FW_003, FW_004, FW_014 } from "./rules/access.ts";
import { FW_006, FW_007, FW_008, FW_009, FW_010, FW_020 } from "./rules/policy.ts";
import { FW_011, FW_012, FW_013 } from "./rules/crypto-vpn.ts";
import {
  FW_005,
  FW_015,
  FW_016,
  FW_017,
  FW_018,
  FW_019,
  OP_001,
  OP_002,
  OP_003,
  OP_004,
} from "./rules/operations.ts";
import type { EvaluationInput, Rule, RuleResult } from "./types.ts";

/** Catalogue order matches section 7, so the report reads like the document. */
export const RULES: Rule[] = [
  FW_001,
  FW_002,
  FW_003,
  FW_004,
  FW_005,
  FW_006,
  FW_007,
  FW_008,
  FW_009,
  FW_010,
  FW_011,
  FW_012,
  FW_013,
  FW_014,
  FW_015,
  FW_016,
  FW_017,
  FW_018,
  FW_019,
  FW_020,
  OP_001,
  OP_002,
  OP_003,
  OP_004,
];

export function evaluate(input: EvaluationInput): RuleResult[] {
  return RULES.map((rule) => {
    const evaluable = rule.requires ? rule.requires(input.config.capabilities) : true;

    return {
      code: rule.code,
      severity: rule.severity,
      evaluable,
      // A rule the brand cannot answer produces no hits AND is not a pass:
      // `evaluable: false` is what the compliance report reads.
      hits: evaluable ? rule.evaluate(input) : [],
    };
  });
}

/** A finding as the engine produces it, before it reaches the database. */
export interface EvaluatedFinding {
  ruleCode: string;
  severity: Severity;
  assetKey: string;
  assetLabel: string;
  evidence: Array<{ label: string; value: string }>;
}

export function toFindings(results: RuleResult[]): EvaluatedFinding[] {
  return results.flatMap((result) =>
    result.hits.map((hit) => ({
      ruleCode: result.code,
      severity: result.severity,
      assetKey: hit.assetKey,
      assetLabel: hit.assetLabel,
      evidence: hit.evidence,
    })),
  );
}

export interface Reconciliation {
  /** Findings that did not exist before. */
  opened: EvaluatedFinding[];
  /** Findings that persist: only `last_seen` and the evidence change. */
  updated: Array<{ id: string; finding: EvaluatedFinding }>;
  /** Open findings the device no longer shows: they close, they are not deleted. */
  resolved: Finding[];
}

const identity = (ruleCode: string, assetKey: string) => `${ruleCode}::${assetKey}`;

/**
 * Compares what the device shows now against the findings already stored for
 * that firewall. Findings the customer accepted as a risk stay accepted: the
 * engine never overrides a human decision.
 */
export function reconcile(existing: Finding[], current: EvaluatedFinding[]): Reconciliation {
  const byIdentity = new Map(
    existing.map((finding) => [identity(finding.ruleCode, finding.assetKey), finding]),
  );
  const currentIdentities = new Set(
    current.map((finding) => identity(finding.ruleCode, finding.assetKey)),
  );

  const opened: EvaluatedFinding[] = [];
  const updated: Array<{ id: string; finding: EvaluatedFinding }> = [];

  for (const finding of current) {
    const match = byIdentity.get(identity(finding.ruleCode, finding.assetKey));
    if (!match) {
      opened.push(finding);
    } else {
      updated.push({ id: match.id, finding });
    }
  }

  const resolved = existing.filter(
    (finding) =>
      finding.status === "open" &&
      !currentIdentities.has(identity(finding.ruleCode, finding.assetKey)),
  );

  return { opened, updated, resolved };
}
