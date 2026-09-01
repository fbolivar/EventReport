/**
 * Catálogo genérico de reglas (docs/diseno-tecnico.md §7).
 * Es el mismo contenido que carga `supabase/seed`: las tarjetas del portal, la
 * landing y el informe leen de aquí hasta que la BD esté conectada.
 */
import type { FindingRule } from "@eventreport/schema";

export const FINDING_RULES: FindingRule[] = [
  {
    code: "FW-001",
    severity: "critical",
    domain: "access",
    title: "Administración expuesta en interfaz WAN",
    description:
      "La administración por HTTPS o SSH responde en una interfaz conectada a internet. Cualquiera puede intentar autenticarse contra el equipo que protege la red.",
  },
  {
    code: "FW-002",
    severity: "high",
    domain: "access",
    title: "Administrador sin segundo factor",
    description:
      "Una cuenta administrativa entra solo con contraseña. Una contraseña filtrada basta para reconfigurar el firewall.",
  },
  {
    code: "FW-003",
    severity: "high",
    domain: "access",
    title: "Administrador sin restricción de hosts de confianza",
    description:
      "La cuenta puede autenticarse desde cualquier dirección. Limitarla a las IP de administración reduce la superficie de ataque sin costo.",
  },
  {
    code: "FW-004",
    severity: "medium",
    domain: "access",
    title: "Más de dos administradores con perfil total",
    description:
      "Varias cuentas con permisos completos diluyen la trazabilidad de los cambios y amplían el impacto de una credencial comprometida.",
  },
  {
    code: "FW-005",
    severity: "high",
    domain: "maintenance",
    title: "Firmware fuera de soporte o con vulnerabilidad conocida",
    description:
      "La versión instalada ya no recibe parches o tiene un CVE publicado con explotación conocida.",
  },
  {
    code: "FW-006",
    severity: "critical",
    domain: "policy",
    title: "Política de origen y destino abiertos con todos los servicios",
    description:
      "Una regla permite cualquier origen hacia cualquier destino en cualquier puerto. El firewall deja de filtrar en ese punto.",
  },
  {
    code: "FW-007",
    severity: "medium",
    domain: "policy",
    title: "Políticas sin tráfico en 90 días",
    description:
      "Reglas que nadie usa siguen abiertas. Cada una es una puerta que hay que revisar en la próxima auditoría.",
  },
  {
    code: "FW-008",
    severity: "medium",
    domain: "logging",
    title: "Políticas permitidas sin registro",
    description:
      "El tráfico que estas reglas permiten no queda en ningún log: no hay forma de reconstruir un incidente que pasó por ahí.",
  },
  {
    code: "FW-009",
    severity: "medium",
    domain: "policy",
    title: "Políticas de salida sin inspección",
    description:
      "Tráfico saliente sin IPS, antivirus, filtrado web ni control de aplicaciones. Las licencias están pagadas y sin usar.",
  },
  {
    code: "FW-010",
    severity: "high",
    domain: "policy",
    title: "NAT entrante hacia administración o bases de datos",
    description:
      "Hay un puerto publicado desde internet hacia un servicio de administración o una base de datos interna.",
  },
  {
    code: "FW-011",
    severity: "high",
    domain: "vpn",
    title: "VPN de acceso remoto sin segundo factor",
    description:
      "Los usuarios entran a la red interna con usuario y contraseña. Es el vector de ransomware más común en PYMES.",
  },
  {
    code: "FW-012",
    severity: "medium",
    domain: "crypto",
    title: "VPN con cifrado obsoleto",
    description:
      "TLS por debajo de 1.2, o IPsec con IKEv1, DES/3DES o grupos Diffie-Hellman de 1024 bits o menos.",
  },
  {
    code: "FW-013",
    severity: "medium",
    domain: "crypto",
    title: "Certificado por vencer o autofirmado en portal público",
    description:
      "El portal que ven los usuarios presenta un certificado que el navegador no valida, o que caduca pronto.",
  },
  {
    code: "FW-014",
    severity: "low",
    domain: "access",
    title: "SNMP v1/v2c con comunidad por defecto",
    description:
      "La comunidad de solo lectura sigue en el valor de fábrica y viaja sin cifrar. Expone el inventario de la red.",
  },
  {
    code: "FW-015",
    severity: "low",
    domain: "logging",
    title: "Sin NTP o con desfase de reloj",
    description:
      "El reloj del firewall se aparta más de 60 segundos. Los tiempos de los logs dejan de servir como evidencia.",
  },
  {
    code: "FW-016",
    severity: "medium",
    domain: "maintenance",
    title: "Licencias de seguridad vencidas o por vencer",
    description:
      "Las suscripciones de IPS, antivirus o filtrado web están vencidas o caducan pronto: las firmas dejan de actualizarse.",
  },
  {
    code: "FW-017",
    severity: "low",
    domain: "logging",
    title: "Sin destino de syslog adicional al colector",
    description:
      "Solo hay una copia de los registros. Los marcos que exigen retención larga piden un segundo destino.",
  },
  {
    code: "FW-018",
    severity: "medium",
    domain: "maintenance",
    title: "Alta disponibilidad degradada",
    description:
      "El clúster está configurado pero uno de los miembros no responde o no sincroniza. La redundancia no existe hoy.",
  },
  {
    code: "FW-019",
    severity: "medium",
    domain: "logging",
    title: "Pérdida de eventos en el colector",
    description:
      "Más del 1 % de las líneas de syslog se descartan. Los conteos del informe de actividad quedan por debajo de la realidad.",
  },
  {
    code: "FW-020",
    severity: "high",
    domain: "policy",
    title: "Tráfico permitido hacia países de alto riesgo",
    description:
      "Hay tráfico saliente autorizado hacia regiones sin relación con la operación del negocio y sin justificación registrada.",
  },
  {
    code: "OP-001",
    severity: "medium",
    domain: "policy",
    title: "Sin revisión de reglas en los últimos seis meses",
    description:
      "No se ha generado ni aprobado un informe de hardening en el período que exige el marco seleccionado.",
  },
  {
    code: "OP-002",
    severity: "medium",
    domain: "logging",
    title: "Eventos críticos sin tratamiento en siete días",
    description:
      "Hay alertas de alta severidad que nadie marcó como atendidas. Un evento sin cierre no es evidencia de control.",
  },
  {
    code: "OP-003",
    severity: "high",
    domain: "logging",
    title: "Retención de registros inferior a la exigida",
    description:
      "La retención combinada de bóveda local y agregados en la nube no alcanza lo que pide el marco activo.",
  },
  {
    code: "OP-004",
    severity: "low",
    domain: "logging",
    title: "Cambios de configuración sin actor identificado",
    description:
      "Hubo cambios cuya autoría no aparece en el syslog de administración: no se puede saber quién los hizo.",
  },
];

export const RULES_BY_CODE: Record<string, FindingRule> = Object.fromEntries(
  FINDING_RULES.map((rule) => [rule.code, rule]),
);
