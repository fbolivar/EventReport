import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import type { ActivityReportInput } from "@/lib/reports/activity";
import { INK, INK_SOFT, LINE, SEVERITY, pdfText } from "@/lib/reports/pdf-theme";

/**
 * Informe de actividad: qué movió la red durante el período.
 *
 * Las horas se dibujan con barras hechas de `View` en vez de un gráfico:
 * react-pdf no tiene canvas, y una barra de ancho proporcional se lee igual de
 * bien e imprime bien en blanco y negro.
 */
const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontSize: 10, color: INK },
  brand: { fontSize: 9, color: INK_SOFT, marginBottom: 24 },
  h1: { fontSize: 22, marginBottom: 4 },
  meta: { fontSize: 9, color: INK_SOFT, marginBottom: 20 },
  h2: { fontSize: 13, marginTop: 20, marginBottom: 8 },
  body: { fontSize: 10, lineHeight: 1.6, marginBottom: 8 },
  soft: { color: INK_SOFT },
  counts: { flexDirection: "row", flexWrap: "wrap", gap: 22, marginBottom: 6 },
  countValue: { fontSize: 17 },
  countLabel: { fontSize: 8, color: INK_SOFT },
  hourRow: { flexDirection: "row", alignItems: "center", marginTop: 1 },
  hourLabel: { width: 26, fontSize: 8, color: INK_SOFT },
  hourBar: { height: 5, backgroundColor: INK, borderRadius: 2 },
  hourValue: { fontSize: 8, color: INK_SOFT, marginLeft: 5 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 3,
    marginTop: 6,
  },
  row: { flexDirection: "row", paddingVertical: 2 },
  cellKey: { flex: 1, fontSize: 9 },
  cellNum: { width: 78, fontSize: 9, textAlign: "right" },
  headCell: { fontSize: 8, color: INK_SOFT },
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

const number = (value: number) => value.toLocaleString("es-CO");

export function ActivityReport({ input }: { input: ActivityReportInput }) {
  const period = `${input.period.start.slice(0, 10)} — ${input.period.end.slice(0, 10)}`;
  const peak = Math.max(1, ...input.byHour);

  return (
    <Document title={`Actividad de red · ${input.tenant.name}`} author="EventReport">
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>EventReport</Text>
        <Text style={styles.h1}>Actividad de red</Text>
        <Text style={styles.meta}>
          {pdfText(input.tenant.name)} · {period} · {input.period.days} días
        </Text>

        <View style={styles.counts}>
          <View>
            <Text style={styles.countValue}>{number(input.totals.allowed)}</Text>
            <Text style={styles.countLabel}>Sesiones permitidas</Text>
          </View>
          <View>
            <Text style={{ ...styles.countValue, color: SEVERITY.high }}>
              {number(input.totals.denied)}
            </Text>
            <Text style={styles.countLabel}>Rechazadas ({input.totals.deniedShare}%)</Text>
          </View>
          <View>
            <Text style={styles.countValue}>{number(input.totals.blockedIps)}</Text>
            <Text style={styles.countLabel}>IP bloqueadas</Text>
          </View>
          <View>
            <Text style={styles.countValue}>{number(input.totals.blockedWeb)}</Text>
            <Text style={styles.countLabel}>Accesos web bloqueados</Text>
          </View>
          <View>
            <Text style={styles.countValue}>{pdfText(input.totals.bytesLabel)}</Text>
            <Text style={styles.countLabel}>Volumen</Text>
          </View>
        </View>

        <Text style={{ ...styles.body, ...styles.soft }}>
          Estas cifras vienen de contadores por hora que envía el colector. Las líneas de registro
          completas se quedan en tu red: por eso el informe dice cuánto y de qué tipo, nunca quién
          visitó qué.
        </Text>

        <Text style={styles.h2}>Sesiones permitidas por hora del día</Text>
        <Text style={{ ...styles.body, ...styles.soft }}>
          Promedio del período. La actividad fuera del horario laboral es lo que conviene mirar
          primero: si a las tres de la mañana hay movimiento, alguien o algo está trabajando.
        </Text>
        {input.byHour.map((value, hour) => (
          <View key={hour} style={styles.hourRow}>
            <Text style={styles.hourLabel}>{String(hour).padStart(2, "0")}h</Text>
            <View style={{ ...styles.hourBar, width: `${Math.round((value / peak) * 70)}%` }} />
            <Text style={styles.hourValue}>{number(value)}</Text>
          </View>
        ))}

        <Text style={styles.h2}>Equipos incluidos</Text>
        {input.devices.map((device) => (
          <Text key={device.hostname} style={{ ...styles.body, ...styles.soft }}>
            {pdfText(device.hostname)} · {device.brand} · firmware {pdfText(device.firmware)}
          </Text>
        ))}

        <Text style={styles.footer} fixed>
          EventReport · BC Fabric SAS · Evidencia técnica del perímetro, no una certificación
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Detalle</Text>
        <Text style={styles.meta}>
          {pdfText(input.tenant.name)} · {period}
        </Text>

        {input.tops.map((top) => (
          <View key={top.dimension} wrap={false}>
            <Text style={styles.h2}>{top.title}</Text>
            <View style={styles.tableHead}>
              <Text style={{ ...styles.cellKey, ...styles.headCell }}>Valor</Text>
              <Text style={{ ...styles.cellNum, ...styles.headCell }}>Sesiones</Text>
            </View>
            {top.entries.map((entry) => (
              <View key={entry.key} style={styles.row}>
                <Text style={styles.cellKey}>{pdfText(entry.key)}</Text>
                <Text style={styles.cellNum}>{number(entry.count)}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.h2}>Por día</Text>
        <View style={styles.tableHead}>
          <Text style={{ ...styles.cellKey, ...styles.headCell }}>Día</Text>
          <Text style={{ ...styles.cellNum, ...styles.headCell }}>Permitidas</Text>
          <Text style={{ ...styles.cellNum, ...styles.headCell }}>Rechazadas</Text>
          <Text style={{ ...styles.cellNum, ...styles.headCell }}>Volumen</Text>
        </View>
        {input.daily.map((day) => (
          <View key={day.date} style={styles.row}>
            <Text style={styles.cellKey}>{day.date}</Text>
            <Text style={styles.cellNum}>{number(day.allowed)}</Text>
            <Text style={styles.cellNum}>{number(day.denied)}</Text>
            <Text style={styles.cellNum}>{pdfText(day.bytesLabel)}</Text>
          </View>
        ))}

        <Text style={styles.footer} fixed>
          EventReport · BC Fabric SAS · Evidencia técnica del perímetro, no una certificación
        </Text>
      </Page>
    </Document>
  );
}

export async function renderActivityReport(input: ActivityReportInput): Promise<Buffer> {
  return renderToBuffer(<ActivityReport input={input} />);
}
