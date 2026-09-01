# EventReport — notas de diseño

> Plan de diseño previo a cualquier componente. Se actualiza con cada decisión no obvia.
> Estado: propuesta v1, pendiente de aprobación de Fernando (2026-08-31).

---

## 1. Posicionamiento visual

El comprador es un gerente o un responsable de TI de una empresa de 20–300 personas que ya paga
un firewall y no sabe qué le está diciendo. Lo que compra no es un dashboard: es **un informe que
puede llevar a una junta o a un auditor**. Por eso el diseño trata la interfaz como un documento
de análisis, no como una consola de seguridad.

Registro: tecnológico, claro, sobrio, con peso editorial. Nada de estética "SOC oscuro": el
producto se lee en pantalla y se imprime en PDF, y ambos deben verse iguales.

---

## 2. Paleta

Base clara, una sola superficie de peso (azul tinta) y un solo color de marca. El color saturado
está reservado para dos cosas: acciones y riesgo. Nada más lleva color.

| Token | Hex | Nombre | Uso |
|---|---|---|---|
| `--color-paper` | `#FFFFFF` | paper | Fondo de página y de tarjetas de informe |
| `--color-mist` | `#F3F5F8` | mist | Superficie secundaria fría: tablas zebra, paneles, bloques de log |
| `--color-ink` | `#0C1B2A` | ink | Superficies de peso: hero, footer, sidebar del portal. También el texto primario |
| `--color-ink-soft` | `#5A6B7C` | ink-soft | Texto secundario, etiquetas, ejes de gráficas |
| `--color-line` | `#E2E7EC` | line | Bordes y separadores (único gris de estructura) |
| `--color-signal` | `#0E5FD8` | signal | **Único color de marca**: acciones primarias, enlaces, serie principal de datos |

Severidades — fijas, accesibles sobre `paper` (contraste ≥ 4.5:1 en texto) y sobre `ink`
(variante `-on-ink`, más clara). Cada una tiene además un `-tint` al 8 % para el fondo de sus chips.

| Token | Hex | Etiqueta en UI |
|---|---|---|
| `--sev-critical` | `#B3261E` | Crítica |
| `--sev-high` | `#C2410C` | Alta |
| `--sev-medium` | `#A16207` | Media |
| `--sev-low` | `#546374` | Baja |
| `--sev-resolved` | `#0F766E` | Resuelta |

Decisión: **baja es gris pizarra, no azul**. Si fuera azul competiría con `signal` y con la serie
de datos, y el usuario leería "acción" donde hay "hallazgo menor". Los cinco valores deben quedar
distinguibles en escala de grises y en deuteranopía (se verifica en `/styleguide`).

Estados de control de cumplimiento (§15.2 del diseño técnico) reutilizan la escala de severidad:
`compliant` = resolved · `non_compliant` = critical · `partial` = medium · `not_assessable` =
línea + trama diagonal · `not_applicable` = ink-soft con texto tachado. Los dos últimos no llevan
color de riesgo porque no son un fallo: son ausencia de evaluación. Así el principio de honestidad
de alcance (§15.1) se sostiene también a nivel visual.

---

## 3. Tipografía

Una sola familia sans con rango completo de pesos, y una mono **solo** para valores técnicos
literales (IP, ID de regla, hash, línea de log, número de ítem CIS). Nunca mono en etiquetas.

- Texto e interfaz: **Geist Sans** (MIT, self-hosted vía `next/font`).
- Valores técnicos: **Geist Mono**.

Elegidas por licencia libre, buen rango de pesos, cifras tabulares y un dibujo neutro-técnico sin
la ubicuidad de Inter. Si el par no convence en pantalla, la alternativa es Inter/JetBrains Mono y
el cambio es un token.

Escala (7 pasos, definida en `tokens.css` con su line-height y tracking):

| Paso | Tamaño | Line-height | Peso | Uso |
|---|---|---|---|---|
| `display` | clamp 36→56px | 1.04 | 620 | Titular del hero |
| `h1` | 32px | 1.16 | 600 | Título de sección de landing / de página del portal |
| `h2` | 24px | 1.25 | 600 | Subsección, título de tarjeta de informe |
| `h3` | 19px | 1.35 | 600 | Título de hallazgo, encabezado de bloque |
| `body` | 16px | 1.60 | 400 | Texto corrido |
| `small` | 14px | 1.50 | 400/500 | Tablas, controles, texto de apoyo |
| `micro` | 12.5px | 1.40 | 500 | Encabezados de tabla, metadatos. **Sentence case, nunca versalitas** |

Cifras siempre con `font-variant-numeric: tabular-nums` para que las columnas no bailen.

