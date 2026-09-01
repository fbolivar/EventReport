# Conectar un firewall real

Guía para poner en marcha EventReport en la red de un cliente. Son tres pasos: instalar el
colector, darle acceso de lectura al firewall y apuntarle el syslog. Al terminar, el portal
muestra el equipo, sus hallazgos y su puntaje de postura.

Toma entre 20 y 40 minutos la primera vez.

---

## Antes de empezar

| Necesitas | Por qué |
|---|---|
| Una máquina en la red del cliente (VM Ubuntu Server o mini PC) | Ahí corre el colector; ver §5.4 del diseño técnico para el dimensionamiento |
| Acceso de administrador al firewall | Para crear un usuario de solo lectura y apuntar el syslog |
| Acceso al portal como administrador de esa empresa | Para emitir el token de enrolamiento |
| El colector puede alcanzar el firewall por HTTPS (443) | Es quien consulta la configuración |
| El firewall puede alcanzar al colector por UDP 514 | Es por donde llegan los registros |
| El colector puede salir a internet por HTTPS | Sube resúmenes al SaaS; **no** requiere que nadie entre desde afuera |

**Lo que nunca sale de la red del cliente:** el token de la API del firewall, las claves de VPN,
las comunidades SNMP y las líneas de registro completas. Al SaaS suben la configuración
normalizada sin secretos, los contadores por hora y los hallazgos.

---

## Paso 1 · Enrolar el colector

1. En el portal, entra a **Ajustes → Colectores**.
2. Elige la sede, escribe un nombre (`colector-bogota`) y pulsa **Emitir token**.
3. Copia el comando que aparece. **Solo se muestra una vez**: guardamos un hash, así que ni
   nosotros podemos recuperarlo. Vence en 24 horas y sirve una sola vez.
4. En la máquina del cliente:

   ```bash
   ./collector enroll -token XXXX-XXXX-XXXX-XXXX -url https://<proyecto>.supabase.co
   ```

   Responde con el identificador del colector y los parámetros del plan: cada cuánto toma
   configuración, cada cuánto envía y cuántos días guarda la bóveda local.

5. El colector queda **en medición**: los primeros días sirven para conocer el tráfico normal
   antes de empezar a llamar la atención.

> Si el token no sirve, la respuesta es la misma para inválido, usado y vencido: emite otro desde
> el portal. No hay forma de saber cuál de los tres casos era, y es a propósito.

---

## Paso 2 · Dar acceso de lectura al firewall

### FortiGate (FortiOS 7.4)

EventReport necesita **leer**, nunca escribir. Se crea un perfil de solo lectura y un usuario de
API restringido a la IP del colector.

1. **System → Admin Profiles → Create New.**
   - Nombre: `eventreport-readonly`
   - Deja todo en **None** salvo estos, en **Read**:
     - System
     - Firewall
     - Log & Report
     - VPN
     - Security Profiles
   - Guarda.

2. **System → Administrators → Create New → REST API Admin.**
   - Username: `eventreport`
   - Administrator Profile: `eventreport-readonly`
   - PKI Group: deshabilitado
   - **Trusted Hosts:** la IP del colector con máscara `/32`, por ejemplo `10.10.0.50/32`.
     Sin esto, el token sirve desde cualquier lugar de la red.
   - Guarda.

3. FortiOS muestra el **API key una sola vez**. Cópiala; es lo que se pega en el paso 3.

4. Comprueba desde el colector que responde:

   ```bash
   curl -k -H "Authorization: Bearer <API-KEY>" \
     https://<ip-del-firewall>/api/v2/monitor/system/status
   ```

   Debe devolver un JSON con `hostname`, `serial`, `model` y `version`.

