# Relevamiento 2026-11-03 · planos TACKER Well Service (stack BOP, cargas de piletas, cargas de trailers)

Tres PDF de 1 página (A4) provistos por el usuario. **No se versionan** (propiedad TACKER, "reproducción prohibida", repo público): solo se citan
(índice en [`docs/fuentes/tacker10/README-sk575.md`](../fuentes/tacker10/README-sk575.md)). Las capturas de `docs/preview/11-*.png` son del **visor**,
no de los planos.

**Alcance.** Los tres son planos de la **flota Well Service TACKER** ("Stack BOP estándar", "Cargas piletas Well Service Tacker", "Trailer modelo
TACKER Well Service"), no del layout del TKR-10. Se registran como fuentes de referencia (`verified: true` = el documento existe) y **no cambian la
geometría ni las cotas del TKR-10**. Tampoco se agregan equipos al layout: no hay cotas ni posiciones.

## 1. Fuentes nuevas

| sourceId                   | Documento                                         | Rev / fecha     | Dibujó / revisó   | Qué aporta                                                        |
| -------------------------- | ------------------------------------------------- | --------------- | ----------------- | ----------------------------------------------------------------- |
| `src-plano-bop-stack`      | 8127-0011 "Stack BOP estándar" (esquema típico)   | rev ?, 30/09/2026 | DJLEYRIA / DV, LD | Composición del stack. Cotas y presiones **ilegibles**            |
| `src-plano-cargas-piletas` | "Cargas piletas Well Service Tacker"              | rev 1, 29/01/2026 | DJLEYRIA / CR, FC-GG | Composición de las cargas de transporte. Sin cotas             |
| `src-plano-cargas-trailer` | 8140-0200 "Trailer modelo TACKER Well Service"    | rev 1, 29/01/2026 | DJLEYRIA / DV, FC-GG | 5 cargas; contenedor 40'×8'×8,6'                               |

## 2. Qué se lee y qué no

### 2.1 Stack BOP (8127-0011)

El PDF no embebe la fuente (CenturyGothic): los números, comillas y unidades salen como recuadros en el render y faltan en la capa de texto. Las letras
se recuperaron de la capa de texto (desplazamiento constante de código). **Todas las cotas `[ ]`, las presiones (KSI) y las medidas de brida son
ilegibles**; también el número de revisión. Legible (rótulos de la leyenda, 20 renglones; el orden de la leyenda **no** está confirmado como orden de montaje):

`BOP pipe ram` · `spacer spool` · `crossover flange` · `gate valve HCR` · `gate valve manual` · `BOP doble pipe ram/shear` · `spacer spool` (de/a KSI) ·
`BOP anular` · `crossover flange` · `API studded tee` · `blind flange` · `gate valve manual` · `API studded tee` · `blind flange` · `gate valve manual` ·
`check valve` · `crossover flange WECO FIG` · `gate valve manual` · `check valve` · `crossover flange WECO FIG`.

Hay vista frontal acotada, vista lateral con globos numerados y vista isométrica. Los globos no se pueden asociar a renglones con confianza.

### 2.2 Cargas de piletas

Legible (rótulos): patín insonorizado **pump triplex – filtros**; pileta **almacenamiento** (pequeña, sobre patín); **unidad de filtrado**; pileta
**almacenamiento** (grande, con barandas); pileta **circulación**; pileta **preparadora**; pileta **ensayo – golpeador & zaranda**; **semirremolque**
pump triplex – pileta – golpeador. Observación del cajetín: "semirremolque permiso circulación por rutas nacionales". Escala 1:1 declarada, **sin cotas**.

### 2.3 Cargas de trailers (8140-0200)

Legible: oficina de equipo, personal de equipo (×2), jefe de equipo (rotulado dos veces), y los rótulos "patín skid" y "semirremolque" (modos de transporte; el semirremolque lleva un tanque cilíndrico). La asignación exacta de cada rótulo a cada unidad no es unívoca.
Cajetín: material "COMMODITIES CONTAINER **40'×8'×8,6'**" = 12,192 × 2,438 × 2,621 m (A, rótulo del cajetín).

## 3. Cruce con el visor (TKR-10)

| Tema                       | Visor (fuente)                                                                      | Planos nuevos                                                      | Decisión |
| -------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| Trailers 12 × 2,4 m        | LAYOUT WS10 (A)                                                                      | 40'×8'×8,6' = 12,192 × 2,438 × 2,621 m                              | Misma familia: el layout redondea. **Se conserva 12 × 2,4**; caja de 2,6 m ya coincide con 8,6' |
| Piletas                    | UNA pileta de ensayo con golpeador (decisión del usuario; plano "Pileta TACKER 1-2-3" 38 m³ vs folleto 40 m³) | 5 piletas + patín insonorizado + unidad de filtrado en la flota WS | **No se agregan** piletas: flota WS, sin posición ni cotas. Fuente en conflicto de volumen sin cambios |
| BOP                        | Anular + doble ram; líneas KL1/KL2 y CL1/CL2, 2 válvulas c/u (C)                     | Además pipe ram simple, spools, HCR + manual, check valve, tee y brida ciega | **No se cambia el modelo.** El stack estándar WS difiere (ram simple adicional, check valve): fuente en conflicto con el folleto, a confirmar si el TKR-10 usa el estándar WS |
| Oficina de equipo          | No modelada                                                                          | Contenedor con mesa larga                                           | No se agrega (sin posición en el layout) |

## 4. Pendientes

- Pedir el 8127-0011 con fuente embebida o en DWG/STEP: presiones, medidas de brida, orden de montaje y rev.
- Confirmar si el TKR-10 usa el stack estándar WS (¿pipe ram simple + doble + anular?) y qué lado lleva HCR / check valve. Hasta entonces, el color y las válvulas del BOP del visor siguen **pendientes de validación**.
- Confirmar con Jorge si alguna de las cargas de piletas / trailers corresponde a la locación del TKR-10 (hoy solo está confirmada la pileta de ensayo y la fila de 4 trailers del LAYOUT WS10).
- Con las cotas del plano de cargas se podría modelar el semirremolque de la bomba triplex (hoy es un patín 6 × 2,4 m del LAYOUT).

## 5. Capturas del visor (`docs/preview/`)

| Archivo                           | Muestra                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `11-bop-stack-visor.png`          | Stack BOP del visor (carretel, doble ram, anular, líneas KL/CL), subestructura oculta |
| `11-piletas-conjunto-visor.png`   | Pileta de ensayo con golpeador, bomba triplex, manifold y patines, vista ortográfica |
| `11-trailers-visor.png`           | Fila de tráilers del layout (jefe, personal, descanso, laboratorio) y tanques      |

Generadas con `npm run snap` (Chrome headless, ortográfica / perspectiva). Geometría **aproximada**, no as-built.
