/**
 * Catálogo de marcos y controles. Datos puros, sin importaciones en tiempo de
 * ejecución más allá del mapeo regla → control: así el generador del seed de
 * Supabase (`supabase/seed/generate.mjs`) puede leer este archivo directamente
 * y la base de datos y el portal nunca se separan.
 */
import type { Control, Framework, FrameworkCode } from "@eventreport/schema";

// Extensión explícita: el generador del seed carga este archivo con Node,
// que sí exige la extensión en las importaciones.
import { RULE_CONTROLS } from "./rule-controls.ts";

export const DEMO_FRAMEWORKS: Framework[] = [
  {
    code: "iso27001",
    name: "ISO/IEC 27001:2022 Anexo A",
    version: "2022",
    logRetentionDays: 0,
    totalControls: 93,
    scopeNote:
      "EventReport aporta evidencia técnica del perímetro para tu SGSI. No sustituye la auditoría ni certifica el sistema de gestión.",
  },
  {
    code: "cis_v8",
    name: "CIS Controls v8 (IG1/IG2)",
    version: "8.0",
    logRetentionDays: 0,
    totalControls: 153,
    scopeNote:
      "Estado por salvaguarda, más los ítems del CIS Benchmark de la marca cuando existe para tu equipo.",
  },
  {
    code: "pci_dss",
    name: "PCI DSS v4.0.1",
    version: "4.0.1",
    logRetentionDays: 365,
    totalControls: 250,
    scopeNote:
      "Cubre los controles de seguridad de red. La retención de 12 meses del requisito 10.5.1 no se satisface con la bóveda local: hace falta un destino de registros adicional (FW-017).",
  },
  {
    code: "hipaa",
    name: "HIPAA Security Rule (45 CFR 164)",
    version: "2013",
    logRetentionDays: 2_190,
    totalControls: 42,
    scopeNote:
      "Evidencia de salvaguardas técnicas de red. HIPAA no es certificable; aplica si procesas datos de salud de entidades cubiertas en Estados Unidos.",
  },
];

export function frameworkByCode(code: FrameworkCode): Framework | undefined {
  return DEMO_FRAMEWORKS.find((framework) => framework.code === code);
}