---

## 4. Espaciado, forma y movimiento

- Escala 4px: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128. Ritmo vertical de sección en la
  landing: 96px en móvil, 128px en escritorio.
- Radios en dos niveles: `--radius-control` 6px (botón, input, chip) y `--radius-surface` 12px
  (tarjeta, panel, drawer). Un tercer nivel sería ruido.
- Sombras: solo dos, y solo en lo que flota. `--shadow-pop` (drawer, popover, menú) y
  `--shadow-hover` (fila de tabla activa). Las tarjetas de informe **no llevan sombra**: se
  separan por línea y por espacio. Es la diferencia entre "documento" y "dashboard genérico".
- Movimiento: una única secuencia orquestada al cargar el hero — el informe se construye a partir
  de eventos (líneas de log → contadores → hallazgo → score), ~1,6 s, una sola vez. El resto
  responde solo a acción del usuario (hover de fila, apertura de drawer, cambio de pestaña).
  Duraciones 120 / 200 / 320 ms, easing `cubic-bezier(0.2, 0, 0, 1)`.
  Con `prefers-reduced-motion: reduce` el hero muestra el estado final sin transición.

---

## 5. Concepto de layout

**Landing**: contenido a 1200px, columna de texto máxima de 68ch. Solo dos superficies `ink` a
sangre completa (hero y footer); el resto es `paper` con separadores. Las secciones no son
tarjetas: son bloques con jerarquía por tamaño y espacio.

**Portal**: sidebar fija de 248px sobre `ink` (única zona oscura), barra superior con selector de
tenant y rango de fechas, contenido a 1440px. La sidebar ancla la navegación y deja todo el peso
visual al contenido claro, que es el informe.

### Hero

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▪ EventReport    Producto  Cumplimiento  Marcas  Precios     [Solicitar demo] │
├──────────────────────────────────────────────────────────────────────────────┤
│ ░░░ superficie ink, a sangre ░░░                                             │
│                                       ┌───────────────────────────────────┐  │
│  Tu firewall ya sabe                  │ Informe ejecutivo · Agosto 2026   │  │
│  qué está pasando.                    │ ───────────────────────────────── │  │
│  Nosotros lo ponemos                  │  Postura         ┌──────┐         │  │
│  por escrito.                         │  del perímetro   │  74  │  ▲ +9   │  │
│                                       │                  └──────┘         │  │
│  Informes ejecutivos, técnicos y de   │  ───────────────────────────────  │  │
│  cumplimiento a partir de los logs y  │  ● Crítica   Administración HTTPS │  │
│  la configuración de tu firewall.     │    expuesta en WAN       FW-001   │  │
│  Sin FortiAnalyzer. Sin SIEM.         │    → Restringir acceso admin…     │  │
│                                       │  ───────────────────────────────  │  │
│  [Solicitar demo]  [Ver un informe]   │  ISO 27001   14 evaluables  9 ✓   │  │
│                                       └───────────────────────────────────┘  │
│                                         ↑ componentes reales del portal      │
└──────────────────────────────────────────────────────────────────────────────┘
```

La tarjeta de la derecha se compone con `PostureScore`, `FindingCard` y `ControlMatrix` — los
mismos del portal. Al cargar se construye: primero pasan líneas de log en mono, luego cuajan los
contadores, luego aparece el hallazgo y al final el score. Es la demostración del producto, no una
ilustración.

### Dashboard

```
┌────────────┬─────────────────────────────────────────────────────────────────┐
│ ▪ EventRep.│ Acme S.A.S. ▾           Últimos 30 días ▾       Generar informe  │
│            ├─────────────────────────────────────────────────────────────────┤
│ Resumen    │ ┌──────────────┐ ┌─────────────────────────────────────────────┐ │
│ Hallazgos  │ │              │ │ Tendencia 90 días                           │ │
│ Actividad  │ │      74      │ │        ╭─╮      ╭──╮                        │ │
│ Cumplim.   │ │  Postura     │ │  ╭─╮╭──╯ ╰──╮╭──╯  ╰───                     │ │
│ Informes   │ │  ▲ +9 vs jul │ │──╯ ╰╯       ╰╯                              │ │
│ Ajustes    │ └──────────────┘ └─────────────────────────────────────────────┘ │
│            │ ┌───────────────────────┐ ┌───────────────────────────────────┐ │
│            │ │ Hallazgos abiertos 14 │ │ Colector                          │ │
│ ─────────  │ │ ██ Crítica    2       │ │ ● Activo · FGT60F  118 EPS        │ │
│ Colector ● │ │ ███ Alta      4       │ │ ● Activo · XGS116   41 EPS        │ │
│ Acme S.A.S │ │ █████ Media   6       │ │ Bóveda 30 d · 62 GB libres        │ │
│            │ │ ██ Baja       2       │ │ Último envío hace 4 min           │ │
│            │ └───────────────────────┘ └───────────────────────────────────┘ │
│            │ Eventos críticos recientes                                      │
│            │ 10:42  Login admin desde 190.85.x.x fuera de trusted_hosts  ●   │
│            │ 08:11  Nueva política any→any en FGT60F                     ●   │
└────────────┴─────────────────────────────────────────────────────────────────┘
```

---

## 6. Tres principios que hacen reconocible a EventReport

1. **El informe es la interfaz.** Un solo juego de componentes (`PostureScore`, `FindingCard`,
   `ControlMatrix`, `SeverityBadge`) se usa en el portal, en la landing y en el PDF. Cambiar un
   token cambia los tres. El cliente ve en la web exactamente lo que va a recibir.
2. **El color es riesgo; todo lo demás es tinta y papel.** Solo hay dos fuentes de color: la acción
   (`signal`) y la severidad. Ninguna sección, ningún icono y ninguna tarjeta decorativa compiten
   por atención con un hallazgo crítico.
3. **La evidencia se escribe en mono; la interpretación en sans.** Toda IP, ID de regla, hash,
   línea de log o número de control va en Geist Mono. Es un contrato visible: lo que está en mono
   viene del firewall, lo que está en sans lo dice EventReport.

---

## 7. Revisión contra la lista de "lo que no queremos"

| Patrón prohibido | Estado del plan |
|---|---|
| Crema + serif + terracota | No: base blanca/tinta, sans única |
| Negro + verde ácido | No: `ink` es azul tinta `#0C1B2A`, nunca negro |
| Layout de periódico con líneas finas | No: jerarquía por tamaño y espacio; línea solo donde separa datos |
| Eyebrows en versalitas | Prohibido por token: el paso `micro` va en sentence case |
| Punto medio como separador, flecha al final del botón | No aparecen; botones con texto solo |
| Numeración 01/02/03 | Solo en "Cómo funciona", que **sí** es una secuencia de tres pasos |
| Tarjetas idénticas con sombra gris | Las tarjetas de informe no llevan sombra; solo dos sombras, para lo que flota |
| Gradientes decorativos | Ninguno |
| Aparición por scroll en cada sección, hover en cada tarjeta | Una sola secuencia, en el hero; hover solo donde hay acción |
| Una palabra del titular en otro color | El titular del hero es de un solo color |

