/**
 * Hallazgos del tenant de ejemplo: 14 abiertos y 3 resueltos, repartidos entre
 * los dos firewalls. Pasan por los mismos tipos que usará Supabase, así que
 * conectar la BD no toca ningún componente.
 */
import type { Finding, RuleRemediation, Severity } from "@eventreport/schema";

export const DEMO_FINDINGS: Finding[] = [
  {
    id: "fnd-001",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-001",
    assetKey: "wan1",
    assetLabel: "Interfaz wan1",
    status: "open",
    severity: "critical",
    firstSeen: "2026-06-14T09:12:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Interfaz", value: "wan1 · 190.85.44.12" },
      { label: "Protocolos habilitados", value: "https, ssh, ping" },
      { label: "Intentos de acceso en 30 días", value: "4.812" },
    ],
  },
  {
    id: "fnd-002",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-011",
    assetKey: "sslvpn",
    assetLabel: "Portal SSL-VPN",
    status: "open",
    severity: "high",
    firstSeen: "2026-06-14T09:12:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Tipo", value: "ssl · tls 1.2" },
      { label: "Usuarios habilitados", value: "38" },
      { label: "Segundo factor", value: "no configurado" },
    ],
  },
  {
    id: "fnd-003",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-006",
    assetKey: "policy:3",
    assetLabel: "Política 3 — Servidores",
    status: "open",
    severity: "critical",
    firstSeen: "2026-07-19T18:03:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Política", value: "id 3 · SRV_ANY" },
      { label: "Origen y destino", value: "any → any" },
      { label: "Servicios", value: "ALL" },
      { label: "Creada por", value: 'admin desde 10.10.0.34' },
    ],
  },
  {
    id: "fnd-004",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-002",
    assetKey: "admin:soporte",
    assetLabel: "Cuenta soporte",
    status: "open",
    severity: "high",
    firstSeen: "2026-05-18T14:30:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Cuenta", value: "soporte · perfil super_admin" },
      { label: "Último ingreso", value: "2026-08-29 08:11" },
      { label: "Segundo factor", value: "deshabilitado" },
    ],
  },
  {
    id: "fnd-005",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-010",
    assetKey: "nat:vip-rdp",
    assetLabel: "NAT entrante a escritorio remoto",
    status: "open",
    severity: "high",
    firstSeen: "2026-06-30T11:47:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Publicado", value: "190.85.44.12:3389 → 10.10.0.42:3389" },
      { label: "Origen permitido", value: "0.0.0.0/0" },
      { label: "Intentos fallidos en 30 días", value: "27.940" },
    ],
  },
  {
    id: "fnd-006",
    firewallId: "fw-xgs-01",
    ruleCode: "FW-005",
    assetKey: "firmware",
    assetLabel: "Firmware del equipo",
    status: "open",
    severity: "high",
    firstSeen: "2026-08-02T05:00:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Versión instalada", value: "19.5.3 MR-3" },
      { label: "CVE conocido", value: "CVE-2026-3199 · 8.8" },
      { label: "Versión con parche", value: "20.0.2 MR-2" },
    ],
  },
  {
    id: "fnd-007",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-008",
    assetKey: "policy:14",
    assetLabel: "Política 14 — LAN a internet",
    status: "open",
    severity: "medium",
    firstSeen: "2026-07-02T11:40:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Política", value: "id 14 · LAN_to_WAN" },
      { label: "Registro", value: "log=none" },
      { label: "Sesiones en 30 días", value: "1.204.881" },
    ],
  },
  {
    id: "fnd-008",
    firewallId: "fw-xgs-01",
    ruleCode: "FW-009",
    assetKey: "policy:7",
    assetLabel: "Regla 7 — Planta a internet",
    status: "open",
    severity: "medium",
    firstSeen: "2026-06-21T09:00:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Regla", value: "id 7 · PLANTA_OUT" },
      { label: "Perfiles aplicados", value: "ninguno" },
      { label: "Tráfico en 30 días", value: "412 GB" },
    ],
  },
  {
    id: "fnd-009",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-007",
    assetKey: "policies:stale",
    assetLabel: "11 políticas sin tráfico",
    status: "open",
    severity: "medium",
    firstSeen: "2026-05-18T14:30:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Políticas", value: "id 8, 12, 19, 21, 22, 27, 31, 33, 36, 40, 44" },
      { label: "Último tráfico", value: "sin registros en 90 días" },
    ],
  },
  {
    id: "fnd-010",
    firewallId: "fw-xgs-01",
    ruleCode: "FW-016",
    assetKey: "license:webprotection",
    assetLabel: "Licencia de protección web",
    status: "open",
    severity: "medium",
    firstSeen: "2026-08-14T00:00:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Módulo", value: "Web Protection" },
      { label: "Vence", value: "2026-09-22" },
      { label: "Estado", value: "expiring" },
    ],
  },
  {
    id: "fnd-011",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-012",
    assetKey: "ipsec:sucursal",
    assetLabel: "Túnel IPsec a la planta",
    status: "open",
    severity: "medium",
    firstSeen: "2026-05-18T14:30:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Túnel", value: "VPN_MDE · peer 200.31.7.88" },
      { label: "Propuesta", value: "IKEv1 · 3DES · SHA1 · DH group 2" },
    ],
  },
  {
    id: "fnd-012",
    firewallId: "fw-fgt-01",
    ruleCode: "OP-002",
    assetKey: "critical-events",
    assetLabel: "Eventos críticos sin cerrar",
    status: "open",
    severity: "medium",
    firstSeen: "2026-08-21T10:00:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Eventos sin tratamiento", value: "6" },
      { label: "Más antiguo", value: "2026-08-21 10:42" },
    ],
  },
  {
    id: "fnd-013",
    firewallId: "fw-xgs-01",
    ruleCode: "FW-014",
    assetKey: "snmp",
    assetLabel: "Servicio SNMP",
    status: "open",
    severity: "low",
    firstSeen: "2026-08-03T15:05:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Versión", value: "v2c" },
      { label: "Comunidad", value: "public" },
    ],
  },
  {
    id: "fnd-014",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-017",
    assetKey: "syslog-targets",
    assetLabel: "Destinos de registro",
    status: "open",
    severity: "low",
    firstSeen: "2026-05-18T14:30:00Z",
    lastSeen: "2026-08-31T02:00:00Z",
    evidence: [
      { label: "Destinos configurados", value: "10.10.0.9 (colector)" },
      { label: "Destino secundario", value: "ninguno" },
    ],
  },
  {
    id: "fnd-015",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-013",
    assetKey: "cert:portal",
    assetLabel: "Certificado del portal",
    status: "resolved",
    severity: "medium",
    firstSeen: "2026-05-20T08:00:00Z",
    lastSeen: "2026-08-11T06:00:00Z",
    resolvedAt: "2026-08-12T14:22:00Z",
    evidence: [
      { label: "Emisor", value: "Let's Encrypt R11" },
      { label: "Vence", value: "2026-11-09" },
    ],
  },
  {
    id: "fnd-016",
    firewallId: "fw-fgt-01",
    ruleCode: "FW-003",
    assetKey: "admin:admin",
    assetLabel: "Cuenta admin",
    status: "resolved",
    severity: "high",
    firstSeen: "2026-05-18T14:30:00Z",
    lastSeen: "2026-07-27T09:00:00Z",
    resolvedAt: "2026-07-28T15:10:00Z",
    evidence: [{ label: "Hosts de confianza", value: "10.10.0.0/24, 190.85.44.8/29" }],
  },
  {
    id: "fnd-017",
    firewallId: "fw-xgs-01",
    ruleCode: "FW-015",
    assetKey: "ntp",
    assetLabel: "Sincronización de reloj",
    status: "resolved",
    severity: "low",
    firstSeen: "2026-06-05T00:00:00Z",
    lastSeen: "2026-08-05T00:00:00Z",
    resolvedAt: "2026-08-06T11:00:00Z",
    evidence: [
      { label: "Servidores NTP", value: "co.pool.ntp.org, 1.co.pool.ntp.org" },
      { label: "Desfase actual", value: "3 s" },
    ],
  },
];

