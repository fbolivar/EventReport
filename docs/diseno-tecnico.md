# Diseño técnico — SaaS de reportes de firewall multimarca para PYMES

**Estado:** borrador v0.6 · **Fecha:** 2026-08-31 · **Autor:** Fernando Bolívar
**Nombre del producto:** EventReport

**Cambios respecto a v0.1:** alcance limitado a firewall; multimarca; se asume que el cliente NO tiene FortiAnalyzer, SIEM ni ningún receptor de logs; syslog pasa a ser fuente obligatoria; se elimina el conector de Active Directory.
**Cambios respecto a v0.2:** segunda marca definida (Sophos XG/XGS); bóveda local de logs crudos incluida desde la fase 1.
**Cambios respecto a v0.3:** dimensionamiento de hardware corregido (bóveda subestimada); operación del receptor syslog, sincronización con el SaaS y matriz de integración syslog por marca (§6.5–6.8); modo medición y asistente de onboarding.
**Cambios respecto a v0.4:** nombre del producto propuesto (§16); cumplimiento con cuatro marcos (ISO 27001:2022, CIS Controls v8 + CIS Benchmarks por marca, PCI DSS v4.0.1, HIPAA) con mapeo completo de reglas (§7) y modelo de evaluación por marca (§15); reglas operativas OP-001..004.
**Cambios respecto a v0.5:** nombre definitivo EventReport (§16).

---

## 1. Alcance y supuestos

| Aspecto | Definición |
|---|---|
| Qué cubre | Postura, actividad, cambios y cumplimiento del firewall perimetral del cliente |
| Qué no cubre | Endpoints, directorio, nube, correo (posibles productos futuros, no módulos de este) |
| Supuesto del cliente | Tiene un firewall (o varios) y nada más: sin FortiAnalyzer, sin SIEM, sin syslog server |
| Marcas | Modelo normalizado; adaptador por marca. MVP con FortiGate; Sophos XG/XGS como segunda marca para validar la abstracción |
| Retención de logs | Bóveda local en el colector desde fase 1: el cliente conserva sus logs crudos sin que suban a la nube |
| Instalación | Binario Go en un equipo o VM del cliente, conexión únicamente saliente |

---

## 2. Arquitectura

```
        PREMISA DEL CLIENTE                              │             NUBE
                                                         │
  ┌────────────┐  API (config, pull cada N h)            │
  │            │──────────────────────┐                  │   ┌──────────────────────────┐
  │  FIREWALL  │                      ▼                  │   │  Supabase                │
  │  (marca X) │  syslog 514/UDP  ┌────────────────┐     │   │  ├─ Postgres + RLS       │
  │            │─────────────────►│   COLECTOR     │─────┼──►│  ├─ Edge Functions       │
  └────────────┘  (push continuo) │   (Go)         │     │   │  └─ Storage (PDF)        │
                                  │ ┌────────────┐ │     │   └───────────┬──────────────┘
                                  │ │ adaptador  │ │     │               │
                                  │ │  marca X   │ │     │   ┌───────────▼──────────────┐
                                  │ ├────────────┤ │     │   │  Next.js en Vercel       │
                                  │ │ normalizar │ │     │   │  · portal por tenant     │
                                  │ │ agregar    │ │     │   │  · motor de informes     │
                                  │ │ reglas     │ │     │   │  · Claude API            │
                                  │ │ bóveda loc.│ │     │   └──────────────────────────┘
                                  │ └────────────┘ │     │
                                  └────────────────┘     │
```

Principios (se mantienen de v0.1):

1. Nada entra a la premisa; el colector inicia todas las conexiones.
2. Las credenciales del firewall no salen de la premisa.
3. La nube recibe **configuración normalizada, agregados horarios y hallazgos**, nunca líneas de log.
4. El snapshot es la unidad de costo.

---

## 3. Fuentes de datos por firewall

| Fuente | Método | Frecuencia | Qué aporta |
|---|---|---|---|
| Configuración | API REST/XML de la marca (o SSH `show config` como respaldo) | Cada 4–24 h + al detectar evento de cambio | Postura, hardening, inventario de políticas, VPN, certificados, firmware |
| Actividad | Syslog UDP/TCP hacia el colector | Continuo | Tráfico, IPS, web filter, control de aplicaciones, VPN, eventos de sistema y administración |
| Estado | API de monitoreo | Cada 5 min | CPU, memoria, sesiones, estado HA, licencias, interfaces |

Sin syslog no hay informe de actividad: la marca puede tener un log local de horas o días, pero no expone tráfico histórico por API. Por eso el colector debe ser el receptor.

---

## 4. Modelo normalizado (contrato multimarca)

### 4.1 Configuración normalizada (`FirewallConfig`)

```
device:      brand, model, serial, firmware, hostname, ha_mode, uptime
admins[]:    name, profile(readonly|readwrite|super), mfa, trusted_hosts[], last_login
mgmt_access: per interface → protocols(https,http,ssh,ping,snmp), is_wan
interfaces[]:name, zone, role(wan|lan|dmz|vpn), ip, vlan
policies[]:  id, name, src_zones[], dst_zones[], src[], dst[], services[], action,
             log(none|security|all), ips, av, web, app_ctl, ssl_inspect,
             hit_count, last_hit, schedule, enabled, position
nat[]:       type(dnat|snat), external, internal, ports
vpn.ipsec[]: name, peer, ike_version, encryption, dh_group, psk_or_cert
vpn.remote:  type(ssl|ipsec|wireguard), tls_min, mfa, users, groups, idle_timeout
certs[]:     name, subject, issuer, not_after, in_use
services:    ntp[], dns[], syslog_targets[], snmp(version, community_default)
licenses[]:  feature, expires_at, status
```

