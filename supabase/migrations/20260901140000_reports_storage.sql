-- Storage for generated PDFs (design section 8).
--
-- Private bucket. The path convention is `<tenant_uuid>/<report_id>.pdf`, and
-- the policies read the tenant straight out of the first folder: a member sees
-- their own reports and nobody else's, enforced by the same
-- `is_tenant_member()` that guards every table.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

create policy reports_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and public.is_tenant_member(((storage.foldername(name))[1])::uuid)
  );

create policy reports_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reports'
    and public.is_tenant_admin(((storage.foldername(name))[1])::uuid)
  );

create policy reports_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'reports'
    and public.is_tenant_admin(((storage.foldername(name))[1])::uuid)
  );

-- The portal marks a report ready once the PDF is stored.
create policy reports_update_row on public.reports
  for update to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));