---

## 8. Descartado (y por qué)

- **Tema oscuro para el portal**: el producto se imprime y se lleva a una junta; dos estéticas
  divergen del PDF. La única zona oscura es la sidebar, como ancla de navegación.
- **Un color por dominio de score** (configuración/operación): añadía cuatro colores que no son
  riesgo. Se distinguen por posición y etiqueta.
- **Iconografía ilustrada en "El problema"**: el brief la prohíbe y el texto en primera persona del
  cliente funciona mejor solo, en tipografía grande.
- **Azul como severidad baja**: colisiona con `signal`. Resuelto con gris pizarra.
- **Tres niveles de radio**: sin ganancia informativa.

---

## 9. Decisiones cerradas (2026-08-31, delegadas por Fernando)

1. **Tipografía: Geist Sans + Geist Mono.** Licencia MIT, self-hosted vía `next/font`, cifras
   tabulares y un dibujo neutro-técnico. Si en pantalla no convence, el cambio es un token.
2. **`signal` se queda en `#0E5FD8`.** Descartado el azul petróleo `#0B6B7A`: está a un paso de
   `--sev-resolved` `#0F766E` y el usuario leería "resuelto" donde hay un botón. Con `ink` azul,
   la distancia se sostiene por saturación y luminosidad, no por tono, y `signal` solo aparece en
   acciones y en la serie principal de datos, nunca como fondo.
3. **El logo dice "EventReport" a secas**, con una marca cuadrada como ancla. "BC Fabric SAS"
   aparece solo en el footer y en el pie del PDF.

---

## 10. Registro de bloques

### Bloque 1 — andamiaje (2026-08-31)

- Monorepo pnpm: `apps/web`, `packages/schema`. Next.js 15.5, React 19, Tailwind v4, TS estricto.
- `packages/schema` guarda el contrato normalizado (§4 del diseño técnico) como TypeScript, no
  como JSON Schema todavía: el portal lo consume por `transpilePackages` y los fixtures del
  bloque 4 tienen que pasar por los mismos tipos que usará Supabase. El JSON Schema para el
  colector se genera desde aquí en la fase 1, cuando exista un consumidor en Go.
