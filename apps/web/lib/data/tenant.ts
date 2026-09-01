import { cache } from "react";
import type { Capabilities, Collector, Firewall, Site, Tenant, TenantMember } from "@eventreport/schema";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

type FirewallRow = Database["public"]["Tables"]["firewalls"]["Row"];

/** Fila de heartbeat tal como llega en la consulta anidada. */
interface HeartbeatRow {
  ts: string;
  eps: number | null;
  dropped_pct: number | null;
  queue_depth: number | null;
  disk_free_gb: number | null;
  clock_skew_seconds: number | null;
  version: string | null;
}

/**
 * Capa de datos del portal. Devuelve los mismos tipos del contrato compartido
 * que consumían los fixtures, así que los componentes no cambiaron una línea.
 *
 * Ninguna consulta filtra por tenant a mano: lo hace RLS. Si una consulta
 * devuelve filas de otro cliente, es un fallo de la base, no de la interfaz.
 */

/** Slug del primer tenant del usuario; decide a dónde entra tras el login. */
export const firstTenantSlug = cache(async (): Promise<string | undefined> => {
  const supabase = await createClient();
  const { data } = await supabase.from("tenants").select("slug").order("name").limit(1);
  return data?.[0]?.slug;
});

export const getTenant = cache(async (slug: string): Promise<Tenant | undefined> => {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tenants")
    .select("id, slug, name, plan, created_at, tenant_frameworks(framework_code)")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return undefined;

  return {
    id: data.slug,
    name: data.name,
    plan: data.plan,
    frameworks: (data.tenant_frameworks ?? []).map((row) => row.framework_code),
    createdAt: data.created_at,
  };
});

/** Identificador interno (uuid) a partir del slug de la URL. */
export const tenantUuid = cache(async (slug: string): Promise<string | undefined> => {
  const supabase = await createClient();
  const { data } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle();
  return data?.id;
});

export const listSites = cache(async (): Promise<Site[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select("id, tenant_id, name, city").order("name");

  return (data ?? []).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    city: row.city ?? "",
  }));
});

function toCapabilities(value: FirewallRow["capabilities"] | Json): Capabilities {
  const raw = (value ?? {}) as Partial<Capabilities>;
  return {
    config: raw.config ?? false,
    policyHitCount: raw.policyHitCount ?? false,
    utmProfiles: raw.utmProfiles ?? false,
    licenses: raw.licenses ?? false,
    adminMfa: raw.adminMfa ?? false,
    vpnRemote: raw.vpnRemote ?? false,
    certificates: raw.certificates ?? false,
    trafficBytes: raw.trafficBytes ?? false,
    identity: raw.identity ?? false,
    geo: raw.geo ?? false,
    unevaluableRules: raw.unevaluableRules ?? [],
  };
}

export const listFirewalls = cache(async (): Promise<Firewall[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("firewalls")
    .select(
      "id, tenant_id, site_id, collector_id, brand, model, serial, firmware, hostname, ha_role, capabilities",
    )
    .order("hostname");

  return (data ?? []).map((row) => ({
    id: row.id,
    siteId: row.site_id,
    collectorId: row.collector_id ?? "",
    brand: row.brand,
    model: row.model ?? "",
    serial: row.serial ?? "",
    firmware: row.firmware ?? "",
    hostname: row.hostname,
    haRole: row.ha_role,
    capabilities: toCapabilities(row.capabilities),
  }));
});

/** Último heartbeat de cada colector, que es lo que el portal muestra. */
export const listCollectors = cache(async (): Promise<Collector[]> => {
  const supabase = await createClient();

  const { data } = await supabase
    .from("collectors")
    .select(
      "id, site_id, name, version, status, last_seen_at, vault_days, collector_heartbeats(ts, eps, dropped_pct, queue_depth, disk_free_gb, clock_skew_seconds, version)",
    )
    .order("name");

  return (data ?? []).map((row) => {
    const beats: HeartbeatRow[] = row.collector_heartbeats ?? [];
    const latest = beats.reduce<HeartbeatRow | undefined>((newest, beat) => {
      if (!newest) return beat;
      return beat.ts > newest.ts ? beat : newest;
    }, undefined);

    return {
      id: row.id,
      siteId: row.site_id,
      name: row.name,
      health: {
        version: latest?.version ?? row.version ?? "—",
        lastSeenAt: row.last_seen_at ?? latest?.ts ?? "",
        status: row.status,
        eps: Number(latest?.eps ?? 0),
        droppedPct: Number(latest?.dropped_pct ?? 0),
        queueDepth: Number(latest?.queue_depth ?? 0),
        diskFreeGb: Number(latest?.disk_free_gb ?? 0),
        clockSkewSeconds: Number(latest?.clock_skew_seconds ?? 0),
        vaultDays: row.vault_days as 0 | 7 | 15 | 30,
      },
    };
  });
});

/**
 * Personas con acceso. El correo vive en `auth.users`, así que lo entrega una
 * función SECURITY DEFINER que filtra por membresía dentro de la propia
 * función: nadie puede pedir los miembros de un tenant ajeno.
 */
export const listMembers = cache(async (): Promise<TenantMember[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("tenant_member_profiles");

  return (data ?? []).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email ?? "",
    fullName: row.full_name ?? "",
    role: row.role,
    lastSeenAt: row.last_seen_at ?? undefined,
  }));
});

/** Invitación aún sin aceptar. La lista vive en Ajustes junto a las personas. */
export interface PendingInvitation {
  id: string;
  email: string;
  role: TenantMember["role"];
  createdAt: string;
}

/**
 * Invitaciones que todavía no se convirtieron en membresía. Sin esta lista una
 * invitación se pierde de vista: nadie sabe a quién ya se invitó.
 */
export const listInvitations = cache(async (): Promise<PendingInvitation[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenant_invitations")
    .select("id, email, role, created_at")
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  }));
});
