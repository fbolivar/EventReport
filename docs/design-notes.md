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

### Bloque 6 — motor de reglas (2026-09-01)

- **`packages/rules` es código puro y probado**: 15 pruebas con `node --test`, sin base de datos y
  sin red. Cada prueba parte de una configuración limpia y rompe **una sola cosa**, así que un
  fallo señala una regla, no un sistema.
- **`evaluate()` y `reconcile()` están separadas a propósito.** La primera dice qué es verdad del
  equipo ahora; la segunda convierte eso en ciclo de vida contra lo que la base ya tenía: lo que
  persiste conserva su `first_seen`, lo que desaparece **se resuelve, no se borra**, y un hallazgo
  que el cliente aceptó como riesgo sigue aceptado — el motor no pisa una decisión humana.
- **Una regla que la marca no puede evaluar no es un aprobado.** `requires(capabilities)` la marca
  `evaluable: false` y el informe de cumplimiento lo declara, en vez de darla por correcta.
- **El instante de evaluación se inyecta** (`now`), no se lee del reloj: sin eso las reglas con
  ventana temporal (FW-007, FW-013, FW-016, OP-001) no serían reproducibles en pruebas.
- El motor corre en la Edge Function `ingest-config`, que es donde un snapshot se vuelve informe:
  guarda la configuración, evalúa, reconcilia y recalcula el score.
- `supabase/functions/build-shared.mjs` copia `packages/schema` y `packages/rules` dentro de la
  función. Las Edge Functions corren en Deno y se despliegan solas: no pueden resolver un workspace
  de pnpm. Copiar es mejor que duplicar, porque la copia se genera y nunca se edita: el motor que
  corre en la nube es el mismo byte a byte que cubren las pruebas.

### Bloque 7 — colector en Go, fase 1 (2026-09-01)

- **Sin dependencias externas**: solo biblioteca estándar. El colector se instala en la máquina
  de un cliente que no controlamos; cada dependencia es una superficie más que auditar y una
  actualización más que empujar. PBKDF2 y Ed25519 ya vienen en Go 1.24+.
- **La línea cruda se escribe en la bóveda antes de parsearla.** Un formato que el adaptador no
  reconoce no se pierde: queda en disco y se cuenta como calidad del dato.
- **La cola es finita a propósito** (50.000 líneas): quedarse atrás no puede convertirse en
  memoria creciente en una máquina del cliente. `push` nunca bloquea, y lo descartado se cuenta.
- El adaptador es la **única** pieza que menciona una marca. Si agregar un fabricante obligara a
  tocar el agregador, las reglas o el portal, el modelo normalizado estaría mal (§12, fase 4).
- 8 paquetes con pruebas, incluida una de punta a punta que levanta el receptor, envía syslog real
  por UDP y comprueba que lo que queda listo para subir es el agregado **y que ninguna línea cruda
  aparece en él**.

#### Auto-blindaje: la prueba de punta a punta encontró una desviación del diseño

El agregador agrupaba por la marca de tiempo del equipo. El §6.6 dice agrupar **por hora de
recepción**, y con razón: un firewall con el reloj corrido reparte su tráfico entre horas que
nunca cierran, y el informe muestra huecos que no existen. Se detectó porque la prueba de punta a
punta mezcló líneas con fecha del equipo (10:15) recibidas a la hora real, y el conteo de líneas
no reconocidas quedó en otra hora.

Corregido: se agrupa por recepción y la diferencia entre relojes viaja como desfase, que es
justamente lo que mira FW-015. Una prueba nueva lo fija.

#### Auto-blindaje: un archivo a medio escribir no puede parecer un envío pendiente

El buffer nombra los archivos temporales con punto inicial y los renombra al terminar, pero
`List()` filtraba solo por extensión: un `.tmp` interrumpido seguía terminando en `.json` y
aparecía como pendiente, listo para subirse a medias. Lo encontró la prueba que simula un corte
de energía a mitad de escritura.

#### Auto-blindaje: un score que toca fondo deja de informar

La primera fórmula restaba una penalización lineal (`peso / superficie`). Al probarla contra un
firewall real y roto —administración en la WAN, política any→any, escritorio remoto publicado— dio
**configuración 0**. Un score en cero no distingue entre malo y catastrófico, y sobre todo no
permite mostrar mejora: el cliente arregla dos cosas y sigue viendo 0.

Se cambió por una penalización saturante (`peso / (peso + superficie)`), que nunca llega a cero y
sigue siendo monótona. El mismo firewall pasó de 0 a 24 en configuración, y de 24 a 41 en total.
Se detectó ejecutando el motor contra la función desplegada, no leyendo el código.

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

---

## Bloque 8 — Motor de informes

El informe es el producto: es lo que el gerente recibe por correo y lo que el auditor archiva.
Por eso la redacción no se improvisa en la plantilla del PDF.

- `lib/reports/input.ts` arma un `ReportInput` con **todas** las cifras ya calculadas por
  nosotros: postura, delta, hallazgos por severidad, actividad y cobertura por marco.
- `lib/reports/sections.ts` le pide a `claude-opus-5` únicamente la prosa, con
  `output_config` de `json_schema` para que la respuesta tenga forma fija, `thinking` adaptativo
  y el bloque de sistema cacheado (es idéntico en todos los informes; los datos no).
  El sistema prohíbe inventar cifras, y el modelo no tiene de dónde sacarlas: solo ve el input.
- Sin `ANTHROPIC_API_KEY`, `templateSections()` redacta lo mismo de forma determinista. Un
  informe con prosa más plana es mejor que un informe que no llega, y hace el flujo probable
  sin red.
- El PDF (`lib/reports/pdf.tsx`) repite los hex de la paleta porque `@react-pdf/renderer` no lee
  variables CSS. El archivo lo dice en un comentario: si cambia `tokens.css`, hay que replicar.
- La descarga (`app/api/reports/[reportId]/route.ts`) busca la fila por RLS y firma una URL de
  300 s contra el bucket privado `reports`. **Regla:** al no existir un chequeo de autorización
  aparte, no hay uno que olvidar; el bucket nunca se vuelve público.

## Bloque 9 — Decisiones del cliente

Tres acciones que faltaban para que el portal no fuera solo de lectura, todas auditadas:

- **Aceptar un riesgo** exige justificación de 15 caracteres como mínimo y queda en el
  historial; `ingest-config` no reabre un hallazgo `accepted`, así que el cliente no pelea con
  el producto en cada snapshot.
- **Marcar un evento como atendido** mueve la regla OP-002, que cuenta eventos críticos sin
  atender de más de siete días. El botón no es cosmético.