- TS con `noUncheckedIndexedAccess` y `verbatimModuleSyntax`; ESLint con `no-explicit-any` y
  `ban-ts-comment` en `error`, para que las reglas de `CLAUDE.md` las verifique la herramienta y
  no la disciplina.
- `next lint` está deprecado y desaparece en Next 16: el script `lint` llama a `eslint .`
  directamente con configuración plana.
- Tokens en `styles/tokens.css` con prefijo `--er-*`; `globals.css` los mapea a utilidades de
  Tailwind con `@theme inline`. Ningún valor literal vive fuera de `tokens.css`.
- Utilidad `.value` para todo dato literal del firewall: aplica la mono y las cifras tabulares.
  Es el principio 3 hecho una sola clase.

### Bloque 2 — sistema de diseño y `/styleguide` (2026-08-31)

- `/styleguide` vive en el grupo `(dev)` y devuelve 404 en producción. Es mesa de trabajo, no
  página del producto.
- **Las etiquetas en español salieron de `packages/schema`.** El paquete viaja al colector en Go;
  solo lleva códigos. Todo el texto visible está en `content/labels.ts`, así que renombrar un
  estado no toca el contrato ni ningún componente.
- Los componentes de informe (`PostureScore`, `TrendChart`, `SeverityBreakdown`, `FindingCard`,
  `ControlMatrix`, `ScopeNote`, `CollectorStatus`) son servidor puro y sin dependencias de
  gráficas: `TrendChart` es SVG en línea. Así el mismo componente sirve al portal, a la landing
  y al PDF, que era el principio 1.
- `EmptyState` / `ErrorState` reciben la acción como `ReactNode`, no como `onClick`. Con un
  manejador tendrían que ser componentes de cliente y arrastrarían al portal entero; así el
  llamador decide si es enlace o botón.
- Severidad con punto sólido además del color: la guía incluye el mismo bloque en escala de
  grises como prueba de que la información sobrevive sin color.
- `components/ui/` sigue vacío a propósito. shadcn/ui entra cuando haga falta una primitiva con
  comportamiento real (drawer, tabs, select del portal); lo que existe hoy es tipografía y color,
  y eso no necesita una dependencia.

### Bloque 3 — landing (2026-08-31)

- **La barra superior vive sobre tinta y se funde con el hero**: la parte alta del sitio es un
  solo bloque oscuro y el resto es papel. Evita el sándwich de una barra blanca sobre un hero
  oscuro y deja el peso visual donde está el argumento.
- **El informe del hero son los componentes reales** (`PostureScore`, `FindingCard`,
  `ControlMatrix`) con los fixtures del portal. Para que cupiera se agregó `compact` a
  `FindingCard`, que oculta la descripción de la regla; se usa también en listas densas.
- **La secuencia de carga es CSS puro**: `@keyframes er-build-in` más seis clases de retardo en
  `globals.css`. Cero JavaScript, cero librería de animación, y el hero sigue siendo componente de
  servidor. Con `prefers-reduced-motion` el bloque global de `globals.css` la anula y se ve el
  estado final.
- Alternancia de fondo `paper` / `mist` para separar secciones sin líneas ni tarjetas: problema
  (papel), cómo funciona (niebla), lo que recibes (papel), cumplimiento (papel), marcas (niebla),
  datos (papel), precios (papel), cierre (niebla).
- El plan recomendado se distingue por borde tinta y botón primario, no por una etiqueta de color
  ni por una tarjeta más alta.
- Precios, disponibilidad de marcas, conteos de controles y correo de contacto quedaron marcados
  con `// REVISAR` en `content/marketing.ts`.

### Bloque 4 — portal con fixtures (2026-08-31)

- **El estado de las vistas vive en la URL, no en el cliente.** Filtros de hallazgos, marco de
  cumplimiento, rango de actividad, marca del asistente y el detalle abierto son parámetros de
  búsqueda; todas las páginas son componentes de servidor. Ventajas: cada vista es compartible y
  recargable, y cuando entren las consultas a Supabase no hay que reescribir la capa de estado.
  El único componente de cliente del portal es la barra lateral, y solo para saber qué sección
  está abierta (`useSelectedLayoutSegment`).
- **El estado de cumplimiento se deriva, no se escribe.** `assessmentsFor()` aplica la tabla del
  §15.2 sobre las reglas mapeadas y las `Capabilities` de cada marca; resolver un hallazgo cambia
  el control solo. Esa misma función alimentará `compliance_assessments` en Supabase, así que el
  motor se prueba antes de existir la base de datos.
