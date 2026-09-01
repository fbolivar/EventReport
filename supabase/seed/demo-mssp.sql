-- Segundo cliente de demostración, para que la vista MSSP tenga algo que comparar.
--
-- Con un solo tenant, un tablero multicliente no se puede evaluar: no se ve si
-- ordena bien, si el motivo de atención tiene sentido ni si los totales suman.
-- Este cliente es deliberadamente distinto del primero: plan menor, un solo
-- equipo, colector caído, postura peor y un evento crítico sin atender.
--
-- Se aplica a mano sobre un entorno de demostración; no es una migración.

begin;

insert into public.tenants (id, slug, name, plan) values
  ('b0000000-0000-4000-8000-000000000001', 'nortis', 'Nortis Salud IPS', 'standard')
on conflict (id) do update set name = excluded.name, plan = excluded.plan;

insert into public.tenant_frameworks (tenant_id, framework_code) values
  ('b0000000-0000-4000-8000-000000000001', 'iso27001'),
  ('b0000000-0000-4000-8000-000000000001', 'hipaa')
on conflict do nothing;

-- El MSSP ve a sus clientes porque es miembro de cada uno: RLS hace el resto.
insert into public.tenant_members (tenant_id, user_id, role)
select 'b0000000-0000-4000-8000-000000000001', id, 'mssp_admin'
from auth.users where email = 'fbolivarb@gmail.com'
on conflict (tenant_id, user_id) do nothing;

insert into public.sites (id, tenant_id, name, city) values
  ('b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'Clínica norte', 'Barranquilla')
on conflict (id) do update set name = excluded.name, city = excluded.city;

-- Colector caído hace tres días: sin datos frescos, el informe del mes sale
-- incompleto y nadie se entera hasta que lo abre.
insert into public.collectors (id, tenant_id, site_id, name, version, status, last_seen_at, vault_days) values
  ('b0000000-0000-4000-8000-000000000021', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000011', 'colector-barranquilla', '0.3.9', 'offline', now() - interval '3 days', 7)
on conflict (id) do update set status = excluded.status, last_seen_at = excluded.last_seen_at;

insert into public.firewalls (id, tenant_id, site_id, collector_id, brand, model, serial, firmware, hostname, ha_role, capabilities) values
  ('b0000000-0000-4000-8000-000000000031', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000021', 'fortigate', 'FortiGate 40F', 'FGT40FTK22004411', '7.0.14', 'FGT40F-BAQ', 'standalone', '{"config":true,"policyHitCount":true,"utmProfiles":true,"licenses":true,"adminMfa":true,"vpnRemote":true,"certificates":true,"trafficBytes":true,"identity":false,"geo":true,"unevaluableRules":["FW-020"]}'::jsonb)
on conflict (id) do update set firmware = excluded.firmware, capabilities = excluded.capabilities;

insert into public.findings (id, tenant_id, firewall_id, rule_code, asset_key, asset_label, status, severity, first_seen, last_seen, resolved_at, evidence) values
  ('b0000000-0000-4000-8000-000000010001', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000031', 'FW-001', 'wan1', 'Interfaz wan1', 'open', 'critical', now() - interval '54 days', now() - interval '3 days', null, '[{"label":"Interfaz","value":"wan1 · 181.49.22.7"},{"label":"Protocolos habilitados","value":"https, ssh"}]'::jsonb),
  ('b0000000-0000-4000-8000-000000010002', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000031', 'FW-002', 'admin', 'Administrador admin', 'open', 'critical', now() - interval '40 days', now() - interval '3 days', null, '[{"label":"Cuenta","value":"admin · perfil super_admin"},{"label":"Segundo factor","value":"no"}]'::jsonb),
  ('b0000000-0000-4000-8000-000000010003', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000031', 'OP-003', 'retention', 'Retención de registros', 'open', 'high', now() - interval '30 days', now() - interval '3 days', null, '[{"label":"Retención actual","value":"7 días"},{"label":"Exigida por HIPAA","value":"180 días"}]'::jsonb),
  ('b0000000-0000-4000-8000-000000010004', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000031', 'FW-012', 'vpn-sede', 'Túnel vpn-sede', 'open', 'high', now() - interval '22 days', now() - interval '3 days', null, '[{"label":"Cifrado","value":"3des"},{"label":"Grupo DH","value":"2"}]'::jsonb),
  ('b0000000-0000-4000-8000-000000010005', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000031', 'FW-008', 'policy:7', 'Política 7 — Invitados', 'resolved', 'medium', now() - interval '60 days', now() - interval '12 days', now() - interval '12 days', '[{"label":"Política","value":"id 7 · GUEST"}]'::jsonb)
on conflict (id) do update set status = excluded.status, severity = excluded.severity;

-- Evento crítico sin atender desde hace nueve días: pasa los siete de OP-002.
insert into public.critical_events (id, tenant_id, firewall_id, rule_code, severity, ts, title, detail, acknowledged_at) values
  ('b0000000-0000-4000-8000-000000020001', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000031', 'FW-001', 'critical', now() - interval '9 days', 'Acceso administrativo desde internet', 'La consola respondió a 14 intentos desde direcciones fuera de Colombia.', null),
  ('b0000000-0000-4000-8000-000000020002', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000031', 'FW-012', 'high', now() - interval '5 days', 'Túnel VPN renegociando con cifrado obsoleto', 'El túnel vpn-sede negoció 3DES con el extremo remoto.', null)
on conflict (id) do nothing;

-- Serie de postura de los últimos 45 días, bajando: un cliente que empeora.
insert into public.posture_scores (tenant_id, firewall_id, computed_at, value, configuration, operation)
select 'b0000000-0000-4000-8000-000000000001'::uuid,
       'b0000000-0000-4000-8000-000000000031'::uuid,
       day,
       greatest(0, 52 - ((now()::date - day::date) * -1) / 3),
       greatest(0, 46 - ((now()::date - day::date) * -1) / 3),
       62
from generate_series(now() - interval '45 days', now(), interval '1 day') as day
on conflict do nothing;

commit;
