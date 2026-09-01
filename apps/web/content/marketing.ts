/**
 * Copy de la landing. Nada de texto en JSX: cambiar un titular no toca código.
 * Cada bloque indica en qué sección aparece.
 *
 * Las marcas `REVISAR` señalan lo que necesita validación de Fernando antes de
 * publicar: precios y afirmaciones sobre marcos y marcas.
 */

/** Navegación superior y pie. */
export const nav = {
  links: [
    { href: "#producto", label: "Producto" },
    { href: "#cumplimiento", label: "Cumplimiento" },
    { href: "#marcas", label: "Marcas" },
    { href: "#precios", label: "Precios" },
  ],
  cta: { href: "#contacto", label: "Solicitar demo" },
} as const;

/** Sección 2 — hero. */
export const hero = {
  title: "Tu firewall ya sabe qué está pasando. Nosotros lo ponemos por escrito.",
  subtitle:
    "EventReport lee la configuración y los registros de tu firewall y entrega informes que puedes llevar a una junta o a una auditoría. Sin FortiAnalyzer, sin SIEM y sin que tus registros salgan de tu red.",
  primary: { href: "#contacto", label: "Solicitar demo" },
  secondary: { href: "#producto", label: "Ver un informe" },
  reportCaption: "Componentes reales del producto, con datos de ejemplo.",
} as const;

/** Sección 3 — el problema, en palabras del cliente. */
export const problem = {
  title: "Lo que escuchamos en cada empresa",
  items: [
    {
      quote: "Tengo un firewall y no sé qué está pasando.",
      body: "Alguien lo configuró hace años y desde entonces nadie lo mira. Los registros se sobrescriben cada pocos días y nadie sabría decir si el mes pasado hubo un intento serio de entrar.",
    },
    {
      quote: "El auditor me pidió evidencia y no la tengo.",
      body: "Puedes mostrar el equipo encendido, pero no un documento que demuestre quién administra, qué reglas hay, qué se bloqueó y desde cuándo. La captura de pantalla no cuenta como evidencia.",
    },
    {
      quote: "Pago licencias de seguridad y no sé si sirven.",
      body: "IPS, antivirus, filtrado web: la factura llega cada año. Nadie ha comprobado si esos módulos están aplicados a las reglas por donde realmente pasa el tráfico.",
    },
  ],
} as const;

/** Sección 4 — cómo funciona. Es una secuencia real: por eso va numerada. */
export const howItWorks = {
  title: "Tres pasos, una sola vez",
  subtitle: "Después de la instalación no tienes que hacer nada más.",
  steps: [
    {
      title: "Instalas el colector",
      body: "Un programa que corre en una máquina virtual o en un equipo pequeño dentro de tu red. Toma unos diez minutos y solo abre conexiones hacia afuera: no hay que publicar nada en internet.",
      detail: "Ubuntu, Windows o un mini PC que te entregamos configurado.",
    },
    {
      title: "Tu firewall le habla a tu propia red",
      body: "El firewall envía sus registros al colector, que está en tu oficina, y EventReport consulta la configuración por la API del fabricante. Los registros crudos se quedan ahí, comprimidos, durante los días que elijas.",
      detail: "Te damos los comandos exactos para tu marca, con la IP ya puesta.",
    },
    {
      title: "Recibes informes y alertas",
      body: "Cada mes llega el informe ejecutivo y el técnico. Cuando algo importante ocurre —un administrador entrando desde una IP desconocida, una regla nueva que abre todo— te llega en el momento.",
      detail: "En el portal, por correo y en PDF listo para imprimir.",
    },
  ],
} as const;

