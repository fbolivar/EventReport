-- El colector reenvía su búfer cuando vuelve el enlace, así que los duplicados
-- son la norma. Esta clave los absorbe: el mismo evento, de la misma regla, en
-- el mismo instante y el mismo equipo, es el mismo evento.
--
-- `nulls not distinct` es necesario: `rule_code` puede ser nulo —un evento de
-- syslog que no corresponde a ninguna regla del catálogo— y con la regla por
-- defecto de Postgres dos nulos se consideran distintos, que es justo lo que
-- permitiría el duplicado.
create unique index critical_events_dedupe_idx
  on public.critical_events (firewall_id, rule_code, ts)
  nulls not distinct;