- **Declarar un control fuera de alcance** exige justificación, y la restricción
  `compliance_not_applicable_needs_reason` la exige también en la base: un control no puede
  quedar fuera de alcance sin motivo aunque un llamador futuro olvide pedirlo. El resumen del
  marco resta ese control de los evaluables en la misma recarga.
- **Invitar personas** sin `service_role`: la invitación es una fila, y un trigger
  `after insert on auth.users` la convierte en membresía cuando esa persona se registra. Las
  invitaciones pendientes se listan junto a las personas; una invitación que no se ve no se
  puede recordar ni cancelar.

#### Auto-blindaje: `.next` compartido entre `dev` y `build` (reincidencia)

Volvió a aparecer `Cannot find module './vendor-chunks/...'` al abrir el portal: un `pnpm dev`
anterior seguía vivo mientras se corría `pnpm build`. La regla ya estaba escrita en `CLAUDE.md`;
lo que faltaba era comprobarla. **Regla:** antes de `build`, matar lo que escuche en el puerto
3000 (`Get-NetTCPConnection -LocalPort 3000`), no solo el proceso que uno recuerda haber
lanzado; después de `build`, borrar `apps/web/.next` antes de volver a `dev`.

#### Verificación de este bloque

Con datos reales en Supabase: evento atendido (4 botones → 3), riesgo aceptado con
justificación y reabierto, control 5.25 fuera de alcance (8 cumplen → 7, 1 fuera de alcance),
invitación registrada y visible como pendiente, informe generado (2 páginas, 7 KB) y descargado
como `application/pdf` con cabecera `%PDF-1.3`. `scrollWidth === clientWidth` a 390, 820 y 1440.
El estado del seed se restauró después de probar.

## Bloque 10 — Entrega del informe

Dos cambios, uno de comportamiento y otro de contenido.

**El trabajo sale del clic.** `requestReport` inserta la fila en `generating`, responde y sigue
en `after()` de `next/server`. Generar tardaba 117 s con el botón bloqueado; ahora responde en
1,7 s y el estado se ve en la lista. El precio es que el usuario tiene que volver: por eso la
fila existe desde el primer instante y cualquier fallo la marca `failed`, nunca la deja colgada
en "Generando…". **Regla:** al desplegar en Vercel hay que fijar `maxDuration` en la ruta; una
función que muere a los 60 s deja informes a medio hacer.

**El informe de hardening existe.** Antes el botón de la página de hallazgos era un enlace a
`/reports` que no generaba nada: prometía un informe que no había. Ahora `buildHardeningInput` +
`HardeningReport` producen el PDF con todos los hallazgos abiertos, su evidencia y los pasos de
la marca. Aquí **no interviene el modelo**: los pasos vienen del catálogo tal como están escritos,
porque un procedimiento que cambia de redacción entre dos informes no se puede auditar ni seguir.

#### El catálogo de remediación estaba casi vacío

De los 12 hallazgos abiertos, solo 4 tenían pasos: el PDF decía "todavía no tenemos los pasos de
esta marca" en 8 de 12. El informe se veía bien y no servía para nada. Se completaron las 24
reglas × 2 marcas (48 entradas, `20260901160000_remediation_catalog.sql`). **Pendiente de
validación:** las rutas de menú son de FortiOS 7.x y Sophos XG v20 y hay que contrastarlas contra
el firmware exacto antes de vender el informe; el hallazgo y la evidencia son correctos aunque la
ruta cambie de nombre entre versiones.

#### Auto-blindaje: el PDF cambiaba caracteres en silencio

La evidencia "any → any" se imprimía como "any ’ any". `@react-pdf/renderer` usa Helvetica con
codificación WinAnsi; un carácter fuera de esa tabla no falla, se sustituye por otro glifo. Es el
peor tipo de error en un documento de evidencia: el PDF se ve bien y dice algo distinto de lo que
el firewall tiene configurado.

Se detectó descomprimiendo los flujos del PDF y leyendo los bytes reales, no mirando el
documento. Arreglo: `pdfText()` en `lib/reports/pdf-theme.ts` traduce los símbolos conocidos
(→ ⇒ ≥ ✓…) y reemplaza por guion lo que WinAnsi no puede dibujar. **Regla:** todo texto que
venga de datos —evidencia, títulos, pasos, prosa del modelo— pasa por `pdfText()` antes de
entrar en un `<Text>`. Si algún día se registra una fuente con Unicode completo, la función
puede volverse identidad, pero no desaparecer.

## Bloque 11 — Cumplimiento y entrega automática

**El informe de cumplimiento** (§8, trimestral) es el documento que el auditor archiva: por cada
control evaluable desde el firewall, su estado y la evidencia literal que lo sostiene. Tampoco
interviene el modelo: si se regenera mañana tiene que decir exactamente lo mismo, o deja de ser
evidencia.

La portada empieza por el alcance, no por el resultado: "de los 93 controles del marco, 13 se
pueden evaluar desde el firewall; los 80 restantes dependen de personas y procesos que este
producto no observa". Un informe de cumplimiento que abre con lo que cumple y esconde su alcance
en una nota al pie engaña al que lo lee. Los controles `not_assessable` se cuentan en la portada
pero no se listan: veinte páginas de "no aplica a este producto" tapan lo que sí evaluamos.

Se corrigió una contradicción aparente: un control que **cumple** se sostiene sobre hallazgos
**cerrados**, y el PDF los mostraba con su severidad en rojo sin decir que estaban resueltos.
Ahora cada evidencia dice su estado y su fecha.

**La entrega automática.** `dueReports()` es una función pura —seis pruebas— que decide qué le
toca a cada cliente según el plan (§10): ejecutivo mensual en básico, + hardening en estándar, +
cumplimiento trimestral por marco en premium. Los períodos son **cerrados**: el mes pasado, el
trimestre pasado. Un informe mensual emitido a mitad de mes no se puede comparar con el
siguiente.

`/api/cron/reports` decide y encarga; `/api/cron/render` renderiza **uno** por petición. La
separación no es estética:

- La memoización de la capa de datos (`cache()` de React) vive dentro de una petición. Un solo
  request recorriendo varios tenants leería, en el segundo, los datos memoizados del primero:
  un informe con datos de otra empresa. **Regla:** la generación programada procesa un tenant por
  petición, siempre.
- Cada PDF tarda hasta un minuto; repartidos, ninguno se acerca al límite de la función.

#### El generador no tiene sesión, y RLS necesita una