### 4.2 Evento normalizado (`FirewallEvent`)

Toda línea de syslog de cualquier marca se traduce a este registro antes de agregarse:

```
ts, type(traffic|ips|av|web|app|vpn|admin|system), action(allow|deny|block|alert),
src_ip, src_country, src_zone, dst_ip, dst_port, dst_zone, proto,
policy_id, user, app, category, threat_name, severity, bytes_in, bytes_out, raw_hash
```

Campos que una marca no tenga quedan vacíos; las reglas y agregaciones toleran ausencia.

### 4.3 Interfaz del adaptador (Go)

```go
type Adapter interface {
    Brand() string
    Capabilities() Capabilities            // qué soporta esta marca/versión
    TestConnection(ctx) error
    FetchConfig(ctx) (*FirewallConfig, error)
    FetchStatus(ctx) (*DeviceStatus, error)
    ParseLog(line []byte) (*FirewallEvent, bool)   // false = línea ignorada
    Remediation(ruleCode string) string             // pasos específicos de la marca
}
```

---

## 5. Matriz de marcas

| Marca | Config | Logs (syslog) | Notas |
|---|---|---|---|
| Fortinet FortiGate | REST `/api/v2` con token | key=value, muy completo | MVP. Ya conoces la API |
| Sophos XG/XGS | XML API + REST parcial | key=value | Segunda marca sugerida: común en PYMES colombianas |
| SonicWall | SonicOS API REST | key=value (ArcSight/CEF opcional) | API requiere habilitarla por CLI |
| MikroTik RouterOS 7 | REST API | texto plano, pobre en campos | Muy común en PYMES pequeñas; menos hallazgos posibles |
| Palo Alto PAN-OS | XML API | CSV con posiciones fijas | Menos frecuente en PYMES, pero API excelente |
| pfSense / OPNsense | API (plugin) / REST nativo | `filterlog` CSV | Opción para clientes de bajo presupuesto |
| WatchGuard Firebox | REST API | key=value | |
| Cisco ASA / FTD | SSH `show running-config` | %ASA-n-xxxxxx | Sin API útil en ASA; parseo de config |
| Check Point | Management API | CEF / LEA | Raro en el segmento objetivo |
| Genérico | Carga manual de archivo de configuración | CEF / syslog RFC 5424 con campos limitados | Válvula de escape para marcas no soportadas |

`Capabilities` declara qué secciones del modelo puede llenar cada adaptador; el informe indica "no evaluable en esta marca" en lugar de mostrar un falso "correcto".

---

## 6. Colector

### 6.1 Módulos

```
collector/
├── cmd/collector/main.go       # install | uninstall | run | enroll | test | vault
├── internal/
│   ├── enroll/                 # token de un solo uso, claves Ed25519
│   ├── config/                 # credenciales cifradas (DPAPI / clave derivada)
│   ├── syslog/                 # listener UDP/TCP 514, cola en memoria, backpressure
│   ├── adapter/                # fortigate/, sophos/, sonicwall/, mikrotik/, generic/
│   ├── normalize/              # FirewallConfig, FirewallEvent, GeoIP local (MaxMind Lite)
│   ├── aggregate/              # rollups horarios, top-N con límite, HLL para únicos
│   ├── rules/                  # evaluación de reglas sobre FirewallConfig y rollups
│   ├── vault/                  # bóveda local opcional de logs crudos (gzip por hora)
│   ├── buffer/                 # SQLite: rollups y snapshots pendientes de envío
│   ├── transport/              # firma, gzip, reintentos, poll de órdenes
│   └── scheduler/
└── packages/schema             # JSON Schema compartido con el portal
```

### 6.2 Pipeline de syslog

1. **Recepción**: listener UDP (y TCP para marcas que lo soportan). Cola en memoria de 50.000 eventos; si se llena, se descartan los más antiguos y se registra el contador `dropped` (aparece en el informe como calidad de datos).
2. **Parseo**: el adaptador convierte cada línea a `FirewallEvent`. Líneas no reconocidas se cuentan, no se guardan.
3. **Enriquecimiento**: país de origen/destino con base GeoIP local; clasificación interna/externa por las zonas de la configuración.
4. **Agregación**: por cada hora se mantienen:
   - Contadores por `type × action` (tráfico permitido/denegado, IPS bloqueado, web bloqueado, etc.)
   - Bytes in/out por política y por interfaz
   - Top-N (N=50) de: IPs origen denegadas, países origen, destinos, puertos, aplicaciones, categorías web, usuarios VPN, firmas IPS, políticas por volumen
   - Únicos aproximados (HyperLogLog): IPs internas activas, usuarios VPN
   - Eventos de administración y sistema completos (son pocos y tienen valor: login admin, cambio de config, reinicio, HA failover, fallo de VPN)
5. **Persistencia local**: rollups en SQLite; la línea cruda se descarta salvo bóveda activa.
6. **Envío**: los rollups pendientes viajan en el siguiente snapshot.

