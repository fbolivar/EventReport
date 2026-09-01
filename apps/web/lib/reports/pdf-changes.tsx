import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import type { ChangesReportInput } from "@/lib/reports/changes";
import { INK, INK_SOFT, LINE, SEVERITY, pdfText } from "@/lib/reports/pdf-theme";

/**
 * Informe de cambios: la bitácora del firewall.
 *
 * Cada entrada dice cuándo, en qué equipo, qué objeto y qué campo cambió, con
 * el valor anterior y el nuevo. Los cambios sin autor se marcan: son los que
 * abren la regla OP-004 y los que un auditor va a preguntar uno por uno.
 */
const SECTION_LABEL: Record<string, string> = {
  policies: "Políticas",
  nat: "NAT",
  admins: "Administradores",
  mgmt_access: "Acceso administrativo",
  vpn: "VPN",
  interfaces: "Interfaces",
  services: "Servicios",
};

const KIND_LABEL: Record<string, string> = {
  added: "Alta",
  removed: "Baja",
  modified: "Cambio",
};

const KIND_COLOR: Record<string, string> = {
  added: SEVERITY.medium!,
  removed: SEVERITY.critical!,
  modified: INK,
};

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontSize: 10, color: INK },
  brand: { fontSize: 9, color: INK_SOFT, marginBottom: 24 },
  h1: { fontSize: 22, marginBottom: 4 },
  meta: { fontSize: 9, color: INK_SOFT, marginBottom: 20 },
  h2: { fontSize: 13, marginTop: 20, marginBottom: 8 },
  body: { fontSize: 10, lineHeight: 1.6, marginBottom: 8 },
  soft: { color: INK_SOFT },
  counts: { flexDirection: "row", gap: 24, marginBottom: 4 },
  countValue: { fontSize: 18 },
  countLabel: { fontSize: 8, color: INK_SOFT },
  entry: { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8, marginTop: 8 },
  entryHead: { flexDirection: "row", justifyContent: "space-between" },
  when: { fontSize: 8, color: INK_SOFT },
  target: { fontSize: 11, marginTop: 2, marginBottom: 2 },
  field: { flexDirection: "row", marginTop: 2 },
  fieldName: { width: 96, fontSize: 8, color: INK_SOFT },
  fieldValue: { flex: 1, fontSize: 8 },
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

const when = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

export function ChangesReport({ input }: { input: ChangesReportInput }) {
  const period = `${input.period.start.slice(0, 10)} — ${input.period.end.slice(0, 10)}`;

  return (
    <Document title={`Cambios de configuración · ${input.tenant.name}`} author="EventReport">
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>EventReport</Text>
        <Text style={styles.h1}>Cambios de configuración</Text>
        <Text style={styles.meta}>
          {pdfText(input.tenant.name)} · {period}
        </Text>

        <View style={styles.counts}>
          <View>
            <Text style={styles.countValue}>{input.totals.changes}</Text>
            <Text style={styles.countLabel}>Cambios</Text>
          </View>
          <View>
            <Text
              style={{
                ...styles.countValue,
                color: input.totals.withoutActor > 0 ? SEVERITY.high : INK_SOFT,
              }}
            >
              {input.totals.withoutActor}
            </Text>
            <Text style={styles.countLabel}>Sin autor identificado</Text>
          </View>
        </View>

        {input.totals.withoutActor > 0 ? (
          <Text style={{ ...styles.body, ...styles.soft }}>
            Un cambio sin autor no se puede auditar: sabemos qué pasó, no quién lo hizo. Se
            identifica cuando el firewall envía sus registros de administración al colector y cada
            persona entra con su propia cuenta, sin credenciales compartidas.
          </Text>
        ) : null}

        <Text style={styles.h2}>Equipos incluidos</Text>
        {input.devices.map((device) => (
          <Text key={device.hostname} style={{ ...styles.body, ...styles.soft }}>
            {pdfText(device.hostname)} · {device.brand} · firmware {pdfText(device.firmware)}
          </Text>
        ))}

        <Text style={styles.h2}>Bitácora</Text>
        {input.lines.length === 0 ? (
          <Text style={{ ...styles.body, ...styles.soft }}>
            No se detectaron cambios de configuración en el período. La configuración del cierre es
            la misma con la que se abrió.
          </Text>
        ) : null}

        {input.lines.map((line, index) => (
          <View key={`${line.ts}-${line.target}-${index}`} style={styles.entry} wrap={false}>
            <View style={styles.entryHead}>
              <Text style={styles.when}>
                {when(line.ts)} · {pdfText(line.device)} · {SECTION_LABEL[line.section] ?? line.section}
              </Text>
              <Text style={{ ...styles.when, color: KIND_COLOR[line.kind] ?? INK }}>
                {KIND_LABEL[line.kind] ?? line.kind}
              </Text>
            </View>
            <Text style={styles.target}>{pdfText(line.target)}</Text>
            <Text style={styles.when}>
              {line.actor ? `Autor: ${pdfText(line.actor)}` : "Autor: no identificado"}
            </Text>

            {line.fields.map((field) => (
              <View key={field.field} style={styles.field}>
                <Text style={styles.fieldName}>{pdfText(field.field)}</Text>
                {/* La flecha va dentro de pdfText: escrita suelta en el JSX,
                    Helvetica no la tiene y el PDF la sustituye en silencio. */}
                <Text style={styles.fieldValue}>
                  {pdfText(`${field.before} → ${field.after}`)}
                </Text>
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

export async function renderChangesReport(input: ChangesReportInput): Promise<Buffer> {
  return renderToBuffer(<ChangesReport input={input} />);
}