Es el problema de fondo del bloque. El portal se apoya en RLS para separar clientes y la capa de
datos no filtra por tenant a mano —a propósito—. La generación automática no tiene usuario, así
que corre con la clave de servicio, que **ignora RLS por completo**: usada tal cual, cada consulta
del generador devolvería las filas de todos los clientes.

Solución: `tenantScoped()` (`lib/supabase/tenant-scope.ts`) es un proxy que añade
`.eq("tenant_id", …)` a cada `select`. El filtro deja de ser algo que alguien pueda olvidar y pasa
a ser parte del cliente; `runAsTenant()` lo instala en un `AsyncLocalStorage` que `createClient()`
consulta, así que la capa de datos funciona sin tocar una sola consulta. Las tablas de catálogo se
declaran una por una y `tenants` se filtra por `id`, no por `tenant_id` —lo aprendimos fallando—.

Ese proxy es lo único que separa a un cliente de otro en el camino programado, así que tiene
pruebas propias (`tenant-scope.test.ts`, 5). **Regla:** la clave de servicio solo se usa a través
de `runAsTenant`; nunca directamente para leer datos de un tenant.

#### Auto-blindaje: un render muerto bloquea el informe para siempre

El despacho cuenta un informe en `generating` como hecho, para no duplicarlo. Si el render muere
—proceso caído, función sin tiempo—, esa fila se queda así y **ese informe no se vuelve a intentar
nunca**. Apareció al reiniciar el servidor a mitad de una generación. Ahora el despacho marca como
`failed` lo que lleve más de 30 minutos generando, antes de decidir qué falta.

En la misma línea: la lista decía "17 disponibles" contando uno fallido. Un informe fallido no
está disponible, y tampoco se puede esconder: ahora dice "16 disponibles · 1 fallido".

#### Lo que falta para que esto entregue de verdad

`supabase/scheduled-reports.sql` deja escrito el `pg_cron` que dispara el mes 1 a las 06:00 UTC,
con la URL y el secreto en Vault. **No está aplicado**: apunta a una URL que todavía no existe, y
un cron llamando al vacío solo llenaría el registro de fallos. Se aplica el día del despliegue.
Falta también el correo: hoy el informe aparece en el portal, no llega a la bandeja del gerente.

#### Validación del catálogo de remediación (2026-09-01)

Las rutas de menú se contrastaron una por una contra la documentación oficial —`docs.fortinet.com`
para FortiOS 7.4 y `docs.sophos.com` para SFOS 20.0—, no contra la memoria de nadie. Siete rutas
estaban mal o desactualizadas:

| Regla | Marca | Decía | Dice |
|---|---|---|---|
| FW-005 | FortiGate | System > Configuration > Backup | Menú del usuario (arriba a la derecha) > Configuration > Backup |
| FW-011 | FortiGate | User & Authentication > FortiToken | FortiTokens para el inventario; User Definition para asignar |
| FW-016 | FortiGate | Dashboard > Licenses | Widget de licencias en Dashboard > Status, o System > FortiGuard |
| FW-002 | Sophos | Authentication > One-time password | Authentication > Multi-factor authentication (MFA) |
| FW-011 | Sophos | Authentication > One-time password | Authentication > Multi-factor authentication (MFA) |
| FW-004 | Sophos | Administration > Device access > Profiles | Profiles > Device access |
| FW-017 | Sophos | Configure > System services > Log settings | System services > Log settings |

En SFOS 20 el módulo dejó de llamarse "One-time password" y pasó a ser "Multi-factor
authentication (MFA)"; la MFA del administrador sigue activándose en Administration > Device
access, eso sí era correcto. El resto de rutas quedó confirmado: System > Administrators con
"Restrict login to trusted hosts" y "Enable Two-factor Authentication", Policy & Objects >
Firewall Policy con Hit Count, Administration > SNMP / Time / Licensing, Profiles > Device access,
Hosts and services > Country group, System services > High availability y Log settings, Backup and
firmware > Backup & restore.

**Regla:** una ruta de menú es un dato con versión, no una constante. Cada vez que se agregue una
marca o se suba una versión mayor de firmware, el catálogo se revisa contra la documentación del
fabricante y la fecha de la revisión queda escrita aquí.

## Bloque 12 — Cambios de configuración

Guardábamos snapshots desde el primer día y nadie los comparaba nunca. `diffConfigs()`
(`packages/rules/src/diff.ts`) los convierte en la bitácora del firewall, y `ingest-config` la
escribe en `config_changes` cada vez que llega un snapshot nuevo.

Cómo compara, y por qué así:

- **Por identidad, no por texto.** Una política se sigue por su `id`, un administrador por su
  nombre. Reordenar la lista no es un cambio.
- **Solo los campos que importan.** Que un contador de aciertos suba no es un cambio de
  configuración; llenar la bitácora de ruido es la forma más rápida de que nadie la lea.
- **Ninguna credencial entra en el diff**: ni PSK, ni comunidad SNMP, ni token. De `auth` viaja el
  método ("psk", "cert"), nunca la clave. Hay una prueba que falla si algo de eso aparece.
- **La posición de una política sí es un cambio**: el orden decide cuál coincide primero, así que
  mover una regla hacia arriba puede abrir un permiso sin editar ninguna.

El informe (`changes`) es a demanda, no programado: el §10 no lo incluye en ningún plan. Como el
hardening y el cumplimiento, no lo redacta el modelo — es un registro, y un registro que se
redacta distinto cada vez no sirve de registro. Los cambios sin autor se cuentan aparte en la
portada: son los que abren OP-004 y los que el auditor pregunta uno por uno.

#### Tres fallos que solo aparecieron probando contra la función desplegada

**El orden de un conjunto se reportaba como cambio.** Los perfiles de inspección salían como
"av, ips, web, appCtl → ips, av, web, appCtl": el mismo conjunto en otro orden. Ahora las listas
se ordenan antes de comparar. **Regla:** en un diff, una lista sin orden semántico se compara como
conjunto.

**Un snapshot que llega tarde invertía el diff.** La función comparaba contra el snapshot más
reciente de la tabla, no contra el anterior a la hora del que llega. El colector guarda en búfer y
sube con retraso por diseño (§6.7), así que esto no es hipotético: una subida atrasada reportaba
como cambio nuevo lo que ya se había corregido. Ahora la consulta lleva
`.lt("collected_at", collectedAt)`.

**La flecha entre el valor viejo y el nuevo se imprimía como un glifo vacío.** El mismo fallo de
WinAnsi del bloque 10, en un sitio nuevo: `pdfText()` estaba aplicado a los valores, pero la
flecha iba suelta en el JSX. **Regla:** en un PDF, el texto literal del JSX también pasa por
`pdfText()` si no es ASCII; no basta con envolver las variables.