/** Sección 5 — lo que recibes. */
export const deliverables = {
  title: "Lo que recibes",
  subtitle:
    "Documentos, no tableros. Cada uno escrito para quien lo va a leer: la gerencia entiende el riesgo, el técnico sabe qué tocar.",
  reports: [
    {
      name: "Ejecutivo de postura",
      audience: "Gerencia",
      frequency: "Mensual",
      body: "Una calificación de 0 a 100, cómo se movió respecto al mes pasado, los cinco riesgos principales y qué se propone hacer en los próximos 30, 60 y 90 días.",
    },
    {
      name: "Hardening del firewall",
      audience: "TI o tu proveedor",
      frequency: "Mensual o cuando lo pidas",
      body: "Todos los hallazgos con la evidencia que los sustenta y los pasos concretos para corregirlos en tu marca, no consejos genéricos.",
    },
    {
      name: "Actividad de red",
      audience: "TI y gerencia",
      frequency: "Mensual",
      body: "Cuánto tráfico pasó y por dónde, qué aplicaciones se usan, qué se bloqueó, quién se conecta por VPN y a qué horas.",
    },
    {
      name: "Cumplimiento",
      audience: "Auditoría y SGSI",
      frequency: "Trimestral",
      body: "Control por control del marco que elijas, con el estado de cada uno, la evidencia enlazada y el alcance dicho con claridad.",
    },
  ],
  findingTitle: "Así se ve un hallazgo",
  findingBody:
    "Cada hallazgo trae la evidencia literal que se leyó del equipo y los pasos de corrección de tu marca. Es lo que tu técnico o tu proveedor necesita para trabajar.",
} as const;

/** Sección 6 — cumplimiento. La nota de alcance es obligatoria y honesta. */
export const compliance = {
  title: "Evidencia para tu auditoría",
  subtitle:
    "Un firewall cubre una parte de cualquier marco. EventReport dice exactamente cuál, y no promete más.",
  // REVISAR: confirmar el conteo de controles evaluables con el mapeo final de §15.
  frameworks: [
    {
      code: "iso27001",
      name: "ISO/IEC 27001:2022",
      body: "Evidencia técnica del perímetro para los controles del Anexo A que dependen de la red: acceso, registro, criptografía, seguimiento.",
      scope: "14 de 93 controles son evaluables desde el firewall.",
    },
    {
      code: "cis_v8",
      name: "CIS Controls v8",
      body: "Estado por salvaguarda, y los ítems del CIS Benchmark de tu marca cuando existe para tu equipo.",
      scope: "Alrededor de 16 salvaguardas de 153.",
    },
    {
      code: "pci_dss",
      name: "PCI DSS v4.0.1",
      body: "El requisito 1 casi completo, más partes de los requisitos 2, 4, 5, 6, 8, 10 y 11 que dependen de los controles de red.",
      scope: "La retención de 12 meses del 10.5.1 exige un destino de registros adicional; el informe lo dice.",
    },
    {
      code: "hipaa",
      name: "HIPAA Security Rule",
      body: "Salvaguardas técnicas de red para empresas que procesan datos de salud de entidades cubiertas en Estados Unidos.",
      scope: "8 a 10 especificaciones técnicas de 42.",
    },
  ],
  note: "EventReport aporta evidencia técnica del perímetro para tu auditoría. No es una certificación y no sustituye al auditor: es el documento que le entregas cuando te pide cómo está configurada y vigilada tu red.",
} as const;

/** Sección 7 — marcas compatibles. */
export const brands = {
  title: "Marcas compatibles",
  subtitle:
    "El modelo de datos es el mismo para todas: los informes no cambian de forma cuando cambias de equipo.",
  // REVISAR: las fechas de disponibilidad dependen del plan de fases (§12).
  available: [
    { name: "Fortinet FortiGate", note: "Configuración, registros y remediación completos" },
    { name: "Sophos XG/XGS", note: "Configuración, registros y remediación completos" },
  ],
  planned: [
    { name: "SonicWall", note: "17 de 20 reglas evaluables" },
    { name: "Palo Alto PAN-OS", note: "20 de 20 reglas evaluables" },
    { name: "WatchGuard Firebox", note: "16 de 20 reglas evaluables" },
    { name: "Cisco ASA / FTD", note: "14 de 20; sin módulos UTM" },
    { name: "pfSense / OPNsense", note: "13 de 20; sin módulos UTM ni licencias" },
    { name: "MikroTik RouterOS", note: "11 de 20; registros con menos detalle" },
  ],
  genericTitle: "¿Otra marca?",
  genericBody:
    "Existe un modo genérico: cargas el archivo de configuración y el colector recibe los registros estándar. Obtienes postura y conteos, con menos detalle. El informe siempre dice qué no se pudo evaluar en tu equipo, en vez de inventar un “correcto”.",
} as const;