Tamaño resultante: entre 15 y 40 KB por hora por firewall, es decir, menos de 1 MB por día aunque el firewall genere 30 GB de logs.

### 6.3 Bóveda local (opcional por plan)

Para clientes sin ningún repositorio de logs que quieran poder investigar un incidente:

- Logs crudos comprimidos por hora (gzip reduce ~10:1) durante 7, 15 o 30 días.
- Nunca suben a la nube. Consultables desde el portal mediante evidencia bajo demanda: el colector filtra localmente por IP/usuario/rango de fechas y devuelve máximo N filas.
- Cuota de disco configurable; al llegar al límite se borra lo más antiguo.

### 6.4 Eventos críticos (tiempo real)

Evaluados sobre el flujo de eventos y sobre diffs de configuración, con tope diario por tenant:

| Evento | Origen |
|---|---|
| Login administrativo exitoso desde IP fuera de `trusted_hosts` o desde WAN | syslog admin |
| Cambio de configuración (dispara FetchConfig inmediato y diff) | syslog system |
| Nueva política con origen y destino `any` | diff de config |
| Ráfaga de IPS crítico o misma firma > X en 10 min | rollup parcial |
| > N intentos fallidos de VPN para un usuario en 15 min | syslog vpn |
| Failover HA, reinicio, CPU > 90 % sostenido | status / syslog |
| Certificado o licencia a menos de 15 días | config |

### 6.5 Hardware y almacenamiento

El syslog es la carga principal y determina el dimensionamiento. Supuesto: ~400 bytes por evento; gzip reduce 10:1.

| EPS | Perfil de cliente | Logs crudos/día | Bóveda 30 días | Sin bóveda | Con bóveda 30 días |
|---|---|---|---|---|---|
| 100 | 10–40 usuarios | 3,5 GB | 10 GB | 2 vCPU · 2 GB · 40 GB | 2 vCPU · 4 GB · 80 GB |
| 500 | 40–150 usuarios | 17 GB | 52 GB | 2 vCPU · 4 GB · 40 GB | 2 vCPU · 4 GB · 120 GB SSD |
| 2.000 | 150–500 usuarios | 69 GB | 210 GB | 4 vCPU · 8 GB · 60 GB | 4 vCPU · 8 GB · 400 GB SSD |

Distribución del disco: SO 15 GB; SQLite de rollups (90 días locales) 1–3 GB; buffer de envío 500 MB; logs del colector 200 MB; GeoIP 100 MB; bóveda según tabla.

**Modo medición**: al enrolar, el colector solo cuenta durante 24 h y reporta EPS, bytes promedio y disco disponible; el portal recomienda la retención de bóveda que cabe.

Recomendación de despliegue: VM Ubuntu Server en el hipervisor del cliente. Sin virtualización: mini PC Intel N100, 16 GB, NVMe 512 GB, entregado como sonda; cubre hasta 2.000 EPS con 30 días de bóveda. Evitar instalarlo en un servidor con otra carga sensible: el listener UDP es tráfico sostenido y la bóveda es escritura constante.

### 6.6 Operación del receptor syslog

```
firewall ──UDP/TCP 514──► listener ──► cola en memoria (50k) ──┬──► bóveda (gzip por hora, escritura cruda)
                                                               └──► workers parseo ──► FirewallEvent ──► agregación en memoria
                                                                                                             │ cada 1 min
                                                                                                             ▼
                                                                                                      SQLite (hora en curso)
                                                                                                             │ minuto 05
                                                                                                             ▼
                                                                                                   rollup de hora cerrada ──► envío
```

1. **Recepción**: 514/UDP y 514/TCP; 6514/TLS para marcas que lo soportan. El firewall se identifica por IP de origen contra `firewalls`; un colector atiende varios equipos de la misma sede.
2. **Bóveda primero**: la línea cruda se escribe antes de parsear en `vault/<firewall_id>/<YYYY-MM-DD>/<HH>.log.gz`. Un formato no reconocido no se pierde.
3. **Parseo y agregación**: workers convierten a `FirewallEvent`; contadores y top-N de la hora en curso viven en memoria y se persisten a SQLite cada minuto.
4. **Cierre de hora**: al minuto 05 la hora anterior se cierra y serializa. Eventos tardíos generan un rollup correctivo; la nube hace `upsert` por `(firewall_id, hour)`.
5. **Rotación**: job diario borra bóveda fuera de retención o cuota; agrega rollups locales > 90 días.
6. **Reloj**: NTP obligatorio; agrupación por hora de recepción; desfase con la marca de tiempo del firewall > 60 s genera FW-015.
7. **Sin internet**: recepción, bóveda y agregación continúan; hasta 7 días de rollups pendientes se suben al reconectar, en orden.

### 6.7 Sincronización con el SaaS

