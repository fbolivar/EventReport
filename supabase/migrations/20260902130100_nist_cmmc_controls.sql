-- Controles y mapeo para NIST SP 800-53 Rev. 5 y CMMC 2.0 nivel 2.
--
-- Cada fila de `rule_controls` es una afirmación que un auditor puede
-- cuestionar: "esta comprobación del firewall aporta evidencia de este
-- control". Por eso se mapea solo lo que la regla mide de verdad, y no el
-- control que suena parecido.
--
-- REVISAR (Fernando): validar el mapeo como Lead Implementer antes de que
-- aparezca en un informe entregado a un cliente. Los conteos totales de cada
-- marco también: mueven la frase "N de M controles evaluables".

insert into public.frameworks (code, name, version, log_retention_days, total_controls, scope_note)
values
  (
    'nist_800_53',
    'NIST SP 800-53 Rev. 5',
    'Rev. 5',
    0,
    1189,
    'Evidencia técnica del perímetro para las familias que dependen de la red: AC, AU, CM, IA, SC, SI. El total incluye controles y mejoras; el firewall aporta evidencia de una parte pequeña y el informe dice cuál.'
  ),
  (
    'cmmc_l2',
    'CMMC 2.0 nivel 2',
    '2.0',
    0,
    110,
    'Las 110 prácticas del nivel 2 provienen de NIST SP 800-171. EventReport cubre las de protección de límites, registro y configuración del firewall; la certificación la emite un C3PAO, no este informe.'
  )
on conflict (code) do nothing;

insert into public.controls (framework_code, code, title, domain) values
  ('nist_800_53', 'AC-4', 'Cumplimiento del flujo de información', 'Control de acceso'),
  ('nist_800_53', 'AC-6', 'Mínimo privilegio', 'Control de acceso'),
  ('nist_800_53', 'AC-17', 'Acceso remoto', 'Control de acceso'),
  ('nist_800_53', 'AU-2', 'Registro de eventos', 'Auditoría y rendición de cuentas'),
  ('nist_800_53', 'AU-3', 'Contenido de los registros de auditoría', 'Auditoría y rendición de cuentas'),
  ('nist_800_53', 'AU-5', 'Respuesta ante fallos del registro de auditoría', 'Auditoría y rendición de cuentas'),
  ('nist_800_53', 'AU-6', 'Revisión, análisis y reporte de auditoría', 'Auditoría y rendición de cuentas'),
  ('nist_800_53', 'AU-8', 'Marcas de tiempo', 'Auditoría y rendición de cuentas'),
  ('nist_800_53', 'AU-9(2)', 'Registros almacenados en un sistema distinto', 'Auditoría y rendición de cuentas'),
  ('nist_800_53', 'AU-11', 'Retención de registros de auditoría', 'Auditoría y rendición de cuentas'),
  ('nist_800_53', 'AU-12', 'Generación de registros de auditoría', 'Auditoría y rendición de cuentas'),
  ('nist_800_53', 'CA-7', 'Seguimiento continuo', 'Evaluación y autorización'),
  ('nist_800_53', 'CM-6', 'Parámetros de configuración', 'Gestión de configuración'),
  ('nist_800_53', 'CM-7', 'Funcionalidad mínima', 'Gestión de configuración'),
  ('nist_800_53', 'CP-10', 'Recuperación y reconstitución del sistema', 'Continuidad'),
  ('nist_800_53', 'IA-2', 'Identificación y autenticación de usuarios de la organización', 'Identificación y autenticación'),
  ('nist_800_53', 'IA-2(1)', 'Autenticación multifactor para cuentas privilegiadas', 'Identificación y autenticación'),
  ('nist_800_53', 'IA-5', 'Gestión de autenticadores', 'Identificación y autenticación'),
  ('nist_800_53', 'RA-5', 'Seguimiento de vulnerabilidades', 'Evaluación de riesgos'),
  ('nist_800_53', 'SA-22', 'Componentes sin soporte del proveedor', 'Adquisición'),
  ('nist_800_53', 'SC-7', 'Protección de límites', 'Protección de sistemas y comunicaciones'),
  ('nist_800_53', 'SC-8', 'Confidencialidad e integridad en la transmisión', 'Protección de sistemas y comunicaciones'),
  ('nist_800_53', 'SC-12', 'Establecimiento y gestión de claves criptográficas', 'Protección de sistemas y comunicaciones'),
  ('nist_800_53', 'SC-13', 'Protección criptográfica', 'Protección de sistemas y comunicaciones'),
  ('nist_800_53', 'SC-17', 'Certificados de infraestructura de clave pública', 'Protección de sistemas y comunicaciones'),
  ('nist_800_53', 'SI-2', 'Corrección de fallos', 'Integridad del sistema y la información'),
  ('nist_800_53', 'SI-3', 'Protección contra código malicioso', 'Integridad del sistema y la información'),
  ('nist_800_53', 'SI-4', 'Seguimiento del sistema', 'Integridad del sistema y la información'),
  ('nist_800_53', 'IR-4', 'Tratamiento de incidentes', 'Respuesta a incidentes')
