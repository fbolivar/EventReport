-- NIST SP 800-53 Rev. 5 y CMMC 2.0 nivel 2.
--
-- El modelo no cambia: un marco, sus controles, y el mapeo regla → control. Lo
-- que cambia es a cuántos marcos responde la misma evidencia técnica que ya se
-- recoge del firewall.
--
-- STIG entra en una migración aparte y a propósito: sus identificadores (V-ID)
-- son específicos de cada dispositivo y de cada versión del benchmark, y se
-- publican en los XCCDF de DISA. Escribirlos de memoria sería inventar
-- referencias que un auditor va a comprobar. Se importan del archivo oficial o
-- no se ponen.

alter type public.framework_code add value if not exists 'nist_800_53';
alter type public.framework_code add value if not exists 'cmmc_l2';