> **Sobre el `-k` y el certificado.** Un FortiGate recién configurado presenta un certificado
> autofirmado, así que la verificación TLS falla. Si vas a dejarlo así, el colector necesita
> `-insecure` en el paso siguiente: la conexión sigue cifrada, pero no se comprueba con quién se
> habla — por eso conviene que colector y firewall estén en la misma red. Si el equipo ya tiene un
> certificado de una autoridad confiable, no pases `-insecure` y todo se verifica.

### Sophos XG (SFOS 20)

1. **Administration → Device access → Local service ACL exception rule:** permite HTTPS desde la
   IP del colector.
2. **Backup and firmware → API:** activa el acceso por API y agrega la IP del colector a la lista
   de permitidos.
3. Crea un administrador de solo lectura en **Profiles → Device access** y asígnalo en
   **Authentication → Users**.

> El adaptador de Sophos llega en la fase 2; hoy el colector solo trae FortiGate. Los pasos
> quedan escritos para que la red esté lista cuando exista.

---

## Paso 3 · Registrar el equipo en el colector

```bash
./collector device add \
  -brand fortigate \
  -host https://10.10.0.1 \
  -token <API-KEY> \
  -insecure \
  -passphrase "<frase de paso de esta máquina>"
```

Qué hace, en ese orden:

1. **Habla con el firewall antes de guardar nada.** Un token equivocado se descubre aquí, contigo
   delante, y no tres días después cuando el primer informe salga vacío.
2. Sube al SaaS lo que el equipo dice de sí mismo —marca, modelo, serie, versión, hostname— y
   recibe el identificador del firewall.
3. **Cifra el token y lo guarda en disco.** El token no viaja: si viajara, un robo de nuestra base
   daría acceso a los firewalls de todos los clientes.

La frase de paso es lo que cifra el token en esa máquina. Guárdala donde guardas las credenciales
del cliente; si se pierde, hay que volver a ejecutar el comando con un token nuevo.

Verifica:

```bash
./collector test -passphrase "<frase de paso>"
```

Debe decir `conexión correcta`. En el portal, el equipo aparece en **Ajustes → Firewalls**.

---

## Paso 4 · Apuntar el syslog al colector

### FortiGate

```
config log syslogd setting
    set status enable
    set server "10.10.0.50"        # IP del colector
    set port 514
    set facility local7
    set format default
    set source-ip "10.10.0.1"      # IP del firewall en esa red
end
```

Y activa el registro del tráfico permitido en las políticas que importan:
**Policy & Objects → Firewall Policy → Log Allowed Traffic → All Sessions.**

### Comprobación

En el colector:

```bash
./collector run
```

En un minuto deberías ver en el registro las líneas recibidas. Si no llega nada:

| Síntoma | Causa habitual |
|---|---|
| Cero líneas | El firewall envía a otra IP, o hay un firewall intermedio bloqueando UDP 514 |
| Llegan y se descartan | Marca no reconocida: revisa `set format default` |
| Llegan con hora rara | El firewall no tiene NTP; el colector agrega por hora de recepción, pero el informe lo señalará |

---

## Qué esperar después

- **Primeras horas:** el equipo aparece con su configuración y los primeros hallazgos.
- **Primer día:** contadores de tráfico por hora en Actividad.
- **Primera semana:** el puntaje de postura empieza a tener tendencia; el colector sale de medición.
- **Fin de mes:** se genera el informe ejecutivo del período cerrado.

---

## Problemas frecuentes

**`certificate signed by unknown authority`** — el certificado del equipo es autofirmado. Agrega
`-insecure`, o instala un certificado de confianza en el firewall.

**`respondió 401`** — el token es incorrecto o el usuario de API no tiene permiso de lectura sobre
ese apartado. Revisa el perfil del paso 2.

**`respondió 403` con el token correcto** — casi siempre es *Trusted Hosts*: la IP desde la que
sale el colector no coincide con la que autorizaste.

**El colector no ve el firewall** — comprueba que la administración por HTTPS está permitida en la
interfaz **interna** del equipo (no en la WAN; si está en la WAN, eso mismo es un hallazgo
crítico: FW-001).