| Llamada | Frecuencia | Contenido | Nota |
|---|---|---|---|
| `POST /enroll` | Una vez | Token de un solo uso + clave pública Ed25519 | Devuelve `collector_id` y configuración |
| `POST /heartbeat` | Cada 5 min | Versión, EPS 1 min, descartes, cola, disco libre, desfase de reloj, EPS por firewall | La respuesta incluye órdenes pendientes (evidencia, cambio de frecuencia, `update_to`). A 5 min: ~8.600 invocaciones/mes por colector |
| `POST /ingest/rollups` | Por plan: 1 h / 4 h / diario | Horas cerradas, gzip | Idempotente; reenvío en orden tras desconexión |
| `POST /ingest/config` | Cada 4–24 h y al detectar cambio por syslog | `FirewallConfig` + sha256 | Si solo cambia el hash se envía el hash; la nube responde si necesita el cuerpo |
| `POST /ingest/events` | Lote cada 10 s si hay | Eventos críticos | Tope diario por tenant en la Edge Function |
| `POST /evidence/{id}` | Al completar una orden | Resultado (máx. N filas) | TTL 30 días en nube |

Actualización del colector: `update_to` en heartbeat → descarga desde Storage → verificación de firma → reemplazo del binario y reinicio del servicio.

Seguridad del transporte syslog: UDP en claro es aceptable dentro de la LAN. Sedes remotas: TCP/TLS donde la marca lo soporte, o syslog por el túnel IPsec existente, o un colector por sede. Nunca UDP por internet abierto.

### 6.8 Matriz de integración syslog por marca

| Marca | Activación en el firewall | Transporte | Formato | Identificación | Campos clave | Observaciones |
|---|---|---|---|---|---|---|
| FortiGate | `config log syslogd setting` → `set status enable`, `set server <ip>`, `set mode udp\|reliable` | UDP, TCP fiable | key=value | `devid`, `devname` | `type`, `subtype`, `logid`, `srcip`, `dstip`, `dstport`, `srcintf`, `dstintf`, `policyid`, `action`, `app`, `utmaction`, `attack`, `sentbyte`, `rcvdbyte`, `user`, `srccountry` | Requiere `set logtraffic all` en políticas para ver tráfico permitido. `set format default` (no CEF) para máximo de campos |
| Sophos XG/XGS | System Services › Log Settings › Syslog Servers; marcar categorías | UDP, TCP, TLS (v19+) | key=value | `device_id`, `device_name` | `log_type`, `log_component`, `log_subtype`, `src_ip`, `dst_ip`, `dst_port`, `fw_rule_id`, `user_name`, `application`, `category`, `sent_bytes`, `recv_bytes`, `src_country_code` | Formato "Device standard" (v18+). Marcar todas las categorías de Firewall, IPS, Web, Application y VPN |
| SonicWall | Device › Log › Syslog › Add; Syslog Format: Enhanced Syslog | UDP; TCP en SonicOS 7 | key=value | `sn=` (serial), `fw=` | `m=` (ID de mensaje), `src=`, `dst=`, `proto=`, `rule=`, `usr=`, `app=`, `note=`, `sent=`, `rcvd=` | El ID `m=` mapea categoría y acción según el catálogo de SonicOS. Log › Settings define qué categorías salen |
| MikroTik RouterOS 7 | System › Logging › Actions (remote, IP, BSD syslog) + Rules por topic (`firewall`, `info`, `error`) | Solo UDP | Texto plano | IP origen; `system identity` si BSD syslog | Prefijo de regla, `in:`, `out:`, `src-mac`, `proto`, `src→dst:port`, `len` | Sin bytes acumulados ni usuario; cada regla necesita `log=yes` y `log-prefix`. Menos hallazgos evaluables (declarado en `Capabilities`) |
| Palo Alto PAN-OS | Device › Server Profiles › Syslog; Objects › Log Forwarding; aplicar a cada política | UDP, TCP, SSL | CSV por posición | `hostname` (campo fijo) | Tipo (`TRAFFIC`, `THREAT`, `SYSTEM`, `CONFIG`), `src`, `dst`, `rule`, `app`, `action`, `bytes_sent`, `bytes_received`, `srcuser`, `threatid` | La posición de columnas cambia por versión de PAN-OS; el adaptador detecta la versión por número de columnas |
| pfSense / OPNsense | Status › System Logs › Settings › Remote Logging | UDP; TCP/TLS en OPNsense (syslog-ng) | `filterlog` CSV | IP origen | rule number, interface, action, direction, ip version, proto, src, dst, ports | Solo tráfico filtrado; sin UTM. Bytes por paquete, no por sesión |
| WatchGuard Firebox | System › Logging › Syslog | UDP, TCP | key=value | `serial` | `msg_id`, `src_ip`, `dst_ip`, `dst_port`, `proc_id`, `policy`, `app_name`, `sent_bytes`, `rcvd_bytes` | Activar logging por política en Policy Manager |
| Cisco ASA / FTD | `logging enable`, `logging host <if> <ip>`, `logging trap informational` | UDP, TCP | `%ASA-n-nnnnnn` | hostname en cabecera | Por ID de mensaje: 302013/302014 (TCP build/teardown), 106023 (deny), 113xxx (VPN auth), 111xxx (config) | Parseo por catálogo de IDs con regex por mensaje; bytes solo en teardown |
| Check Point | Log Exporter en Management (`cp_log_export`) | TCP/UDP | CEF o syslog | `origin` | `action`, `src`, `dst`, `service`, `rule_name`, `protection_name` | Raro en el segmento; se implementa si aparece demanda |
| Genérico | Según producto | UDP | RFC 5424 / CEF | IP origen | Severidad, facility, `deviceEventClassId` si CEF | Solo conteos por severidad y palabras clave |

