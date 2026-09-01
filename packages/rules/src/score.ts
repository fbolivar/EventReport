/**
 * Posture score (docs/diseno-tecnico.md section 11).
 *
 * Configuration weighs 70% and operation 30%. The configuration side is
 * normalized by the size of the device: ten open findings on a firewall with
 * two hundred policies is not the same as ten on a firewall with six.
 */
import { SEVERITY_WEIGHTS, type Severity } from "@eventreport/schema";

export interface ScoreInput {
  /** Open findings that come from the configuration (FW-xxx). */
  configurationFindings: Array<{ severity: Severity }>;
  /** Open findings that come from operation (OP-xxx, FW-019). */
  operationFindings: Array<{ severity: Severity }>;
  policies: number;
  admins: number;
  /** Percentage of syslog lines dropped: data quality. */
  droppedPct: number;
  expiredLicenses: number;
  haDegraded: boolean;
  /** Critical events in the period with no treatment. */
  untreatedCriticalEvents: number;
}

export interface ScoreBreakdown {
  value: number;
  configuration: number;
  operation: number;
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function weigh(findings: Array<{ severity: Severity }>): number {
  return findings.reduce((sum, finding) => sum + SEVERITY_WEIGHTS[finding.severity], 0);
}

export function score(input: ScoreInput): ScoreBreakdown {
  // Reference surface: every policy and every admin is a chance to get it
  // wrong. The floor keeps a tiny firewall from being punished by its own size.
  const surface = Math.max(12, input.policies + input.admins * 2);

  // Saturating penalty rather than linear. A linear ratio sends any small
  // firewall with two critical findings straight to 0, and a score that
  // bottoms out stops telling the customer whether things got better.
  const weight = weigh(input.configurationFindings);
  const configurationPenalty = (weight / (weight + surface)) * 100;
  const configuration = clamp(100 - configurationPenalty);

  const operationPenalty =
    weigh(input.operationFindings) * 4 +
    Math.min(30, input.droppedPct * 6) +
    input.expiredLicenses * 8 +
    (input.haDegraded ? 10 : 0) +
    Math.min(20, input.untreatedCriticalEvents * 3);
  const operation = clamp(100 - operationPenalty);

  return {
    value: clamp(configuration * 0.7 + operation * 0.3),
    configuration,
    operation,
  };
}
