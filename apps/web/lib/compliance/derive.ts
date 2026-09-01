import type {
  ComplianceAssessment,
  Control,
  Finding,
  Firewall,
  Framework,
  FrameworkCode,
  FrameworkCoverage,
  RuleControl,
} from "@eventreport/schema";

/**
 * Motor de cumplimiento (§15.2). Función pura: recibe controles, mapeo,
 * hallazgos y capacidades de las marcas, y devuelve el estado de cada control.
 *
 * Vive fuera de la capa de datos a propósito. La usan los fixtures y las
 * consultas a Supabase, y es la misma que alimentará `compliance_assessments`
 * cuando el cálculo pase a ejecutarse del lado del servidor.
 */
export interface DeriveInput {
  frameworkCode: FrameworkCode;
  controls: Control[];
  ruleControls: RuleControl[];
  findings: Finding[];
  firewalls: Firewall[];
  /** Controles declarados fuera de alcance por el cliente, con justificación. */
  notApplicable?: Record<string, string>;
  assessedAt: string;
}

export function deriveAssessments({
  frameworkCode,
  controls,
  ruleControls,
  findings,
  firewalls,
  notApplicable = {},
  assessedAt,
}: DeriveInput): ComplianceAssessment[] {
  // Una regla es evaluable si al menos un firewall del tenant puede evaluarla.
  const isEvaluable = (ruleCode: string) =>
    firewalls.length === 0 ||
    firewalls.some((firewall) => !firewall.capabilities.unevaluableRules.includes(ruleCode));

  return controls.map((control) => {
    const justification = notApplicable[control.code];
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

    const ruleCodes = ruleControls
      .filter((row) => row.frameworkCode === frameworkCode && row.controlCode === control.code)
      .map((row) => row.ruleCode);

    const related = findings.filter((finding) => ruleCodes.includes(finding.ruleCode));
    const open = related.filter((finding) => finding.status === "open");
    const evaluables = ruleCodes.filter(isEvaluable);

    if (evaluables.length === 0) {
      return {
        frameworkCode,
        controlCode: control.code,
        status: "not_assessable" as const,
        evidenceFindingIds: [],
        assessedAt,
      };
    }

    if (open.length > 0) {
      return {
        frameworkCode,
        controlCode: control.code,
        status: "non_compliant" as const,
        evidenceFindingIds: open.map((finding) => finding.id),
        assessedAt,
      };
    }

    return {
      frameworkCode,
      controlCode: control.code,
      status: evaluables.length < ruleCodes.length ? ("partial" as const) : ("compliant" as const),
      evidenceFindingIds: related.map((finding) => finding.id),
      assessedAt,
    };
  });
}

/** Titular de cobertura del informe (§15.1). */
export function coverageFrom(
  framework: Framework,
  assessments: ComplianceAssessment[],
): FrameworkCoverage {
  const count = (status: ComplianceAssessment["status"]) =>
    assessments.filter((item) => item.status === status).length;

  return {
    frameworkCode: framework.code,
    totalControls: framework.totalControls,
    assessableControls: assessments.length,
    compliant: count("compliant"),
    nonCompliant: count("non_compliant"),
    partial: count("partial"),
    notAssessable: count("not_assessable"),
    notApplicable: count("not_applicable"),
  };
}