on conflict (framework_code, code) do nothing;

insert into public.controls (framework_code, code, title, domain) values
  ('cmmc_l2', 'AC.L1-3.1.1', 'Limitar el acceso a usuarios autorizados', 'Control de acceso'),
  ('cmmc_l2', 'AC.L1-3.1.2', 'Limitar el acceso a las funciones permitidas', 'Control de acceso'),
  ('cmmc_l2', 'AC.L2-3.1.5', 'Aplicar el mínimo privilegio', 'Control de acceso'),
  ('cmmc_l2', 'AC.L2-3.1.12', 'Vigilar y controlar las sesiones de acceso remoto', 'Control de acceso'),
  ('cmmc_l2', 'AC.L2-3.1.14', 'Encaminar el acceso remoto por puntos de control gestionados', 'Control de acceso'),
  ('cmmc_l2', 'AU.L2-3.3.1', 'Crear y conservar registros de auditoría', 'Auditoría'),
  ('cmmc_l2', 'AU.L2-3.3.2', 'Trazar las acciones hasta un usuario concreto', 'Auditoría'),
  ('cmmc_l2', 'AU.L2-3.3.4', 'Alertar ante fallos del proceso de registro', 'Auditoría'),
  ('cmmc_l2', 'AU.L2-3.3.7', 'Sincronizar los relojes de los sistemas', 'Auditoría'),
  ('cmmc_l2', 'CM.L2-3.4.1', 'Mantener configuraciones de referencia', 'Gestión de configuración'),
  ('cmmc_l2', 'CM.L2-3.4.6', 'Aplicar el principio de funcionalidad mínima', 'Gestión de configuración'),
  ('cmmc_l2', 'CM.L2-3.4.7', 'Restringir programas, funciones y servicios no esenciales', 'Gestión de configuración'),
  ('cmmc_l2', 'IA.L2-3.5.3', 'Usar autenticación multifactor', 'Identificación y autenticación'),
  ('cmmc_l2', 'IA.L2-3.5.7', 'Exigir complejidad mínima en las contraseñas', 'Identificación y autenticación'),
  ('cmmc_l2', 'IR.L2-3.6.1', 'Establecer capacidad de tratamiento de incidentes', 'Respuesta a incidentes'),
  ('cmmc_l2', 'RA.L2-3.11.2', 'Buscar vulnerabilidades periódicamente', 'Evaluación de riesgos'),
  ('cmmc_l2', 'SC.L1-3.13.1', 'Vigilar y proteger las comunicaciones en los límites', 'Protección de sistemas'),
  ('cmmc_l2', 'SC.L2-3.13.8', 'Cifrar la información en tránsito', 'Protección de sistemas'),
  ('cmmc_l2', 'SC.L2-3.13.10', 'Gestionar las claves criptográficas', 'Protección de sistemas'),
  ('cmmc_l2', 'SI.L1-3.14.1', 'Corregir los fallos a tiempo', 'Integridad del sistema'),
  ('cmmc_l2', 'SI.L1-3.14.2', 'Proteger contra código malicioso', 'Integridad del sistema'),
  ('cmmc_l2', 'SI.L1-3.14.4', 'Actualizar los mecanismos de protección', 'Integridad del sistema'),
  ('cmmc_l2', 'SI.L2-3.14.6', 'Vigilar el sistema y el tráfico de comunicaciones', 'Integridad del sistema')
on conflict (framework_code, code) do nothing;

