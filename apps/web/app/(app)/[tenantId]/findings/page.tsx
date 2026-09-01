import type { Metadata } from "next";
import type { Severity } from "@eventreport/schema";

import { FindingDrawer } from "@/components/app/findings/finding-drawer";
import { FindingsTable } from "@/components/app/findings/findings-table";
import { FilterLinks } from "@/components/app/shell/filter-links";
import { PageHeader } from "@/components/app/shell/page-header";
import { EmptyState } from "@/components/shared/states";
import { ButtonLink } from "@/components/shared/button";
import { Surface } from "@/components/shared/surface";
import { SEVERITY_LABELS } from "@/content/labels";
import { listFindings, remediationFor, rulesByCode } from "@/lib/data/findings";
import { listRuleControls } from "@/lib/data/compliance";
import { listFirewalls } from "@/lib/data/tenant";

export const metadata: Metadata = { title: "Hallazgos" };

type Search = { severity?: string; status?: string; firewall?: string; finding?: string };

export default async function FindingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<Search>;
}) {
  const { tenantId } = await params;
  const search = await searchParams;
  const basePath = `/${tenantId}/findings`;

  const status = search.status ?? "open";
  const severity = search.severity ?? "all";
  const firewall = search.firewall ?? "all";

  const [allFindings, rules, firewalls, ruleControls] = await Promise.all([
    listFindings(),
    rulesByCode(),
    listFirewalls(),
    listRuleControls(),
  ]);

  const visible = allFindings.filter((finding) => {
    if (status !== "all" && finding.status !== status) return false;
    if (severity !== "all" && finding.severity !== severity) return false;
    if (firewall !== "all" && finding.firewallId !== firewall) return false;
    return true;
  });

  const selected = search.finding
    ? allFindings.find((finding) => finding.id === search.finding)
    : undefined;
  const selectedFirewall = selected
    ? firewalls.find((item) => item.id === selected.firewallId)
    : undefined;
  const steps =
    selected && selectedFirewall
      ? await remediationFor(selected.ruleCode, selectedFirewall.brand)
      : undefined;

  const countBy = (predicate: (severity: Severity) => boolean) =>
    allFindings.filter((finding) => finding.status === status && predicate(finding.severity)).length;

  const asQuery = (overrides: Partial<Search>) => {
    const next = new URLSearchParams();
    const merged: Search = { ...search, ...overrides };
    if (merged.status && merged.status !== "open") next.set("status", merged.status);
    if (merged.severity && merged.severity !== "all") next.set("severity", merged.severity);
    if (merged.firewall && merged.firewall !== "all") next.set("firewall", merged.firewall);
    if (merged.finding) next.set("finding", merged.finding);
    const query = next.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hallazgos"
        meta={`${visible.length} de ${allFindings.length} · cada uno con evidencia y remediación de la marca`}
        action={
          <ButtonLink href={`/${tenantId}/reports`} variant="secondary">
            Informe de hardening
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <FilterLinks
          label="Estado"
          param="status"
          basePath={basePath}
          searchParams={{ severity: search.severity, firewall: search.firewall }}
          current={status}
          options={[
            { value: "open", label: "Abiertos" },
            { value: "resolved", label: "Resueltos" },
            { value: "all", label: "Todos" },
          ]}
        />
        <FilterLinks
          label="Severidad"
          param="severity"
          basePath={basePath}
          searchParams={{ status: search.status, firewall: search.firewall }}
          current={severity}
          options={[
            { value: "all", label: "Todas" },
            { value: "critical", label: SEVERITY_LABELS.critical, count: countBy((s) => s === "critical") },
            { value: "high", label: SEVERITY_LABELS.high, count: countBy((s) => s === "high") },
            { value: "medium", label: SEVERITY_LABELS.medium, count: countBy((s) => s === "medium") },
            { value: "low", label: SEVERITY_LABELS.low, count: countBy((s) => s === "low") },
          ]}
        />
        <FilterLinks
          label="Equipo"
          param="firewall"
          basePath={basePath}
          searchParams={{ status: search.status, severity: search.severity }}
          current={firewall}
          options={[
            { value: "all", label: "Todos los equipos" },
            ...firewalls.map((item) => ({ value: item.id, label: item.hostname })),
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Surface className="px-5 py-2">
          {visible.length > 0 ? (
            <FindingsTable
              findings={visible}
              rules={rules}
              firewalls={firewalls}
              selectedId={selected?.id}
              hrefFor={(findingId) => asQuery({ finding: findingId })}
            />
          ) : (
            <EmptyState
              title="Ningún hallazgo con estos filtros"
              description="Prueba con otra severidad o con el otro equipo. Si el filtro está en resueltos, quiere decir que todavía no se ha cerrado ninguno de ese tipo."
              action={
                <ButtonLink href={basePath} variant="secondary" size="sm">
                  Quitar filtros
                </ButtonLink>
              }
            />
          )}
        </Surface>

        {selected ? (
          <FindingDrawer
            finding={selected}
            rule={rules[selected.ruleCode]}
            firewall={selectedFirewall}
            remediation={steps}
            ruleControls={ruleControls}
            closeHref={asQuery({ finding: undefined })}
          />
        ) : (
          <Surface className="hidden px-5 py-10 lg:block">
            <p className="text-small text-ink-soft">
              Elige un hallazgo para ver su evidencia, los pasos de corrección de la marca y los
              controles a los que responde.
            </p>
          </Surface>
        )}
      </div>
    </div>
  );
}
