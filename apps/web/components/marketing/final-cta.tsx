import { ButtonLink } from "@/components/shared/button";
import { finalCta } from "@/content/marketing";

export function FinalCta() {
  return (
    <section id="contacto" className="scroll-mt-6 bg-mist">
      <div className="mx-auto max-w-marketing px-6 py-[var(--er-section-y)] lg:py-[var(--er-section-y-lg)]">
        <div className="max-w-prose">
          <h2 className="text-h1 text-balance">{finalCta.title}</h2>
          <p className="mt-4 text-body text-ink-soft">{finalCta.body}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink href={finalCta.primary.href} size="lg">
              {finalCta.primary.label}
            </ButtonLink>
            <span className="text-small text-ink-soft">{finalCta.secondary}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
