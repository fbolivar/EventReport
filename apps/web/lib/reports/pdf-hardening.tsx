import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import type { HardeningInput } from "@/lib/reports/hardening";
import {
  INK,
  INK_SOFT,
  LINE,
  SEVERITY,
  SEVERITY_LABEL,
  pdfText,
} from "@/lib/reports/pdf-theme";

/**
 * Informe de hardening: la lista de trabajo del técnico.
 *
 * Cada hallazgo lleva su evidencia y los pasos de la marca. El documento se
 * pagina solo según cuántos hallazgos haya; `wrap={false}` mantiene cada
 * hallazgo entero en una página, porque unos pasos partidos a la mitad se
 * ejecutan mal.
 */
const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontSize: 10, color: INK },
  brand: { fontSize: 9, color: INK_SOFT, marginBottom: 24 },
  h1: { fontSize: 22, marginBottom: 4 },
  meta: { fontSize: 9, color: INK_SOFT, marginBottom: 20 },
  h2: { fontSize: 13, marginTop: 20, marginBottom: 8 },
  body: { fontSize: 10, lineHeight: 1.6, marginBottom: 8 },
  soft: { color: INK_SOFT },
  counts: { flexDirection: "row", gap: 24, marginBottom: 8 },
  countValue: { fontSize: 18 },
  countLabel: { fontSize: 8, color: INK_SOFT },
  item: { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 10, marginTop: 10 },
  badge: { fontSize: 8, marginBottom: 4 },
  itemTitle: { fontSize: 12, marginBottom: 3 },
  evidence: { flexDirection: "row", marginTop: 2 },
  evidenceLabel: { width: 110, fontSize: 9, color: INK_SOFT },
  evidenceValue: { fontSize: 9 },
  step: { flexDirection: "row", marginTop: 3 },
  stepNumber: { width: 16, fontSize: 9, color: INK_SOFT },
  stepText: { flex: 1, fontSize: 9, lineHeight: 1.5 },
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

const SEVERITIES = ["critical", "high", "medium", "low"] as const;

export function HardeningReport({ input }: { input: HardeningInput }) {
  const period = `${input.period.start.slice(0, 10)} — ${input.period.end.slice(0, 10)}`;

  return (
    <Document title={`Hardening del firewall · ${input.tenant.name}`} author="EventReport">
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>EventReport</Text>
        <Text style={styles.h1}>Hardening del firewall</Text>
        <Text style={styles.meta}>
          {pdfText(input.tenant.name)} · {period}
        </Text>

        <View style={styles.counts}>
          {SEVERITIES.map((severity) => (
            <View key={severity}>
              <Text style={{ ...styles.countValue, color: SEVERITY[severity] }}>
                {input.counts[severity]}
              </Text>
              <Text style={styles.countLabel}>{SEVERITY_LABEL[severity]}</Text>
            </View>
          ))}
        </View>

        <Text style={{ ...styles.body, ...styles.soft }}>
          {input.items.length} hallazgos abiertos, ordenados por severidad. Los pasos son los del
          fabricante para la versión instalada; verifica en un cambio controlado antes de aplicarlos
          en producción.
        </Text>

        <Text style={styles.h2}>Equipos incluidos</Text>
        {input.devices.map((device) => (
          <Text key={device.hostname} style={{ ...styles.body, ...styles.soft }}>
            {pdfText(device.hostname)} · {device.brand} · firmware {pdfText(device.firmware)}
          </Text>
        ))}

        {input.items.map((item) => (
          <View key={`${item.code}-${item.asset}`} style={styles.item} wrap={false}>
            <Text style={{ ...styles.badge, color: SEVERITY[item.severity] ?? INK_SOFT }}>
              {SEVERITY_LABEL[item.severity]} · {item.code} · {pdfText(item.asset)}
            </Text>
            <Text style={styles.itemTitle}>{pdfText(item.title)}</Text>
            {item.description ? (
              <Text style={{ ...styles.body, ...styles.soft }}>{pdfText(item.description)}</Text>
            ) : null}

            {item.evidence.map((entry) => (
              <View key={entry.label} style={styles.evidence}>
                <Text style={styles.evidenceLabel}>{pdfText(entry.label)}</Text>
                <Text style={styles.evidenceValue}>{pdfText(entry.value)}</Text>
              </View>
            ))}

            {item.steps.length > 0 ? (
              <View style={{ marginTop: 6 }}>
                {item.steps.map((step, index) => (
                  <View key={step} style={styles.step}>
                    <Text style={styles.stepNumber}>{index + 1}.</Text>
                    <Text style={styles.stepText}>{pdfText(step)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ ...styles.body, ...styles.soft, marginTop: 6 }}>
                Todavía no tenemos los pasos de {item.brand} para esta regla. El hallazgo y su
                evidencia son válidos; la corrección hay que buscarla en la documentación del
                fabricante.
              </Text>
            )}
          </View>
        ))}

        <Text style={styles.footer} fixed>
          EventReport · BC Fabric SAS · Evidencia técnica del perímetro, no una certificación
        </Text>
      </Page>
    </Document>
  );
}

export async function renderHardeningReport(input: HardeningInput): Promise<Buffer> {
  return renderToBuffer(<HardeningReport input={input} />);
}