#### Auto-blindaje: el servidor de desarrollo sirviendo un módulo viejo

El informe de cambios salía siendo el ejecutivo. El código enrutaba bien, la fila decía
`type: changes` y el PDF era otro. La causa no estaba en el código: `pnpm dev` seguía ejecutando
la versión anterior de `lib/reports/render.ts` —los cambios en componentes sí se recargaban, los
de un módulo del servidor usado dentro de `after()` no—. Se descubrió metiendo un `console.error`
que **nunca apareció** en el registro: eso, y no el PDF, fue lo que probó que el archivo editado
no se estaba ejecutando.

**Regla:** si un cambio en código de servidor parece no surtir efecto, lo primero es reiniciar
`pnpm dev` y volver a probar; recién después se depura el código. Y para confirmar que una rama
nueva se ejecuta, un rastro que se pueda ver vale más que mirar el resultado.

## Bloque 13 — Actividad de red

El informe más barato de construir —los rollups ya estaban— y el que completa el plan estándar
(§10). Dos páginas: cifras del período con el reparto por hora del día, y el detalle con los
top-N y la tabla diaria.

- **Las horas se dibujan con barras de `View`**, no con un gráfico: react-pdf no tiene canvas, y
  una barra de ancho proporcional se lee igual e imprime bien en blanco y negro.
- El texto explica por qué mirar las horas: actividad a las tres de la mañana es la señal, no el
  total del día.
- **Una dimensión sin datos no se imprime.** Una tabla vacía en un informe hace dudar de todas las
  demás.
- El informe repite, en su propia página, que las líneas de registro se quedan en la red del
  cliente: dice cuánto y de qué tipo, nunca quién visitó qué. Esa frontera es del producto (§4), y
  el documento que llega al cliente es donde tiene que verse.

#### Auto-blindaje: el número de páginas era una estimación

Cada tipo de informe calculaba sus páginas con una división —`1 + ceil(items / 4)`— y la ficha del
portal decía "2 páginas" en un PDF de 3. Un dato que el usuario puede desmentir abriendo el
archivo. Ahora `countPages()` cuenta los objetos `/Type /Page` del PDF ya renderizado, una sola
vez para todos los tipos. **Regla:** si el dato está en el artefacto, se lee del artefacto; no se
estima.

## Bloque 14 — Tablero multicliente (MSSP)

La vista existía, pero con un solo tenant en la base no se podía juzgar. Lo primero fue crear un
segundo cliente de demostración deliberadamente distinto —plan menor, un equipo, colector caído,
eventos sin atender, postura peor— en `supabase/seed/demo-mssp.sql`. **Regla:** una vista que
compara N cosas no se puede evaluar con N=1.

Con dos clientes a la vista, el defecto de fondo quedó claro: **el tablero ordenaba por puntaje**,
y el puntaje no dice qué hacer hoy. `attentionFor()` (`lib/mssp/attention.ts`, seis pruebas) da
una frase por cliente y un orden por urgencia:

1. **Colector caído.** Va antes que cualquier hallazgo: sin datos nuevos, el informe del mes sale
   incompleto y nadie se entera hasta abrirlo. Ningún puntaje refleja eso.
2. **Eventos críticos sin atender de más de siete días** —el umbral de OP-002—: ya ocurrieron.
3. Hallazgos críticos abiertos, caída de postura mayor a cinco puntos, eventos recientes, colector
   sin reportar, hallazgos altos.
4. Y si no hay nada, lo dice: "Sin novedades: nada que hacer hoy". Una celda vacía se lee como
   dato faltante.

El delta del tablero comparaba contra el día anterior, así que un cliente que se deteriora despacio
aparecía "sin cambio" todos los días. Ahora compara contra hace un mes, igual que `postureScore`
en el portal. **Regla:** la misma cifra se calcula igual en todas las vistas, o el producto se
contradice a sí mismo.

Queda pendiente el informe "Comparativo de clientes" (§8, mensual para MSSP): el tablero responde
"qué hago hoy", no "cómo va mi cartera este mes".

## Bloque 15 — Enrolamiento del colector

El primer contacto real del cliente con el producto: instala el colector, pega un comando y el
equipo aparece conectado en el portal. Hasta ahora la Edge Function `enroll` era un esqueleto que
devolvía 501 y el colector Go degradaba pidiendo registrar la clave a mano.

Cómo quedó, y por qué:

- **El token se guarda hasheado.** Es la única llamada sin firma —el colector todavía no tiene
  identidad—, así que el token *es* la credencial. Quien lea `collector_enrolments`, nosotros
  incluidos, no puede enrolar un colector con lo que hay ahí.
- **Se muestra una sola vez**, y la pantalla lo dice antes de que el operador cierre la ventana.
  Se entrega el comando completo, no el token suelto: lo que se pega en la máquina del cliente es
  el comando.
- **Un solo uso y 24 horas.** Un token que sirve para siempre acaba pegado en un chat. Se quema
  con `update ... where used_at is null`, así que dos enrolamientos simultáneos no pueden ganar
  los dos, y si el quemado falla se borra el colector recién creado.
- **Token inválido, usado y vencido responden lo mismo**: no se le dice a quien prueba tokens cuál
  de las tres acertó.
- **La configuración la decide la nube**, derivada del plan: snapshots por día, minutos de rollup,
  días de bóveda, tope de eventos. El colector la guarda tal cual. Si la calculara él, un cliente
  se subiría el cupo editando un archivo local.
- El colector arranca en `measuring`: los primeros días sirven para conocer el tráfico normal
  antes de empezar a llamar la atención (§5).

Probado de punta a punta con el binario Go real contra la función desplegada: token emitido en el
portal, `collector enroll` lo consume, el equipo aparece en Ajustes con bóveda de 30 días —la del
plan premium—, y **el mismo token vuelve a usarse y responde 401**, igual que uno vencido.

#### El segundo cliente destapó que el portal nunca filtraba por empresa

Al crear el cliente de demostración para el tablero MSSP, Ajustes de Acme empezó a decir "3 sedes"
—Acme tiene dos— y los hallazgos de una empresa aparecían en el portal de la otra. La causa:
**la capa de datos no filtraba por la empresa de la URL**, se apoyaba solo en RLS. Con un usuario
por cliente eso es correcto; con un MSSP miembro de varias empresas, el portal sumaba todo lo que
el usuario puede ver, y un informe firmado podía salir con hallazgos de otro cliente.

