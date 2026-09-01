-- EventReport — core tenancy.
-- Design reference: docs/diseno-tecnico.md section 9.
--
-- Rule that never bends: every table carrying tenant data has `tenant_id` and
-- RLS in the same migration that creates it. Writes from the collector go
-- through Edge Functions with the service_role key, which bypasses RLS after
-- resolving the tenant from `collector_id`; no client-side write policy exists
-- for telemetry.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums
create type public.plan_code as enum ('basic', 'standard', 'premium');
create type public.member_role as enum ('mssp_admin', 'client_admin', 'client_viewer');
create type public.brand as enum (
  'fortigate', 'sophos_xg', 'sonicwall', 'mikrotik', 'panos',
  'pfsense', 'watchguard', 'cisco_asa', 'checkpoint', 'generic'
);
create type public.severity as enum ('critical', 'high', 'medium', 'low');
create type public.collector_status as enum ('active', 'measuring', 'stale', 'offline');
create type public.ha_role as enum ('standalone', 'primary', 'secondary');

-- ------------------------------------------------------------- tenants
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  plan public.plan_code not null default 'basic',
  created_at timestamptz not null default now()
);

create table public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'client_viewer',
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index tenant_members_user_idx on public.tenant_members (user_id);

-- --------------------------------------------------------- helpers (RLS)
-- SECURITY DEFINER so the membership lookup does not recurse into the very
-- policy being evaluated. Owned by postgres, which owns the table and
-- therefore bypasses its RLS.
create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_members m
    where m.tenant_id = p_tenant_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_members m
    where m.tenant_id = p_tenant_id
      and m.user_id = auth.uid()
      and m.role in ('mssp_admin', 'client_admin')
  );
$$;

revoke execute on function public.is_tenant_member(uuid) from public;
revoke execute on function public.is_tenant_admin(uuid) from public;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.is_tenant_admin(uuid) to authenticated;

-- ----------------------------------------------------- sites and devices
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  city text,
  created_at timestamptz not null default now()
);

create index sites_tenant_idx on public.sites (tenant_id);

create table public.collectors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  name text not null,
  -- Ed25519 public key registered at enrolment. The private key never leaves
  -- the customer's machine.
  public_key text,
  version text,
  status public.collector_status not null default 'measuring',
  last_seen_at timestamptz,
  config jsonb not null default '{}'::jsonb,
  vault_days smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint collectors_vault_days_check check (vault_days in (0, 7, 15, 30))
);

create index collectors_tenant_idx on public.collectors (tenant_id);

create table public.firewalls (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  collector_id uuid references public.collectors (id) on delete set null,
  brand public.brand not null,
  model text,
  serial text,
  firmware text,
  hostname text not null,
  ha_role public.ha_role not null default 'standalone',
  -- What this adapter can fill in; drives which rules are evaluable (15.4).
  capabilities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, serial)
);

create index firewalls_tenant_idx on public.firewalls (tenant_id);

-- ------------------------------------------------------------------ RLS
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.sites enable row level security;
alter table public.collectors enable row level security;
alter table public.firewalls enable row level security;

create policy tenants_select on public.tenants
  for select to authenticated
  using (public.is_tenant_member(id));

create policy tenants_update on public.tenants
  for update to authenticated
  using (public.is_tenant_admin(id))
  with check (public.is_tenant_admin(id));

create policy tenant_members_select on public.tenant_members
  for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy tenant_members_write on public.tenant_members
  for all to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy sites_select on public.sites
  for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy sites_write on public.sites
  for all to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy collectors_select on public.collectors
  for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy collectors_write on public.collectors
  for all to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy firewalls_select on public.firewalls
  for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy firewalls_write on public.firewalls
  for all to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));
