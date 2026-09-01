import Anthropic from "@anthropic-ai/sdk";

import type { ReportInput } from "@/lib/reports/input";

/**
 * Report prose (docs/diseno-tecnico.md §8).
 *
 * Claude writes the narrative; every number comes from `ReportInput`, which we
 * computed. The model is told, in the system prompt, that it may not invent a
 * figure — and it has no way to obtain one anyway, because the input is the
 * whole of what it sees.
 *
 * Without an API key the pipeline still produces a report: a deterministic
 * template takes over. The product must not stop working because a third-party
 * key is missing, and it makes the whole thing testable offline.
 */
export interface ReportSections {
  /** Two or three sentences a general manager reads first. */
  summary: string;
  /** What changed since the previous period. */
  trend: string;
  /** The five main risks, in business language. */
  risks: Array<{ title: string; impact: string; action: string }>;
  /** Plan for the next 30, 60 and 90 days. */
  plan: { days30: string[]; days60: string[]; days90: string[] };
  /** Honest scope note for the compliance section (§15.1). */
  complianceNote: string;
  /** Whether the prose was written by the model or by the fallback template. */
  generatedBy: "claude" | "template";
}

const MODEL = "claude-opus-5";

const SYSTEM = `Eres el analista que redacta los informes de EventReport, un servicio que
convierte la configuración y los registros de un firewall en informes para la gerencia de una
PYME.

Reglas que no puedes romper:
- No inventes ninguna cifra. Solo puedes usar los números que aparecen en los datos que recibes.
- No prometas cumplimiento. EventReport aporta evidencia técnica del perímetro; no certifica.
- Escribe en español latinoamericano neutro, para un gerente sin vocabulario técnico.
- Frases cortas. Nada de "solución integral", "360°" ni "lleva tu seguridad al siguiente nivel".
- Cuando menciones un hallazgo, di qué significa para el negocio, no cómo se llama la regla.
- Para el volumen de tráfico usa el texto de "bytesLabel" tal cual; nunca escribas el número
  crudo de bytes ni lo conviertas tú.`;

/** JSON Schema of the sections: the model answers this shape or nothing. */
const SECTIONS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "trend", "risks", "plan", "complianceNote"],
  properties: {
    summary: { type: "string" },
    trend: { type: "string" },
    // `output_config` no admite `minItems`/`maxItems`: la cantidad se pide en la
    // instrucción, y `risks.length` se recorta abajo por si el modelo se pasa.
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "impact", "action"],
        properties: {
          title: { type: "string" },
          impact: { type: "string" },
          action: { type: "string" },
        },
      },
    },
    plan: {
      type: "object",
      additionalProperties: false,
      required: ["days30", "days60", "days90"],
      properties: {
        days30: { type: "array", items: { type: "string" } },
        days60: { type: "array", items: { type: "string" } },
        days90: { type: "array", items: { type: "string" } },
      },
    },
    complianceNote: { type: "string" },
  },
} as const;

export async function writeSections(input: ReportInput): Promise<ReportSections> {
  if (!process.env.ANTHROPIC_API_KEY) return templateSections(input);

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      // The instructions are identical on every report; the data is not. Keep
      // the stable half first and cached, and the tenant's numbers after it.
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: {
        format: { type: "json_schema", schema: SECTIONS_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content:
            "Redacta el informe ejecutivo del período. En \"risks\" incluye entre uno y cinco " +
            "riesgos, ordenados del más grave al menos grave. En cada lista del plan, entre " +
            "una y tres acciones.\n\n" +
            JSON.stringify(input, null, 2),
        },
      ],
    });

    const text = response.content.find((block) => block.type === "text");
    if (!text || text.type !== "text") return templateSections(input);

    const parsed = JSON.parse(text.text) as Omit<ReportSections, "generatedBy">;
    // El esquema no puede acotar la longitud, así que la acotamos aquí: el PDF
    // ejecutivo tiene sitio para cinco riesgos y ni uno más.
    return { ...parsed, risks: parsed.risks.slice(0, 5), generatedBy: "claude" };
  } catch (error) {
    // A report that arrives with plainer prose beats a report that does not
    // arrive. The failure is logged, not swallowed silently.
    console.error("No se pudo redactar con Claude, se usa la plantilla", error);
    return templateSections(input);
  }
}

/** Deterministic prose. Same facts, no model. */
export function templateSections(input: ReportInput): ReportSections {
  const { score, findings, compliance } = input;
  const critical = findings.bySeverity.critical ?? 0;
  const high = findings.bySeverity.high ?? 0;

  const summary = score
    ? `La postura del perímetro de ${input.tenant.name} está en ${score.value} sobre 100: ` +
      `${score.configuration} en configuración y ${score.operation} en operación. ` +
      `Hay ${findings.open} hallazgos abiertos, de los cuales ${critical} son críticos y ${high} altos.`
    : `Hay ${findings.open} hallazgos abiertos en el perímetro de ${input.tenant.name}.`;

  const trend =
    score?.delta === undefined
      ? "Este es el primer período con datos completos, así que todavía no hay comparación."
      : score.delta === 0
        ? "La postura no cambió respecto al período anterior."
        : score.delta > 0
          ? `La postura mejoró ${score.delta} puntos respecto al período anterior.`
          : `La postura bajó ${Math.abs(score.delta)} puntos respecto al período anterior.`;

  const risks = findings.top.map((finding) => ({
    title: finding.title,
    impact: `Afecta a ${finding.asset}. Detectado desde el ${finding.firstSeen.slice(0, 10)}.`,
    action: "Ver los pasos de corrección de la marca en el informe de hardening.",
  }));

  const iso = compliance[0];

  return {
    summary,
    trend,
    risks,
    plan: {
      days30: findings.top.slice(0, 2).map((finding) => `Cerrar: ${finding.title}`),
      days60: findings.top.slice(2, 4).map((finding) => `Cerrar: ${finding.title}`),
      days90: ["Revisar las reglas del firewall y retirar las que no tienen tráfico"],
    },
    complianceNote: iso
      ? `De los ${iso.totalControls} controles de ${iso.name}, ${iso.assessable} son evaluables ` +
        `desde el firewall: ${iso.compliant} cumplen y ${iso.nonCompliant} no. Este informe es ` +
        `evidencia técnica del perímetro, no una certificación.`
      : "Este informe es evidencia técnica del perímetro, no una certificación.",
    generatedBy: "template",
  };
}

/** Exported for tests and for the activity section of other report types. */
export const reportModel = MODEL;
export type { ReportInput };
export { SECTIONS_SCHEMA };
export const activitySummary = (input: ReportInput) =>
  `${input.activity.allowed.toLocaleString("es-CO")} sesiones permitidas y ` +
  `${input.activity.denied.toLocaleString("es-CO")} denegadas en ${input.activity.days} días.`;