RLS decide **quién** puede ver; faltaba decidir **qué** se está mirando. El middleware anota la
empresa de la URL en un encabezado y `createClient()` devuelve un cliente acotado a ella con el
mismo proxy que ya usaba la generación programada. El RPC de personas no pasa por el proxy —es una
función, no una tabla—, así que ahora recibe la empresa como argumento; sigue comprobando la
membresía por dentro: **el argumento acota, no autoriza**.

**Regla:** en una aplicación multiempresa, RLS es la frontera de seguridad y el filtro por la
empresa de la URL es la de corrección. Faltando el segundo, el error no es un rechazo: son datos
de más, que es peor. Y no se ve con un solo cliente en la base.

#### Auto-blindaje: reconstruir la respuesta del middleware borra las cookies de sesión

Marcar la empresa de la URL en un encabezado rompió el inicio de sesión: *"An unexpected response
was received from the server"* al pulsar Entrar. La causa no estaba en el formulario. En
`updateSession`, `response` se reconstruye cada vez que Supabase escribe cookies —eso es lo que
refresca la sesión—, y yo lo reconstruía **después**, con `NextResponse.next({ request })`,
tirando esas cookies a la basura. El usuario se autenticaba y salía sin sesión.

Arreglo: el encabezado se pone sobre `request` **antes** de crear el cliente; toda respuesta
derivada de esa petición ya lo lleva. **Regla:** en el middleware, `NextResponse.next({ request })`
se llama una vez al principio y solo se vuelve a llamar dentro de `setAll`. Cualquier otra
reconstrucción descarta lo que Supabase acababa de escribir.

En el mismo arreglo apareció otro defecto: el `next` del inicio de sesión se validaba contra la
**primera** empresa del usuario. Quien administra varias pedía `/nortis/findings`, se le exigía
sesión y terminaba en `/acme/dashboard`. Ahora se valida contra todas las empresas de las que es
miembro —la lista sale de RLS—, así que un `next` inventado sigue sin llevar a nadie donde no
tiene acceso.

## Bloque 16 — Registrar el firewall, y el correo

### El equipo que el colector vigila

`collector enroll` daba identidad al colector, pero el archivo quedaba con `devices: null`: no
sabía a qué firewall mirar. `collector device add` cierra ese hueco y es el segundo comando que
ejecuta el técnico.

El orden importa: **primero habla con el equipo, después guarda**. Un token equivocado se descubre
con el técnico delante, no tres días más tarde cuando el primer informe salga vacío. Después sube
a `register-device` lo que el firewall dice de sí mismo —marca, modelo, serie, versión— y **cifra
el token en disco**. El token no viaja: si viajara, un robo de nuestra base daría acceso a los
firewalls de todos los clientes. Hay una comprobación de que el archivo no lo contiene en claro.

`register-device` resuelve el tenant y la sede desde el colector firmante, nunca desde el cuerpo,
y usa la **serie** como identidad del equipo: reinstalar el colector actualiza el firewall, no lo
duplica ni consume cupo del plan.

**TLS.** Un FortiGate de fábrica presenta un certificado autofirmado, así que verificar falla.
`-insecure` existe, está apagado por defecto y el colector lo advierte en el registro cada vez que
conecta; queda escrito en el archivo de configuración para que se pueda auditar después. Aceptar
un certificado que no se puede validar es una decisión, no un detalle de conexión.

Probado de punta a punta contra un FortiGate simulado con TLS autofirmado (`scripts/fakegate`, en
el scratchpad): sin `-insecure` falla con `certificate signed by unknown authority`; con token
equivocado, `401`; con todo correcto registra el equipo, `collector test` responde
`conexión correcta` y el firewall aparece en el portal con su modelo y firmware.

La guía para hacerlo contra un equipo real —perfil de solo lectura, usuario de API, *trusted
hosts*, syslog y los errores frecuentes— está en `docs/conectar-un-firewall.md`.

### Correo

`docs/entrega-por-correo.md` tiene el paso a paso de Google Workspace: cuenta dedicada
`informes@`, alias, verificación en dos pasos, contraseña de aplicación, y **SPF, DKIM y DMARC**,
que es la parte que se salta todo el mundo y la razón por la que los informes acaban en spam.

El código (`lib/email/send.ts`) sale por SMTP y está detrás de una interfaz: cambiar a un proveedor
transaccional es cambiar el transporte. Tres decisiones que quedan en el código, no en el correo:

- **Sin credenciales no falla**, informa que no envió. Un informe generado y guardado vale aunque
  el aviso no salga; al revés, no.
- **El correo no lleva hallazgos.** Un hallazgo dice dónde está el hueco del firewall del cliente;
  el correo no es un canal para eso.
- **El enlace no lleva token**: apunta al portal, que pide sesión. Reenviar el correo no regala
  acceso.

El aviso sale solo desde la generación programada. Quien acaba de pulsar "Generar" no necesita un
correo diciéndole que lo pidió.

`scripts/probe-email.ts` prueba el envío sin generar nada; hoy responde "faltan SMTP_HOST,
SMTP_USER o SMTP_PASSWORD", que es exactamente lo que debe decir hasta que la cuenta exista.

#### Nota: `gofmt -l` en Windows

El repositorio se saca con CRLF, y `gofmt` espera LF: `gofmt -l` marca archivos que no tienen nada
mal. Antes de "arreglar" formato, mirar `gofmt -d`: si el diff son líneas completas sin cambios
visibles, es el fin de línea y hay que dejarlo.

## Bloque 17 — Fase 1 del colector cerrada

Tres de las cuatro Edge Functions que quedaban en esqueleto ya escriben: `ingest-rollups`,
`ingest-events` y `heartbeat`. La cuarta, `evidence`, es fase 5 por diseño (§6.3: la consulta
desde el portal llega con el mecanismo de evidencia bajo demanda), y sigue siendo esqueleto a
propósito.

Del lado del colector, el bucle de ejecución quedó completo: cierra horas, encola eventos
críticos, toma snapshots de configuración según el plan y reporta calidad del dato en el latido.

Decisiones que quedaron en el código:

- **La comprobación "este firewall es de este colector" vive en un solo sitio**
  (`_shared/firewall.ts`). Es la que nunca se puede olvidar: sin ella, un colector con
  credenciales válidas escribiría en los datos de otra empresa cambiando un identificador.
- **La severidad de un evento la decide EventReport, no el fabricante.** El campo `severity` de
  un FortiGate viene vacío en la mitad de las líneas que importan —un ingreso administrativo no
  trae ninguno—, y copiarlo hacía que la nube descartara el evento en silencio.
