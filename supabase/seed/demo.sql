-- EventReport — demo tenant (Acme S.A.S.).
-- GENERATED FILE: do not edit by hand. Source: apps/web/lib/fixtures.
-- Regenerate with: node supabase/seed/demo.mjs

begin;

-- ------------------------------------------------------------- tenant
insert into public.tenants (id, slug, name, plan) values ('a0000000-0000-4000-8000-000000000001', 'acme', 'Acme S.A.S.', 'premium')
on conflict (id) do update set name = excluded.name, plan = excluded.plan;

insert into public.tenant_frameworks (tenant_id, framework_code) values
  ('a0000000-0000-4000-8000-000000000001', 'iso27001'),
  ('a0000000-0000-4000-8000-000000000001', 'cis_v8'),
  ('a0000000-0000-4000-8000-000000000001', 'pci_dss')
on conflict do nothing;

insert into public.usage_quotas (tenant_id, firewalls, config_snapshots_per_day, critical_events_per_day, evidence_rows, claude_tokens_per_month)
values ('a0000000-0000-4000-8000-000000000001', 10, 6, 500, 2000, 1500000)
on conflict (tenant_id) do nothing;

-- --------------------------------------------------- sites and devices
insert into public.sites (id, tenant_id, name, city) values
  ('a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'Sede principal', 'Bogotá'),
  ('a0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'Planta', 'Medellín')
on conflict (id) do update set name = excluded.name, city = excluded.city;

insert into public.collectors (id, tenant_id, site_id, name, version, status, last_seen_at, vault_days) values
  ('a0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000011', 'colector-bogota', '0.4.2', 'active', '2026-08-31T02:56:00Z', 30),
  ('a0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000012', 'colector-medellin', '0.4.1', 'stale', '2026-08-30T18:10:00Z', 7)
on conflict (id) do update set status = excluded.status, last_seen_at = excluded.last_seen_at, version = excluded.version;

insert into public.collector_heartbeats (tenant_id, collector_id, ts, version, eps, dropped_pct, queue_depth, disk_free_gb, clock_skew_seconds) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000021', '2026-08-31T02:56:00Z', '0.4.2', 118, 0.2, 1240, 62, 3),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000022', '2026-08-30T18:10:00Z', '0.4.1', 0, 2.7, 50000, 3, 94)
on conflict (collector_id, ts) do update set eps = excluded.eps, dropped_pct = excluded.dropped_pct;

insert into public.firewalls (id, tenant_id, site_id, collector_id, brand, model, serial, firmware, hostname, ha_role, capabilities) values
  ('a0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000021', 'fortigate', 'FortiGate 60F', 'FGT60FTK21089123', '7.2.8', 'FGT60F-BOG', 'standalone', '{"config":true,"policyHitCount":true,"utmProfiles":true,"licenses":true,"adminMfa":true,"vpnRemote":true,"certificates":true,"trafficBytes":true,"identity":true,"geo":true,"unevaluableRules":[]}'::jsonb),
  ('a0000000-0000-4000-8000-000000000032', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000022', 'sophos_xg', 'Sophos XGS 116', 'S1160-4471-9902', '19.5.3 MR-3', 'XGS116-MDE', 'standalone', '{"config":true,"policyHitCount":false,"utmProfiles":true,"licenses":true,"adminMfa":true,"vpnRemote":true,"certificates":true,"trafficBytes":true,"identity":true,"geo":true,"unevaluableRules":["FW-007"]}'::jsonb)
on conflict (id) do update set firmware = excluded.firmware, capabilities = excluded.capabilities;

-- ----------------------------------------------------------- findings
insert into public.findings (id, tenant_id, firewall_id, rule_code, asset_key, asset_label, status, severity, first_seen, last_seen, resolved_at, evidence) values
  ('a0000000-0000-4000-8000-000000010001', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'FW-001', 'wan1', 'Interfaz wan1', 'open', 'critical', '2026-06-14T09:12:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Interfaz","value":"wan1 · 190.85.44.12"},{"label":"Protocolos habilitados","value":"https, ssh, ping"},{"label":"Intentos de acceso en 30 días","value":"4.812"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010002', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'FW-011', 'sslvpn', 'Portal SSL-VPN', 'open', 'high', '2026-06-14T09:12:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Tipo","value":"ssl · tls 1.2"},{"label":"Usuarios habilitados","value":"38"},{"label":"Segundo factor","value":"no configurado"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010003', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'FW-006', 'policy:3', 'Política 3 — Servidores', 'open', 'critical', '2026-07-19T18:03:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Política","value":"id 3 · SRV_ANY"},{"label":"Origen y destino","value":"any → any"},{"label":"Servicios","value":"ALL"},{"label":"Creada por","value":"admin desde 10.10.0.34"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010004', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'FW-002', 'admin:soporte', 'Cuenta soporte', 'open', 'high', '2026-05-18T14:30:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Cuenta","value":"soporte · perfil super_admin"},{"label":"Último ingreso","value":"2026-08-29 08:11"},{"label":"Segundo factor","value":"deshabilitado"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010005', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'FW-010', 'nat:vip-rdp', 'NAT entrante a escritorio remoto', 'open', 'high', '2026-06-30T11:47:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Publicado","value":"190.85.44.12:3389 → 10.10.0.42:3389"},{"label":"Origen permitido","value":"0.0.0.0/0"},{"label":"Intentos fallidos en 30 días","value":"27.940"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010006', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000032', 'FW-005', 'firmware', 'Firmware del equipo', 'open', 'high', '2026-08-02T05:00:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Versión instalada","value":"19.5.3 MR-3"},{"label":"CVE conocido","value":"CVE-2026-3199 · 8.8"},{"label":"Versión con parche","value":"20.0.2 MR-2"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010007', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'FW-008', 'policy:14', 'Política 14 — LAN a internet', 'open', 'medium', '2026-07-02T11:40:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Política","value":"id 14 · LAN_to_WAN"},{"label":"Registro","value":"log=none"},{"label":"Sesiones en 30 días","value":"1.204.881"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010008', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000032', 'FW-009', 'policy:7', 'Regla 7 — Planta a internet', 'open', 'medium', '2026-06-21T09:00:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Regla","value":"id 7 · PLANTA_OUT"},{"label":"Perfiles aplicados","value":"ninguno"},{"label":"Tráfico en 30 días","value":"412 GB"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010009', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'FW-007', 'policies:stale', '11 políticas sin tráfico', 'open', 'medium', '2026-05-18T14:30:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Políticas","value":"id 8, 12, 19, 21, 22, 27, 31, 33, 36, 40, 44"},{"label":"Último tráfico","value":"sin registros en 90 días"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010010', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000032', 'FW-016', 'license:webprotection', 'Licencia de protección web', 'open', 'medium', '2026-08-14T00:00:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Módulo","value":"Web Protection"},{"label":"Vence","value":"2026-09-22"},{"label":"Estado","value":"expiring"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010011', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'FW-012', 'ipsec:sucursal', 'Túnel IPsec a la planta', 'open', 'medium', '2026-05-18T14:30:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Túnel","value":"VPN_MDE · peer 200.31.7.88"},{"label":"Propuesta","value":"IKEv1 · 3DES · SHA1 · DH group 2"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010012', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'OP-002', 'critical-events', 'Eventos críticos sin cerrar', 'open', 'medium', '2026-08-21T10:00:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Eventos sin tratamiento","value":"6"},{"label":"Más antiguo","value":"2026-08-21 10:42"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010013', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000032', 'FW-014', 'snmp', 'Servicio SNMP', 'open', 'low', '2026-08-03T15:05:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Versión","value":"v2c"},{"label":"Comunidad","value":"public"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010014', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'FW-017', 'syslog-targets', 'Destinos de registro', 'open', 'low', '2026-05-18T14:30:00Z', '2026-08-31T02:00:00Z', null, '[{"label":"Destinos configurados","value":"10.10.0.9 (colector)"},{"label":"Destino secundario","value":"ninguno"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010015', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'FW-013', 'cert:portal', 'Certificado del portal', 'resolved', 'medium', '2026-05-20T08:00:00Z', '2026-08-11T06:00:00Z', '2026-08-12T14:22:00Z', '[{"label":"Emisor","value":"Let''s Encrypt R11"},{"label":"Vence","value":"2026-11-09"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010016', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'FW-003', 'admin:admin', 'Cuenta admin', 'resolved', 'high', '2026-05-18T14:30:00Z', '2026-07-27T09:00:00Z', '2026-07-28T15:10:00Z', '[{"label":"Hosts de confianza","value":"10.10.0.0/24, 190.85.44.8/29"}]'::jsonb),
  ('a0000000-0000-4000-8000-000000010017', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000032', 'FW-015', 'ntp', 'Sincronización de reloj', 'resolved', 'low', '2026-06-05T00:00:00Z', '2026-08-05T00:00:00Z', '2026-08-06T11:00:00Z', '[{"label":"Servidores NTP","value":"co.pool.ntp.org, 1.co.pool.ntp.org"},{"label":"Desfase actual","value":"3 s"}]'::jsonb)
on conflict (firewall_id, rule_code, asset_key) do update set status = excluded.status, last_seen = excluded.last_seen, evidence = excluded.evidence;

-- ---------------------------------------------------- critical events
insert into public.critical_events (id, tenant_id, firewall_id, rule_code, severity, ts, title, detail, acknowledged_at) values
  ('a0000000-0000-4000-8000-000000020001', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'FW-003', 'critical', '2026-08-31T02:42:00Z', 'Ingreso administrativo desde una IP no autorizada', 'La cuenta admin entró desde 190.85.212.44, fuera de los hosts de confianza.', null),
  ('a0000000-0000-4000-8000-000000020002', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', 'FW-006', 'critical', '2026-08-30T14:11:00Z', 'Política nueva con origen y destino abiertos', 'Se creó la política 3 (SRV_ANY) con any → any y servicio ALL.', null),
  ('a0000000-0000-4000-8000-000000020003', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000032', 'FW-011', 'high', '2026-08-30T03:18:00Z', 'Intentos fallidos de VPN para un mismo usuario', '41 intentos fallidos del usuario jperez en 15 minutos desde 5 países distintos.', '2026-08-30T08:05:00Z'),
  ('a0000000-0000-4000-8000-000000020004', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000032', 'FW-016', 'medium', '2026-08-29T00:00:00Z', 'Licencia de protección web por vencer', 'La suscripción de Web Protection del XGS 116 vence el 22 de septiembre.', null),
  ('a0000000-0000-4000-8000-000000020005', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000032', 'FW-018', 'medium', '2026-08-28T19:44:00Z', 'Reinicio no programado del equipo', 'El XGS 116 se reinició sin cambio de configuración previo.', '2026-08-28T21:00:00Z'),
  ('a0000000-0000-4000-8000-000000020006', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000032', 'FW-019', 'medium', '2026-08-27T11:02:00Z', 'Pérdida de eventos en el colector', 'El colector de Medellín descartó el 2,7 % de las líneas durante 40 minutos.', null)
on conflict (id) do update set acknowledged_at = excluded.acknowledged_at;

-- ------------------------------------------------------------ reports
insert into public.reports (id, tenant_id, type, framework_code, period_start, period_end, status, generated_at, pages, size_kb) values
  ('a0000000-0000-4000-8000-000000030001', 'a0000000-0000-4000-8000-000000000001', 'executive', null, '2026-08-01T00:00:00Z', '2026-08-31T00:00:00Z', 'ready', '2026-08-31T03:00:00Z', 6, 412),
  ('a0000000-0000-4000-8000-000000030002', 'a0000000-0000-4000-8000-000000000001', 'hardening', null, '2026-08-01T00:00:00Z', '2026-08-31T00:00:00Z', 'ready', '2026-08-31T03:04:00Z', 19, 1284),
  ('a0000000-0000-4000-8000-000000030003', 'a0000000-0000-4000-8000-000000000001', 'compliance', 'iso27001', '2026-06-01T00:00:00Z', '2026-08-31T00:00:00Z', 'generating', null, 0, 0),
  ('a0000000-0000-4000-8000-000000030004', 'a0000000-0000-4000-8000-000000000001', 'activity', null, '2026-07-01T00:00:00Z', '2026-07-31T00:00:00Z', 'ready', '2026-08-01T03:02:00Z', 11, 902),
  ('a0000000-0000-4000-8000-000000030005', 'a0000000-0000-4000-8000-000000000001', 'baseline', null, '2026-05-18T00:00:00Z', '2026-05-18T00:00:00Z', 'ready', '2026-05-18T16:40:00Z', 14, 1002)
on conflict (id) do update set status = excluded.status;

-- --------------------------------------------------------- top-N rows
insert into public.rollups_topn (tenant_id, firewall_id, hour, dimension, key, count, bytes) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'src_country', 'Colombia', 812440, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'src_country', 'Estados Unidos', 214009, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'src_country', 'Países Bajos', 38112, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'src_country', 'Rusia', 21887, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'src_country', 'China', 18204, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'src_country', 'Brasil', 9640, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'src_ip_denied', '45.155.205.7', 12884, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'src_ip_denied', '185.220.101.34', 9118, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'src_ip_denied', '193.32.162.19', 7402, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'src_ip_denied', '141.98.10.212', 5559, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'src_ip_denied', '89.248.165.44', 4031, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'dst_ip', '20.190.160.14', 188402, 412000000000),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'dst_ip', '142.250.78.14', 141220, 288000000000),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'dst_ip', '13.107.42.14', 98774, 96000000000),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'dst_port', '443', 1042118, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'dst_port', '80', 118402, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'dst_port', '3389', 27940, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'dst_port', '22', 12884, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'dst_port', '53', 9774, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'app', 'Microsoft 365', 402118, 512000000000),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'app', 'Google Workspace', 188220, 240000000000),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'app', 'WhatsApp Web', 96004, 41000000000),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'app', 'YouTube', 71338, 388000000000),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'app', 'Dropbox', 22119, 88000000000),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'app', 'TeamViewer', 8442, 6000000000),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'web_category', 'Negocios y economía', 288114, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'web_category', 'Tecnología', 201009, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'web_category', 'Redes sociales', 142880, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'web_category', 'Streaming', 88402, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'web_category', 'Apuestas (bloqueado)', 4118, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'web_category', 'Malware (bloqueado)', 1402, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'vpn_user', 'agomez', 188, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'vpn_user', 'crestrepo', 142, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'vpn_user', 'jperez', 96, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'vpn_user', 'soporte', 41, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'ips_signature', 'Apache.Struts.RCE', 1884, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'ips_signature', 'MS.RDP.BlueKeep', 1204, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'ips_signature', 'SSH.Brute.Force', 998, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'ips_signature', 'PHPUnit.RCE', 412, 0),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'policy', '14 · LAN_to_WAN', 1204881, 812000000000),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'policy', '7 · PLANTA_OUT', 388004, 412000000000),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000031', date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), 'policy', '3 · SRV_ANY', 88112, 96000000000)
on conflict (firewall_id, hour, dimension, key) do update set count = excluded.count, bytes = excluded.bytes;

-- ----------------------------------------------------- hourly rollups
-- Same shape as the fixtures: working hours, quiet weekends, night VPN and
-- IPS bursts that do not follow the working day.
with hours as (
  select generate_series(date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz) - interval '30 days',
                         date_trunc('hour', '2026-08-31T03:00:00Z'::timestamptz), interval '1 hour') as hour
),
shaped as (
  select
    hour,
    case
      when extract(hour from hour) between 8 and 12 then 1.0
      when extract(hour from hour) between 13 and 18 then 0.92
      when extract(hour from hour) between 6 and 7 then 0.45
      when extract(hour from hour) between 19 and 21 then 0.35
      else 0.12
    end
    * case when extract(isodow from hour) <= 5 then 1.0 else 0.22 end as load,
    -- Deterministic wobble, so the curve is identical on every re-seed.
    (abs(hashtext(hour::text)) % 100) / 100.0 as noise
  from hours
),
devices as (
  select 'a0000000-0000-4000-8000-000000000031'::uuid as firewall_id, 1.0 as scale
  union all select 'a0000000-0000-4000-8000-000000000032'::uuid, 0.38
)
insert into public.rollups_hourly (tenant_id, firewall_id, hour, type, action, count, bytes_in, bytes_out)
select * from (
  select 'a0000000-0000-4000-8000-000000000001'::uuid, d.firewall_id, s.hour, 'traffic'::public.event_type, 'allow'::public.event_action,
         greatest(0, round(s.load * d.scale * 5400 * (0.9 + s.noise * 0.2)))::bigint,
         greatest(0, round(s.load * d.scale * 5400 * 41000 * 0.7))::bigint,
         greatest(0, round(s.load * d.scale * 5400 * 41000 * 0.3))::bigint
  from shaped s cross join devices d
  union all
  select 'a0000000-0000-4000-8000-000000000001'::uuid, d.firewall_id, s.hour, 'traffic', 'deny',
         greatest(0, round(s.load * d.scale * 780 * (0.9 + s.noise * 0.2)))::bigint, 0, 0
  from shaped s cross join devices d
  union all
  select 'a0000000-0000-4000-8000-000000000001'::uuid, d.firewall_id, s.hour, 'ips', 'block',
         greatest(0, round(s.load * d.scale * 46 + case when s.noise > 0.97 then 240 else 0 end))::bigint, 0, 0
  from shaped s cross join devices d
  union all
  select 'a0000000-0000-4000-8000-000000000001'::uuid, d.firewall_id, s.hour, 'web', 'block',
         greatest(0, round(s.load * d.scale * 210))::bigint, 0, 0
  from shaped s cross join devices d
  union all
  select 'a0000000-0000-4000-8000-000000000001'::uuid, d.firewall_id, s.hour, 'vpn', 'allow',
         greatest(0, round(case when extract(hour from s.hour) >= 19 or extract(hour from s.hour) <= 6
                                then 14 else 5 end * d.scale))::bigint, 0, 0
  from shaped s cross join devices d
) as rows(tenant_id, firewall_id, hour, type, action, count, bytes_in, bytes_out)
on conflict (firewall_id, hour, type, action) do update set count = excluded.count;