export const OPEN_FINDINGS = DEMO_FINDINGS.filter((finding) => finding.status === "open");

export function findingById(id: string): Finding | undefined {
  return DEMO_FINDINGS.find((finding) => finding.id === id);
}

export function openCountsBySeverity(): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of OPEN_FINDINGS) counts[finding.severity] += 1;
  return counts;
}

/** `Remediation(ruleCode)` del adaptador: pasos concretos de la marca (§4.3). */
export const DEMO_REMEDIATIONS: RuleRemediation[] = [
  {
    ruleCode: "FW-001",
    brand: "fortigate",
    steps: [
      "Entra a Network › Interfaces y abre la interfaz WAN señalada en el hallazgo.",
      "En Administrative Access desmarca HTTPS, SSH y PING.",
      "Si necesitas administrar desde fuera, deja solo HTTPS y agrega las IP de administración en System › Admin › Trusted Hosts.",
      "Confirma por CLI: config system interface, edit <interfaz>, unset allowaccess.",
    ],
  },
  {
    ruleCode: "FW-011",
    brand: "fortigate",
    steps: [
      "Crea el servidor de segundo factor en User & Authentication › FortiToken o RADIUS.",
      "Asigna el token a cada usuario del grupo de VPN.",
      "En VPN › SSL-VPN Settings exige el grupo con MFA en Authentication/Portal Mapping.",
      "Prueba con una cuenta antes de cerrar el acceso al resto.",
    ],
  },
  {
    ruleCode: "FW-006",
    brand: "fortigate",
    steps: [
      "Abre Policy & Objects › Firewall Policy y localiza la política señalada en el hallazgo.",
      "Reemplaza el origen y el destino any por los grupos de direcciones reales.",
      "Cambia el servicio ALL por los puertos que la aplicación necesita.",
      "Deja la política deshabilitada un día y revisa el contador de aciertos antes de borrarla.",
    ],
  },
  {
    ruleCode: "FW-009",
    brand: "sophos_xg",
    steps: [
      "Entra a Rules and policies › Firewall rules y abre la regla señalada en el hallazgo.",
      "En Security features activa IPS, protección web y control de aplicaciones.",
      "Selecciona los perfiles predeterminados de tu política de salida.",
      "Verifica el consumo de CPU la primera hora: la inspección agrega carga.",
    ],
  },
  {
    ruleCode: "FW-014",
    brand: "sophos_xg",
    steps: [
      "Ve a Administration › SNMP y elimina la comunidad public.",
      "Crea un usuario SNMPv3 con autenticación SHA y cifrado AES.",
      "Restringe el acceso a la IP del sistema de monitoreo.",
    ],
  },
  {
    ruleCode: "FW-002",
    brand: "fortigate",
    steps: [
      "Entra a System > Administrators y abre cada cuenta con perfil super_admin.",
      "Activa Two-factor Authentication y asigna un FortiToken (móvil o físico) o un servidor RADIUS con MFA.",
      "Registra el token con el administrador presente y pídele que inicie sesión antes de cerrar la ventana.",
      "Verifica por CLI: config system admin, show, y confirma que two-factor no quede en disable.",
    ],
  },
  {
    ruleCode: "FW-003",
    brand: "fortigate",
    steps: [
      "Entra a System > Administrators y abre la cuenta señalada en el hallazgo.",
      "Activa Restrict login to trusted hosts y agrega las redes desde donde se administra, con máscara exacta.",
      "Deja siempre al menos un rango válido: si los tres quedan en 0.0.0.0/0 la restricción no existe.",
      "Prueba desde una IP fuera del rango: la sesión debe rechazarse antes de pedir contraseña.",
    ],
  },
  {
    ruleCode: "FW-004",
    brand: "fortigate",
    steps: [
      "Revisa System > Administrators y decide quién necesita de verdad perfil super_admin.",
      "Crea perfiles acotados en System > Admin Profiles, por ejemplo solo lectura o solo políticas.",
      "Reasigna a los administradores sobrantes al perfil acotado; no borres cuentas, cámbiales el perfil.",
      "Deja constancia de quién aprobó cada perfil total: es la evidencia que pide la auditoría.",
    ],
  },
  {
    ruleCode: "FW-005",
    brand: "fortigate",
    steps: [
      "Consulta la versión instalada en Dashboard > Status y compárala con el ciclo de vida publicado por Fortinet.",
      "Descarga la versión estable recomendada para tu modelo desde el portal de soporte de Fortinet.",
      "Respalda la configuración en System > Configuration > Backup y programa ventana de mantenimiento.",
      "Sigue la ruta de actualización oficial: saltar versiones puede corromper la configuración.",
    ],
  },
  {
    ruleCode: "FW-007",
    brand: "fortigate",
    steps: [
      "Abre Policy & Objects > Firewall Policy y activa la columna Hit Count con rango de 90 días.",
      "Deshabilita, sin borrar, las políticas sin aciertos y anota la fecha.",
      "Espera al menos dos semanas por si aparece un proceso mensual que las necesitaba.",
      "Borra las que sigan sin uso y guarda el respaldo previo por si hay que revertir.",
    ],
  },
  {
    ruleCode: "FW-008",
    brand: "fortigate",
    steps: [
      "Abre Policy & Objects > Firewall Policy y filtra las políticas con acción accept.",
      "En cada una activa Log Allowed Traffic en All Sessions.",
      "Si el equipo sufre por volumen, deja Security Events solo en políticas internas de bajo riesgo, nunca en las de salida a internet.",
      "Confirma en Log & Report que los eventos llegan al colector después del cambio.",
    ],
  },
  {
    ruleCode: "FW-009",
    brand: "fortigate",
    steps: [
      "Abre Policy & Objects > Firewall Policy y localiza las políticas de salida a internet.",
      "En Security Profiles activa AntiVirus, Web Filter, Application Control e IPS con los perfiles de tu política.",
      "Activa inspección SSL: certificate-inspection como mínimo, deep-inspection si ya distribuiste el certificado.",
      "Revisa CPU y memoria la primera hora: la inspección agrega carga real al equipo.",
    ],
  },
  {
    ruleCode: "FW-010",
    brand: "fortigate",
    steps: [
      "Abre Policy & Objects > Virtual IPs y revisa cada VIP publicada hacia internet.",
      "Elimina las que publiquen RDP 3389, SSH 22, SMB 445 o puertos de base de datos.",
      "Si el acceso es necesario, sustitúyelo por VPN con segundo factor en lugar de publicar el puerto.",
      "Para lo que deba seguir publicado, limita Source Address a las IP de origen conocidas.",
    ],
  },
  {
    ruleCode: "FW-012",
    brand: "fortigate",
    steps: [
      "Abre VPN > IPsec Tunnels y edita la fase 1 y la fase 2 del túnel señalado.",
      "Retira DES, 3DES, MD5 y SHA1; deja AES-256 con SHA-256 o superior y DH group 14 o mayor.",
      "Coordina el cambio con el extremo remoto: el túnel cae hasta que ambos lados coincidan.",
      "Para SSL-VPN, en VPN > SSL-VPN Settings fija Algorithm en High y deshabilita TLS 1.0 y 1.1.",
    ],
  },
  {
    ruleCode: "FW-013",
    brand: "fortigate",
    steps: [
      "Revisa System > Certificates y localiza el certificado del portal señalado.",
      "Emite o renueva un certificado de una autoridad pública para el nombre que usan los usuarios.",
      "Impórtalo y asígnalo en VPN > SSL-VPN Settings o en la VIP correspondiente.",
      "Programa el recordatorio de renovación: un certificado vencido deja a la gente fuera sin aviso.",
    ],
  },
  {
    ruleCode: "FW-014",
    brand: "fortigate",
    steps: [
      "Entra a System > SNMP y elimina la comunidad public o private.",
      "Crea un usuario SNMP v3 con autenticación SHA y cifrado AES.",
      "Restringe Hosts a la IP del sistema de monitoreo.",
      "Actualiza el monitoreo con las credenciales nuevas antes de borrar las viejas.",
    ],
  },
  {
    ruleCode: "FW-015",
    brand: "fortigate",
    steps: [
      "Entra a System > Settings > System Time y selecciona Synchronize with NTP Server.",
      "Usa al menos dos servidores; si tienes controlador de dominio, apunta al mismo que usan los servidores.",
      "Fija la zona horaria correcta: un log con hora equivocada no sirve como evidencia.",
      "Confirma por CLI: diagnose sys ntp status.",
    ],
  },
  {
    ruleCode: "FW-016",
    brand: "fortigate",
    steps: [
      "Revisa Dashboard > Licenses y anota qué servicio está vencido o por vencer.",
      "Renueva con el canal antes de la fecha: al vencer, IPS y antivirus dejan de actualizar firmas.",
      "Aplica la licencia en System > FortiGuard y fuerza Update Now.",
      "Verifica que la fecha de las firmas avance después de la renovación.",
    ],
  },
  {
    ruleCode: "FW-017",
    brand: "fortigate",
    steps: [
      "Entra a Log & Report > Log Settings y agrega un segundo destino syslog.",
      "Apunta ese destino a un almacenamiento fuera del firewall y fuera del colector.",
      "Envía en formato CEF o syslog estándar para que otro sistema pueda leerlo.",
      "Comprueba que llegan eventos a ambos destinos antes de dar por cerrado el hallazgo.",
    ],
  },
  {
    ruleCode: "FW-018",
    brand: "fortigate",
    steps: [
      "Revisa System > HA y compara el estado de los dos miembros.",
      "Identifica si la degradación viene del enlace de heartbeat, de firmware distinto o de una sincronización fallida.",
      "Iguala el firmware de ambos equipos: la HA no sincroniza entre versiones distintas.",
      "Fuerza la sincronización por CLI: diagnose sys ha checksum recalculate.",
    ],
  },
  {
    ruleCode: "FW-019",
    brand: "fortigate",
    steps: [
      "Revisa en Log & Report si el equipo está descartando eventos por volumen.",
      "Baja el nivel de detalle de las políticas más ruidosas antes de ampliar el colector.",
      "Verifica que el enlace hacia el colector no esté saturado ni bloqueado por otra política.",
      "Si la pérdida persiste, el colector necesita más disco o más CPU: revisa su dimensionamiento.",
    ],
  },
  {
    ruleCode: "FW-020",
    brand: "fortigate",
    steps: [
      "Abre Policy & Objects > Addresses y crea grupos geográficos con los países que no usa tu operación.",
      "Agrega una política de denegación por encima de las de salida con esos grupos como destino.",
      "Activa el registro en esa política: lo bloqueado es la evidencia de que sirve.",
      "Revisa una semana después si alguien legítimo quedó bloqueado, antes de ampliar la lista.",
    ],
  },
  {
    ruleCode: "OP-001",
    brand: "fortigate",
    steps: [
      "Programa la revisión de reglas como tarea recurrente cada seis meses.",
      "Genera el informe de hardening de EventReport como punto de partida de la revisión.",
      "Documenta qué se revisó, qué se cambió y quién lo aprobó: eso es lo que pide el control.",
      "Cierra la revisión con el respaldo de configuración del día.",
    ],
  },
  {
    ruleCode: "OP-002",
    brand: "fortigate",
    steps: [
      "Abre la lista de eventos críticos en el portal y revisa los que llevan más de siete días.",
      "Asigna un responsable a cada uno; sin responsable el evento no se cierra.",
      "Marca el evento como atendido dejando escrito qué se hizo, aunque la conclusión sea que era legítimo.",
      "Si el evento se repite, conviértelo en una regla o en una alerta, no en una revisión manual más.",
    ],
  },
  {
    ruleCode: "OP-003",
    brand: "fortigate",
    steps: [
      "Compara la retención actual con la que exige tu marco: PCI DSS pide un año, con tres meses en línea.",
      "Sube los días de bóveda del colector en Ajustes si el disco lo permite.",
      "Si no alcanza, agrega almacenamiento al colector antes que reducir el detalle de los registros.",
      "Deja escrito el cálculo de retención: el auditor pregunta por qué ese número.",
    ],
  },
  {
    ruleCode: "OP-004",
    brand: "fortigate",
    steps: [
      "Entra a Log & Report > Log Settings y confirma que el registro de eventos de administración esté activo.",
      "Prohíbe las cuentas compartidas: si todos entran como admin, ningún cambio tiene autor.",
      "Crea una cuenta nominal por persona y desactiva la genérica.",
      "Verifica en el log que los cambios nuevos traen usuario e IP de origen.",
    ],
  },
  {
    ruleCode: "FW-001",
    brand: "sophos_xg",
    steps: [
      "Entra a Administration > Device access y revisa la columna WAN.",
      "Desmarca HTTPS, SSH y Ping para la zona WAN.",
      "Si necesitas administración remota, deja HTTPS y agrega las IP en Local service ACL exception rule.",
      "Prueba desde fuera que el puerto ya no responde antes de cerrar el hallazgo.",
    ],
  },
  {
    ruleCode: "FW-002",
    brand: "sophos_xg",
    steps: [
      "Entra a Authentication > One-time password y activa el servicio.",
      "Marca a los administradores en Administration > Device access para exigir OTP.",
      "Entrega el código QR a cada persona y verifica un inicio de sesión antes de forzarlo a todos.",
      "Deja una cuenta de emergencia documentada y guardada fuera del equipo.",
    ],
  },
  {
    ruleCode: "FW-003",
    brand: "sophos_xg",
    steps: [
      "Entra a Administration > Device access > Local service ACL exception rule.",
      "Crea la excepción con las redes desde donde se administra y quita el acceso general.",
      "Ordena las reglas: la de denegación amplia debe quedar debajo de la excepción.",
      "Prueba desde una IP no autorizada: debe rechazar la conexión.",
    ],
  },
  {
    ruleCode: "FW-004",
    brand: "sophos_xg",
    steps: [
      "Revisa Administration > Device access > Profiles y quién tiene perfil Administrator.",
      "Crea perfiles acotados con solo los módulos que cada rol necesita.",
      "Reasigna las cuentas sobrantes al perfil acotado en Authentication > Users.",
      "Documenta quién aprobó cada perfil total.",
    ],
  },
  {
    ruleCode: "FW-005",
    brand: "sophos_xg",
    steps: [
      "Revisa la versión en Control center y compárala con el ciclo de vida publicado por Sophos.",
      "Descarga la versión recomendada desde el portal de Sophos para tu modelo.",
      "Respalda la configuración en Backup & firmware > Backup & restore antes de actualizar.",
      "Actualiza en ventana de mantenimiento y confirma que las suscripciones sigan activas después.",
    ],
  },
  {
    ruleCode: "FW-006",
    brand: "sophos_xg",
    steps: [
      "Abre Rules and policies > Firewall rules y localiza la regla señalada.",
      "Reemplaza las zonas y redes Any por los objetos reales de origen y destino.",
      "Cambia el servicio Any por los puertos que la aplicación usa.",
      "Desactiva la regla un día y revisa los contadores antes de eliminarla.",
    ],
  },
  {
    ruleCode: "FW-007",
    brand: "sophos_xg",
    steps: [
      "En Rules and policies > Firewall rules activa la columna de uso y ordena por última coincidencia.",
      "Desactiva las reglas sin tráfico en 90 días y anota la fecha.",
      "Espera dos semanas por si existe un proceso mensual.",
      "Elimina las que sigan sin uso, con respaldo previo.",
    ],
  },
  {
    ruleCode: "FW-008",
    brand: "sophos_xg",
    steps: [
      "Abre Rules and policies > Firewall rules y filtra las reglas con acción Accept.",
      "Activa Log firewall traffic en cada una.",
      "Confirma en Reports que el tráfico permitido aparece después del cambio.",
      "Verifica que los eventos también lleguen al colector.",
    ],
  },
  {
    ruleCode: "FW-010",
    brand: "sophos_xg",
    steps: [
      "Revisa Rules and policies > NAT rules y las reglas DNAT publicadas.",
      "Elimina las que publiquen RDP, SSH, SMB o puertos de base de datos hacia internet.",
      "Sustituye el acceso por VPN con segundo factor.",
      "Para lo que siga publicado, limita el origen a direcciones conocidas.",
    ],
  },
  {
    ruleCode: "FW-011",
    brand: "sophos_xg",
    steps: [
      "Entra a Authentication > One-time password y activa OTP para el grupo de VPN.",
      "En VPN > SSL VPN remote access asigna solo grupos con OTP exigido.",
      "Entrega los códigos y prueba con una cuenta antes de aplicarlo a todos.",
      "Revisa el log de autenticación tras el cambio.",
    ],
  },
  {
    ruleCode: "FW-012",
    brand: "sophos_xg",
    steps: [
      "Abre VPN > IPsec policies y edita la política del túnel señalado.",
      "Quita DES, 3DES, MD5 y SHA1; deja AES-256 con SHA-256 y DH group 14 o superior.",
      "Coordina con el extremo remoto: el túnel cae hasta que ambos coincidan.",
      "Para SSL VPN, deshabilita TLS 1.0 y 1.1 en la configuración del servicio.",
    ],
  },
  {
    ruleCode: "FW-013",
    brand: "sophos_xg",
    steps: [
      "Revisa Certificates > Certificates y localiza el del portal señalado.",
      "Emite o renueva con una autoridad pública para el nombre que usan los usuarios.",
      "Asígnalo en Administration > Admin and user settings o en el servicio correspondiente.",
      "Programa el aviso de renovación con un mes de anticipación.",
    ],
  },
  {
    ruleCode: "FW-015",
    brand: "sophos_xg",
    steps: [
      "Entra a Administration > Time y selecciona sincronización con servidor NTP.",
      "Configura al menos dos servidores y la zona horaria correcta.",
      "Si tienes dominio, usa el mismo servidor que los servidores internos.",
      "Confirma que la hora del log coincide con la real después del cambio.",
    ],
  },
  {
    ruleCode: "FW-016",
    brand: "sophos_xg",
    steps: [
      "Revisa Administration > Licensing y anota qué módulo está vencido o por vencer.",
      "Renueva con el canal antes de la fecha: sin suscripción, IPS y antivirus dejan de actualizar.",
      "Sincroniza la licencia desde el portal de Sophos.",
      "Verifica que la fecha de las firmas avance tras la renovación.",
    ],
  },
  {
    ruleCode: "FW-017",
    brand: "sophos_xg",
    steps: [
      "Entra a Configure > System services > Log settings y agrega un servidor syslog.",
      "Apunta el segundo destino fuera del firewall y fuera del colector.",
      "Selecciona los módulos que deben enviarse, no solo el firewall.",
      "Comprueba que llegan eventos a ambos destinos.",
    ],
  },
  {
    ruleCode: "FW-018",
    brand: "sophos_xg",
    steps: [
      "Revisa System services > High availability y el estado de los dos miembros.",
      "Confirma que el enlace dedicado de HA está activo y que el firmware coincide.",
      "Iguala versiones si difieren: la HA no sincroniza entre versiones distintas.",
      "Fuerza la sincronización y revisa el log del par.",
    ],
  },
  {
    ruleCode: "FW-019",
    brand: "sophos_xg",
    steps: [
      "Revisa si el equipo descarta eventos por volumen en Log settings.",
      "Reduce el detalle de las reglas más ruidosas antes de ampliar el colector.",
      "Verifica que el camino hacia el colector no esté saturado ni bloqueado.",
      "Si persiste, el colector necesita más disco o CPU.",
    ],
  },
  {
    ruleCode: "FW-020",
    brand: "sophos_xg",
    steps: [
      "Crea grupos de país en Hosts and services > Country group con los que no usa tu operación.",
      "Agrega una regla de denegación por encima de las de salida usando esos grupos.",
      "Activa el registro en esa regla.",
      "Revisa una semana después si alguien legítimo quedó bloqueado.",
    ],
  },
  {
    ruleCode: "OP-001",
    brand: "sophos_xg",
    steps: [
      "Programa la revisión de reglas cada seis meses como tarea recurrente.",
      "Usa el informe de hardening de EventReport como punto de partida.",
      "Documenta qué se revisó, qué cambió y quién aprobó.",
      "Cierra con el respaldo de configuración del día.",
    ],
  },
  {
    ruleCode: "OP-002",
    brand: "sophos_xg",
    steps: [
      "Revisa en el portal los eventos críticos con más de siete días.",
      "Asigna responsable a cada uno.",
      "Márcalo como atendido dejando escrito qué se hizo.",
      "Si se repite, conviértelo en regla o alerta.",
    ],
  },
  {
    ruleCode: "OP-003",
    brand: "sophos_xg",
    steps: [
      "Compara la retención actual con la que exige tu marco.",
      "Sube los días de bóveda del colector si el disco lo permite.",
      "Agrega almacenamiento antes que reducir el detalle de los registros.",
      "Deja escrito el cálculo de retención.",
    ],
  },
  {
    ruleCode: "OP-004",
    brand: "sophos_xg",
    steps: [
      "Confirma en Log settings que el registro de eventos de administración esté activo.",
      "Elimina las cuentas compartidas: sin cuenta nominal, ningún cambio tiene autor.",
      "Crea una cuenta por persona y desactiva la genérica.",
      "Verifica que los cambios nuevos traigan usuario e IP.",
    ],
  },
];

export function remediationFor(ruleCode: string, brand: string): string[] | undefined {
  return DEMO_REMEDIATIONS.find(
    (item) => item.ruleCode === ruleCode && item.brand === brand,
  )?.steps;
}
