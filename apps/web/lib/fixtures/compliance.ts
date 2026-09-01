/**
 * Cumplimiento: controles evaluables desde el firewall y su estado (§15).
 * Los cinco estados aparecen en el conjunto: el informe nunca dice "cumple
 * ISO 27001", dice cuántos controles son evaluables y qué pasa con cada uno.
 */
import type {
  ComplianceAssessment,
  Control,
  Framework,
  FrameworkCoverage,
} from "@eventreport/schema";

export const DEMO_FRAMEWORKS: Framework[] = [
  {
    code: "iso27001",
    name: "ISO/IEC 27001:2022 Anexo A",
    version: "2022",
    logRetentionDays: 0,
    totalControls: 93,
    scopeNote:
      "EventReport aporta evidencia técnica del perímetro para tu SGSI. No sustituye la auditoría ni certifica el sistema de gestión.",
  },
  {
    code: "cis_v8",
    name: "CIS Controls v8 (IG1/IG2)",
    version: "8.0",
    logRetentionDays: 0,
    totalControls: 153,
    scopeNote:
      "Estado por salvaguarda, más los ítems del CIS Benchmark de la marca cuando existe para tu equipo.",
  },
  {
    code: "pci_dss",
    name: "PCI DSS v4.0.1",
    version: "4.0.1",
    logRetentionDays: 365,
    totalControls: 250,
    scopeNote:
      "Cubre los controles de seguridad de red (requisito 1 casi completo). La retención de 12 meses del requisito 10.5.1 exige un destino de registros adicional.",
  },
  {
    code: "hipaa",
    name: "HIPAA Security Rule (45 CFR 164)",
    version: "2013",
    logRetentionDays: 2_190,
    totalControls: 42,
    scopeNote:
      "Evidencia de salvaguardas técnicas de red. HIPAA no es certificable; aplica si procesas datos de salud de entidades cubiertas en EE. UU.",
  },
];

export const DEMO_ISO_CONTROLS: Control[] = [
  { frameworkCode: "iso27001", code: "8.20", title: "Seguridad de las redes", domain: "Controles tecnológicos" },
  { frameworkCode: "iso27001", code: "8.5", title: "Autenticación segura", domain: "Controles tecnológicos" },
  { frameworkCode: "iso27001", code: "8.15", title: "Registro de eventos", domain: "Controles tecnológicos" },
  { frameworkCode: "iso27001", code: "8.16", title: "Actividades de seguimiento", domain: "Controles tecnológicos" },
  { frameworkCode: "iso27001", code: "8.24", title: "Uso de criptografía", domain: "Controles tecnológicos" },
  { frameworkCode: "iso27001", code: "8.8", title: "Gestión de vulnerabilidades técnicas", domain: "Controles tecnológicos" },
  { frameworkCode: "iso27001", code: "8.17", title: "Sincronización de relojes", domain: "Controles tecnológicos" },
  { frameworkCode: "iso27001", code: "8.32", title: "Gestión de cambios", domain: "Controles tecnológicos" },
];

export const DEMO_ISO_ASSESSMENTS: ComplianceAssessment[] = [
  {
    frameworkCode: "iso27001",
    controlCode: "8.20",
    status: "non_compliant",
    evidenceFindingIds: ["fnd-001", "fnd-003"],
    assessedAt: "2026-08-31T02:00:00Z",
  },
  {
    frameworkCode: "iso27001",
    controlCode: "8.5",
    status: "non_compliant",
    evidenceFindingIds: ["fnd-002"],
    assessedAt: "2026-08-31T02:00:00Z",
  },
  {
    frameworkCode: "iso27001",
    controlCode: "8.15",
    status: "partial",
    evidenceFindingIds: ["fnd-003"],
    assessedAt: "2026-08-31T02:00:00Z",
  },
  {
    frameworkCode: "iso27001",
    controlCode: "8.16",
    status: "compliant",
    evidenceFindingIds: [],
    assessedAt: "2026-08-31T02:00:00Z",
  },
  {
    frameworkCode: "iso27001",
    controlCode: "8.24",
    status: "compliant",
    evidenceFindingIds: ["fnd-005"],
    assessedAt: "2026-08-31T02:00:00Z",
  },
  {
    frameworkCode: "iso27001",
    controlCode: "8.8",
    status: "compliant",
    evidenceFindingIds: [],
    assessedAt: "2026-08-31T02:00:00Z",
  },
  {
    frameworkCode: "iso27001",
    controlCode: "8.17",
    status: "not_assessable",
    evidenceFindingIds: [],
    assessedAt: "2026-08-31T02:00:00Z",
  },
  {
    frameworkCode: "iso27001",
    controlCode: "8.32",
    status: "not_applicable",
    evidenceFindingIds: [],
    justification:
      "La gestión de cambios se audita en la herramienta de tiquetes del cliente, fuera del alcance del firewall.",
    assessedAt: "2026-08-31T02:00:00Z",
  },
];

export const DEMO_ISO_COVERAGE: FrameworkCoverage = {
  frameworkCode: "iso27001",
  totalControls: 93,
  assessableControls: 14,
  compliant: 6,
  nonCompliant: 4,
  partial: 2,
  notAssessable: 1,
  notApplicable: 1,
};
