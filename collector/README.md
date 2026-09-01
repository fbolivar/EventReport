# Colector EventReport (Go)

El agente que corre dentro de la red del cliente. Recibe syslog, guarda los
registros crudos en disco del cliente, los normaliza, los agrega por hora y sube
solo resúmenes firmados. **Los logs crudos nunca salen de la empresa.**

Especificación: [`../docs/diseno-tecnico.md`](../docs/diseno-tecnico.md) §6.

## Estado

Fase 1 del §12: enrolamiento, receptor de syslog, adaptador FortiGate (API y
registros), agregación por hora, bóveda local y transporte firmado. Sin
dependencias externas: solo biblioteca estándar de Go 1.24+.

```bash
go test ./...     # 8 paquetes en verde
go build ./cmd/collector
```

## Comandos

```bash
collector enroll -token <token> -url https://<proyecto>.supabase.co
collector run                       # recibe, agrega y envía
collector test                      # prueba la API del firewall
collector vault -device <id>        # consulta la bóveda local
```

## Cómo está armado

```
cmd/collector      CLI
internal/normalize contrato multimarca (espeja packages/schema)
internal/adapter   interfaz por marca; fortigate/ es la única implementada
internal/syslog    receptor UDP y TCP con cola acotada y contador de descartes
internal/vault     bóveda local: un gzip por equipo y hora, rotación y cuota
internal/aggregate contadores y top-N por hora
internal/buffer    envíos pendientes, en orden y a prueba de reinicio
internal/transport firma Ed25519, reintentos con espera creciente
internal/pipeline  une todo: recibir → bóveda → parsear → agregar → cerrar hora
```

## Decisiones que conviene conocer

**La línea cruda se escribe en la bóveda antes de parsearla.** Un formato que el
adaptador no reconoce no se pierde: queda en disco y se puede investigar. Lo que
no se reconoce se cuenta como calidad del dato y aparece en el informe.

**La cola es finita a propósito** (50.000 líneas). Cuando se llena se descarta lo
más viejo y se cuenta: quedarse atrás no puede convertirse en memoria creciente
en una máquina del cliente. Ese contador es el que abre FW-019 al pasar del 1 %.

**Se agrupa por hora de recepción, no por el reloj del firewall** (§6.6). Un
equipo con el reloj corrido repartiría su tráfico entre horas que nunca cierran.
La diferencia entre ambos relojes viaja como desfase, que es lo que mira FW-015.

**El tenant nunca viaja en el cuerpo.** La nube lo resuelve desde el
`collector_id` firmado; un colector comprometido no puede escribir en los datos
de otra empresa cambiando un campo.

**Las credenciales del firewall se cifran en disco** (AES-GCM con clave derivada
por PBKDF2) y no salen de la máquina. La clave privada Ed25519 tampoco.
