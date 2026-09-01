import { Value } from "@/components/shared/value";
import { cn } from "@/lib/utils/cn";
import { Row, Section } from "./shell";

const BASE_COLORS = [
  { name: "paper", token: "--er-paper", hex: "#FFFFFF", use: "Fondo de página y tarjetas de informe" },
  { name: "mist", token: "--er-mist", hex: "#F3F5F8", use: "Superficie secundaria fría" },
  { name: "ink", token: "--er-ink", hex: "#0C1B2A", use: "Texto primario y superficies de peso" },
  { name: "ink-soft", token: "--er-ink-soft", hex: "#5A6B7C", use: "Texto secundario, etiquetas, ejes" },
  { name: "line", token: "--er-line", hex: "#E2E7EC", use: "Bordes y separadores" },
  { name: "signal", token: "--er-signal", hex: "#0E5FD8", use: "Acciones, enlaces, serie principal" },
];

const SEVERITY_COLORS = [
  { name: "crítica", token: "--er-sev-critical", hex: "#B3261E", swatch: "bg-critical" },
  { name: "alta", token: "--er-sev-high", hex: "#C2410C", swatch: "bg-high" },
  { name: "media", token: "--er-sev-medium", hex: "#A16207", swatch: "bg-medium" },
  { name: "baja", token: "--er-sev-low", hex: "#546374", swatch: "bg-low" },
  { name: "resuelta", token: "--er-sev-resolved", hex: "#0F766E", swatch: "bg-resolved" },
];

const TYPE_STEPS = [
  { step: "display", className: "text-display", sample: "Tu firewall ya sabe qué está pasando" },
  { step: "h1", className: "text-h1", sample: "Hallazgos abiertos" },
  { step: "h2", className: "text-h2", sample: "Cumplimiento por marco" },
  { step: "h3", className: "text-h3", sample: "Administración expuesta en interfaz WAN" },
  {
    step: "body",
    className: "text-body",
    sample:
      "La administración por HTTPS responde en una interfaz conectada a internet. Cualquiera puede intentar autenticarse contra el equipo que protege la red.",
  },
  { step: "small", className: "text-small", sample: "38 usuarios habilitados · sin segundo factor" },
  { step: "micro", className: "text-micro", sample: "Última sincronización hace 4 minutos" },
];

const SPACING = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128];

export function FoundationsSections() {
  return (
    <>
      <Section
        id="paleta"
        title="Paleta"
        description="Base clara, una sola superficie de peso y un solo color de marca. El color saturado está reservado a las acciones y al riesgo."
      >
        <ul className="divide-y divide-line">
          {BASE_COLORS.map((color) => (
            <li key={color.name} className="flex items-center gap-4 py-3">
              <span
                className="size-10 shrink-0 rounded-control border border-line"
                style={{ backgroundColor: `var(${color.token})` }}
              />
              <span className="w-24 text-small font-medium">{color.name}</span>
              <Value className="w-52 text-micro text-ink-soft">{color.token}</Value>
              <Value className="w-20 text-micro text-ink-soft">{color.hex}</Value>
              <span className="hidden text-small text-ink-soft md:inline">{color.use}</span>
            </li>
          ))}
        </ul>

        <h3 className="mt-8 text-h3">Severidades</h3>
        <p className="mt-2 max-w-prose text-small text-ink-soft">
          Fijas y accesibles. Cada una lleva punto sólido además del color, para que la información
          sobreviva en escala de grises y en deuteranopía.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-surface border border-line p-4">
            <p className="text-micro text-ink-soft">Sobre papel</p>
            <ul className="mt-3 space-y-2">
              {SEVERITY_COLORS.map((sev) => (
                <li key={sev.name} className="flex items-center gap-3">
                  <span className={cn("size-4 rounded-control", sev.swatch)} />
                  <span className="w-20 text-small">{sev.name}</span>
                  <Value className="text-micro text-ink-soft">{sev.hex}</Value>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-surface border border-line p-4">
            <p className="text-micro text-ink-soft">
              En escala de grises (prueba de que el color no es el único portador)
            </p>
            <ul className="mt-3 space-y-2 [filter:grayscale(1)]">
              {SEVERITY_COLORS.map((sev) => (
                <li key={sev.name} className="flex items-center gap-3">
                  <span className={cn("size-4 rounded-control", sev.swatch)} />
                  <span className="w-20 text-small">{sev.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section
        id="tipografia"
        title="Tipografía"
        description="Geist Sans para todo. Geist Mono solo para valores literales del firewall: IP, id de regla, hash, línea de log. Nunca en etiquetas."
      >
        <div className="divide-y divide-line">
          {TYPE_STEPS.map((item) => (
            <Row key={item.step} label={item.step} hint={`text-${item.step}`}>
              <p className={item.className}>{item.sample}</p>
            </Row>
          ))}
          <Row label="valor técnico" hint="clase .value">
            <p>
              <Value>190.85.44.12:443 · policy 14 · FW-001 · sha256 4f2a…9c1b</Value>
            </p>
          </Row>
        </div>
      </Section>

      <Section
        id="forma"
        title="Espaciado, forma y sombra"
        description="Escala de 4 px, dos radios y dos sombras. Las tarjetas de informe no llevan sombra: se separan por línea y por espacio."
      >
        <Row label="Espaciado" hint="4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128">
          <div className="flex flex-wrap items-end gap-2">
            {SPACING.map((value) => (
              <div key={value} className="text-center">
                <div className="bg-signal/15 border-signal/30 border-b-2" style={{ width: value, height: 24 }} />
                <Value className="mt-1 block text-micro text-ink-soft">{value}</Value>
              </div>
            ))}
          </div>
        </Row>
        <Row label="Radios" hint="control 6 px · superficie 12 px">
          <div className="flex gap-4">
            <div className="flex size-20 items-center justify-center rounded-control border border-line text-micro text-ink-soft">
              control
            </div>
            <div className="flex size-20 items-center justify-center rounded-surface border border-line text-micro text-ink-soft">
              superficie
            </div>
          </div>
        </Row>
        <Row label="Sombras" hint="solo para lo que flota">
          <div className="flex gap-4">
            <div className="flex size-20 items-center justify-center rounded-surface bg-paper text-micro text-ink-soft shadow-hover">
              hover
            </div>
            <div className="flex size-20 items-center justify-center rounded-surface bg-paper text-micro text-ink-soft shadow-pop">
              pop
            </div>
            <div className="flex size-20 items-center justify-center rounded-surface border border-line bg-paper text-micro text-ink-soft">
              informe
            </div>
          </div>
        </Row>
      </Section>
    </>
  );
}
