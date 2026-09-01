import { FindingCard } from "@/components/app/findings/finding-card";
import { MarketingSection } from "@/components/marketing/section";
import { deliverables } from "@/content/marketing";
import { DEMO_FINDINGS, DEMO_REMEDIATIONS } from "@/lib/fixtures/findings";
import { RULES_BY_CODE } from "@/lib/fixtures/rules";

const sample = DEMO_FINDINGS[1];
const sampleSteps = DEMO_REMEDIATIONS[1]?.steps;

/**
 * Lo que recibe el cliente. El ejemplo no es una captura: es el componente real
 * del portal, con los pasos de remediación de la marca.
 */
export function Deliverables() {
  return (
    <MarketingSection id="producto" title={deliverables.title} subtitle={deliverables.subtitle}>
      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {deliverables.reports.map((report) => (
          <article key={report.name} className="border-t border-line pt-5">
            <h3 className="text-h2">{report.name}</h3>
            <p className="mt-1 text-micro text-ink-soft">
              {report.audience} · {report.frequency}
            </p>
            <p className="mt-3 text-body text-ink-soft">{report.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
        <div className="self-center">
          <h3 className="text-h2 text-balance">{deliverables.findingTitle}</h3>
          <p className="mt-3 text-body text-ink-soft">{deliverables.findingBody}</p>
        </div>
        {sample ? (
          <FindingCard
            finding={sample}
            rule={RULES_BY_CODE[sample.ruleCode]!}
            brand="fortigate"
            remediation={sampleSteps}
          />
        ) : null}
      </div>
    </MarketingSection>
  );
}
