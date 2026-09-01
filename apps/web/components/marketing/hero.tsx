import { ButtonLink } from "@/components/shared/button";
import { HeroReport } from "@/components/marketing/hero-report";
import { hero } from "@/content/marketing";

export function Hero() {
  return (
    <section className="bg-ink pb-16 md:pb-24">
      <div className="mx-auto grid max-w-marketing grid-cols-1 gap-14 px-6 pt-10 md:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:gap-16">
        <div className="max-w-prose lg:pt-6">
          <h1 className="er-build er-build-1 text-display text-on-ink text-balance">{hero.title}</h1>
          <p className="er-build er-build-2 mt-6 text-body text-on-ink-soft">{hero.subtitle}</p>
          <div className="er-build er-build-3 mt-9 flex flex-wrap gap-3">
            <ButtonLink href={hero.primary.href} variant="onInk" size="lg">
              {hero.primary.label}
            </ButtonLink>
            <ButtonLink href={hero.secondary.href} variant="onInkGhost" size="lg">
              {hero.secondary.label}
            </ButtonLink>
          </div>
        </div>

        <div>
          <HeroReport />
          <p className="mt-3 text-micro text-on-ink-soft">{hero.reportCaption}</p>
        </div>
      </div>
    </section>
  );
}
