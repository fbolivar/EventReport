import { MarketingSection } from "@/components/marketing/section";
import { brands } from "@/content/marketing";

export function Brands() {
  return (
    <MarketingSection id="marcas" title={brands.title} subtitle={brands.subtitle} tone="mist">
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <h3 className="text-micro text-ink-soft">Disponible</h3>
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {brands.available.map((brand) => (
              <li key={brand.name} className="flex flex-wrap items-baseline gap-x-3 py-3">
                <span className="text-body font-medium">{brand.name}</span>
                <span className="text-small text-ink-soft">{brand.note}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-micro text-ink-soft">En camino</h3>
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {brands.planned.map((brand) => (
              <li key={brand.name} className="flex flex-wrap items-baseline gap-x-3 py-3">
                <span className="text-body">{brand.name}</span>
                <span className="text-small text-ink-soft">{brand.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-12 max-w-prose border-t border-line pt-6">
        <h3 className="text-h3">{brands.genericTitle}</h3>
        <p className="mt-3 text-body text-ink-soft">{brands.genericBody}</p>
      </div>
    </MarketingSection>
  );
}
