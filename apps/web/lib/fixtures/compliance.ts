/**
 * Cumplimiento: catálogo de controles y evaluación derivada de los hallazgos.
 *
 * El estado de cada control NO está escrito a mano: se deriva de las reglas
 * mapeadas y de lo que la marca puede evaluar, con la tabla del §15.2. Cuando
 * llegue Supabase, esta misma función alimenta `compliance_assessments`.
 */
import type { ComplianceAssessment, FrameworkCode, FrameworkCoverage } from "@eventreport/schema";

import { controlsFor, DEMO_FRAMEWORKS, frameworkByCode } from "@/lib/fixtures/catalog";
import { DEMO_FINDINGS } from "@/lib/fixtures/findings";
import { RULE_CONTROLS } from "@/lib/fixtures/rule-controls";
import { DEMO_FIREWALLS } from "@/lib/fixtures/tenant";

export { controlsFor, DEMO_FRAMEWORKS, frameworkByCode };

/** Controles que el cliente declaró fuera de alcance, con justificación (§15.2). */
const NOT_APPLICABLE: Record<string, string> = {
  "iso27001:8.32":
    "La gestión de cambios se audita en la herramienta de tiquetes del cliente, fuera del alcance del firewall.",
};

/** Una regla es evaluable si al menos un firewall del tenant puede evaluarla. */
function isEvaluable(ruleCode: string): boolean {
  return DEMO_FIREWALLS.some(
    (firewall) => !firewall.capabilities.unevaluableRules.includes(ruleCode),
  );
}

/**
 * Deriva el estado de cada control con la tabla del §15.2. Ningún estado se
 * escribe a mano: si se resuelve un hallazgo, el control cambia solo.
 */
export function assessmentsFor(frameworkCode: FrameworkCode): ComplianceAssessment[] {
  const assessedAt = "2026-08-31T03:00:00Z";

  return controlsFor(frameworkCode).map((control) => {
    const justification = NOT_APPLICABLE[`${frameworkCode}:${control.code}`];
    const ruleCodes = RULE_CONTROLS.filter(
      (row) => row.frameworkCode === frameworkCode && row.controlCode === control.code,
    ).map((row) => row.ruleCode);

    const findings = DEMO_FINDINGS.filter((finding) => ruleCodes.includes(finding.ruleCode));
    const openFindings = findings.filter((finding) => finding.status === "open");
    const evaluables = ruleCodes.filter(isEvaluable);

    if (justification) {
      return {
        frameworkCode,
        controlCode: control.code,
        status: "not_applicable" as const,
        evidenceFindingIds: [],
        justification,
        assessedAt,
      };
    }

    if (evaluables.length === 0) {
      return {
        frameworkCode,
        controlCode: control.code,
        status: "not_assessable" as const,
        evidenceFindingIds: [],
        assessedAt,
      };
    }

    if (openFindings.length > 0) {
      return {
        frameworkCode,
        controlCode: control.code,
        status: "non_compliant" as const,
        evidenceFindingIds: openFindings.map((finding) => finding.id),
        assessedAt,
      };
    }

    const status = evaluables.length < ruleCodes.length ? "partial" : "compliant";
    return {
      frameworkCode,
      controlCode: control.code,
      status,
      evidenceFindingIds: findings.map((finding) => finding.id),
      assessedAt,
    };
  });
}

/** Titular de cobertura del informe de cumplimiento (§15.1). */
export function coverageFor(frameworkCode: FrameworkCode): FrameworkCoverage {
  const framework = frameworkByCode(frameworkCode);
  const assessments = assessmentsFor(frameworkCode);
  const count = (status: ComplianceAssessment["status"]) =>
    assessments.filter((item) => item.status === status).length;

  return {
    frameworkCode,
    totalControls: framework?.totalControls ?? assessments.length,
    assessableControls: assessments.length,
    compliant: count("compliant"),
    nonCompliant: count("non_compliant"),
    partial: count("partial"),
    notAssessable: count("not_assessable"),
    notApplicable: count("not_applicable"),
  };
}

/** Atajos que consumen la landing y la guía de estilo. */
export const DEMO_ISO_CONTROLS = controlsFor("iso27001");
export const DEMO_ISO_ASSESSMENTS = assessmentsFor("iso27001");
export const DEMO_ISO_COVERAGE = coverageFor("iso27001");
