-- The membership helpers must stay callable by `authenticated`, because RLS
-- policies are evaluated with the caller's privileges. They must NOT be
-- reachable by `anon`: a signed-out caller has no membership to check, and
-- these functions are exposed as RPC endpoints by PostgREST.
--
-- Raised by the Supabase security advisor after the first migrations.

revoke execute on function public.is_tenant_member(uuid) from anon;
revoke execute on function public.is_tenant_admin(uuid) from anon;
