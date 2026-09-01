import type { ControlStatus, FrameworkCode } from "@eventreport/schema";

import { assessmentsFor, controlsFor, coverageFor, listFrameworks } from "@/lib/data/compliance";
import { listFindings, rulesByCode } from "@/lib/data/findings";
import { getTenant, listFirewalls } from "@/lib/data/tenant";

/**
 * Informe de cumplimiento (docs/diseno-tecnico.md §8, trimestral).
 *
 * Es el documento que el auditor se lleva: por cada control evaluable desde el
 * firewall, su estado y la evidencia que lo sostiene. Como el ejecutivo, no
 * inventa nada; a diferencia del ejecutivo, tampoco lo redacta el modelo. Un
 * informe de cumplimiento tiene que decir exactamente lo mismo si se regenera
 * mañana, o deja de ser evidencia.
 *
 * La nota de alcance (§15.1) no es un descargo legal: es la parte honesta del
 * producto. EventReport ve el perímetro, no el SGSI.
 */
export interface ComplianceControlLine {
  code: string;
  title: string;
  domain: string;
  status: ControlStatus;
  /** Hallazgos que sostienen el estado, con su evidencia literal. */
  evidence: Array<{
    code: string;
    title: string;
    asset: string;
    severity: string;
    /**
     * Un control que cumple se sostiene sobre hallazgos **cerrados**. Sin este
     * dato el informe muestra "Cumple" junto a lo que parece una falla abierta,
     * y el auditor lee una contradicción donde hay una corrección.
     */
    state: "abierto" | "resuelto" | "riesgo aceptado";
    since: string;
    values: Array<{ label: string; value: string }>;
  }>;
  /** Escrita por el cliente cuando declara el control fuera de alcance. */
  justification?: string;
}

export interface ComplianceReportInput {
  tenant: { name: string };
  framework: { code: FrameworkCode; name: string; version: string; scopeNote: string };
  period: { start: string; end: string };
  coverage: {
    totalControls: number;
    assessable: number;
    compliant: number;
    nonCompliant: number;
    partial: number;
    notAssessable: number;
    notApplicable: number;
  };
  /** Solo los controles evaluables: los demás no son parte del alcance del informe. */
  controls: ComplianceControlLine[];
  devices: Array<{ hostname: string; brand: string; firmware: string }>;
}

export async function buildComplianceInput(
  tenantSlug: string,
  frameworkCode: FrameworkCode,
  periodStart: string,
  periodEnd: string,
): Promise<ComplianceReportInput | undefined> {
  const [tenant, frameworks, controls, assessments, coverage, findings, rules, firewalls] =
    await Promise.all([
      getTenant(tenantSlug),
      listFrameworks(),
      controlsFor(frameworkCode),
      assessmentsFor(frameworkCode),
      coverageFor(frameworkCode),
      listFindings(),
      rulesByCode(),
      listFirewalls(),
    ]);

  const framework = frameworks.find((item) => item.code === frameworkCode);
  if (!tenant || !framework || !coverage) return undefined;

  const byCode = new Map(assessments.map((item) => [item.controlCode, item]));

  const lines: ComplianceControlLine[] = controls
    .map((control) => {
      const assessment = byCode.get(control.code);
      if (!assessment) return undefined;

      const evidence = assessment.evidenceFindingIds
        .map((id) => findings.find((finding) => finding.id === id))
        .filter((finding) => finding !== undefined)
        .map((finding) => ({
          code: finding.ruleCode,
          title: rules[finding.ruleCode]?.title ?? finding.ruleCode,
          asset: finding.assetLabel,
          severity: finding.severity,
          state:
            finding.status === "resolved"
              ? ("resuelto" as const)
              : finding.status === "accepted"
                ? ("riesgo aceptado" as const)
                : ("abierto" as const),
          since: (finding.resolvedAt ?? finding.firstSeen).slice(0, 10),
          values: finding.evidence,
        }));

      return {
        code: control.code,
        title: control.title,
        domain: control.domain,
        status: assessment.status,
        evidence,
        justification: assessment.justification,
      };
    })
    .filter((line) => line !== undefined)
    // Los no evaluables desde el firewall se cuentan en la portada, pero no se
    // listan: llenar veinte páginas de "no aplica a este producto" esconde lo
    // que sí evaluamos.
    .filter((line) => line.status !== "not_assessable");

  return {
    tenant: { name: tenant.name },
    framework: {
      code: framework.code,
      name: framework.name,
      version: framework.version,
      scopeNote: framework.scopeNote,
    },
    period: { start: periodStart, end: periodEnd },
    coverage: {
      totalControls: coverage.totalControls,
      assessable: coverage.assessableControls,
      compliant: coverage.compliant,
      nonCompliant: coverage.nonCompliant,
      partial: coverage.partial,
      notAssessable: coverage.notAssessable,
      notApplicable: coverage.notApplicable,
    },
    controls: lines,
    devices: firewalls.map((firewall) => ({
      hostname: firewall.hostname,
      brand: firewall.brand,
      firmware: firewall.firmware,
    })),
  };
}
