/**
 * Mapeo regla → control, tal cual la tabla del §7 del diseño técnico.
 * Es el mismo contenido que cargará `supabase/seed` en `rule_controls`.
 */
import type { FrameworkCode, RuleControl } from "@eventreport/schema";

type Mapping = [rule: string, iso: string[], cis: string[], pci: string[], hipaa: string[]];

const TABLE: Mapping[] = [
  ["FW-001", ["8.20", "8.9"], ["4.2", "12.8"], ["1.3.1", "2.2.7"], ["164.312(a)(1)"]],
  ["FW-002", ["8.5"], ["6.5"], ["8.4.1"], ["164.312(d)"]],
  ["FW-003", ["8.5", "8.20"], ["4.2", "12.8"], ["1.3.1"], ["164.312(a)(1)"]],
  ["FW-004", ["8.2"], ["5.4"], ["7.2.1"], ["164.308(a)(3)"]],
  ["FW-005", ["8.8"], ["7.4", "12.1"], ["6.3.3"], ["164.308(a)(5)(ii)(B)"]],
  ["FW-006", ["8.20"], ["4.2", "12.2"], ["1.2.5", "1.3.1"], ["164.312(a)(1)"]],
  ["FW-007", ["8.20"], ["4.2"], ["1.2.7"], ["164.308(a)(8)"]],
  ["FW-008", ["8.15"], ["8.2", "8.5"], ["10.2.1"], ["164.312(b)"]],
  ["FW-009", ["8.7", "8.20"], ["13.3", "13.10"], ["5.2.1", "11.5.1"], ["164.308(a)(5)(ii)(B)"]],
  ["FW-010", ["8.20"], ["12.2"], ["1.3.1", "1.4.4"], ["164.312(a)(1)"]],
  ["FW-011", ["8.5"], ["6.4"], ["8.4.3"], ["164.312(d)"]],
  ["FW-012", ["8.24"], ["3.10"], ["4.2.1"], ["164.312(e)(1)"]],
  ["FW-013", ["8.24"], ["3.10"], ["4.2.1"], ["164.312(e)(1)"]],
  ["FW-014", ["8.20"], ["4.2"], ["2.2.2"], ["164.312(a)(1)"]],
  ["FW-015", ["8.17"], ["8.4"], ["10.6.1"], ["164.312(b)"]],
  ["FW-016", ["8.7", "8.8"], ["10.1", "13.3"], ["5.2.1", "11.5.1"], ["164.308(a)(5)(ii)(B)"]],
  ["FW-017", ["8.15"], ["8.9", "8.10"], ["10.3.3", "10.5.1"], ["164.316(b)(2)"]],
  ["FW-018", ["8.14"], [], [], ["164.308(a)(7)"]],
  ["FW-019", ["8.15"], ["8.2"], ["10.2.1", "10.3.3"], ["164.312(b)"]],
  ["FW-020", ["8.20"], ["12.2"], ["1.3.2"], ["164.312(a)(1)"]],
  ["OP-001", ["8.20"], ["4.2"], ["1.2.7"], ["164.308(a)(8)"]],
  ["OP-002", ["5.25", "8.16"], ["17.4"], ["10.4.1"], ["164.308(a)(6)"]],
  ["OP-003", ["8.15"], ["8.10"], ["10.5.1"], ["164.316(b)(2)"]],
  ["OP-004", ["8.15", "8.32"], ["8.5"], ["10.2.1.6"], ["164.312(b)"]],
];

export const RULE_CONTROLS: RuleControl[] = TABLE.flatMap(([rule, iso, cis, pci, hipaa]) => {
  const rows: Array<[FrameworkCode, string[]]> = [
    ["iso27001", iso],
    ["cis_v8", cis],
    ["pci_dss", pci],
    ["hipaa", hipaa],
  ];
  return rows.flatMap(([frameworkCode, codes]) =>
    codes.map((controlCode) => ({ ruleCode: rule, frameworkCode, controlCode })),
  );
});

/** Reglas mapeadas a un control, para la columna de evidencia del informe. */
export function rulesForControl(frameworkCode: FrameworkCode, controlCode: string): string[] {
  return RULE_CONTROLS.filter(
    (row) => row.frameworkCode === frameworkCode && row.controlCode === controlCode,
  ).map((row) => row.ruleCode);
}
