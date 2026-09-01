import { MarketingSection } from "@/components/marketing/section";
import { ButtonLink } from "@/components/shared/button";
import { pricing } from "@/content/marketing";
import { cn } from "@/lib/utils/cn";

/**
 * Planes del §10. El plan recomendado se distingue por borde y peso, no por
 * una etiqueta de color ni por una tarjeta más grande.
 */
export function Pricing() {
  return (
    <MarketingSection id="precios" title={pricing.title} subtitle={pricing.subtitle}>
      <div className="grid gap-6 md:grid-cols-3">
        {pricing.plans.map((plan) => (
          <article
            key={plan.code}
            className={cn(
              "flex flex-col rounded-surface border p-6",
              "featured" in plan && plan.featured ? "border-ink" : "border-line",
            )}
          >
            <h3 className="text-h3">{plan.name}</h3>
            <p className="mt-1 min-h-12 text-small text-ink-soft">{plan.pitch}</p>
            <p data-numeric className="mt-4 text-h1">
              {plan.price}
            </p>
            <ul className="mt-6 flex-1 space-y-2.5 border-t border-line pt-5">
              {plan.features.map((feature) => (
                <li key={feature} className="text-small">
                  {feature}
                </li>
              ))}
            </ul>
            <ButtonLink
              href="#contacto"
              variant={"featured" in plan && plan.featured ? "primary" : "secondary"}
              className="mt-6"
            >
              Solicitar demo
            </ButtonLink>
          </article>
        ))}
      </div>

      <p className="mt-6 text-small text-ink-soft">{pricing.note}</p>

      <div className="mt-14 max-w-prose border-t border-line pt-6">
        <h3 className="text-h3">{pricing.msspTitle}</h3>
        <p className="mt-3 text-body text-ink-soft">{pricing.msspBody}</p>
      </div>
    </MarketingSection>
  );
}
