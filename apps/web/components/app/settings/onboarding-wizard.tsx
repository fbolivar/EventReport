import type { Brand } from "@eventreport/schema";

import { FilterLinks } from "@/components/app/shell/filter-links";
import { Value } from "@/components/shared/value";
import { BRAND_LABELS } from "@/content/labels";
import { BRAND_INSTRUCTIONS, ONBOARDING_INTRO } from "@/content/onboarding";
import { cn } from "@/lib/utils/cn";

/**
 * Asistente de onboarding (§6.8). La marca elegida vive en la URL; los
 * comandos salen con la IP del colector ya sustituida, que es la diferencia
 * entre una guía y algo que el cliente puede pegar.
 */
export function OnboardingWizard({
  brands,
  current,
  collectorIp,
  basePath,
}: {
  brands: Brand[];
  current: Brand;
  collectorIp: string;
  basePath: string;
}) {
  const instructions = BRAND_INSTRUCTIONS[current];
  // Sin colector instalado no hay IP que poner. Inventar una —o dejar la del
  // ejemplo— manda al técnico a apuntar el firewall a una dirección que no
  // existe, y después nadie entiende por qué no llega nada.
  const target = collectorIp || "<IP-DEL-COLECTOR>";
  const withIp = (text: string) => text.replaceAll("{ip}", target);

  return (
    <div>
      <ol className="grid gap-6 border-b border-line pb-6 md:grid-cols-3">
        {ONBOARDING_INTRO.steps.map((step, index) => (
          <li key={step.title}>
            <Value className="text-micro text-ink-soft">Paso {index + 1}</Value>
            <p className="mt-1 text-small font-medium">{step.title}</p>
            <p className="mt-1 text-micro text-ink-soft">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6">
        <FilterLinks
          label="Marca del firewall"
          param="brand"
          basePath={basePath}
          searchParams={{}}
          current={current}
          options={brands.map((brand) => ({ value: brand, label: BRAND_LABELS[brand] }))}
        />
      </div>

      {instructions ? (
        <div className="mt-6 space-y-4">
          <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[max-content_1fr]">
            <dt className="text-micro text-ink-soft">Dónde</dt>
            <dd className="text-small">{instructions.path}</dd>
            <dt className="text-micro text-ink-soft">Transporte</dt>
            <dd className="text-small">{instructions.transport}</dd>
            <dt className="text-micro text-ink-soft">Formato</dt>
            <dd className="text-small">{instructions.format}</dd>
            <dt className="text-micro text-ink-soft">Destino</dt>
            <dd>
              <Value className="text-small">{target}:514</Value>
            </dd>
          </dl>

          {instructions.commands ? (
            <pre className="overflow-x-auto rounded-control bg-mist px-4 py-3">
              <code className="value text-small text-ink">
                {instructions.commands.map(withIp).join("\n")}
              </code>
            </pre>
          ) : null}

          {instructions.steps ? (
            <ol className="space-y-2">
              {instructions.steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-small">
                  <Value className="mt-0.5 shrink-0 text-ink-soft">{index + 1}.</Value>
                  <span>{withIp(step)}</span>
                </li>
              ))}
            </ol>
          ) : null}

          {instructions.warning ? (
            <p className={cn("border-l-2 border-medium pl-4 text-small")}>{instructions.warning}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-small text-ink-soft">
          Para esta marca todavía no hay asistente. Escríbenos y te damos los comandos mientras
          llega su adaptador.
        </p>
      )}
    </div>
  );
}
