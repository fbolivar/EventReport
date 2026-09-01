# EventReport — guía para Claude Code

## Qué es
SaaS que convierte logs y configuración del firewall de una PYME en informes ejecutivos, técnicos y de cumplimiento (ISO 27001:2022, CIS, PCI DSS v4.0.1, HIPAA). Un colector en Go recibe syslog y consulta la API del firewall en la red del cliente; agrega localmente y sube solo resúmenes. Diseño completo en `docs/diseno-tecnico.md`; es la fuente de verdad.

## Stack
Next.js 15 App Router · TypeScript estricto · Tailwind v4 · shadcn/ui · Supabase (Postgres, Auth, Storage, Edge Functions) · Vercel · pnpm · Node 20. Colector en Go (`collector/`), fuera del alcance hasta que se indique.

## Reglas que no se negocian
- Toda tabla nueva lleva `tenant_id` y RLS desde la misma migración. Sin excepciones.
- Ninguna credencial de firewall, token o clave viaja en snapshots ni se guarda en la nube.
- Ningún log crudo sube a Supabase; solo `FirewallConfig` normalizado, rollups y hallazgos.
- Los esquemas de `packages/schema` son versionados; un cambio incompatible sube la versión mayor.
- Sin `any`, sin `@ts-ignore`, sin valores visuales inline: todo desde `styles/tokens.css`.
- Copy de interfaz y marketing en `content/`, nunca en JSX. Español neutro; código en inglés.

## Estructura
`apps/web` (Next.js) · `packages/schema` (JSON Schema) · `supabase/` (migraciones, seed, functions) · `collector/` (Go) · `docs/`.
Componentes: `components/ui` (shadcn, no editar) · `components/marketing` (una carpeta por sección) · `components/app` (por dominio: findings, activity, compliance, reports, settings) · `components/shared`.

## Diseño
- `docs/design-notes.md` guarda el plan de diseño y las decisiones; leerlo antes de tocar estilos.
- `/styleguide` (solo dev) muestra tokens y componentes en todos sus estados; mantenerla al día.
- Un solo color de marca; severidades como tokens fijos; mono solo para valores técnicos literales.
- Sin patrones genéricos: sin eyebrows en mayúsculas, sin flechas en botones, sin tarjetas idénticas con sombra, sin animaciones por sección.

## Flujo
- Ramas `feat/<bloque>`, PR a `main`, commits convencionales en inglés.
- Antes de reportar un bloque como listo: `pnpm lint && pnpm typecheck && pnpm build`; revisar 390 / 820 / 1440 px.
- Detenerse al final de cada bloque y esperar revisión de Fernando en el navegador.
- Ante ambigüedad con `docs/diseno-tecnico.md`, preguntar; no asumir.

## Comandos
```
pnpm install
pnpm dev                 # apps/web en http://localhost:3000
pnpm lint && pnpm typecheck && pnpm build
supabase start           # stack local
supabase db reset        # migraciones + seed
supabase gen types typescript --local > apps/web/lib/supabase/types.ts
```

**Detener `pnpm dev` antes de `pnpm build`.** Los dos escriben en `apps/web/.next`; si el build
corre con el servidor levantado, reemplaza los chunks que el proceso tiene cargados y el
siguiente request falla con `Cannot find module './15.js'`. Recuperación: matar el proceso del
puerto 3000, borrar `apps/web/.next` y relanzar `pnpm dev`.