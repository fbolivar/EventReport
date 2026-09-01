# Colector EventReport (Go)

Fuera de alcance hasta la fase 1. Este directorio queda reservado.

El colector se instala en un equipo o VM del cliente y hace todo el trabajo pesado dentro de su
red: recibe syslog en 514/UDP y 514/TCP, consulta la API del firewall para la configuración y el
estado, normaliza a `FirewallConfig` / `FirewallEvent`, agrega por hora y envía solo resúmenes
firmados al SaaS. Los logs crudos se guardan comprimidos en la bóveda local y nunca suben.

Especificación: [`../docs/diseno-tecnico.md`](../docs/diseno-tecnico.md) §6.
Contrato compartido con el portal: [`../packages/schema`](../packages/schema).

Estructura prevista (§6.1):

```
cmd/collector/main.go      install | uninstall | run | enroll | test | vault
internal/enroll            token de un solo uso, claves Ed25519
internal/config            credenciales cifradas (DPAPI / clave derivada)
internal/syslog            listener UDP/TCP, cola en memoria, backpressure
internal/adapter           fortigate/, sophos/, sonicwall/, mikrotik/, generic/
internal/normalize         FirewallConfig, FirewallEvent, GeoIP local
internal/aggregate         rollups horarios, top-N, HyperLogLog
internal/rules             evaluación de FW-001..020 y OP-001..004
internal/vault             bóveda local de logs crudos (gzip por hora)
internal/buffer            SQLite: rollups y snapshots pendientes
internal/transport         firma, gzip, reintentos, poll de órdenes
internal/scheduler
```