**Asistente de onboarding en el portal**: el cliente elige marca, ingresa la IP del colector y el portal muestra los comandos o la ruta de menú con la IP ya sustituida, más una prueba en vivo ("esperando eventos…" → "recibiendo 120 EPS de FGT60F").

---

## 7. Catálogo de reglas genéricas (postura)

Se evalúan sobre `FirewallConfig` y rollups, sin conocer la marca. `Remediation(rule)` de cada adaptador devuelve los pasos concretos. El mapeo a marcos es genérico (una regla, cuatro marcos); el detalle por marco y las particularidades por marca están en §15.

| Código | Sev. | Hallazgo | ISO 27001:2022 | CIS Controls v8 | PCI DSS v4.0.1 | HIPAA (45 CFR) |
|---|---|---|---|---|---|---|
| FW-001 | Crítica | Administración (HTTPS/SSH) expuesta en interfaz WAN | 8.20, 8.9 | 4.2, 12.8 | 1.3.1, 2.2.7 | 164.312(a)(1) |
| FW-002 | Alta | Administrador sin MFA | 8.5 | 6.5 | 8.4.1 | 164.312(d) |
| FW-003 | Alta | Administrador sin restricción de hosts de confianza | 8.5, 8.20 | 4.2, 12.8 | 1.3.1 | 164.312(a)(1) |
| FW-004 | Media | Más de 2 administradores con perfil super | 8.2 | 5.4 | 7.2.1 | 164.312(a)(2)(i), 164.308(a)(3) |
| FW-005 | Alta | Firmware fuera de soporte o con vulnerabilidad conocida | 8.8 | 7.4, 12.1 | 6.3.3 | 164.308(a)(5)(ii)(B) |
| FW-006 | Crítica | Política `any → any` con servicio `ALL` habilitada | 8.20 | 4.2, 12.2 | 1.2.5, 1.3.1, 1.3.2 | 164.312(a)(1) |
| FW-007 | Media | Políticas sin hits en 90 días | 8.20 | 4.2 | 1.2.7 | 164.308(a)(8) |
| FW-008 | Media | Políticas permitidas sin logging | 8.15 | 8.2, 8.5 | 10.2.1 | 164.312(b) |
| FW-009 | Media | Políticas de salida sin inspección (IPS/AV/web/app) | 8.7, 8.20 | 13.3, 13.10 | 5.2.1, 11.5.1 | 164.308(a)(5)(ii)(B) |
| FW-010 | Alta | NAT entrante hacia servicios de administración o bases de datos | 8.20 | 12.2 | 1.3.1, 1.4.4 | 164.312(a)(1) |
| FW-011 | Alta | VPN remota sin MFA | 8.5 | 6.4 | 8.4.3 | 164.312(d) |
| FW-012 | Media | VPN con TLS < 1.2 o IPsec con IKEv1/DES/3DES/DH ≤ 5 | 8.24 | 3.10 | 4.2.1 | 164.312(e)(1), (e)(2)(ii) |
| FW-013 | Media | Certificado por vencer o autofirmado en portal público | 8.24 | 3.10 | 4.2.1 | 164.312(e)(1) |
| FW-014 | Baja | SNMP v1/v2c con comunidad por defecto | 8.20 | 4.2 | 2.2.2 | 164.312(a)(1) |
| FW-015 | Baja | Sin NTP o desfase de reloj > 60 s | 8.17 | 8.4 | 10.6.1 | 164.312(b) |
| FW-016 | Media | Licencias de seguridad vencidas o por vencer | 8.7, 8.8 | 10.1, 13.3 | 5.2.1, 11.5.1 | 164.308(a)(5)(ii)(B) |
| FW-017 | Baja | Sin destino de syslog adicional al colector | 8.15 | 8.9, 8.10 | 10.3.3, 10.5.1 | 164.312(b), 164.316(b)(2) |
| FW-018 | Media | HA configurado pero degradado | 8.14 | — | — | 164.308(a)(7) |
| FW-019 | Media | Descartes de syslog en el colector > 1 % | 8.15 | 8.2 | 10.2.1, 10.3.3 | 164.312(b) |
| FW-020 | Alta | Tráfico permitido hacia países de alto riesgo sin justificación | 8.20 | 12.2 | 1.3.2 | 164.312(a)(1) |

Reglas operativas (se evalúan sobre la actividad del servicio, no sobre la configuración):

| Código | Sev. | Hallazgo | ISO | CIS v8 | PCI | HIPAA |
|---|---|---|---|---|---|---|
| OP-001 | Media | Sin revisión de reglas en los últimos 6 meses (informe de hardening no generado o no aprobado) | 8.20 | 4.2 | 1.2.7 | 164.308(a)(8) |
| OP-002 | Media | Eventos críticos sin tratamiento en 7 días | 5.25, 8.16 | 17.4 | 10.4.1, 10.7 | 164.308(a)(6) |
| OP-003 | Alta | Retención de logs inferior a la exigida por el marco seleccionado | 8.15 | 8.10 | 10.5.1 | 164.316(b)(2) |
| OP-004 | Baja | Cambios de configuración sin actor identificado | 8.15, 8.32 | 8.5 | 10.2.1.6 | 164.312(b) |

---

## 8. Informes

