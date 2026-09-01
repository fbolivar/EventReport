-- EventReport — global catalogues (sections 7 and 15).
--
-- DELIBERATE EXCEPTION to the "every table carries tenant_id" rule: these
-- tables hold no customer data. They are the shared catalogue of rules,
-- frameworks and controls that EventReport ships and maintains, identical for
-- every tenant. RLS is still enabled on all of them, with a read-only policy
-- for authenticated users; writes are reserved for the service_role, which is
-- how the seed and future catalogue updates are applied.

create type public.rule_domain as enum (
  'access', 'policy', 'vpn', 'crypto', 'logging', 'maintenance'
);

create type public.framework_code as enum ('iso27001', 'cis_v8', 'pci_dss', 'hipaa');

-- ------------------------------------------------------------ rules
create table public.finding_rules (
  code text primary key,
  severity public.severity not null,
  domain public.rule_domain not null,
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

-- Brand-specific remediation returned by each adapter's Remediation(rule).
create table public.rule_remediations (
  rule_code text not null references public.finding_rules (code) on delete cascade,
  brand public.brand not null,
  steps text[] not null,
  primary key (rule_code, brand)
);

-- ------------------------------------------------------- frameworks
create table public.frameworks (
  code public.framework_code primary key,
  name text not null,
  version text not null,
  -- Retention the framework demands, in days. 0 = not prescribed.
  log_retention_days integer not null default 0,
  total_controls integer not null,
  scope_note text not null
);

create table public.controls (
  framework_code public.framework_code not null references public.frameworks (code) on delete cascade,
  code text not null,
  title text not null,
  domain text,
  primary key (framework_code, code)
);

-- Generic rule -> control mapping (section 7). One rule, four frameworks.
create table public.rule_controls (
  rule_code text not null references public.finding_rules (code) on delete cascade,
  framework_code public.framework_code not null,
  control_code text not null,
  primary key (rule_code, framework_code, control_code),
  foreign key (framework_code, control_code)
    references public.controls (framework_code, code) on delete cascade
);

-- CIS Benchmark items per brand, mapped to generic rules (section 15.3).
create table public.brand_benchmarks (
  brand public.brand not null,
  benchmark_version text not null,
  item_code text not null,
  item_title text not null,
  rule_code text references public.finding_rules (code) on delete set null,
  primary key (brand, benchmark_version, item_code)
);

-- ------------------------------------------------------------------ RLS
alter table public.finding_rules enable row level security;
alter table public.rule_remediations enable row level security;
alter table public.frameworks enable row level security;
alter table public.controls enable row level security;
alter table public.rule_controls enable row level security;
alter table public.brand_benchmarks enable row level security;

create policy finding_rules_read on public.finding_rules
  for select to authenticated using (true);

create policy rule_remediations_read on public.rule_remediations
  for select to authenticated using (true);

create policy frameworks_read on public.frameworks
  for select to authenticated using (true);

create policy controls_read on public.controls
  for select to authenticated using (true);

create policy rule_controls_read on public.rule_controls
  for select to authenticated using (true);

create policy brand_benchmarks_read on public.brand_benchmarks
  for select to authenticated using (true);