- **Un ingreso administrativo se clasifica como `admin`, no como `system`.** FortiGate mete en
  "system" tanto un reinicio como la entrada de una persona a configurar el firewall. Para el
  producto no es lo mismo.
- **Lo que se encola es la forma del contrato**, no la estructura interna del agregador. Encolar
  la estructura interna acopla el formato del disco con el de la API.
- **La configuración del plan la decide la nube** y el colector la guarda: snapshots por día,
  minutos de rollup, días de bóveda. Si la calculara él, un cliente se subiría el cupo editando
  un archivo local.

#### Auto-blindaje: `null` no es una lista vacía, y apareció tres veces

El primer snapshot de un firewall de verdad tumbó la ingesta con
`Cannot read properties of null (reading 'length')`. En Go una lista vacía se serializa como
`null`, y **todo** el lado TypeScript asumía arreglos porque los fixtures siempre los traían.
Falló tres veces seguidas, en tres capas distintas:

1. el motor de reglas, sobre `config.admins`;
2. el diff, sobre las colecciones del snapshot guardado;
3. otra vez el diff y el motor, sobre las listas **dentro** de cada objeto (`policy.src`,
   `admin.trustedHosts`, `services.ntp`).

Arreglado en los dos lados, que es lo que corresponde: el colector nunca envía `null` —hay una
prueba que serializa un snapshot de un equipo recién configurado y falla si aparece uno— y el
motor y el diff normalizan lo que reciben, porque son entrada externa y pueden venir de un
colector de una versión anterior.

**Regla:** en cualquier frontera entre lenguajes, una colección ausente y una vacía significan lo
mismo, y quien recibe lo normaliza. Los fixtures no encuentran esto: los escribe la misma persona
que escribe el consumidor.

#### Verificación

Contra el proyecto de producción, con el colector Go compilado y un FortiGate simulado con
certificado autofirmado:

| Vía | Resultado |
|---|---|
| `enroll` | Colector registrado con los parámetros del plan |
| `device add` | Equipo dado de alta; token cifrado en disco |
| Snapshot de configuración | Aceptado; **6 hallazgos** derivados de la configuración real del equipo |
| 600 líneas de syslog | Agregadas por hora; 11 eventos críticos encolados |
| `ingest-events` | Aceptado y visible en el portal |
| `ingest-rollups` | Aceptado; responde hasta qué hora, para que el colector purgue su búfer |
| `heartbeat` | Aceptado; el colector aparece con EPS, descartes y desfase de reloj |

Los hallazgos que produjo el equipo simulado son exactamente los que su configuración merece:
administración expuesta en WAN, administrador sin segundo factor y sin hosts de confianza,
retención insuficiente, sin NTP y sin destino de syslog adicional.

## Bloque 18 — Instalación sin comandos

Un instalador que pide escribir comandos ya perdió a la mitad de los clientes. El onboarding
quedó así: **descargar, doble clic, dos campos en el navegador**.

- El portal genera un instalador **con el token de enrolamiento dentro** (`.ps1` para Windows,
  `.sh` para Linux). No hay nada que copiar ni pegar, y el token —que solo se muestra una vez
  porque en la base hay un hash— viaja dentro del archivo en vez de por un chat.
- El script descarga el binario del bucket público `downloads`, ejecuta `collector setup` y el
  asistente se abre solo en el navegador.
- El binario se publica desde el propio proyecto. No hay que ir a buscarlo a ningún otro lado.

#### Por qué la clave del firewall se pide en la máquina y no en el portal

Es la decisión de fondo del bloque. Sería más cómodo pedir la IP y el token del firewall en
Ajustes, pero entonces esa credencial viajaría al SaaS y quedaría en nuestra base: **un robo de
nuestra base daría acceso a los firewalls de todos los clientes**. Es exactamente lo que el
producto promete que no pasa (§4).

La salida es un asistente que sirve el propio colector en `127.0.0.1:8899`: interfaz gráfica, sin
comandos, y la credencial no sale de la máquina. La página escucha **solo en loopback** —quien
esté en la misma oficina no puede abrirla— y no carga nada de internet, porque en una instalación
la máquina puede no tener salida todavía.

#### Los mensajes de error son parte del producto

`x509: certificate signed by unknown authority` no le dice nada a quien está instalando. El
asistente traduce: *"El equipo usa un certificado propio. Elige «Aceptar el certificado
autofirmado» y vuelve a intentar."* Lo mismo con 401 —revisa la clave y los hosts de confianza— y
con un tiempo de espera agotado. **Regla:** un error que el usuario puede corregir se escribe en
términos de lo que tiene que hacer, no de lo que falló por dentro.

#### Verificación

Recorrido completo como un cliente, contra producción: se pulsó *Agregar colector* en el portal,
se descargó `instalar-eventreport-acme.ps1`, se ejecutó, el asistente se abrió en el navegador, se
llenaron dirección y clave, *Probar conexión* respondió `FGT60F-LAB · FortiGate 60F · v7.4.4`, y
*Conectar* dejó el equipo registrado y el colector midiendo. Cero comandos escritos a mano.

#### Dos fallos que solo aparecieron con hardware real

**El `.ps1` no se puede ejecutar.** Windows bloquea por política cualquier script de PowerShell
descargado de internet: el cliente ve un error de seguridad en rojo y abandona. El instalador pasó
a ser un `.cmd`, que se ejecuta con doble clic sin tocar ninguna política y usa `curl.exe`, que
viene en Windows desde 2018. De regalo, un archivo bajado con curl no queda marcado como
"procedente de internet", así que el binario tampoco se bloquea.

**El firewall llegó sin serie ni firmware.** Un FortiGate 40F de verdad se registró con
`firmware: desconocido` y serie vacía. La causa: FortiOS devuelve **la serie y la versión en la
raíz** de `monitor/system/status`, no dentro de `results`. Las pruebas no lo veían porque el
simulador los ponía donde el código los esperaba — un simulador escrito por quien escribe el
cliente confirma sus propios supuestos.

Arreglado en los dos lados: el adaptador lee la raíz y cae a `results` si no está, con una prueba
que usa la forma real de la respuesta; y `register-device` ya no usa una serie vacía como
identidad —dos equipos sin serie se pisarían entre sí—, sino que cae al nombre del equipo.

**Regla:** un simulador sirve para ejercitar el camino, no para validar el contrato. El contrato
se confirma contra un equipo real o contra la documentación del fabricante.

#### El asistente decía "midiendo" sin medir