| Informe | Audiencia | Periodicidad | Contenido |
|---|---|---|---|
| Ejecutivo de postura | Gerencia | Mensual | Score, tendencia, 5 riesgos principales, amenazas bloqueadas, plan a 30/60/90 días |
| Hardening del firewall | TI / MSSP | Mensual o bajo demanda | Todos los hallazgos con evidencia y remediación específica de la marca |
| Actividad de red | TI / gerencia | Mensual | Tráfico por interfaz y política, top apps y categorías, VPN, países, horarios |
| Amenazas | TI | Mensual / semanal | IPS, AV, web bloqueado, orígenes recurrentes, tendencias |
| Cambios de configuración | TI / auditoría | Mensual | Diff entre snapshots: políticas nuevas/modificadas, admins, VPN, quién y cuándo (syslog admin) |
| Cumplimiento | Auditoría / SGSI | Trimestral | Por marco seleccionado (ISO 27001, CIS, PCI DSS, HIPAA): controles evaluables desde el firewall, estado, brechas, evidencia enlazada y nota de alcance |
| Eventos críticos | TI | Al ocurrir / semanal | Alertas de alta severidad y su tratamiento |
| Línea base | Ambos | Al enrolar | Primera foto; sirve como "antes" del servicio |
| Comparativo de clientes | MSSP | Mensual | Ranking y patrones entre tus clientes |

Pipeline con Claude: igual que v0.1 (JSON estructurado de entrada → JSON de secciones → PDF con `@react-pdf/renderer`), cacheado por `(tipo, snapshot_id)`.

---

## 9. Esquema de datos (Supabase)

RLS por `tenant_id` con `is_tenant_member()`; Edge Functions con `service_role` validando el tenant desde el `collector_id`.

| Tabla | Propósito | Campos clave |
|---|---|---|
| `tenants`, `tenant_members`, `sites` | Igual que v0.1 | |
| `collectors` | Instancias enroladas | `site_id, public_key, version, last_seen_at, status, config jsonb, vault_days` |
| `firewalls` | Un registro por dispositivo | `site_id, brand, model, serial, firmware, ha_role, capabilities jsonb` |
| `config_snapshots` | Configuración normalizada | `firewall_id, collected_at, config jsonb, sha256` |
| `config_changes` | Diff entre snapshots consecutivos | `firewall_id, from_id, to_id, section, change jsonb, actor, ts` |
| `rollups_hourly` | Agregados por hora | `firewall_id, hour, type, action, count, bytes_in, bytes_out` |
| `rollups_topn` | Top-N por hora y dimensión | `firewall_id, hour, dimension, key, count, bytes` |
| `device_status` | Serie de estado | `firewall_id, ts, cpu, mem, sessions, ha_state` |
| `finding_rules` | Catálogo genérico | `code, severity, title, description, controls text[]` |
| `rule_remediations` | Remediación por marca | `rule_code, brand, steps` |
| `findings` | Ciclo de vida | `firewall_id, rule_code, asset_key, status, first_seen, last_seen, resolved_at` |
| `critical_events` | Tiempo real | `firewall_id, rule_code, severity, payload jsonb, ts` |
| `evidence_requests` | Consultas a bóveda o config | `firewall_id, query jsonb, status, result jsonb, expires_at` |
| `frameworks` | Marcos soportados | `code, name, version, log_retention_days` |
| `controls` | Catálogo de controles por marco | `framework_code, code, title, domain` |
| `rule_controls` | Mapeo genérico regla → control | `rule_code, framework_code, control_code` |
| `brand_benchmarks` | Ítems de CIS Benchmark por marca → regla | `brand, benchmark_version, item_code, item_title, rule_code` |
| `tenant_frameworks` | Marcos que el cliente declara aplicables | `tenant_id, framework_code, scope_note` |
| `compliance_assessments` | Estado por control, firewall y marco | `tenant_id, firewall_id, framework_code, control_code, status, evidence_finding_ids uuid[], assessed_at` |
| `reports`, `usage_quotas`, `usage_counters` | Igual que v0.1 | |

Retención en nube: `rollups_hourly` 13 meses (agregación diaria después de 90 días); `rollups_topn` 90 días; `config_snapshots` 12 meses; `config_changes` indefinido; `critical_events` 90 días.

---

## 10. Control de gasto por plan

| Parámetro | Básico | Estándar | Premium |
|---|---|---|---|
| Firewalls por tenant | 1 | 3 | 10 |
| Snapshots de config por día | 1 | 4 | 6 + al detectar cambio |
| Envío de rollups | Diario | Cada 4 h | Cada hora |
| Eventos críticos por día | 50 | 200 | 500 |
| Bóveda local de logs | No | 7 días | 30 días |
| Filas por consulta de evidencia | 200 | 500 | 2.000 |
| Tokens Claude por mes | 150k | 500k | 1.5M |
| Informes automáticos | Ejecutivo mensual | + hardening + actividad | + cumplimiento trimestral + amenazas semanal |

---

## 11. Score de postura

Dos componentes por firewall, combinados en un score 0–100:

- **Configuración (70 %)**: hallazgos abiertos ponderados por severidad (crítica 10, alta 5, media 2, baja 1), normalizado por número de políticas y administradores.
- **Operación (30 %)**: calidad de datos (descartes de syslog), licencias vigentes, estado HA, eventos críticos del período.

