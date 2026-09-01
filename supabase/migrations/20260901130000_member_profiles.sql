-- The portal must show who has access, and the email lives in `auth.users`,
-- which is not readable from the API. A SECURITY DEFINER function exposes just
-- the fields the settings screen needs, and only for tenants the caller
-- belongs to — the membership filter is inside the function, not in the query.

create or replace function public.tenant_member_profiles()
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
  order by m.created_at;
$$;

revoke execute on function public.tenant_member_profiles() from public, anon;
grant execute on function public.tenant_member_profiles() to authenticated;