/** Sección 8 — confianza: dónde viven los datos. */
export const dataResidency = {
  title: "Tus registros no salen de tu red",
  subtitle:
    "Es la decisión de diseño más importante del producto, y la que hace que un cliente sin SIEM pueda tenerlo.",
  staysTitle: "Se queda en tu oficina",
  stays: [
    "Los registros crudos del firewall, comprimidos, durante 7, 15 o 30 días.",
    "Las credenciales del firewall, cifradas en el colector.",
    "Las llaves de VPN, contraseñas y comunidades SNMP: nunca se leen ni se transmiten.",
  ],
  uploadsTitle: "Sube a la nube",
  uploads: [
    "Resúmenes por hora: cuántos eventos de cada tipo, cuántos bytes, los 50 principales orígenes, destinos y aplicaciones.",
    "La configuración normalizada, sin secretos: reglas, administradores, interfaces, certificados y licencias.",
    "Los hallazgos y los eventos críticos.",
  ],
  volume:
    "Aunque tu firewall genere 30 GB de registros al día, lo que viaja son menos de 1 MB. Si quieres investigar un incidente, la consulta baja al colector, se ejecuta ahí y devuelve solo las líneas que pediste.",
} as const;

/** Sección 9 — precios. */
export const pricing = {
  title: "Planes",
  subtitle: "Un firewall pequeño y una sola sede tienen precio de firewall pequeño.",
  // REVISAR: precios de marcador. Definir con Fernando antes de publicar.
  note: "Precios en dólares por mes, facturados anualmente. Instalación y primera línea base incluidas.",
  plans: [
    {
      code: "basic",
      name: "Básico",
      price: "USD 89",
      pitch: "Una sede, un firewall, el informe que le falta a tu gerencia.",
      features: [
        "1 firewall",
        "Informe ejecutivo mensual",
        "Configuración revisada una vez al día",
        "50 alertas críticas al día",
        "Sin bóveda de registros",
      ],
    },
    {
      code: "standard",
      name: "Estándar",
      price: "USD 189",
      pitch: "Lo que necesita una empresa con área de TI o proveedor externo.",
      featured: true,
      features: [
        "Hasta 3 firewalls",
        "Ejecutivo, hardening y actividad",
        "Configuración cada 6 horas y resúmenes cada 4",
        "200 alertas críticas al día",
        "Bóveda local de 7 días",
      ],
    },
    {
      code: "premium",
      name: "Premium",
      price: "USD 389",
      pitch: "Varias sedes, cumplimiento formal y consulta de registros.",
      features: [
        "Hasta 10 firewalls",
        "Todos los informes, con cumplimiento trimestral",
        "Resúmenes cada hora y snapshot al detectar cambios",
        "500 alertas críticas al día",
        "Bóveda local de 30 días y consulta desde el portal",
      ],
    },
  ],
  msspTitle: "¿Administras varios clientes?",
  msspBody:
    "Hay una vista para proveedores de servicio: todos tus clientes en una tabla, con su calificación, sus hallazgos críticos y el estado de cada colector. Escríbenos y armamos el esquema.",
} as const;

/** Sección 10 — llamado final. */
export const finalCta = {
  title: "Empieza por saber cómo estás",
  body: "La primera entrega es una línea base: la foto de tu firewall hoy, con todo lo que encontramos y qué tan grave es. A partir de ahí se mide el progreso.",
  primary: { href: "mailto:hola@eventreport.io", label: "Solicitar demo" },
  // REVISAR: correo y dominio definitivos (§16: eventreport.io propuesto).
  secondary: "O escríbenos a hola@eventreport.io",
} as const;

/** Pie de página. */
export const footer = {
  tagline: "Informes de firewall para empresas que no tienen un SOC.",
  columns: [
    {
      title: "Producto",
      links: [
        { href: "#producto", label: "Lo que recibes" },
        { href: "#cumplimiento", label: "Cumplimiento" },
        { href: "#marcas", label: "Marcas compatibles" },
        { href: "#precios", label: "Precios" },
      ],
    },
    {
      title: "Empresa",
      links: [
        { href: "#contacto", label: "Contacto" },
        { href: "#datos", label: "Tratamiento de datos" },
      ],
    },
  ],
  legal: "BC Fabric SAS · Bogotá, Colombia",
} as const;
