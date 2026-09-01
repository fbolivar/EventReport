-- Product pieces the portal was missing: inviting people, and letting the
-- customer declare a control out of scope.

-- --------------------------------------------------------- invitations
--
-- An admin invites by email. When that person signs up, a trigger turns the
-- pending invitation into a membership. No service_role key is involved, so
-- the flow works from the portal alone.
create table public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null,
  role public.member_role not null default 'client_viewer',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (tenant_id, email)
);

create index tenant_invitations_email_idx on public.tenant_invitations (lower(email));

alter table public.tenant_invitations enable row level security;

create policy tenant_invitations_select on public.tenant_invitations
  for select to authenticated using (public.is_tenant_member(tenant_id));

create policy tenant_invitations_write on public.tenant_invitations
  for all to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- Turns pending invitations into memberships when the person signs up.
create or replace function public.accept_invitations_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tenant_members (tenant_id, user_id, role)
  select invitation.tenant_id, new.id, invitation.role
  from public.tenant_invitations invitation
  where lower(invitation.email) = lower(new.email)
    and invitation.accepted_at is null
  on conflict (tenant_id, user_id) do nothing;

  update public.tenant_invitations
  set accepted_at = now()
  where lower(email) = lower(new.email)
    and accepted_at is null;

  return new;
end;
$$;

create trigger accept_invitations_on_signup
  after insert on auth.users
  for each row
  execute function public.accept_invitations_for_new_user();

-- ------------------------------------------------- out-of-scope controls
--
-- The customer needs to be able to write the decision, and to undo it. The
-- check constraint already guarantees a justification exists; these policies
-- decide who may write one.
create policy compliance_assessments_insert on public.compliance_assessments
  for insert to authenticated
  with check (public.is_tenant_admin(tenant_id));

create policy compliance_assessments_delete on public.compliance_assessments
  for delete to authenticated
  using (public.is_tenant_admin(tenant_id));
