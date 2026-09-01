/**
 * Prueba del envío de correo (docs/entrega-por-correo.md, paso 5).
 *
 *   node --experimental-strip-types --env-file=.env.local scripts/probe-email.ts tu@correo.com
 *
 * Manda un mensaje real, así que se ejecuta a mano y nunca desde el build.
 * Sin credenciales configuradas lo dice y sale, que es la mitad del valor de
 * esta prueba: confirma si el entorno está completo antes de tocar el producto.
 */
import { reportReadyMail, sendMail } from "../lib/email/send.ts";

const to = process.argv[2];
if (!to) {
  console.error("uso: probe-email.ts <correo de destino>");
  process.exit(2);
}

const mail = reportReadyMail({
  tenantName: "Empresa de prueba",
  reportName: "Informe ejecutivo de postura",
  period: "1 de agosto — 31 de agosto de 2026",
  portalUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/acme/reports`,
  to: [to],
});

const result = await sendMail(mail);

if (result.sent) {
  console.log("enviado:", result.messageId);
} else if (result.reason === "sin configurar") {
  console.error("faltan SMTP_HOST, SMTP_USER o SMTP_PASSWORD en .env.local");
  process.exit(1);
} else {
  console.error("el envío falló; el detalle está arriba");
  process.exit(1);
}
