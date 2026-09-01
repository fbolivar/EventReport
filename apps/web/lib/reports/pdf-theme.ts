/**
 * Paleta de los PDF.
 *
 * `@react-pdf/renderer` no lee variables CSS, así que los valores de
 * `styles/tokens.css` se repiten aquí. Este es el **único** lugar donde eso
 * ocurre: si cambia un token de color, se cambia aquí y en ningún otro sitio.
 */
export const INK = "#0C1B2A";
export const INK_SOFT = "#5A6B7C";
export const LINE = "#E2E7EC";

export const SEVERITY: Record<string, string> = {
  critical: "#B3261E",
  high: "#C2410C",
  medium: "#A16207",
  low: "#546374",
};

export const SEVERITY_LABEL: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

/**
 * Adapta un texto a lo que la fuente estándar del PDF sabe dibujar.
 *
 * `@react-pdf/renderer` usa Helvetica con codificación WinAnsi. Un carácter
 * fuera de esa tabla no falla: se sustituye por otro glifo. Así, la flecha de
 * "any → any" salía impresa como "any ’ any" —evidencia técnica alterada sin
 * que nadie se entere—. Aquí se traduce lo que sabemos que aparece y se
 * reemplaza el resto por un guion, que al menos se ve como lo que es.
 */
const REPLACEMENTS: Record<string, string> = {
  "→": "->",
  "⇒": "=>",
  "↔": "<->",
  "✓": "OK",
  "✗": "X",
  "≥": ">=",
  "≤": "<=",
  "≠": "!=",
};

/** Los símbolos que WinAnsi sí tiene por encima de Latin-1 (rango 0x80-0x9F). */
const WINANSI_EXTRAS = new Set(
  Array.from("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ"),
);

export function pdfText(value: string): string {
  let out = "";
  for (const char of value) {
    const mapped = REPLACEMENTS[char];
    if (mapped !== undefined) {
      out += mapped;
      continue;
    }
    const code = char.codePointAt(0)!;
    out += code <= 0xff || WINANSI_EXTRAS.has(char) ? char : "-";
  }
  return out;
}
