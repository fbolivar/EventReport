/**
 * Tenant de ejemplo: una empresa con dos sedes, dos firewalls de marcas
 * distintas y un colector por sede. Es el caso que valida la abstracción
 * multimarca (§12, fase 4).
 */
import type { Capabilities, Collector, Firewall, Site, Tenant, TenantMember } from "@eventreport/schema";

import { DEMO_COLLECTOR_DEGRADED, DEMO_COLLECTOR_HEALTH } from "@/lib/fixtures/collector";

/** Momento de referencia de todos los fixtures: fijo, para que nada cambie entre capturas. */
export const NOW = "2026-08-31T03:00:00Z";

const FORTIGATE_CAPABILITIES: Capabilities = {
  config: true,
  policyHitCount: true,
  utmProfiles: true,
  licenses: true,
  adminMfa: true,
  vpnRemote: true,
  certificates: true,
  trafficBytes: true,
  identity: true,
  geo: true,
  unevaluableRules: [],
};

/** Sophos XG: 19 de 20 reglas; el hit count por regla solo existe desde v18.5. */
const SOPHOS_CAPABILITIES: Capabilities = {
  ...FORTIGATE_CAPABILITIES,
  policyHitCount: false,
  unevaluableRules: ["FW-007"],
};

export const DEMO_TENANT: Tenant = {
  id: "acme",
  name: "Acme S.A.S.",
  plan: "premium",
  frameworks: ["iso27001", "cis_v8", "pci_dss"],
  createdAt: "2026-05-18T14:00:00Z",
};

export const DEMO_SITES: Site[] = [
  { id: "site-bog", tenantId: "acme", name: "Sede principal", city: "Bogotá" },
  { id: "site-mde", tenantId: "acme", name: "Planta", city: "Medellín" },
];

export const DEMO_COLLECTORS: Collector[] = [
  { id: "col-bog", siteId: "site-bog", name: "colector-bogota", health: DEMO_COLLECTOR_HEALTH },
  { id: "col-mde", siteId: "site-mde", name: "colector-medellin", health: DEMO_COLLECTOR_DEGRADED },
];

export const DEMO_FIREWALLS: Firewall[] = [
  {
    id: "fw-fgt-01",
    siteId: "site-bog",
    collectorId: "col-bog",
    brand: "fortigate",
    model: "FortiGate 60F",
    serial: "FGT60FTK21089123",
    firmware: "7.2.8",
    hostname: "FGT60F-BOG",
    haRole: "standalone",
    capabilities: FORTIGATE_CAPABILITIES,
  },
  {
    id: "fw-xgs-01",
    siteId: "site-mde",
    collectorId: "col-mde",
    brand: "sophos_xg",
    model: "Sophos XGS 116",
    serial: "S1160-4471-9902",
    firmware: "19.5.3 MR-3",
    hostname: "XGS116-MDE",
    haRole: "standalone",
    capabilities: SOPHOS_CAPABILITIES,
  },
];

export const DEMO_MEMBERS: TenantMember[] = [
  {
    id: "mem-1",
    tenantId: "acme",
    email: "gerencia@acme.com.co",
    fullName: "Claudia Restrepo",
    role: "client_admin",
    lastSeenAt: "2026-08-30T21:14:00Z",
  },
  {
    id: "mem-2",
    tenantId: "acme",
    email: "sistemas@acme.com.co",
    fullName: "Andrés Gómez",
    role: "client_admin",
    lastSeenAt: "2026-08-31T02:41:00Z",
  },
  {
    id: "mem-3",
    tenantId: "acme",
    email: "auditoria@acme.com.co",
    fullName: "Marcela Ruiz",
    role: "client_viewer",
    lastSeenAt: "2026-08-24T16:02:00Z",
  },
  {
    id: "mem-4",
    tenantId: "acme",
    email: "soporte@bcfabric.co",
    fullName: "Mesa de servicio BC Fabric",
    role: "mssp_admin",
    lastSeenAt: "2026-08-31T02:58:00Z",
  },
];

export function firewallById(id: string): Firewall | undefined {
  return DEMO_FIREWALLS.find((firewall) => firewall.id === id);
}

export function siteById(id: string): Site | undefined {
  return DEMO_SITES.find((site) => site.id === id);
}
