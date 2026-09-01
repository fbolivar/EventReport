-- La función devolvía las membresías de **todas** las empresas del usuario. Con
-- un cliente por usuario daba igual; con un MSSP miembro de varias, la pantalla
-- de Ajustes de una empresa listaba a la gente de las otras. Ahora recibe la
-- empresa que se está mirando, y sigue comprobando la membresía por dentro: el
-- argumento acota, no autoriza.
create or replace function public.tenant_member_profiles(p_tenant_id uuid default null)
returns table (
  id uuid,
  tenant_id uuid,
  user_id uuid,
  role public.member_role,
  email text,
  full_name text,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.tenant_id,
    m.user_id,
    m.role,
    u.email::text,
    coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email::text, '@', 1)) as full_name,
    u.last_sign_in_at
  from public.tenant_members m
  join auth.users u on u.id = m.user_id
  where public.is_tenant_member(m.tenant_id)
    and (p_tenant_id is null or m.tenant_id = p_tenant_id)
  order by m.created_at;
$$;

revoke execute on function public.tenant_member_profiles(uuid) from public, anon;
grant execute on function public.tenant_member_profiles(uuid) to authenticated;
