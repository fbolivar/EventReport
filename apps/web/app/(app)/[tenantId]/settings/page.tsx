import type { Metadata } from "next";
import type { Brand } from "@eventreport/schema";
import { BRANDS } from "@eventreport/schema";

import { OnboardingWizard } from "@/components/app/settings/onboarding-wizard";
import { PageHeader } from "@/components/app/shell/page-header";
import { Surface, SurfaceBody, SurfaceHeader } from "@/components/shared/surface";
import { Value } from "@/components/shared/value";
import { BRAND_LABELS, FRAMEWORK_LABELS, MEMBER_ROLE_LABELS } from "@/content/labels";
import { BRAND_INSTRUCTIONS } from "@/content/onboarding";
import { listFrameworks } from "@/lib/data/compliance";
import {
  getTenant,
  listCollectors,
  listFirewalls,
  listInvitations,
  listMembers,
  listSites,
} from "@/lib/data/tenant";
import { formatSince } from "@/lib/utils/format";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Ajustes" };

const WIZARD_BRANDS = BRANDS.filter((brand) => BRAND_INSTRUCTIONS[brand] !== undefined);

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ brand?: string }>;
}) {
  const { tenantId } = await params;
  const { brand } = await searchParams;
  const currentBrand: Brand =
    WIZARD_BRANDS.find((item) => item === brand) ?? WIZARD_BRANDS[0] ?? "fortigate";

  const [tenant, sites, firewalls, collectors, members, invitations, frameworks] = await Promise.all([
    getTenant(tenantId),
    listSites(),
    listFirewalls(),
    listCollectors(),
    listMembers(),
    listInvitations(),
    listFrameworks(),
  ]);

  const now = new Date().toISOString();
  const siteById = (id: string) => sites.find((site) => site.id === id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ajustes"
        meta={`${tenant?.name ?? ""} · plan ${tenant?.plan ?? ""} · ${sites.length} sedes`}
      />

      <Surface>
        <SurfaceHeader
          title="Conectar un firewall"
          meta="Los comandos salen con la IP de tu colector ya puesta"
        />
        <SurfaceBody>
          <OnboardingWizard
            brands={WIZARD_BRANDS}
            current={currentBrand}
            collectorIp="10.10.0.9"
            basePath={`/${tenantId}/settings`}
          />
        </SurfaceBody>
      </Surface>

      <div className="grid gap-6 lg:grid-cols-2">
        <Surface>
          <SurfaceHeader title="Equipos" meta={`${firewalls.length} firewalls conectados`} />
          <SurfaceBody className="py-0">
            <ul className="divide-y divide-line">
              {firewalls.map((firewall) => {
                const site = siteById(firewall.siteId);
                const unevaluable = firewall.capabilities.unevaluableRules;
                return (
                  <li key={firewall.id} className="py-4">
                    <p className="text-small font-medium">
                      <Value>{firewall.hostname}</Value>
                    </p>
                    <p className="mt-0.5 text-micro text-ink-soft">
                      {BRAND_LABELS[firewall.brand]} · {firewall.model} · {site?.city}
                    </p>
                    <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-micro text-ink-soft">
                      <div className="flex gap-1.5">
                        <dt>Serie</dt>
                        <dd>
                          <Value>{firewall.serial}</Value>
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt>Firmware</dt>
                        <dd>
                          <Value>{firewall.firmware}</Value>
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt>Reglas no evaluables</dt>
                        <dd>
                          <Value>
                            {unevaluable.length === 0 ? "ninguna" : unevaluable.join(", ")}
                          </Value>
                        </dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceHeader title="Colectores" meta="Uno por sede" />
          <SurfaceBody className="py-0">
            <ul className="divide-y divide-line">
              {collectors.map((collector) => {
                const site = siteById(collector.siteId);
                return (
                  <li key={collector.id} className="py-4">
                    <p className="text-small font-medium">
                      <Value>{collector.name}</Value>
                    </p>
                    <p className="mt-0.5 text-micro text-ink-soft">
                      {site?.name} · {site?.city} · versión{" "}
                      <Value>{collector.health.version}</Value>
                    </p>
                    <p className="mt-1 text-micro text-ink-soft">
                      Último contacto {formatSince(collector.health.lastSeenAt, now)} · bóveda de{" "}
                      <Value>{collector.health.vaultDays}</Value> días
                    </p>
                  </li>
                );
              })}
            </ul>
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceHeader
            title="Personas"
            meta={`${members.length} con acceso`}
          />
          <SurfaceBody className="space-y-4 py-4">
            <InviteForm tenantId={tenantId} />
            <ul className="divide-y divide-line">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-small">{member.fullName}</p>
                    <p className="truncate text-micro text-ink-soft">
                      <Value>{member.email}</Value>
                    </p>
                  </div>
                  <span className="shrink-0 text-micro text-ink-soft">
                    {MEMBER_ROLE_LABELS[member.role]}
                  </span>
                </li>
              ))}
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-small text-ink-soft">Invitación pendiente</p>
                    <p className="truncate text-micro text-ink-soft">
                      <Value>{invitation.email}</Value>
                    </p>
                  </div>
                  <span className="shrink-0 text-micro text-ink-soft">
                    {MEMBER_ROLE_LABELS[invitation.role]}
                  </span>
                </li>
              ))}
            </ul>
          </SurfaceBody>
        </Surface>

        <Surface>
          <SurfaceHeader
            title="Marcos de cumplimiento"
            meta="Los que declaraste aplicables para tu operación"
          />
          <SurfaceBody className="py-0">
            <ul className="divide-y divide-line">
              {frameworks.map((framework) => {
                const isActive = tenant?.frameworks.includes(framework.code) ?? false;
                return (
                  <li key={framework.code} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-small">{FRAMEWORK_LABELS[framework.code]}</p>
                      <p className="mt-0.5 max-w-prose text-micro text-ink-soft">
                        {framework.scopeNote}
                      </p>
                    </div>
                    <span className="shrink-0 text-micro text-ink-soft">
                      {isActive ? "Activo" : "Inactivo"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </SurfaceBody>
        </Surface>
      </div>
    </div>
  );
}