-- Mapeo regla → control. Solo lo que la regla mide de verdad.
insert into public.rule_controls (rule_code, framework_code, control_code) values
  ('FW-001', 'nist_800_53', 'AC-17'), ('FW-001', 'nist_800_53', 'SC-7'),
  ('FW-002', 'nist_800_53', 'IA-2'), ('FW-002', 'nist_800_53', 'IA-2(1)'),
  ('FW-003', 'nist_800_53', 'AC-17'), ('FW-003', 'nist_800_53', 'SC-7'),
  ('FW-004', 'nist_800_53', 'AC-6'),
  ('FW-005', 'nist_800_53', 'SI-2'), ('FW-005', 'nist_800_53', 'SA-22'), ('FW-005', 'nist_800_53', 'RA-5'),
  ('FW-006', 'nist_800_53', 'AC-4'), ('FW-006', 'nist_800_53', 'SC-7'),
  ('FW-007', 'nist_800_53', 'CM-7'),
  ('FW-008', 'nist_800_53', 'AU-2'), ('FW-008', 'nist_800_53', 'AU-12'),
  ('FW-009', 'nist_800_53', 'SI-3'), ('FW-009', 'nist_800_53', 'SI-4'),
  ('FW-010', 'nist_800_53', 'SC-7'), ('FW-010', 'nist_800_53', 'AC-4'),
  ('FW-011', 'nist_800_53', 'IA-2(1)'), ('FW-011', 'nist_800_53', 'AC-17'),
  ('FW-012', 'nist_800_53', 'SC-8'), ('FW-012', 'nist_800_53', 'SC-13'),
  ('FW-013', 'nist_800_53', 'SC-12'), ('FW-013', 'nist_800_53', 'SC-17'),
  ('FW-014', 'nist_800_53', 'IA-5'), ('FW-014', 'nist_800_53', 'CM-6'),
  ('FW-015', 'nist_800_53', 'AU-8'),
  ('FW-016', 'nist_800_53', 'SI-3'), ('FW-016', 'nist_800_53', 'SA-22'),
  ('FW-017', 'nist_800_53', 'AU-9(2)'),
  ('FW-018', 'nist_800_53', 'CP-10'),
  ('FW-019', 'nist_800_53', 'AU-5'),
  ('FW-020', 'nist_800_53', 'AC-4'), ('FW-020', 'nist_800_53', 'SC-7'),
  ('OP-001', 'nist_800_53', 'CA-7'), ('OP-001', 'nist_800_53', 'CM-7'),
  ('OP-002', 'nist_800_53', 'IR-4'), ('OP-002', 'nist_800_53', 'AU-6'),
  ('OP-003', 'nist_800_53', 'AU-11'),
  ('OP-004', 'nist_800_53', 'AU-3')
on conflict do nothing;

insert into public.rule_controls (rule_code, framework_code, control_code) values
  ('FW-001', 'cmmc_l2', 'AC.L2-3.1.14'), ('FW-001', 'cmmc_l2', 'SC.L1-3.13.1'),
  ('FW-002', 'cmmc_l2', 'IA.L2-3.5.3'),
  ('FW-003', 'cmmc_l2', 'AC.L2-3.1.12'), ('FW-003', 'cmmc_l2', 'AC.L1-3.1.1'),
  ('FW-004', 'cmmc_l2', 'AC.L2-3.1.5'),
  ('FW-005', 'cmmc_l2', 'SI.L1-3.14.1'), ('FW-005', 'cmmc_l2', 'RA.L2-3.11.2'),
  ('FW-006', 'cmmc_l2', 'SC.L1-3.13.1'), ('FW-006', 'cmmc_l2', 'AC.L1-3.1.2'),
  ('FW-007', 'cmmc_l2', 'CM.L2-3.4.7'),
  ('FW-008', 'cmmc_l2', 'AU.L2-3.3.1'),
  ('FW-009', 'cmmc_l2', 'SI.L1-3.14.2'), ('FW-009', 'cmmc_l2', 'SI.L2-3.14.6'),
  ('FW-010', 'cmmc_l2', 'SC.L1-3.13.1'),
  ('FW-011', 'cmmc_l2', 'IA.L2-3.5.3'), ('FW-011', 'cmmc_l2', 'AC.L2-3.1.12'),
  ('FW-012', 'cmmc_l2', 'SC.L2-3.13.8'),
  ('FW-013', 'cmmc_l2', 'SC.L2-3.13.10'),
  ('FW-014', 'cmmc_l2', 'IA.L2-3.5.7'), ('FW-014', 'cmmc_l2', 'CM.L2-3.4.6'),
  ('FW-015', 'cmmc_l2', 'AU.L2-3.3.7'),
  ('FW-016', 'cmmc_l2', 'SI.L1-3.14.4'),
  ('FW-017', 'cmmc_l2', 'AU.L2-3.3.1'),
  ('FW-018', 'cmmc_l2', 'CM.L2-3.4.1'),
  ('FW-019', 'cmmc_l2', 'AU.L2-3.3.4'),
  ('FW-020', 'cmmc_l2', 'SC.L1-3.13.1'),
  ('OP-001', 'cmmc_l2', 'CM.L2-3.4.1'),
  ('OP-002', 'cmmc_l2', 'IR.L2-3.6.1'),
  ('OP-003', 'cmmc_l2', 'AU.L2-3.3.1'),
  ('OP-004', 'cmmc_l2', 'AU.L2-3.3.2')
on conflict do nothing;
