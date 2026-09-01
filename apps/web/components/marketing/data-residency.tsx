import { MarketingSection } from "@/components/marketing/section";
import { dataResidency } from "@/content/marketing";

/**
 * La sección de confianza. Dos listas enfrentadas: qué se queda y qué sube.
 * Sin adornos: la credibilidad está en el detalle, no en un candado dibujado.
 */
export function DataResidency() {
  return (
    <MarketingSection id="datos" title={dataResidency.title} subtitle={dataResidency.subtitle}>
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <h3 className="text-h3">{dataResidency.staysTitle}</h3>
          <ul className="mt-4 space-y-3 border-t border-line pt-4">
            {dataResidency.stays.map((item) => (
              <li key={item} className="text-body text-ink-soft">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-h3">{dataResidency.uploadsTitle}</h3>
          <ul className="mt-4 space-y-3 border-t border-line pt-4">
            {dataResidency.uploads.map((item) => (
              <li key={item} className="text-body text-ink-soft">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-12 max-w-prose border-t border-line pt-6 text-body">
        {dataResidency.volume}
      </p>
    </MarketingSection>
  );
}
