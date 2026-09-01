import Link from "next/link";
import type { Finding, FindingRule, Firewall, RuleControl } from "@eventreport/schema";

import { RemediationSteps } from "@/components/app/findings/remediation-steps";
import { RiskDecision } from "@/components/app/findings/risk-decision";
import { SeverityBadge } from "@/components/app/findings/severity-badge";
import { Value } from "@/components/shared/value";
import { BRAND_LABELS, FINDING_STATUS_LABELS, FRAMEWORK_SHORT_LABELS } from "@/content/labels";
import { formatDate } from "@/lib/utils/format";

/**
 * Detalle del hallazgo: evidencia literal, remediación de la marca y a qué
 * controles responde. Es lo que el técnico necesita para trabajar y lo que el
 * auditor necesita para creerlo.
 */
export function FindingDrawer({
  finding,
  rule,
  firewall,
  remediation: steps,
  ruleControls,
  tenantId,
  closeHref,
}: {
  finding: Finding;
  rule?: FindingRule;
  firewall?: Firewall;
  remediation?: string[];
  ruleControls: RuleControl[];
  tenantId: string;
  closeHref: string;
}) {
  const controls = ruleControls.filter((row) => row.ruleCode === finding.ruleCode);
  const evaluable = firewall
    ? !firewall.capabilities.unevaluableRules.includes(finding.ruleCode)
    : true;

  return (
    <aside
      aria-label="Detalle del hallazgo"
      className="rounded-surface border border-line bg-paper lg:sticky lg:top-10"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <SeverityBadge severity={finding.severity} resolved={finding.status === "resolved"} />
          <h2 className="mt-3 text-h3">{rule?.title ?? finding.ruleCode}</h2>
          <p className="mt-1 text-micro text-ink-soft">
            <Value>{finding.ruleCode}</Value> · {finding.assetLabel}
          </p>
        </div>
        <Link href={closeHref} className="rounded-control text-small text-ink-soft hover:text-ink">
          Cerrar
        </Link>
      </div>

      <div className="space-y-5 px-5 py-4">
        <p className="text-small text-ink-soft">{rule?.description}</p>

        <dl className="grid gap-x-6 gap-y-1.5 border-t border-line pt-4 sm:grid-cols-[max-content_1fr]">
          <dt className="text-micro text-ink-soft">Estado</dt>
          <dd className="text-small">{FINDING_STATUS_LABELS[finding.status]}</dd>
          <dt className="text-micro text-ink-soft">Equipo</dt>
          <dd className="text-small">
            <Value>{firewall?.hostname ?? finding.firewallId}</Value>
            {firewall ? ` · ${BRAND_LABELS[firewall.brand]}` : ""}
          </dd>
          <dt className="text-micro text-ink-soft">Detectado</dt>
          <dd className="text-small">{formatDate(finding.firstSeen)}</dd>
          <dt className="text-micro text-ink-soft">
            {finding.resolvedAt ? "Resuelto" : "Visto por última vez"}
          </dt>
          <dd className="text-small">{formatDate(finding.resolvedAt ?? finding.lastSeen)}</dd>
        </dl>

        <div className="border-t border-line pt-4">
          <p className="text-micro text-ink-soft">Evidencia leída del equipo</p>
          <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-[max-content_1fr]">
            {finding.evidence.map((item) => (
              <div key={item.label} className="contents">
                <dt className="text-micro text-ink-soft">{item.label}</dt>
                <dd>
                  <Value className="text-small">{item.value}</Value>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {steps && firewall ? (
          <RemediationSteps
            brand={firewall.brand}
            steps={steps}
            className="border-t border-line pt-4"
          />
        ) : (
          <p className="border-t border-line pt-4 text-small text-ink-soft">
            {evaluable
              ? "Los pasos de remediación para esta marca se agregan con su adaptador."
              : "Esta regla no es evaluable en esta marca; el informe la declara como no evaluable en lugar de darla por correcta."}
          </p>
        )}

        {controls.length > 0 ? (
          <div className="border-t border-line pt-4">
            <p className="text-micro text-ink-soft">Controles que responde</p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {controls.map((control) => (
                <li key={`${control.frameworkCode}-${control.controlCode}`} className="text-small">
                  <span className="text-ink-soft">
                    {FRAMEWORK_SHORT_LABELS[control.frameworkCode]}
                  </span>{" "}
                  <Value>{control.controlCode}</Value>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <RiskDecision
          tenantId={tenantId}
          findingId={finding.id}
          status={finding.status}
          justification={finding.justification}
        />
      </div>
    </aside>
  );
}
