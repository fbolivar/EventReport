-- Actividad atribuida a una persona, un equipo o una dirección.
--
-- Sobre el tráfico real de un FortiGate 40F en una PYME, `user` aparece en once
-- de cada cien líneas: agrupar solo por usuario autenticado deja la pantalla
-- vacía en la empresa promedio, que es justo el cliente. El colector baja por
-- una escalera —usuario, equipo, huella, dirección— y guarda **en qué escalón
-- se quedó**, para que el informe no llame "usuario" a una IP.
--
-- Siguen sin subir líneas crudas: esto son contadores por hora, igual que el
-- resto de los rollups.

create type public.identity_kind as enum ('user', 'host', 'fingerprint', 'address');

create table public.rollups_identity_hourly (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  firewall_id uuid not null references public.firewalls (id) on delete cascade,
  hour timestamptz not null,
  -- La clave lleva su tipo dentro (`user:jperez`, `ip:192.168.2.11`) para que
  -- una persona y un equipo homónimos no se sumen en la misma fila.
  identity_key text not null,
  kind public.identity_kind not null,
  label text not null,
  sessions bigint not null default 0,
  allowed bigint not null default 0,
  denied bigint not null default 0,
  bytes_in bigint not null default 0,
  bytes_out bigint not null default 0,
  primary key (firewall_id, hour, identity_key)
);

create index rollups_identity_hourly_tenant_idx
  on public.rollups_identity_hourly (tenant_id, hour desc);

-- El detalle de cada identidad: sus aplicaciones, categorías y destinos.
create table public.rollups_identity_topn (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  firewall_id uuid not null references public.firewalls (id) on delete cascade,
  hour timestamptz not null,
  identity_key text not null,
  dimension public.topn_dimension not null,
  key text not null,
  count bigint not null default 0,
  bytes bigint not null default 0,
  primary key (firewall_id, hour, identity_key, dimension, key)
);

create index rollups_identity_topn_tenant_idx
  on public.rollups_identity_topn (tenant_id, hour desc, identity_key);

alter table public.rollups_identity_hourly enable row level security;
alter table public.rollups_identity_topn enable row level security;

create policy "identity hourly readable by tenant members"
  on public.rollups_identity_hourly for select
  using (public.is_tenant_member(tenant_id));

create policy "identity topn readable by tenant members"
  on public.rollups_identity_topn for select
  using (public.is_tenant_member(tenant_id));
