# EventReport

Convierte los logs y la configuración del firewall de una PYME en informes ejecutivos, técnicos y
de cumplimiento (ISO 27001:2022, CIS Controls v8 + Benchmarks, PCI DSS v4.0.1, HIPAA), sin que el
cliente necesite FortiAnalyzer ni SIEM.

Un colector en Go recibe syslog y consulta la API del firewall dentro de la red del cliente,
agrega localmente y sube solo resúmenes. **Los logs crudos nunca salen de la empresa.**

Diseño completo y fuente de verdad: [`docs/diseno-tecnico.md`](docs/diseno-tecnico.md).
Decisiones de diseño visual: [`docs/design-notes.md`](docs/design-notes.md).
Guía de trabajo para agentes: [`CLAUDE.md`](CLAUDE.md).

## Estructura

```
apps/web         Portal y landing (Next.js 15, App Router)
packages/schema  Contrato normalizado multimarca, compartido con el colector
supabase/        Migraciones, seed (reglas, marcos, controles) y Edge Functions
collector/       Colector en Go (fase 1)
docs/            Diseño técnico, notas de diseño, capturas
```

## Requisitos

Node 20 o superior, pnpm 10.

## Puesta en marcha

```bash
pnpm install
cp .env.example apps/web/.env.local   # completar con las claves del proyecto Supabase
pnpm dev                              # http://localhost:3000
```

## Supabase

Proyecto de desarrollo: `eventreport` · ref `xhprvnpmyrwsxdzhprqu` · región `us-east-1`,
organización `bc-fabric-sas`.

```bash
node supabase/seed/generate.mjs   # regenera seed.sql desde apps/web/lib/fixtures
```

Las migraciones de `supabase/migrations/` están aplicadas. Toda tabla con datos de cliente lleva
`tenant_id` y RLS; los catálogos globales (reglas, marcos, controles) llevan RLS de solo lectura.
Las escrituras de telemetría entran por Edge Functions con `service_role`, nunca desde el navegador.

## Comprobaciones antes de un PR

```bash
pnpm lint
pnpm typecheck
pnpm build
```

En desarrollo, `/styleguide` muestra los tokens y todos los componentes en sus estados.

## Licencia

Software propietario de BC Fabric SAS. Todos los derechos reservados.
