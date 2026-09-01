import { ControlMatrix } from "@/components/app/compliance/control-matrix";
import { MarketingSection } from "@/components/marketing/section";
import { compliance } from "@/content/marketing";
import { DEMO_ISO_ASSESSMENTS, DEMO_ISO_CONTROLS } from "@/lib/fixtures/compliance";

/**
 * Cumplimiento con la nota de alcance del §15.1. La matriz que se muestra aquí
 * es la misma del portal: el cliente ve antes de comprar lo que va a recibir.
 */
export function Compliance() {
  return (
    <MarketingSection id="cumplimiento" title={compliance.title} subtitle={compliance.subtitle}>
      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {compliance.frameworks.map((framework) => (
          <article key={framework.code} className="border-t border-line pt-5">
            <h3 className="text-h3">{framework.name}</h3>
            <p className="mt-3 text-body text-ink-soft">{framework.body}</p>
            <p className="mt-3 text-small">{framework.scope}</p>
          </article>
        ))}
      </div>

      <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-12">
        <p className="max-w-prose self-center text-body">{compliance.note}</p>
        <div className="rounded-surface border border-line px-5 py-4">
          <p className="text-micro text-ink-soft">
            ISO/IEC 27001:2022 · extracto del informe de cumplimiento
          </p>
          <ControlMatrix
            controls={DEMO_ISO_CONTROLS}
            assessments={DEMO_ISO_ASSESSMENTS}
            className="mt-3"
          />
        </div>
      </div>
    </MarketingSection>
  );
}