Tras conectar el firewall, la pantalla anunciaba que el colector quedaba midiendo — y no medía:
`setup` registraba el equipo y ahí terminaba. El cliente cerraba la ventana y no llegaba un solo
dato. Se vio con el FortiGate 40F real: equipo registrado con su serie y su firmware correctos,
**cero snapshots**.

El bucle de recolección se separó de la orden `run` y ahora arranca solo en cuanto hay un equipo
conectado, en la misma ventana. Cada equipo que se conecta lo reinicia: el colector lee sus
firewalls al arrancar, así que uno agregado después no existiría para él hasta el próximo
reinicio, y una sede con dos firewalls es lo normal.

**Regla:** una pantalla no puede afirmar un estado que el programa no ha alcanzado. Si dice
"midiendo", que esté midiendo.

#### Un equipo viejo tumbaba el colector entero

En la primera instalación real, el colector arrancó y murió en la misma línea:

```
msg=midiendo
msg="el colector se detuvo" error="no se pudo descifrar: ¿frase de paso incorrecta?"
```

El archivo de configuración conservaba un firewall de un intento anterior, cifrado con otra frase
de paso. El arranque abría **todas** las credenciales y devolvía el primer error, así que un
equipo obsoleto dejaba sin datos a los equipos que sí funcionaban.

Dos cambios:

- **Un equipo que no se puede abrir se omite**, con un registro que dice cuál y qué hacer. Solo si
  ninguno abre se detiene, y entonces el mensaje explica que hay que reconectarlos.
- **El asistente limpia lo que estorba**: al conectar, el técnico acaba de demostrar cuál es la
  frase correcta, así que las entradas que no abren con ella —o que apuntan al mismo equipo o al
  mismo host— se descartan en vez de acumularse.

**Regla:** en un proceso que atiende a varios equipos, el fallo de uno se aísla. Un error de
configuración de ayer no puede dejar ciego lo que hoy funciona.

#### Un ámbar eterno: el modo medición no terminaba nunca

El diseño (§5) dice que el colector mide 24 h desde el enrolamiento y después empieza a vigilar.
Nadie lo implementó: el latido conservaba `measuring` para siempre, así que en el portal el
colector se quedaba en ámbar de por vida. El primer cliente real lo leyó como "no veo nada
activo", que es exactamente lo que parece.

Dos cambios, en el sitio que corresponde a cada uno:

- El **latido** pasa el colector a `active` cuando se cumplen las 24 h desde el enrolamiento. La
  regla vive en el servidor, no en el colector: un cliente no debe poder acortarse el período de
  medición.
- La **pantalla** dice cuánto falta: "En medición · empieza a vigilar en 24 h". Un estado en
  ámbar sin explicación se lee como avería y termina en una llamada de soporte.

**Regla:** un estado transitorio tiene que decir cuándo termina. Si no se puede decir, no es un
estado, es un problema.

## Bloque 19 — El colector deja de depender de una ventana abierta

Hasta aquí el colector moría al cerrar la consola: una demo, no una instalación. Ahora se puede
dejar puesto en un cliente.

**Arranque automático con `schtasks`, no con el SCM.** Un servicio de verdad obliga a hablar el
protocolo del Service Control Manager, y eso exige una dependencia externa. El colector es de
biblioteca estándar a propósito (§6.1): lo que se instala en la red de un cliente se audita mejor
cuanto menos trae dentro. Una tarea al arranque cumple lo que importa —se levanta sola, sobrevive
a reinicios, no necesita que nadie inicie sesión— y se quita con un comando.

**La frase de paso, sellada con DPAPI de máquina.** Para arrancar sin nadie delante, el colector
tiene que abrir la credencial del firewall solo. Guardar la frase en texto plano sería regalar el
token a quien copie la carpeta; sellada con DPAPI en ámbito de máquina, **el archivo no sirve en
otro equipo**. Quien tenga administrador local puede abrirlo, pero esa persona ya podía leer la
configuración y ejecutar el colector: no se pierde nada que no estuviera perdido. Fuera de Windows
no hay DPAPI y la protección real son los permisos `0600` del archivo; está dicho así en el
código y en la guía, sin fingir que es cifrado.

**El instalador no se eleva.** Se elevó al principio, por no pedir administrador al final
cuando el técnico ya había llenado todo. Costó caro: un proceso elevado corre como otro usuario y
pierde la VPN por la que el técnico llega al firewall —clientes como NetExtender montan el túnel
por usuario—, así que el asistente abría y no podía conectar con nada. Ahora se eleva un solo
paso, el de instalar el servicio, que es el único que lo necesita.

**La configuración vive en `%LOCALAPPDATA%`.** Estuvo en `%ProgramData%` mientras el instalador
se elevaba, porque una ruta de máquina significa lo mismo para el administrador y para SYSTEM. Sin
elevación deja de servir: la carpeta que creó un administrador no la puede escribir un usuario
normal, y `curl` fallaba con un error de escritura que el instalador reportaba como "revisa tu
conexión a internet". SYSTEM puede leer LOCALAPPDATA, así que el servicio sigue funcionando.

**El instalador es ASCII puro.** `cmd.exe` lee el archivo con la tabla de caracteres del sistema,
no en UTF-8: una tilde parte la línea y Windows ejecuta los pedazos como comandos —el técnico vio
`'clientes' is not recognized as an internal or external command` antes de cualquier otra cosa—.
El generador quita acentos en vez de confiar en que nadie escriba uno.

**El asistente tiene puertos de repuesto.** Ejecutar el instalador dos veces —o tener un colector
ya corriendo— hacía morir al segundo con `bind: Only one usage of each socket address...`, en
inglés y sin explicación. Ahora prueba los diez puertos siguientes y anuncia el que usó.

**Regla:** cada decisión de esta lista se pagó con una instalación real fallida. Un instalador se
prueba ejecutándolo como lo ejecuta el cliente —sin elevar, con su usuario, con su nombre de
empresa acentuado— porque ninguno de estos tres fallos aparece leyendo el código.

#### "Actividad" vacía sin explicar por qué

Un colector vivo con cero eventos por segundo no está roto: es que el firewall no le envía sus
registros. Sin decirlo, el cliente ve la pantalla de Actividad en blanco y culpa al producto. La
tarjeta del colector ahora avisa: *"No está llegando syslog. Apunta el firewall a este colector
para ver actividad y eventos."*

**Regla:** cuando el producto no puede mostrar algo porque falta un paso del cliente, lo dice en
el sitio donde se nota la ausencia.

#### Elevar el instalador rompió el acceso al firewall

