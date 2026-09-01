# Edge Functions

Esqueletos tipados de las seis llamadas del colector (§6.7). Cada una valida la
forma del cuerpo, verifica la firma Ed25519 y resuelve el tenant desde el
`collector_id` antes de tocar la base; la lógica de negocio llega con el
colector en la fase 1, marcada con `TODO(fase N)`.

| Función | Frecuencia | Qué recibe |
|---|---|---|
| `enroll` | Una vez | Token de un solo uso y clave pública del colector |
| `heartbeat` | Cada 5 min | Salud del colector; responde órdenes pendientes |
| `ingest-rollups` | 1 h / 4 h / diario según plan | Horas cerradas, idempotentes por `(firewall, hora, tipo, acción)` |
| `ingest-config` | Cada 4–24 h y al detectar cambio | `FirewallConfig` normalizado y su sha256 |
| `ingest-events` | Lote cada 10 s | Eventos críticos, con tope diario por plan |
| `evidence` | Al completar una orden | Resultado de una consulta a la bóveda local |

**El tenant nunca se toma del cuerpo**: se resuelve desde el `collector_id`
firmado. Un colector comprometido no puede escribir en los datos de otra
empresa cambiando un campo.

Estas funciones usan la clave `service_role` y por tanto saltan RLS: son el
único lugar donde eso ocurre, y por eso la resolución del tenant y el control de
cuotas viven en `_shared/collector-auth.ts`.

Las respuestas hoy son `501 not implemented`: el contrato existe y se puede
probar, la lógica no.

Despliegue (cuando tengan lógica):

```bash
supabase functions deploy heartbeat --project-ref xhprvnpmyrwsxdzhprqu
```
