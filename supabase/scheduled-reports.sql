-- Disparo mensual de la generación de informes.
--
-- NO es una migración: se aplica a mano el día que el portal tenga una URL
-- pública. Aplicarlo antes solo dejaría un cron llamando a un servidor que no
-- existe, y el registro de fallos escondería los fallos de verdad.
--
-- El endpoint decide qué falta (`lib/reports/schedule.ts`) y encarga un render
-- por informe. Correrlo dos veces el mismo día no duplica nada: un informe ya
-- emitido para ese período no se vuelve a pedir.

-- 1. Extensiones. `pg_net` hace la llamada HTTP; `pg_cron` la agenda.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 2. El secreto compartido y la URL viven en Vault, no en el cuerpo del cron:
--    `cron.job` es legible por cualquiera con acceso a la base.
--    Reemplaza los valores antes de ejecutar.
select vault.create_secret('https://app.eventreport.io', 'eventreport_app_url');
select vault.create_secret('<CRON_SECRET del despliegue>', 'eventreport_cron_secret');

-- 3. El día 1 de cada mes a las 06:00 UTC (01:00 en Colombia). Después del
--    cierre del mes, y antes de que empiece la jornada del cliente.
select cron.schedule(
  'eventreport-monthly-reports',
  '0 6 1 * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'eventreport_app_url') || '/api/cron/reports',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                                     where name = 'eventreport_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Para revisar qué pasó:
--   select * from cron.job_run_details order by start_time desc limit 10;
--   select * from net._http_response order by created desc limit 10;