-- ------------------------------------------------------ posture scores
-- 90 days of the curve of a real service: low baseline at enrolment, steps
-- when the customer closes findings, a dip when a new one appears.
with days as (
  select generate_series(date_trunc('day', '2026-08-31T03:00:00Z'::timestamptz) - interval '89 days',
                         date_trunc('day', '2026-08-31T03:00:00Z'::timestamptz), interval '1 day') as day
),
curve as (
  select day,
    case
      when day < now() - interval '77 days' then 52
      when day < now() - interval '62 days' then 58
      when day < now() - interval '48 days' then 61
      when day < now() - interval '41 days' then 57
      when day < now() - interval '26 days' then 65
      when day < now() - interval '15 days' then 69
      when day < now() - interval '6 days' then 72
      else 74
    end as value
  from days
),
devices as (
  select 'a0000000-0000-4000-8000-000000000031'::uuid as firewall_id, 0 as offset
  union all select 'a0000000-0000-4000-8000-000000000032'::uuid, -4
)
insert into public.posture_scores (tenant_id, firewall_id, computed_at, value, configuration, operation)
select 'a0000000-0000-4000-8000-000000000001'::uuid, d.firewall_id, c.day,
       greatest(0, least(100, c.value + d.offset)),
       greatest(0, least(100, c.value + d.offset - 3)),
       greatest(0, least(100, c.value + d.offset + 7))
from curve c cross join devices d
on conflict (tenant_id, firewall_id, computed_at) do update set value = excluded.value;

commit;
