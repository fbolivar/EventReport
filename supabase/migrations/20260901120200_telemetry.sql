-- EventReport — telemetry uploaded by the collector (sections 6 and 9).
--
-- What lands here: normalized configuration, hourly rollups, top-N and
-- critical events. What never lands here: raw log lines, firewall credentials,
-- VPN keys or SNMP communities.
--
-- Every table is tenant-scoped and read-only for authenticated users: writes
-- arrive through Edge Functions with the service_role key, which resolves the
-- tenant from the signed collector_id before inserting.

create type public.event_type as enum (
  'traffic', 'ips', 'av', 'web', 'app', 'vpn', 'admin', 'system'
);

create type public.event_action as enum ('allow', 'deny', 'block', 'alert');

create type public.topn_dimension as enum (
  'src_country', 'src_ip_denied', 'dst_ip', 'dst_port', 'app',
  'web_category', 'vpn_user', 'ips_signature', 'policy'
);

create type public.ha_state as enum ('healthy', 'degraded', 'failed');

-- ------------------------------------------------------ configuration
create table public.config_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  firewall_id uuid not null references public.firewalls (id) on delete cascade,
  collected_at timestamptz not null,
  -- Normalized FirewallConfig (section 4.1). Never holds secrets.
  config jsonb not null,
  sha256 text not null,
  created_at timestamptz not null default now(),
  unique (firewall_id, sha256, collected_at)
);

create index config_snapshots_firewall_idx
  on public.config_snapshots (firewall_id, collected_at desc);

create table public.config_changes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  firewall_id uuid not null references public.firewalls (id) on delete cascade,
  from_snapshot_id uuid references public.config_snapshots (id) on delete set null,
  to_snapshot_id uuid references public.config_snapshots (id) on delete set null,
  section text not null,
  change jsonb not null,
  -- Who made it, taken from the admin syslog. Null opens OP-004.
  actor text,
  ts timestamptz not null,
  created_at timestamptz not null default now()
);

create index config_changes_firewall_idx on public.config_changes (firewall_id, ts desc);

-- ------------------------------------------------------------ rollups
create table public.rollups_hourly (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  firewall_id uuid not null references public.firewalls (id) on delete cascade,
  hour timestamptz not null,
  type public.event_type not null,
  action public.event_action not null,
  count bigint not null default 0,
  bytes_in bigint not null default 0,
  bytes_out bigint not null default 0,
  -- Idempotent upsert per (firewall, hour, type, action): a late correction
  -- overwrites instead of duplicating (section 6.6).
  primary key (firewall_id, hour, type, action)
);

create index rollups_hourly_tenant_hour_idx on public.rollups_hourly (tenant_id, hour desc);

create table public.rollups_topn (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  firewall_id uuid not null references public.firewalls (id) on delete cascade,
  hour timestamptz not null,
  dimension public.topn_dimension not null,
  key text not null,
  count bigint not null default 0,
  bytes bigint not null default 0,
  primary key (firewall_id, hour, dimension, key)
);

create index rollups_topn_tenant_idx on public.rollups_topn (tenant_id, dimension, hour desc);

create table public.device_status (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  firewall_id uuid not null references public.firewalls (id) on delete cascade,
  ts timestamptz not null,
  cpu smallint,
  mem smallint,
  sessions integer,
  ha_state public.ha_state,
  primary key (firewall_id, ts)
);

-- --------------------------------------------------- collector health
create table public.collector_heartbeats (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  collector_id uuid not null references public.collectors (id) on delete cascade,
  ts timestamptz not null,
  version text,
  eps integer not null default 0,
  dropped_pct numeric(5, 2) not null default 0,
  queue_depth integer not null default 0,
  disk_free_gb integer,
  clock_skew_seconds integer,
  primary key (collector_id, ts)
);

-- ---------------------------------------------------- critical events
create table public.critical_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  firewall_id uuid not null references public.firewalls (id) on delete cascade,
  rule_code text references public.finding_rules (code) on delete set null,
  severity public.severity not null,
  ts timestamptz not null,
  title text not null,
  detail text,
  payload jsonb not null default '{}'::jsonb,
  -- Untreated after seven days opens OP-002.
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users (id) on delete set null
);

create index critical_events_tenant_ts_idx on public.critical_events (tenant_id, ts desc);

-- --------------------------------------------- evidence on demand (v5)
create table public.evidence_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  firewall_id uuid not null references public.firewalls (id) on delete cascade,
  requested_by uuid references auth.users (id) on delete set null,
  -- Filter that the collector runs locally against its own vault. The raw
  -- lines never travel; only the capped result does.
  query jsonb not null,
  status text not null default 'pending',
  result jsonb,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now(),
  constraint evidence_requests_status_check
    check (status in ('pending', 'running', 'done', 'failed', 'expired'))
);

create index evidence_requests_tenant_idx on public.evidence_requests (tenant_id, created_at desc);

-- ------------------------------------------------------------------ RLS
alter table public.config_snapshots enable row level security;
alter table public.config_changes enable row level security;
alter table public.rollups_hourly enable row level security;
alter table public.rollups_topn enable row level security;
alter table public.device_status enable row level security;
alter table public.collector_heartbeats enable row level security;
alter table public.critical_events enable row level security;
alter table public.evidence_requests enable row level security;

create policy config_snapshots_select on public.config_snapshots
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy config_changes_select on public.config_changes
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy rollups_hourly_select on public.rollups_hourly
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy rollups_topn_select on public.rollups_topn
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy device_status_select on public.device_status
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy collector_heartbeats_select on public.collector_heartbeats
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy critical_events_select on public.critical_events
  for select to authenticated using (public.is_tenant_member(tenant_id));

-- Acknowledging an event is the one write the portal owns here.
create policy critical_events_ack on public.critical_events
  for update to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy evidence_requests_select on public.evidence_requests
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy evidence_requests_insert on public.evidence_requests
  for insert to authenticated
  with check (public.is_tenant_admin(tenant_id));
