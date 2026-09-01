import type { Brand, Finding, FindingRule } from "@eventreport/schema";

import { RemediationSteps } from "@/components/app/findings/remediation-steps";
import { SeverityBadge } from "@/components/app/findings/severity-badge";
import { Value } from "@/components/shared/value";
import { cn } from "@/lib/utils/cn";

/**
 * La unidad del producto: un hallazgo con su evidencia literal y su remediación.
 * Se usa igual en el portal, en el informe y en la landing.
 */
export function FindingCard({
  finding,
  rule,
  brand,
  remediation,
  compact = false,
  className,
}: {
  finding: Finding;
  rule: FindingRule;
  brand?: Brand;
  remediation?: string[];
  /** Sin descripción de la regla: para listas densas y para el hero. */
  compact?: boolean;
  className?: string;
}) {
  const resolved = finding.status === "resolved";

  return (
    <article
      className={cn(
        "rounded-surface border border-line bg-paper px-5 py-4",
        resolved && "bg-mist",
        className,
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <SeverityBadge severity={finding.severity} resolved={resolved} />
        <Value className="text-micro text-ink-soft">{rule.code}</Value>
        <span className="text-micro text-ink-soft">{finding.assetLabel}</span>
      </header>

      <h3 className={cn("mt-3 text-h3", resolved && "text-ink-soft")}>{rule.title}</h3>
      {compact ? null : (
        <p className="mt-2 max-w-prose text-small text-ink-soft">{rule.description}</p>
      )}

      {finding.evidence.length > 0 ? (
        <dl
          className={cn(
            "grid gap-x-6 gap-y-1.5 sm:grid-cols-[max-content_1fr]",
            compact ? "mt-3" : "mt-4 border-t border-line pt-4",
          )}
        >
          {finding.evidence.map((item) => (
            <div key={item.label} className="contents">
              <dt className="text-micro text-ink-soft">{item.label}</dt>
              <dd>
                <Value className="text-small">{item.value}</Value>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {remediation && brand ? (
        <RemediationSteps
          brand={brand}
          steps={remediation}
          className="mt-4 border-t border-line pt-4"
        />
      ) : null}
    </article>
  );
}
