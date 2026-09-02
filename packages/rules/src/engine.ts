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

/**
 * Rellena las colecciones ausentes antes de evaluar.
 *
 * El motor recibe la configuración que envió un colector, y eso es entrada
 * externa: si una lista llega como `null` —cosa que pasa, porque en Go una
 * lista vacía se serializa así— la evaluación entera reventaba y el cliente se
 * quedaba sin hallazgos. Una regla puede no encontrar nada; lo que no puede es
 * dejar de correr porque un firewall no tiene túneles VPN.
 *
 * Aquí se normaliza en vez de comprobar en cada regla: veinticuatro reglas
 * defendiéndose por su cuenta es veinticuatro sitios donde olvidarlo.
 */
function withCollections(config: EvaluationInput["config"]): EvaluationInput["config"] {
  const list = <T,>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

  return {
    ...config,
    // Las listas de dentro de cada objeto también llegan nulas: una política
    // sin servicios, un administrador sin hosts de confianza. Se rellenan aquí
    // por la misma razón que las de arriba.
    admins: list(config.admins).map((admin) => ({
      ...admin,
      trustedHosts: list(admin?.trustedHosts),
    })),
    mgmtAccess: list(config.mgmtAccess).map((access) => ({
      ...access,
      protocols: list(access?.protocols),
    })),
    interfaces: list(config.interfaces),
    policies: list(config.policies).map((policy) => ({
      ...policy,
      srcZones: list(policy?.srcZones),
      dstZones: list(policy?.dstZones),
      src: list(policy?.src),
      dst: list(policy?.dst),
      services: list(policy?.services),
    })),
    nat: list(config.nat).map((rule) => ({ ...rule, ports: list(rule?.ports) })),
    certs: list(config.certs),
    licenses: list(config.licenses),
    vpn: { ...config.vpn, ipsec: list(config.vpn?.ipsec) },
    services: {
      ...config.services,
      ntp: list(config.services?.ntp),
      dns: list(config.services?.dns),
      syslogTargets: list(config.services?.syslogTargets),
    },
    capabilities: {
      ...config.capabilities,
      unevaluableRules: list(config.capabilities?.unevaluableRules),
    },
  };
}

export function evaluate(raw: EvaluationInput): RuleResult[] {
  const input: EvaluationInput = { ...raw, config: withCollections(raw.config) };

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
