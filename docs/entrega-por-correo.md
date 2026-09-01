# Entrega de informes por correo

El informe que se queda en el portal no lo lee nadie. Esta guía deja el correo funcionando desde
una cuenta de Google Workspace, paso a paso, y explica qué pasa cuando el volumen crezca.

**Decisión tomada:** una cuenta real con alias, no un alias suelto. Google Workspace solo permite
enviar desde una dirección que exista como cuenta o como alias de una cuenta, y para autenticar
por SMTP hace falta una cuenta con contraseña de aplicación. Una cuenta dedicada además se puede
revocar sin tocar el correo de nadie.

---

## Paso 1 · Crear la cuenta de envío

1. Entra a [admin.google.com](https://admin.google.com) como administrador del dominio.
2. **Directorio → Usuarios → Añadir usuario nuevo.**
   - Nombre: `EventReport`
   - Apellido: `Informes`
   - Correo: `informes@tudominio.com`
   - Genera una contraseña y **desmarca** "Pedir cambio de contraseña al iniciar sesión".
3. Guarda. Esta cuenta ocupa una licencia de Workspace; si eso importa, usa una licencia
   *Cloud Identity* o comparte el buzón con un grupo (ver el paso 6).

## Paso 2 · Añadir el alias de respuesta

Los informes se envían desde `informes@`, pero conviene que las respuestas lleguen a alguien.

1. **Directorio → Usuarios →** abre `informes@tudominio.com`.
2. **Información del usuario → Alias de correo electrónico → Añadir alias.**
3. Agrega `no-responder@tudominio.com` si prefieres esa dirección como remitente visible.
4. Para que las respuestas lleguen a soporte: **Grupos → Crear grupo** `soporte@tudominio.com`,
   agrega a las personas del equipo, y usa esa dirección como `Reply-To` (paso 5).

## Paso 3 · Activar la verificación en dos pasos y crear la contraseña de aplicación

Sin verificación en dos pasos, Google no permite crear contraseñas de aplicación.

1. Cierra sesión y entra a Gmail **como `informes@tudominio.com`**.
2. Ve a [myaccount.google.com/security](https://myaccount.google.com/security).
3. **Verificación en dos pasos → Empezar.** Usa un número del equipo, no el personal de alguien
   que puede irse de la empresa.
4. Vuelve a Seguridad → **Contraseñas de aplicaciones**.
   - Si no aparece: el administrador la tiene bloqueada. En admin.google.com,
     **Seguridad → Controles de acceso y datos → Menos seguras / Contraseñas de aplicación**,
     permítelas para esta unidad organizativa.
5. Crea una con el nombre `EventReport`. Google muestra **16 caracteres una sola vez**: cópialos.

## Paso 4 · Autenticar el dominio (SPF, DKIM, DMARC)

Sin esto los informes acaban en spam, que para el cliente es lo mismo que no enviarlos.

1. **SPF.** En el DNS del dominio, un registro TXT en la raíz:

   ```
   v=spf1 include:_spf.google.com ~all
   ```

   Si ya tienes uno, **no agregues otro**: se combinan en el mismo registro.

2. **DKIM.** En admin.google.com: **Aplicaciones → Google Workspace → Gmail → Autenticar correo
   electrónico.** Genera la clave (2048 bits), copia el TXT que muestra y créalo en tu DNS como
   `google._domainkey`. Espera a que propague y pulsa **Iniciar autenticación**.

3. **DMARC.** Un TXT en `_dmarc.tudominio.com`:

   ```
   v=DMARC1; p=none; rua=mailto:dmarc@tudominio.com; pct=100
   ```

   Empieza en `p=none` para observar durante un mes; después sube a `quarantine`.

4. Comprueba con [mxtoolbox.com/dmarc.aspx](https://mxtoolbox.com/dmarc.aspx) o enviando un correo
   a `check-auth@verifier.port25.com`.

## Paso 5 · Configurar EventReport

En `apps/web/.env.local` (y en las variables del despliegue cuando llegue):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=informes@tudominio.com
SMTP_PASSWORD=<los 16 caracteres del paso 3, sin espacios>
SMTP_FROM="EventReport <informes@tudominio.com>"
SMTP_REPLY_TO=soporte@tudominio.com
```

Prueba el envío sin generar nada:

```bash
cd apps/web
node --experimental-strip-types --env-file=.env.local scripts/probe-email.ts tu@correo.com
```

Debe llegar un correo de prueba. Si falla:

| Error | Causa |
|---|---|
| `Invalid login: 535-5.7.8` | La contraseña de aplicación está mal copiada o tiene espacios |
| `Username and Password not accepted` | Falta la verificación en dos pasos en esa cuenta |
| Se conecta y no llega | Revisa spam; casi siempre falta DKIM del paso 4 |

## Paso 6 · Quién recibe

Los informes van a las personas con acceso a la empresa en el portal (**Ajustes → Personas**).
Un cliente que quiera que su gerente reciba el informe sin entrar al portal, lo invita con
permiso de lectura.

---

## Límites y cuándo cambiar de proveedor

| | Google Workspace SMTP | Proveedor transaccional (Resend, Postmark) |
|---|---|---|
| Envíos por día | 2.000 por cuenta | Decenas de miles |
| Destinatarios por mensaje | 100 | Sin límite práctico |
| Rebotes y aperturas | No los ves | Panel y webhooks |
| Costo | Incluido | Desde ~20 USD/mes |
| Tiempo de puesta en marcha | Esta guía | Verificar dominio y una clave |

**Regla práctica:** con menos de 50 clientes, Workspace sobra —cada cliente recibe uno o dos
informes al mes—. Al pasar de ahí, o el primer día que un cliente diga "no me llegó" y no puedas
demostrar lo contrario, migra a un proveedor transaccional: lo que se compra ahí es el registro de
entrega, no la capacidad.

El código de envío está detrás de una interfaz (`lib/email/`), así que cambiar de proveedor es
cambiar el transporte, no el producto.

---

## Lo que EventReport envía, y lo que no

- **Envía:** un aviso de que el informe está listo, con un enlace al portal, y opcionalmente el
  PDF adjunto si el cliente lo pide.
- **No envía:** hallazgos en el cuerpo del correo. Un hallazgo dice dónde está el hueco del
  firewall del cliente; el correo no es un canal para eso.
- **Ningún enlace del correo lleva un token de acceso.** El enlace va al portal, y ahí se pide
  sesión: si alguien reenvía el correo, no regala acceso.