Al añadir el arranque automático hice que el instalador pidiera administrador **al principio**.
Parecía cortés —resolver los permisos de una vez— y rompió la instalación real: un proceso
elevado corre en otro contexto de usuario, y los clientes de VPN como SonicWall NetExtender
montan el túnel **por usuario**. Elevado, el asistente dejaba de alcanzar el firewall al que el
técnico sí llegaba desde su sesión. El síntoma en el cliente fue "no deja probar ni conectar".

El asistente vuelve a correr sin elevar, y el permiso se pide **solo en el último paso**: el botón
"Instalar como servicio" se relanza a sí mismo con UAC. Windows muestra el aviso una vez, cuando
hace falta y para lo que hace falta.

**Regla:** pedir privilegios antes de necesitarlos no es prolijidad, es cambiar el entorno de todo
lo que viene después. Se eleva lo que necesita elevación, y nada más.

## Bloque 20 — Lo que la primera instalación real dejó al descubierto

Cinco defectos, todos del mismo tipo: el producto sabía algo y no lo decía, o decía algo que no
era cierto.

**El puerto del syslog estaba cerrado.** Windows bloquea el tráfico entrante en los tres perfiles
por defecto. El firewall del cliente enviaba sus registros contra un puerto cerrado y el portal
mostraba "Actividad" vacía. Ahora la instalación del servicio —que ya pide administrador— abre
UDP 514 en el mismo paso. No es una tarea aparte para el técnico: es parte de instalar.

**El asistente decía `0.0.0.0:514`.** Nadie puede apuntar un firewall a esa dirección. El técnico
tiene que adivinar cuál de sus interfaces es la buena, y adivinó mal —yo también, al recomendarle
la del adaptador equivocado—. Ahora el colector lista **sus IP reales** y dice cuál criterio usar:
la de la red por la que se llega al firewall.

**El portal mostraba una IP de ejemplo.** El asistente de Ajustes traía `10.10.0.9` escrita a
mano. Alguien la copia. Ahora muestra la dirección real del colector, que llega en el latido, y si
no hay colector todavía lo dice en vez de inventar una.

**No se podían quitar colectores.** Instalar deja rastro: un intento fallido, una prueba, una
máquina que se cambió. Sin forma de retirarlos, la lista se llena de colectores muertos y deja de
significar nada.

**No se podía dar de alta un cliente.** El portal servía a las empresas que alguien hubiera
sembrado en la base. Para un proveedor que vende a varias PYMES eso no es un detalle, es la mitad
del producto. `create_tenant` crea la empresa, la membresía de quien la crea, los cupos de su plan
y su primera sede: una función que lo hace entero, porque hacerlo en cuatro pasos deja empresas a
medias cuando uno falla —y una empresa sin cupos rechaza la primera ingesta sin explicar por qué.

**Regla de todo el bloque:** cuando el producto depende de un dato que solo él conoce —una IP, un
puerto, un estado—, decirlo es parte del trabajo. Y cuando no lo conoce, decir que no lo conoce,
en vez de poner un ejemplo que alguien copiará.

#### Dos cosas que estaban hechas y no se podían usar

**La vista de clientes no estaba en el menú.** Existía en `/mssp` desde el bloque 14 y había que
escribir la dirección a mano. Un proveedor entra y sale de sus empresas todo el día. Ahora aparece
en la barra —solo para quien administra más de una empresa: a un cliente con una sola, una vista
de "clientes" no le dice nada—.

Eso obligó a un cliente **sin acotar** a la empresa de la URL: la pregunta es justamente "cuántas
empresas ve este usuario", y el cliente acotado siempre respondería una. Se llama
`createUnscopedClient` para que aparezca en cualquier búsqueda: usarlo dentro del portal de un
cliente es el error que el acotado evita.

**El modo medición no se podía terminar.** Las 24 h son una recomendación, no una condena: quien
instala sabe si su cliente puede esperar un día. Un ámbar de 24 horas sin nada que hacer al
respecto se lee como avería. Ahora hay "Empezar a vigilar ahora", y el latido respeta esa decisión
en vez de devolver el colector a medición.

**Regla:** una función que existe pero no tiene camino en la interfaz no existe. Y un estado que
el usuario no puede cambiar tiene que explicarse solo.

#### "Las herramientas del mercado son instantáneas"

La comparación era justa y descubrió dos cosas.

**El disco libre nunca iba a llegar.** El latido enviaba `diskFreeGb: 0` escrito a mano. No era
una espera: era un dato que el colector no medía. Ahora lo mide del disco donde vive la bóveda
—`GetDiskFreeSpaceEx` en Windows, `statfs` fuera—, que es lo que decide cuántos días de registros
caben. Un colector con el disco lleno deja de guardar y nadie se entera hasta que hace falta la
evidencia.

**La actividad tardaba hasta 65 minutos.** El diseño (§6.6) manda las horas **cerradas**, lo cual
es correcto para el informe y desastroso para el primer día: el cliente instala, mira Actividad y
no hay nada. Ahora el colector sube también **la hora en curso** en cada envío, cada cinco minutos.

Lo que hace seguro ese adelanto ya estaba en el esquema: la clave del upsert es
(firewall, hora, tipo, acción), así que la hora parcial se sobrescribe con la completa cuando
cierra. Enviar dos veces la misma hora no duplica nada — la decisión de idempotencia tomada al
diseñar la tabla es la que permite este cambio sin tocarla.

**Regla:** "es por diseño" no es respuesta cuando el diseño se pensó para el informe mensual y el
usuario está mirando la pantalla el primer día. Lo que cuesta es lo mismo; lo que cambia es
cuándo se ve.

#### Retirar un colector dejaba una identidad muerta en el disco

El operador retiró el colector desde el portal, volvió a bajar el instalador y el colector
"no hacía nada": arrancaba, decía que medía, y cada envío se rechazaba en silencio. La causa: el
archivo local seguía con el identificador del colector borrado, y `setup` respetaba la
configuración existente sin comprobar que siguiera valiendo.

Ahora, antes de respetar una configuración previa, el colector pregunta si el portal todavía lo
reconoce. Si le responden 401 o 403 —y solo entonces— se vuelve a registrar con el token del
instalador. **Un problema de red no cuenta**: quedarse sin internet un minuto no puede borrar el
registro de un colector que funciona.

Reproducido con el identificador muerto real antes de arreglarlo, y verificado después:
`el registro anterior ya no vale; se vuelve a registrar este equipo`.

**Regla:** un identificador guardado en disco es una suposición sobre el estado del servidor.
Antes de construir encima, se comprueba — y el fallo se distingue de la falta de red, porque
tratarlos igual borra lo que funciona.
