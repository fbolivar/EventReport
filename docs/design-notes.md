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
