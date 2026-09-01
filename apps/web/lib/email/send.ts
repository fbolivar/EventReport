import nodemailer from "nodemailer";

/**
 * Envío de correo (docs/entrega-por-correo.md).
 *
 * Detrás de una interfaz a propósito: hoy sale por el SMTP de Google Workspace,
 * que basta hasta unas decenas de clientes, y el día que haga falta un proveedor
 * transaccional se cambia el transporte y nada más.
 *
 * Sin credenciales configuradas **no falla**: informa que no envió. Un informe
 * generado y guardado vale aunque el aviso no salga; al revés no.
 *
 * No lleva `server-only`: nodemailer no se puede empaquetar para el navegador,
 * así que importarlo desde un componente de cliente rompe el build de todas
 * formas —y con `server-only` este módulo tampoco se podría probar con node.
 */
export interface Mail {
  to: string[];
  subject: string;
  /** Texto plano. El correo de un producto de seguridad no necesita HTML. */
  body: string;
}

export type MailResult =
  | { sent: true; messageId: string }
  | { sent: false; reason: "sin configurar" | "falló" };

function transport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return undefined;

  const port = Number(process.env.SMTP_PORT ?? 465);
  return nodemailer.createTransport({
    host,
    port,
    // 465 es TLS desde el saludo; 587 negocia STARTTLS. Nunca sin cifrar.
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendMail(mail: Mail): Promise<MailResult> {
  const mailer = transport();
  if (!mailer) return { sent: false, reason: "sin configurar" };

  try {
    const info = await mailer.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      replyTo: process.env.SMTP_REPLY_TO,
      to: mail.to.join(", "),
      subject: mail.subject,
      text: mail.body,
    });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error("no se pudo enviar el correo", error);
    return { sent: false, reason: "falló" };
  }
}

/**
 * Aviso de informe listo.
 *
 * El correo **no lleva hallazgos**: un hallazgo dice dónde está el hueco del
 * firewall del cliente, y el correo no es un canal para eso. Tampoco lleva un
 * enlace con token: apunta al portal, que pide sesión, así que reenviar el
 * correo no regala acceso.
 */
export function reportReadyMail(input: {
  tenantName: string;
  reportName: string;
  period: string;
  portalUrl: string;
  to: string[];
}): Mail {
  return {
    to: input.to,
    subject: `${input.reportName} de ${input.tenantName} · ${input.period}`,
    body: [
      `El ${input.reportName.toLowerCase()} del período ${input.period} ya está disponible.`,
      "",
      `Ábrelo en el portal: ${input.portalUrl}`,
      "",
      "Si no puedes entrar, pide acceso a quien administra EventReport en tu empresa.",
      "",
      "EventReport · BC Fabric SAS",
      "Evidencia técnica del perímetro, no una certificación.",
    ].join("\n"),
  };
}
