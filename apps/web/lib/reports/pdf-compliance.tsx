import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ControlStatus } from "@eventreport/schema";

import type { ComplianceReportInput } from "@/lib/reports/compliance";
import { INK, INK_SOFT, LINE, SEVERITY, SEVERITY_LABEL, pdfText } from "@/lib/reports/pdf-theme";

/**
 * Informe de cumplimiento: lo que el auditor archiva.
 *
 * La portada dice primero cuántos controles del marco quedan **fuera** de lo
 * que este producto puede evaluar. Un informe de cumplimiento que empieza por
 * lo que cumple, y esconde su alcance en una nota al pie, engaña al que lo lee.
 */
const STATUS_COLOR: Record<ControlStatus, string> = {
  compliant: "#0F766E",
  non_compliant: SEVERITY.critical!,
  partial: SEVERITY.medium!,
  not_assessable: INK_SOFT,
  not_applicable: INK_SOFT,
};

const STATUS_LABEL: Record<ControlStatus, string> = {
  compliant: "Cumple",
  non_compliant: "No cumple",
  partial: "Parcial",
  not_assessable: "No evaluable",
  not_applicable: "Fuera de alcance",
};

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontSize: 10, color: INK },
  brand: { fontSize: 9, color: INK_SOFT, marginBottom: 24 },
  h1: { fontSize: 22, marginBottom: 4 },
  meta: { fontSize: 9, color: INK_SOFT, marginBottom: 20 },
  h2: { fontSize: 13, marginTop: 20, marginBottom: 8 },
  body: { fontSize: 10, lineHeight: 1.6, marginBottom: 8 },
  soft: { color: INK_SOFT },
  scopeBox: { borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 12, marginBottom: 12 },
  counts: { flexDirection: "row", gap: 22, marginTop: 10, marginBottom: 4 },
  countValue: { fontSize: 18 },
  countLabel: { fontSize: 8, color: INK_SOFT },
  control: { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 10, marginTop: 10 },
  controlHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  controlCode: { fontSize: 11 },
  status: { fontSize: 9 },
  domain: { fontSize: 8, color: INK_SOFT, marginBottom: 4 },
  evidenceItem: { marginTop: 6, paddingLeft: 10 },
  evidenceTitle: { fontSize: 9, marginBottom: 2 },
  evidenceRow: { flexDirection: "row", marginTop: 1 },
  evidenceLabel: { width: 110, fontSize: 8, color: INK_SOFT },
  evidenceValue: { fontSize: 8 },
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

export function ComplianceReport({ input }: { input: ComplianceReportInput }) {
  const period = `${input.period.start.slice(0, 10)} — ${input.period.end.slice(0, 10)}`;
  const outOfReach = input.coverage.totalControls - input.coverage.assessable;

  return (
    <Document
      title={`Cumplimiento ${input.framework.name} · ${input.tenant.name}`}
      author="EventReport"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>EventReport</Text>
        <Text style={styles.h1}>Cumplimiento</Text>
        <Text style={styles.meta}>
          {pdfText(input.framework.name)} {pdfText(input.framework.version)} ·{" "}
          {pdfText(input.tenant.name)} · {period}
        </Text>

        <View style={styles.scopeBox}>
          <Text style={styles.body}>
            De los {input.coverage.totalControls} controles del marco, {input.coverage.assessable}{" "}
            se pueden evaluar desde la configuración y los registros del firewall. Los{" "}
            {outOfReach} restantes dependen de personas, procesos y sistemas que este producto no
            observa, y no se afirma nada sobre ellos.
          </Text>
          <Text style={{ ...styles.body, ...styles.soft, marginBottom: 0 }}>
            {pdfText(input.framework.scopeNote)}
          </Text>
        </View>

        <View style={styles.counts}>
          <View>
            <Text style={{ ...styles.countValue, color: STATUS_COLOR.compliant }}>
              {input.coverage.compliant}
            </Text>
            <Text style={styles.countLabel}>Cumplen</Text>
          </View>
          <View>
            <Text style={{ ...styles.countValue, color: STATUS_COLOR.non_compliant }}>
              {input.coverage.nonCompliant}
            </Text>
            <Text style={styles.countLabel}>No cumplen</Text>
          </View>
          <View>
            <Text style={{ ...styles.countValue, color: STATUS_COLOR.partial }}>
              {input.coverage.partial}
            </Text>
            <Text style={styles.countLabel}>Parciales</Text>
          </View>
          <View>
            <Text style={{ ...styles.countValue, color: INK_SOFT }}>
              {input.coverage.notApplicable}
            </Text>
            <Text style={styles.countLabel}>Fuera de alcance</Text>
          </View>
        </View>

        <Text style={styles.h2}>Equipos evaluados</Text>
        {input.devices.map((device) => (
          <Text key={device.hostname} style={{ ...styles.body, ...styles.soft }}>
            {pdfText(device.hostname)} · {device.brand} · firmware {pdfText(device.firmware)}
          </Text>
        ))}

        <Text style={styles.h2}>Estado por control</Text>
        {input.controls.map((control) => (
          <View key={control.code} style={styles.control} wrap={false}>
            <View style={styles.controlHead}>
              <Text style={styles.controlCode}>
                {control.code} · {pdfText(control.title)}
              </Text>
              <Text style={{ ...styles.status, color: STATUS_COLOR[control.status] }}>
                {STATUS_LABEL[control.status]}
              </Text>
            </View>
            {control.domain ? (
              <Text style={styles.domain}>{pdfText(control.domain)}</Text>
            ) : null}

            {control.justification ? (
              <Text style={{ ...styles.body, ...styles.soft }}>
                Fuera de alcance según el cliente: {pdfText(control.justification)}
              </Text>
            ) : null}

            {control.evidence.length === 0 && !control.justification ? (
              <Text style={{ ...styles.body, ...styles.soft }}>
                Sin hallazgos en el perímetro para este control durante el período.
              </Text>
            ) : null}

            {control.evidence.map((item) => (
              <View key={`${item.code}-${item.asset}`} style={styles.evidenceItem}>
                <Text style={styles.evidenceTitle}>
                  <Text style={{ color: SEVERITY[item.severity] ?? INK_SOFT }}>
                    {SEVERITY_LABEL[item.severity] ?? item.severity}
                  </Text>
                  {" · "}
                  {item.code} · {pdfText(item.title)} ({pdfText(item.asset)}) ·{" "}
                  {item.state} {item.state === "resuelto" ? "el" : "desde el"} {item.since}
                </Text>
                {item.values.map((value) => (
                  <View key={value.label} style={styles.evidenceRow}>
                    <Text style={styles.evidenceLabel}>{pdfText(value.label)}</Text>
                    <Text style={styles.evidenceValue}>{pdfText(value.value)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.footer} fixed>
          EventReport · BC Fabric SAS · Evidencia técnica del perímetro, no una certificación
        </Text>
      </Page>
    </Document>
  );
}

export async function renderComplianceReport(input: ComplianceReportInput): Promise<Buffer> {
  return renderToBuffer(<ComplianceReport input={input} />);
}