- **Los fixtures pasan por los tipos del contrato compartido.** Rollups horarios deterministas
  (jornada laboral, VPN nocturna, ráfagas de IPS), 14 hallazgos abiertos y 3 resueltos, eventos
  críticos, informes y el mapeo regla → control completo del §7.
- **El fondo tinta lo lleva la columna, no la barra fija.** La barra lateral es `sticky` dentro de
  una columna `bg-ink` que se estira; si el `bg-ink` va en el elemento `h-dvh`, el color se corta
  a la altura de la ventana y el resto de la columna queda blanco en páginas largas.
- En móvil la barra de postura se oculta bajo 640 px: con la etiqueta y el número no queda ancho
  útil, y una barra de 10 px no informa, solo ensucia.

### Bloque 5 — autenticación, datos reales y Edge Functions (2026-09-01)

- **El portal dejó de leer fixtures.** `lib/data/*` devuelve los mismos tipos del contrato
  compartido que devolvían los fixtures, así que ningún componente cambió de forma: solo pasaron
  a recibir por props lo que antes importaban (`FindingsTable`, `FindingDrawer`,
  `CriticalEventList`, `AppSidebar`). Los fixtures siguen vivos para `/styleguide` y la landing.
- **Ninguna consulta filtra por tenant a mano.** Lo hace RLS. Si una consulta devolviera filas de
  otro cliente sería un fallo de la base, no de la interfaz, y por eso la prueba de RLS con dos
  tenants vale más que cualquier revisión del código de la página.
- **El motor de cumplimiento salió a `lib/compliance/derive.ts`**, función pura. La usan los
  fixtures y las consultas a Supabase, y dará el mismo resultado cuando el cálculo se ejecute en
  el servidor. Verificado: con datos reales, PCI DSS da los mismos 20 controles evaluables, 4 que
  cumplen y 16 que no.
- **La comparación del score es contra hace un mes, no contra ayer.** Con datos diarios reales el
  delta diario era 0 y la tarjeta decía "▲ 0 puntos", que no informa nada. El informe es mensual;
  la comparación también.
- El correo de los miembros vive en `auth.users`, que no se expone por la API. Lo entrega
  `tenant_member_profiles()`, SECURITY DEFINER con el filtro de membresía **dentro** de la
  función: nadie puede pedir los miembros de un tenant ajeno.

#### Auto-blindaje: un usuario creado por SQL rompe el login

Insertar en `auth.users` deja en NULL columnas que GoTrue lee como cadenas no nulas
(`confirmation_token`, `recovery_token`, `email_change*`, `reauthentication_token`), y el endpoint
de token responde `500 Database error querying schema` sin decir por qué. El formulario solo veía
"error inesperado".

Se encontró llamando al endpoint de auth con `curl`, no depurando la interfaz: la capa que falla
es la que hay que interrogar. **Regla:** un usuario creado por SQL lleva esas columnas en `''`;
lo natural es crearlos por la API de administración cuando exista el flujo de invitación.

#### Auto-blindaje: rejillas sin columna base desbordan en móvil

`grid ... lg:grid-cols-[...]` sin definir columnas en el ancho base deja la columna en `auto`.
Con un hijo `max-w-prose` (68ch ≈ 600 px), la columna toma 600 px y la página desborda a 390 px,
aunque ningún elemento se vea cortado. Se detectó midiendo `scrollWidth` contra `clientWidth`, no
mirando la captura.

**Regla:** toda rejilla que solo define columnas en un breakpoint lleva `grid-cols-1` en el ancho
base (Tailwind lo traduce a `minmax(0,1fr)`, que sí encoge). Verificación en cada bloque:
`document.documentElement.scrollWidth === clientWidth` a 390, 820 y 1440.

#### Auto-blindaje: `tailwind-merge` borraba colores de texto

`cn()` usaba `twMerge` con la configuración por defecto. Como nuestra escala tipográfica
(`text-small`, `text-micro`, `text-h3`…) no existe en Tailwind, `tailwind-merge` la leía como
color de texto, la consideraba en conflicto con `text-paper` y **eliminaba una de las dos**. El
botón primario quedó con texto tinta sobre azul y el botón sobre tinta quedó invisible.

Se detectó en `/styleguide` comparando el `className` renderizado contra el escrito, no a ojo.
Arreglo: `extendTailwindMerge` declarando la escala en el grupo `font-size`
(`lib/utils/cn.ts`). **Regla:** cada paso nuevo de tipografía en `tokens.css` se agrega también
a esa lista, o los colores de texto vuelven a desaparecer en silencio.