Se guarda en cada snapshot para tendencia; el score del tenant es el promedio ponderado de sus firewalls.

---

## 12. Fases

| Fase | Entregable | Criterio de salida |
|---|---|---|
| 0 | Esquema, JSON Schema, catálogo FW-001..020, `CLAUDE.md` | Migraciones aplicadas, RLS probada con dos tenants |
| 1 | Colector: enrolamiento, listener syslog, adaptador FortiGate (API + logs), rollups, bóveda local | Un FortiGate real enviando config y rollups a Supabase; logs crudos consultables en el colector |
| 2 | Motor de reglas, diff de configuración, dashboard de postura y actividad | Hallazgos con ciclo de vida y gráficas de tráfico en el portal |
| 3 | Informes ejecutivo, hardening y actividad con Claude en PDF | Informe descargable |
| 4 | Adaptador Sophos XG/XGS (XML API + syslog) | Mismo informe generado para Sophos sin tocar reglas ni portal |
| 5 | Eventos críticos, evidencia bajo demanda sobre la bóveda, cuotas | Límites aplicados por plan; consulta de logs desde el portal |
| 6 | Cumplimiento ISO/CIS/PCI, adaptadores adicionales, adaptador genérico | |

La fase 4 es la prueba real de la abstracción: si al agregar Sophos hay que modificar reglas o portal, el modelo normalizado está mal y conviene corregirlo antes de la tercera marca.

Nota sobre la bóveda en fase 1: solo se implementa la escritura (gzip por hora, rotación por días y por cuota de disco) y una consulta local por CLI (`collector vault query --ip X --from --to`). La consulta desde el portal llega en fase 5 con el mecanismo de evidencia bajo demanda.

---

## 13. Decisiones pendientes

1. Registrar dominio para EventReport (ver §16).
2. Retención por defecto de la bóveda en el plan básico (7 días propuesto) y cuota de disco máxima.
3. Verificar existencia y versión vigente de CIS Benchmark para SonicWall y WatchGuard antes de implementar sus adaptadores.
4. Facturación (Stripe) y firma de código del binario: posteriores al piloto.

## 14. Decisiones tomadas

| Fecha | Decisión |
|---|---|
| 2026-08-31 | Alcance: solo firewall, multimarca; cliente sin FortiAnalyzer/SIEM |
| 2026-08-31 | Nube: agregados + eventos críticos + evidencia bajo demanda; nunca logs crudos |
| 2026-08-31 | Un proyecto Supabase con RLS por tenant |
| 2026-08-31 | Producto independiente de HexDesk/Nortis/HexWatch |
| 2026-08-31 | Colector: binario Go en equipo o VM existente del cliente |
| 2026-08-31 | Marca MVP: FortiGate; segunda marca: Sophos XG/XGS |
| 2026-08-31 | Bóveda local de logs crudos desde fase 1 |
| 2026-08-31 | Marcos de cumplimiento: ISO 27001:2022, CIS (Controls v8 + Benchmarks por marca), PCI DSS v4.0.1, HIPAA |
| 2026-08-31 | Nombre del producto: EventReport |

---

## 15. Cumplimiento por marco y por marca

### 15.1 Principio de honestidad de alcance

Un firewall cubre una fracción de cualquier marco. El informe de cumplimiento nunca dice "cumple ISO 27001"; dice: "de los N controles del marco, M son evaluables desde el firewall; de esos, X cumplen, Y no cumplen y Z no son evaluables en esta marca". Así el cliente puede llevar el informe a su auditor como evidencia parcial, y tú no asumes una afirmación que no puedes sostener.

| Marco | Controles totales | Evaluables desde el firewall (aprox.) | Qué aporta el producto |
|---|---|---|---|
| ISO/IEC 27001:2022 Anexo A | 93 | 12–14 (8.2, 8.5, 8.7, 8.8, 8.9, 8.14, 8.15, 8.16, 8.17, 8.20, 8.24, 8.32, 5.25) | Evidencia técnica para el SGSI del cliente |
| CIS Controls v8 (IG1/IG2) | 153 salvaguardas | 15–18 (grupos 3, 4, 5, 6, 7, 8, 10, 12, 13, 17) | Estado por salvaguarda; complementa con CIS Benchmark de la marca |
| PCI DSS v4.0.1 | 12 requisitos / ~250 subrequisitos | Req. 1 casi completo; parcial en 2, 4, 5, 6, 8, 10, 11 | Evidencia para SAQ o auditoría del QSA sobre los NSC (network security controls) |
| HIPAA Security Rule (45 CFR 164.308/312/316) | 18 estándares / 42 especificaciones | 8–10 especificaciones técnicas | Evidencia de salvaguardas técnicas de red; aplica a clientes con datos de salud de EE. UU. o BPO/proveedores de entidades cubiertas |

HIPAA es ley estadounidense, no certificable; en Colombia aplica a clientes que procesan PHI de entidades cubiertas (BPO de salud, software médico exportado, filiales). Se ofrece como marco opcional que el tenant activa en `tenant_frameworks`.

### 15.2 Cómo se evalúa cada marco

Todos los marcos se evalúan con el mismo motor: una regla (FW-xxx u OP-xxx) tiene un estado (abierta/resuelta) y está mapeada a controles en `rule_controls`. El estado de un control se deriva así:

