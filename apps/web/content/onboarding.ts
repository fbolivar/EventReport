/**
 * Asistente de onboarding: cómo activar el envío de registros en cada marca
 * (§6.8 del diseño técnico). El portal sustituye {ip} por la del colector.
 */
import type { Brand } from "@eventreport/schema";

export interface BrandInstructions {
  path: string;
  transport: string;
  format: string;
  /** Comandos literales; se muestran en mono porque son del equipo. */
  commands?: string[];
  steps?: string[];
  warning?: string;
}

export const ONBOARDING_INTRO = {
  title: "Conecta un firewall",
  subtitle:
    "Tres pasos. El colector ya está instalado y esperando; falta decirle a tu equipo que le hable.",
  steps: [
    { title: "Elige la marca", body: "Los comandos cambian por fabricante y por versión." },
    {
      title: "Aplica la configuración",
      body: "Copia los comandos con la IP del colector ya puesta, o sigue la ruta del menú.",
    },
    {
      title: "Confirma la recepción",
      body: "El portal muestra en vivo cuántos eventos por segundo está recibiendo de ese equipo.",
    },
  ],
} as const;

export const BRAND_INSTRUCTIONS: Partial<Record<Brand, BrandInstructions>> = {
  fortigate: {
    path: "CLI o System › Log & Report › Log Settings",
    transport: "UDP 514 o TCP fiable",
    format: "key=value (formato default, no CEF)",
    commands: [
      "config log syslogd setting",
      "  set status enable",
      "  set server {ip}",
      "  set mode udp",
      "  set port 514",
      "  set format default",
      "end",
    ],
    warning:
      "Sin `set logtraffic all` en las políticas, el informe solo verá el tráfico denegado. Actívalo al menos en las políticas de salida.",
  },
  sophos_xg: {
    path: "System Services › Log Settings › Syslog Servers › Add",
    transport: "UDP, TCP o TLS (v19+)",
    format: "Device standard (v18+)",
    steps: [
      "Agrega un servidor con nombre EventReport y dirección {ip}, puerto 514.",
      "Elige formato Device standard y facility DAEMON.",
      "Marca todas las categorías de Firewall, IPS, Web, Application Control y VPN.",
      "Guarda y aplica: el envío empieza de inmediato.",
    ],
  },
  sonicwall: {
    path: "Device › Log › Syslog › Add",
    transport: "UDP; TCP en SonicOS 7",
    format: "Enhanced Syslog",
    steps: [
      "Agrega el servidor {ip} en el puerto 514.",
      "En Syslog Format elige Enhanced Syslog, no el formato heredado.",
      "En Log › Settings marca las categorías de tráfico, IPS y control de aplicaciones.",
    ],
  },
  mikrotik: {
    path: "System › Logging › Actions y Rules",
    transport: "Solo UDP",
    format: "Texto plano (BSD syslog)",
    commands: [
      "/system logging action",
      'add name=eventreport target=remote remote={ip} remote-port=514 src-address=0.0.0.0',
      "/system logging",
      "add topics=firewall action=eventreport",
      "add topics=info action=eventreport",
      "add topics=error action=eventreport",
    ],
    warning:
      "Cada regla del firewall necesita `log=yes` y un `log-prefix`. RouterOS no envía bytes por sesión ni usuario, así que 9 de las 20 reglas no son evaluables en esta marca; el informe lo dice.",
  },
  panos: {
    path: "Device › Server Profiles › Syslog, y Objects › Log Forwarding",
    transport: "UDP, TCP o SSL",
    format: "CSV por posición",
    steps: [
      "Crea el perfil de syslog con servidor {ip}, puerto 514, transporte UDP.",
      "Crea un perfil de Log Forwarding que use ese servidor para Traffic, Threat, System y Config.",
      "Aplica el perfil de reenvío a cada política de seguridad.",
    ],
  },
  pfsense: {
    path: "Status › System Logs › Settings › Remote Logging",
    transport: "UDP; TCP/TLS en OPNsense",
    format: "filterlog CSV",
    steps: [
      "Activa Enable Remote Logging y pon {ip}:514 como servidor.",
      "Marca Firewall Events y System Events.",
      "No hay módulos UTM: 7 de las 20 reglas no aplican en esta marca.",
    ],
  },
};
