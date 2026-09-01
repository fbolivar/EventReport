-- Enrolamiento del colector (docs/diseno-tecnico.md §6.7).
--
-- El operador pide un token en el portal, lo pega en la máquina del cliente y
-- el colector se registra solo. Es la única llamada sin firma —el colector
-- todavía no tiene identidad—, así que el token **es** la credencial:
--
-- * se guarda **hasheado**, nunca en claro: quien lea la tabla no puede enrolar
--   un colector ajeno;
-- * es de un solo uso y vence; un token que sirve para siempre acaba pegado en
--   un chat;
-- * queda atado a una sede, así que un token filtrado no sirve para otra.
create table public.collector_enrolments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  -- sha256 del token en hex. El texto plano solo existe una vez, en la
  -- pantalla que lo muestra.
  token_hash text not null unique,
  -- Cómo lo llamó el operador, para saber cuál es cuál mientras esperan.
  label text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  collector_id uuid references public.collectors (id) on delete set null
);

create index collector_enrolments_tenant_idx
  on public.collector_enrolments (tenant_id, created_at desc);

alter table public.collector_enrolments enable row level security;

-- Los miembros ven los enrolamientos de su empresa; solo un administrador
-- puede crearlos o revocarlos. El hash es visible, y no sirve de nada.
create policy collector_enrolments_select on public.collector_enrolments
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy collector_enrolments_write on public.collector_enrolments
  for all to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));