| Estado del control | Condición |
|---|---|
| `compliant` | Todas las reglas mapeadas al control están resueltas y son evaluables en la marca |
| `non_compliant` | Al menos una regla mapeada está abierta |
| `partial` | Algunas reglas evaluables están resueltas y otras no son evaluables en la marca |
| `not_assessable` | Ninguna regla mapeada es evaluable en la marca (`Capabilities` lo declara) |
| `not_applicable` | El cliente lo marcó como fuera de alcance con justificación (queda registrada) |

Marcos con exigencias de retención (PCI 10.5.1: 12 meses, 3 inmediatos; HIPAA 164.316(b)(2): 6 años de documentación) se evalúan con OP-003 contra la retención real del tenant: bóveda local + rollups en nube. Los rollups no son logs de auditoría; si el cliente selecciona PCI, el informe indica explícitamente que la bóveda de 30 días no satisface 10.5.1 y recomienda un destino secundario de syslog (FW-017), o el plan premium con bóveda extendida.

### 15.3 Componente por marca: CIS Benchmarks

CIS publica benchmarks de configuración específicos por producto. Donde existe, el adaptador de la marca mapea sus ítems a reglas FW-xxx en `brand_benchmarks`, y el informe de cumplimiento CIS muestra dos capas: salvaguardas de CIS Controls v8 (genéricas) e ítems del Benchmark de esa marca (específicos, con el número de ítem que el auditor reconoce).

| Marca | CIS Benchmark | Estado en el producto |
|---|---|---|
| FortiGate | CIS Fortinet FortiGate Firewall Benchmark | Fase 2: mapear ítems a FW-001..020; los ítems sin regla equivalente se agregan como reglas específicas de marca (FGT-xxx) |
| Sophos XG/XGS | CIS Sophos XG Firewall Benchmark | Fase 4, junto con el adaptador |
| Palo Alto PAN-OS | CIS Palo Alto Firewall Benchmark | Al implementar el adaptador |
| Check Point | CIS Check Point Firewall Benchmark | Al implementar el adaptador |
| Cisco ASA / FTD | CIS Cisco ASA / Firepower Benchmark | Al implementar el adaptador |
| pfSense | CIS pfSense Firewall Benchmark | Al implementar el adaptador |
| SonicWall, WatchGuard | Verificar disponibilidad y versión vigente (decisión pendiente 3) | Si no existe, solo CIS Controls v8 |
| MikroTik | No existe benchmark CIS | Solo CIS Controls v8; el informe lo indica |

Regla de mantenimiento: la versión del benchmark se guarda en `brand_benchmarks.benchmark_version` y aparece en el informe; cuando CIS publica una versión nueva se revisa el mapeo, no se rehace.

### 15.4 Evaluabilidad por marca

`Capabilities` de cada adaptador declara qué secciones del modelo puede llenar; de ahí se deriva qué reglas son evaluables y, por transitividad, qué controles. Estimación con la información disponible hoy:

| Marca | Reglas FW evaluables (de 20) | Limitaciones típicas |
|---|---|---|
| FortiGate | 20 | — |
| Sophos XG/XGS | 19 | Hit count por regla solo desde v18.5 |
| Palo Alto | 20 | — |
| SonicWall | 17 | Hit count limitado; sin detalle de perfiles UTM por API en versiones antiguas |
| WatchGuard | 16 | API sin hit counts |
| Cisco ASA | 14 | Sin UTM (FW-009, FW-016 no aplican); hit counts vía `show access-list` |
| pfSense / OPNsense | 13 | Sin UTM ni licencias; sin MFA nativa en admin (FW-002 evaluable solo con paquete) |
| MikroTik | 11 | Sin UTM, sin licencias, sin hit count fiable, MFA no nativa |
| Genérico (config manual) | Según lo que contenga el archivo | Solo postura; sin actividad |

### 15.5 Selección de marcos por tenant y flujo del informe

1. Al crear el tenant se seleccionan los marcos aplicables (ISO 27001 por defecto; CIS recomendado; PCI y HIPAA opcionales con nota de alcance).
2. Cada snapshot de configuración recalcula `compliance_assessments` para los marcos activos.
3. El informe de cumplimiento se genera por marco y por firewall, con: resumen de cobertura (§15.1), tabla de controles con estado y reglas de evidencia, brechas priorizadas por severidad, remediación específica de la marca, y anexo con el mapeo regla → control para el auditor.
4. Los controles `not_applicable` requieren justificación escrita del cliente y quedan en el historial con fecha y usuario.

---

## 16. Nombre del producto

**Decisión (2026-08-31): EventReport.**

Dominios verificados vía Vercel el 2026-08-31:

| Dominio | Estado | Precio/año |
|---|---|---|
| eventreport.com | No disponible | — |
| eventreport.app | No disponible | — |
| eventreport.io | Disponible | USD 30 |
| eventreport.co | Disponible | USD 29,99 |
| geteventreport.com | Disponible | USD 11,25 |

Recomendación: registrar eventreport.io como dominio principal y eventreport.co por el mercado colombiano; verificar el uso actual de eventreport.com antes de lanzar para evitar confusión de marca.

Alternativas consideradas y descartadas: HexWall (continuidad con HexDesk/HexWatch; hexwall.app e .io disponibles), Muralla (palabra común), Perimetra (conflicto con MSSP existente en EE. UU.).
