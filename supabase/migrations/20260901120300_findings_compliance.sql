-- EventReport — findings, compliance, reports and quotas (sections 9 to 11, 15).

create type public.finding_status as enum ('open', 'resolved', 'accepted');

create type public.control_status as enum (
  'compliant', 'non_compliant', 'partial', 'not_assessable', 'not_applicable'
);

create type public.report_type as enum (
  'executive', 'hardening', 'activity', 'threats', 'changes',
  'compliance', 'critical_events', 'baseline'
);

create type public.report_status as enum ('generating', 'ready', 'failed');

-- ----------------------------------------------------------- findings
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  firewall_id uuid not null references public.firewalls (id) on delete cascade,
  rule_code text not null references public.finding_rules (code) on delete restrict,
  -- What the finding is about: a policy id, an admin name, an interface.
  asset_key text not null,
  asset_label text not null,
  status public.finding_status not null default 'open',
  severity public.severity not null,
  first_seen timestamptz not null,
  last_seen timestamptz not null,
  resolved_at timestamptz,
  -- Literal values read from the device; the portal renders them in mono.
  evidence jsonb not null default '[]'::jsonb,
  -- Written justification when the customer accepts the risk.
  justification text,
  -- One live finding per rule and asset; its lifecycle is an update, not a
  -- new row (section 9).
  unique (firewall_id, rule_code, asset_key)
);

create index findings_tenant_status_idx on public.findings (tenant_id, status, severity);

-- ------------------------------------------------------ posture score
create table public.posture_scores (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  firewall_id uuid references public.firewalls (id) on delete cascade,
  computed_at timestamptz not null,
  -- 70% configuration, 30% operation (section 11).
  value smallint not null,
  configuration smallint not null,
  operation smallint not null,
  primary key (tenant_id, firewall_id, computed_at),
  constraint posture_scores_range check (value between 0 and 100)
);

create index posture_scores_tenant_idx on public.posture_scores (tenant_id, computed_at desc);

-- --------------------------------------------------------- compliance
create table public.tenant_frameworks (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  framework_code public.framework_code not null references public.frameworks (code) on delete cascade,
  scope_note text,
  activated_at timestamptz not null default now(),
  primary key (tenant_id, framework_code)
);

create table public.compliance_assessments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  firewall_id uuid references public.firewalls (id) on delete cascade,
  framework_code public.framework_code not null,
  control_code text not null,
  status public.control_status not null,
  -- Findings that justify the state; empty when not assessable.
  evidence_finding_ids uuid[] not null default '{}',
  -- Required when the customer marks a control out of scope (section 15.5).
  justification text,
  justified_by uuid references auth.users (id) on delete set null,
  assessed_at timestamptz not null default now(),
  unique (tenant_id, firewall_id, framework_code, control_code),
  foreign key (framework_code, control_code)
    references public.controls (framework_code, code) on delete cascade,
  constraint compliance_not_applicable_needs_reason
    check (status <> 'not_applicable' or justification is not null)
);

create index compliance_assessments_tenant_idx
  on public.compliance_assessments (tenant_id, framework_code);

-- ------------------------------------------------------------ reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  type public.report_type not null,
  framework_code public.framework_code,
  period_start timestamptz not null,
  period_end timestamptz not null,
  status public.report_status not null default 'generating',
  generated_at timestamptz,
  -- Path in Storage; the PDF itself is not stored in Postgres.
  storage_path text,
  pages integer not null default 0,
  size_kb integer not null default 0,
  requested_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index reports_tenant_idx on public.reports (tenant_id, created_at desc);

-- ------------------------------------------------------------- quotas
create table public.usage_quotas (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  firewalls integer not null default 1,
  config_snapshots_per_day integer not null default 1,
  critical_events_per_day integer not null default 50,
  evidence_rows integer not null default 200,
  claude_tokens_per_month integer not null default 150000,
  updated_at timestamptz not null default now()
);

create table public.usage_counters (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  metric text not null,
  period date not null,
  value bigint not null default 0,
  primary key (tenant_id, metric, period)
);

-- ------------------------------------------------------------------ RLS
alter table public.findings enable row level security;
alter table public.posture_scores enable row level security;
alter table public.tenant_frameworks enable row level security;
alter table public.compliance_assessments enable row level security;
alter table public.reports enable row level security;
alter table public.usage_quotas enable row level security;
alter table public.usage_counters enable row level security;

create policy findings_select on public.findings
  for select to authenticated using (public.is_tenant_member(tenant_id));

-- The portal may accept a risk or reopen it; detection stays server-side.
create policy findings_update on public.findings
  for update to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy posture_scores_select on public.posture_scores
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy tenant_frameworks_select on public.tenant_frameworks
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy tenant_frameworks_write on public.tenant_frameworks
  for all to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy compliance_assessments_select on public.compliance_assessments
  for select to authenticated using (public.is_tenant_member(tenant_id));

-- Declaring a control out of scope is a customer decision, and it is audited.
create policy compliance_assessments_update on public.compliance_assessments
  for update to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy reports_select on public.reports
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy reports_insert on public.reports
  for insert to authenticated
  with check (public.is_tenant_admin(tenant_id));

create policy usage_quotas_select on public.usage_quotas
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy usage_counters_select on public.usage_counters
  for select to authenticated using (public.is_tenant_member(tenant_id));
