import { MarketingSection } from "@/components/marketing/section";
import { Value } from "@/components/shared/value";
import { howItWorks } from "@/content/marketing";

/**
 * Única sección numerada del sitio: aquí el orden importa de verdad, porque es
 * la secuencia de instalación.
 */
export function HowItWorks() {
  return (
    <MarketingSection
      id="como-funciona"
      title={howItWorks.title}
      subtitle={howItWorks.subtitle}
      tone="mist"
    >
      <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
        {howItWorks.steps.map((step, index) => (
          <li key={step.title} className="border-t border-line pt-5">
            <Value className="text-micro text-ink-soft">Paso {index + 1}</Value>
            <h3 className="mt-3 text-h2 text-balance">{step.title}</h3>
            <p className="mt-3 text-body text-ink-soft">{step.body}</p>
            <p className="mt-3 text-small text-ink-soft">{step.detail}</p>
          </li>
        ))}
      </ol>
    </MarketingSection>
  );
}