const CONTROL_TITLES: Record<string, { title: string; domain: string }> = {
  // ISO/IEC 27001:2022, Anexo A
  "iso27001:5.25": { title: "Evaluación y decisión sobre eventos de seguridad", domain: "Organizativos" },
  "iso27001:8.2": { title: "Derechos de acceso privilegiado", domain: "Tecnológicos" },
  "iso27001:8.5": { title: "Autenticación segura", domain: "Tecnológicos" },
  "iso27001:8.7": { title: "Protección contra software malicioso", domain: "Tecnológicos" },
  "iso27001:8.8": { title: "Gestión de vulnerabilidades técnicas", domain: "Tecnológicos" },
  "iso27001:8.9": { title: "Gestión de la configuración", domain: "Tecnológicos" },
  "iso27001:8.14": { title: "Redundancia de los recursos de tratamiento", domain: "Tecnológicos" },
  "iso27001:8.15": { title: "Registro de eventos", domain: "Tecnológicos" },
  "iso27001:8.16": { title: "Actividades de seguimiento", domain: "Tecnológicos" },
  "iso27001:8.17": { title: "Sincronización de relojes", domain: "Tecnológicos" },
  "iso27001:8.20": { title: "Seguridad de las redes", domain: "Tecnológicos" },
  "iso27001:8.24": { title: "Uso de criptografía", domain: "Tecnológicos" },
  "iso27001:8.32": { title: "Gestión de cambios", domain: "Tecnológicos" },
  // CIS Controls v8
  "cis_v8:3.10": { title: "Cifrar los datos sensibles en tránsito", domain: "Protección de datos" },
  "cis_v8:4.2": { title: "Establecer y mantener configuración segura de red", domain: "Configuración segura" },
  "cis_v8:5.4": { title: "Restringir privilegios de administrador", domain: "Gestión de cuentas" },
  "cis_v8:6.4": { title: "Exigir MFA para el acceso remoto a la red", domain: "Control de acceso" },
  "cis_v8:6.5": { title: "Exigir MFA para el acceso administrativo", domain: "Control de acceso" },
  "cis_v8:7.4": { title: "Gestión automatizada de parches de aplicaciones", domain: "Vulnerabilidades" },
  "cis_v8:8.2": { title: "Recolectar registros de auditoría", domain: "Gestión de registros" },
  "cis_v8:8.4": { title: "Sincronizar los relojes de auditoría", domain: "Gestión de registros" },
  "cis_v8:8.5": { title: "Recolectar registros de auditoría detallados", domain: "Gestión de registros" },
  "cis_v8:8.9": { title: "Centralizar los registros de auditoría", domain: "Gestión de registros" },
  "cis_v8:8.10": { title: "Conservar los registros de auditoría", domain: "Gestión de registros" },
  "cis_v8:10.1": { title: "Desplegar y mantener software antimalware", domain: "Defensa antimalware" },
  "cis_v8:12.1": { title: "Mantener la infraestructura de red actualizada", domain: "Infraestructura de red" },
  "cis_v8:12.2": { title: "Establecer y mantener una arquitectura de red segura", domain: "Infraestructura de red" },
  "cis_v8:12.8": { title: "Establecer y mantener computación dedicada para tareas administrativas", domain: "Infraestructura de red" },
  "cis_v8:13.3": { title: "Desplegar una solución de detección de intrusiones", domain: "Monitoreo y defensa" },
  "cis_v8:13.10": { title: "Realizar filtrado a nivel de aplicación", domain: "Monitoreo y defensa" },
  "cis_v8:17.4": { title: "Establecer y mantener un proceso de respuesta a incidentes", domain: "Respuesta a incidentes" },
  // PCI DSS v4.0.1
  "pci_dss:1.2.5": { title: "Puertos, protocolos y servicios permitidos identificados y aprobados", domain: "Requisito 1" },
  "pci_dss:1.2.7": { title: "Revisión periódica de las configuraciones de los NSC", domain: "Requisito 1" },
  "pci_dss:1.3.1": { title: "Tráfico entrante al entorno restringido a lo necesario", domain: "Requisito 1" },
  "pci_dss:1.3.2": { title: "Tráfico saliente del entorno restringido a lo necesario", domain: "Requisito 1" },
  "pci_dss:1.4.4": { title: "Los componentes que almacenan datos no son accesibles desde redes no confiables", domain: "Requisito 1" },
  "pci_dss:2.2.2": { title: "Cuentas y contraseñas por defecto eliminadas o cambiadas", domain: "Requisito 2" },
  "pci_dss:2.2.7": { title: "Todo acceso administrativo no consola está cifrado", domain: "Requisito 2" },
  "pci_dss:4.2.1": { title: "Criptografía fuerte durante la transmisión en redes públicas", domain: "Requisito 4" },
  "pci_dss:5.2.1": { title: "Solución antimalware desplegada y activa", domain: "Requisito 5" },
  "pci_dss:6.3.3": { title: "Componentes de software protegidos con los parches vigentes", domain: "Requisito 6" },
  "pci_dss:7.2.1": { title: "Modelo de control de acceso definido", domain: "Requisito 7" },
  "pci_dss:8.4.1": { title: "MFA para todo acceso administrativo no consola", domain: "Requisito 8" },
  "pci_dss:8.4.3": { title: "MFA para todo acceso remoto desde fuera de la red", domain: "Requisito 8" },
  "pci_dss:10.2.1": { title: "Registros de auditoría habilitados y activos", domain: "Requisito 10" },
  "pci_dss:10.2.1.6": { title: "Los registros identifican al usuario que originó el evento", domain: "Requisito 10" },
  "pci_dss:10.3.3": { title: "Los registros se respaldan en un servidor interno seguro", domain: "Requisito 10" },
  "pci_dss:10.4.1": { title: "Revisión de los registros de auditoría", domain: "Requisito 10" },
  "pci_dss:10.5.1": { title: "Doce meses de historial de registros, tres inmediatamente disponibles", domain: "Requisito 10" },
  "pci_dss:10.6.1": { title: "Relojes sincronizados en todos los sistemas", domain: "Requisito 10" },
  "pci_dss:11.5.1": { title: "Detección de intrusiones desplegada y monitoreada", domain: "Requisito 11" },
  // HIPAA Security Rule
  "hipaa:164.308(a)(3)": { title: "Gestión de acceso de la fuerza laboral", domain: "Salvaguardas administrativas" },
  "hipaa:164.308(a)(5)(ii)(B)": { title: "Protección contra software malicioso", domain: "Salvaguardas administrativas" },
  "hipaa:164.308(a)(6)": { title: "Procedimientos de respuesta a incidentes", domain: "Salvaguardas administrativas" },
  "hipaa:164.308(a)(7)": { title: "Plan de contingencia", domain: "Salvaguardas administrativas" },
  "hipaa:164.308(a)(8)": { title: "Evaluación periódica de las salvaguardas", domain: "Salvaguardas administrativas" },
  "hipaa:164.312(a)(1)": { title: "Control de acceso", domain: "Salvaguardas técnicas" },
  "hipaa:164.312(b)": { title: "Controles de auditoría", domain: "Salvaguardas técnicas" },
  "hipaa:164.312(d)": { title: "Autenticación de la persona o entidad", domain: "Salvaguardas técnicas" },
  "hipaa:164.312(e)(1)": { title: "Seguridad de la transmisión", domain: "Salvaguardas técnicas" },
  "hipaa:164.316(b)(2)": { title: "Retención de la documentación por seis años", domain: "Requisitos de política" },
};

/** Controles del marco que EventReport puede tocar: los que tienen regla mapeada. */
export function controlsFor(frameworkCode: FrameworkCode): Control[] {
  const codes = [
    ...new Set(
      RULE_CONTROLS.filter((row) => row.frameworkCode === frameworkCode).map(
        (row) => row.controlCode,
      ),
    ),
  ];

  return codes
    .map((code) => ({
      frameworkCode,
      code,
      title: CONTROL_TITLES[`${frameworkCode}:${code}`]?.title ?? code,
      domain: CONTROL_TITLES[`${frameworkCode}:${code}`]?.domain ?? "",
    }))
    .sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));
}

