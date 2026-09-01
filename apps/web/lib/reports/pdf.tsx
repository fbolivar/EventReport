import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import type { ReportInput } from "@/lib/reports/input";
import type { ReportSections } from "@/lib/reports/sections";

/**
 * The PDF the customer takes to a board meeting or to an auditor.
 *
 * The palette is the one from styles/tokens.css. react-pdf cannot read CSS
 * variables, so the values are repeated here — the only place in the codebase
 * where that is true, and the reason this file names its source.
 */
const INK = "#0C1B2A";
const INK_SOFT = "#5A6B7C";
const LINE = "#E2E7EC";
const SEVERITY: Record<string, string> = {
  critical: "#B3261E",
  high: "#C2410C",
  medium: "#A16207",
  low: "#546374",
};

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontSize: 10, color: INK },
  brand: { fontSize: 9, color: INK_SOFT, marginBottom: 24 },
  h1: { fontSize: 22, marginBottom: 4 },
  meta: { fontSize: 9, color: INK_SOFT, marginBottom: 24 },
  h2: { fontSize: 13, marginTop: 20, marginBottom: 8 },
  body: { fontSize: 10, lineHeight: 1.6, marginBottom: 8 },
  soft: { color: INK_SOFT },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8 },
  scoreBox: {
    width: 76,
    height: 76,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: { fontSize: 30 },
  risk: { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8, marginTop: 8 },
  riskTitle: { fontSize: 11, marginBottom: 3 },
  badge: { fontSize: 8, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  tableHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 4,
    fontSize: 8,
    color: INK_SOFT,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    fontSize: 8,
    color: INK_SOFT,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8,
  },
});

function scoreColor(value: number): string {
  if (value >= 85) return "#0F766E";
  if (value >= 70) return SEVERITY.medium!;
  if (value >= 50) return SEVERITY.high!;
  return SEVERITY.critical!;
}

const number = (value: number) => value.toLocaleString("es-CO");

export function ExecutiveReport({
  input,
  sections,
}: {
  input: ReportInput;
  sections: ReportSections;
}) {
  const period = `${input.period.start.slice(0, 10)} — ${input.period.end.slice(0, 10)}`;

  return (
    <Document title={`Informe ejecutivo · ${input.tenant.name}`} author="EventReport">
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>EventReport</Text>
        <Text style={styles.h1}>Informe ejecutivo de postura</Text>
        <Text style={styles.meta}>
          {input.tenant.name} · {period}
        </Text>

        {input.score ? (
          <View style={styles.scoreRow}>
            <View style={styles.scoreBox}>
              <Text style={{ ...styles.scoreValue, color: scoreColor(input.score.value) }}>
                {input.score.value}
              </Text>
            </View>
            <View>
              <Text style={styles.body}>Postura del perímetro sobre 100</Text>
              <Text style={{ ...styles.body, ...styles.soft }}>
                Configuración {input.score.configuration} · Operación {input.score.operation}
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.body}>{sections.summary}</Text>
        <Text style={{ ...styles.body, ...styles.soft }}>{sections.trend}</Text>

        <Text style={styles.h2}>Riesgos principales</Text>
        {sections.risks.map((risk, index) => {
          const finding = input.findings.top[index];
          return (
            <View key={risk.title} style={styles.risk}>
              {finding ? (
                <Text style={{ ...styles.badge, color: SEVERITY[finding.severity] ?? INK_SOFT }}>
                  {finding.code} · {finding.severity}
                </Text>
              ) : null}
              <Text style={styles.riskTitle}>{risk.title}</Text>
              <Text style={styles.body}>{risk.impact}</Text>
              <Text style={{ ...styles.body, ...styles.soft }}>{risk.action}</Text>
            </View>
          );
        })}

        <Text style={styles.footer} fixed>
          EventReport · BC Fabric SAS · Evidencia técnica del perímetro, no una certificación
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Plan a 30, 60 y 90 días</Text>
        {(["days30", "days60", "days90"] as const).map((key, index) => (
          <View key={key}>
            <Text style={{ ...styles.body, marginTop: 8 }}>
              {[30, 60, 90][index]} días
            </Text>
            {sections.plan[key].map((item) => (
              <Text key={item} style={{ ...styles.body, ...styles.soft }}>
                · {item}
              </Text>
            ))}
          </View>
        ))}

        <Text style={styles.h2}>Actividad del período</Text>
        <View style={styles.tableHead}>
          <Text>Medida</Text>
          <Text>Valor</Text>
        </View>
        {[
          ["Sesiones permitidas", number(input.activity.allowed)],
          ["Sesiones denegadas", number(input.activity.denied)],
          ["Bloqueos de IPS", number(input.activity.blockedIps)],
          ["Bloqueos web", number(input.activity.blockedWeb)],
        ].map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text>{label}</Text>
            <Text>{value}</Text>
          </View>
        ))}

        <Text style={styles.h2}>Cumplimiento</Text>
        <Text style={{ ...styles.body, ...styles.soft }}>{sections.complianceNote}</Text>
        <View style={styles.tableHead}>
          <Text>Marco</Text>
          <Text>Evaluables · cumplen · no cumplen</Text>
        </View>
        {input.compliance.map((framework) => (
          <View key={framework.framework} style={styles.row}>
            <Text>{framework.name}</Text>
            <Text>
              {framework.assessable} · {framework.compliant} · {framework.nonCompliant}
            </Text>
          </View>
        ))}

        <Text style={styles.h2}>Equipos incluidos</Text>
        {input.devices.map((device) => (
          <View key={device.hostname} style={styles.row}>
            <Text>
              {device.hostname} · {device.brand} {device.firmware}
            </Text>
            <Text style={styles.soft}>
              {device.unevaluableRules.length === 0
                ? "todas las reglas evaluables"
                : `no evaluables: ${device.unevaluableRules.join(", ")}`}
            </Text>
          </View>
        ))}

        <Text style={{ ...styles.body, ...styles.soft, marginTop: 16 }}>
          Redacción {sections.generatedBy === "claude" ? "asistida por Claude" : "en plantilla"} ·
          cifras calculadas por EventReport a partir de la configuración y los registros del
          firewall.
        </Text>

        <Text style={styles.footer} fixed>
          EventReport · BC Fabric SAS · Evidencia técnica del perímetro, no una certificación
        </Text>
      </Page>
    </Document>
  );
}

/** Renders the PDF to a buffer, ready to store or download. */
export async function renderExecutiveReport(
  input: ReportInput,
  sections: ReportSections,
): Promise<Buffer> {
  return renderToBuffer(<ExecutiveReport input={input} sections={sections} />);
}
