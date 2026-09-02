-- Dar de alta un cliente desde el portal.
--
-- No hay política de inserción sobre `tenants` a propósito: crear una empresa
-- no es escribir una fila, es crearla con su membresía, sus cupos y su sede
-- inicial. Una función lo hace entero o no lo hace.
--
-- Solo puede llamarla quien ya administra alguna empresa como MSSP: si no,
-- cualquier cuenta autenticada podría llenar la base de empresas vacías.
create or replace function public.create_tenant(
  p_name text,
  p_slug text,
  p_plan public.plan_code default 'basic',
  p_site text default 'Sede principal',
  p_city text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  if auth.uid() is null then
    raise exception 'hace falta iniciar sesión';
  end if;

  if not exists (
    select 1 from public.tenant_members m
    where m.user_id = auth.uid() and m.role = 'mssp_admin'
  ) then
    raise exception 'solo un administrador MSSP puede dar de alta empresas';
  end if;

  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_slug), '') = '' then
    raise exception 'la empresa necesita nombre e identificador';
  end if;

  p_slug := lower(regexp_replace(trim(p_slug), '[^a-zA-Z0-9-]+', '-', 'g'));

  insert into public.tenants (slug, name, plan)
  values (p_slug, trim(p_name), p_plan)
  returning id into v_tenant;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant, auth.uid(), 'mssp_admin');

  insert into public.usage_quotas (
    tenant_id, firewalls, config_snapshots_per_day, critical_events_per_day,
    evidence_rows, claude_tokens_per_month
  )
  values (
    v_tenant,
    case p_plan when 'premium' then 10 when 'standard' then 3 else 1 end,
    case p_plan when 'premium' then 6 when 'standard' then 4 else 1 end,
    case p_plan when 'premium' then 500 when 'standard' then 200 else 50 end,
    case p_plan when 'premium' then 2000 when 'standard' then 500 else 200 end,
    case p_plan when 'premium' then 1500000 when 'standard' then 500000 else 150000 end
  );

  insert into public.tenant_frameworks (tenant_id, framework_code)
  values (v_tenant, 'iso27001')
  on conflict do nothing;

  insert into public.sites (tenant_id, name, city)
  values (v_tenant, coalesce(nullif(trim(p_site), ''), 'Sede principal'), trim(p_city));

  return v_tenant;
end;
$$;

revoke execute on function public.create_tenant(text, text, public.plan_code, text, text) from public, anon;
grant execute on function public.create_tenant(text, text, public.plan_code, text, text) to authenticated;
