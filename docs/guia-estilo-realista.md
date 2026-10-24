# Guía de estilo realista y recorrido por componente — Equipo 10 (SK-575)

Fecha: 2026-10-11 · Alcance: visor V2 (`public/legacy/`, módulos `legacy-ext/`) y motor nativo R3F (`src/scene/`).
Estado: **propuesta**. No cambia datos, cotas ni QHSE. Documento de diseño, no de ingeniería.

> Regla que gobierna todo este documento: **más realismo visual no es más exactitud.** Un render fotorrealista
> transmite una autoridad que el modelo no tiene (confianza B/C, no as-built). Cada mejora visual de esta guía va
> acompañada de su rótulo: "referencia CAD · no as-built", "efecto visual", "animación ilustrativa". Si una mejora
> hace más difícil ver ese rótulo, no se hace.

Capturas de trabajo (no versionadas, carpeta de sesión `scratchpad/estilo/`): `ref1-drillingmatters.png`,
`ref1-drawworks.png`, `ref2-tecedu.png`, `ref2/workover-*.jpg|webp`, `nuestro.png`, `nuestro-b.png`,
`nuestro-piso.png`, `tesis-p3.png`, `tesis-p5.png`, `tesis-p6.png`, `tesis-p7.png`, `tesis-p8.png`. Si se quieren
conservar, copiarlas a `docs/preview/estilo/` en un cambio aparte.

---

## A. Qué hace "realista" cada referencia

### A.1 IADC — Interactive Rig (drillingmatters.org)

**Es un equipo de perforación (drilling), no workover.** Se toma solo la interacción y el tratamiento de imagen; nada de
su configuración (top drive, iron roughneck, bombas de lodo, zarandas, mesa rotary) aplica a equipo 10.

Inspección técnica (Playwright headless, DOM y red):

| Técnica | Qué hay realmente |
| --- | --- |
| Motor | **No es 3D en tiempo real.** Angular 4 + `<img src="tower.png" usemap="#Map">`: una sola imagen pre-renderizada del rig con fondo transparente. Sin `<canvas>`, sin WebGL. |
| Fondo | Foto real de un campo (`field1.jpg`) a pantalla completa, lavada con blanco (~35 %). El rig "se apoya" en un suelo real: es lo que más vende el realismo. |
| Render | Render offline con sombras suaves de contacto horneadas en la propia imagen, colores de pintura saturados por sistema (amarillo barandas, verde piletas, azul bombas, rojo BOP) y vista axonométrica alta. |
| Hotspots | `<area shape="rect">` sobre la imagen + círculo numerado con flecha fina (callout) junto a cada pieza (1–11). |
| Leyenda | Lista numerada fija a la derecha (bloque número + nombre), que replica los números de los callouts. |
| Ficha | Modal centrado con título, **video MP4 real del componente** (`assets/video/B/Drawworks.mp4`, metraje del fabricante) y paginador 1…11 con el actual en rojo: anterior/siguiente sin cerrar el modal. |

Captura: `ref1-drillingmatters.png` (vista general), `ref1-drawworks.png` (ficha "Drawworks" abierta).

Lo que vale copiar: **numeración estable** compartida entre modelo, leyenda y ficha; **paginador dentro de la ficha**;
suelo fotográfico que ancla el equipo; paleta por sistema. Lo que no: imagen estática (pierde órbita, medición, corte,
QHSE), metraje ajeno sin fuente y contenido de drilling.

### A.2 TECEDU — Workover rig (tecedu.org, "Digital Pattern")

Inspección: la página es una **galería de 13 renders offline** 1920×1080 (jpg/webp) de un modelo 3D de workover sobre
camión; sin canvas ni visor interactivo. El modelo vive en su producto de AR/VR (no expuesto). Galería: derrick,
drawworks, monkey board, BOP, compresor, panel de control, outrigger hidráulico, vistas generales.

| Técnica | Evidencia en los renders |
| --- | --- |
| Iluminación | **Sol duro + cielo HDRI exterior** (nubes reales, hora dorada en `general-view.jpg`, cielo azul en `derrick.jpg`). Sombras proyectadas nítidas del reticulado sobre el ripio (`monkey-board.jpg`): el patrón de sombra comunica la estructura mejor que la estructura misma. |
| Reflejos | Metales y pintura reflejan el cielo (gradiente cálido/frío en los cilindros azules, cañería de acero con reflejo especular largo). Sin entorno, el PBR se ve plástico. |
| Materiales | Pintura dieléctrica brillante (azul, naranja), acero galvanizado gris claro con micro-variación, goma negra mate en mangueras, cable con hebras, madera en tablones del piso. Roughness variada **dentro** de una misma pieza (huellas, polvo). |
| Suelo | Textura de ripio/arena fotográfica con variación de escala macro y micro; recibe sombras. |
| Geometría | Chapas con espesor real, bordes con bisel/chaflán que atrapan luz, recortes de alivianamiento en las almas, cartelas, pasadores, rejillas de ventilación, discos de freno perforados, mangueras con curvatura (sweep). Detalle concentrado donde mira la cámara. |
| Encuadre | Cámaras de "fotógrafo": contrapicado desde la boca de pozo (`derrick.jpg`), cenital sobre el monkey board, primer plano a altura de ojo con profundidad de campo leve. Cada componente tiene **su** toma. |
| Postproceso | Tone mapping fílmico, AO de contacto (rincones oscuros), bloom muy leve en reflejos, viñeta suave. |

Captura: `ref2-tecedu.png` (cabecera), `ref2/workover-derrick.jpg`, `ref2/workover-monkey-board.jpg`,
`ref2/workover-general-view.jpg`, `ref2/workover-general-view-3.webp`.

Lo que vale copiar: entorno exterior con sol, reflejos del cielo, sombras del reticulado en el suelo, una cámara
autorada por componente, espesor y bisel en chapas. Lo que no: geometría del camión/mástil (otro equipo), postproceso
de path tracing (inviable en tiempo real con el presupuesto) y profundidad de campo permanente.

### A.3 Artículo Chagoyén-Méndez et al. (2015) — torre mástil XJ-350

PDF local (artículo de revista, no tesis): *Modelado y análisis de la torre del equipo de intervención de pozos de
petróleo y gas*, Centro Azúcar 42(2), pp. 21–30. Equipo: **XJ-350 Workover Rig (SJ Petroleum Machinery, China)**. No es
el SK-575. Aporta topología de un mástil reticulado workover (sección D) y un ejemplo de estilo "SolidWorks" (Fig. 3,
p. 26): reticulado en color oscuro sobre fondo claro, vientos como líneas finas grises, apoyos en verde. Su valor de
estilo es la **legibilidad del reticulado**: diagonales y montantes distinguibles por contraste, no por color.

---

## B. Brecha contra nuestro visor

Medición propia (V2, `npm run snap`, Chrome headless SwiftShader, 1440×900, pixelRatio 1, modelo SK-575 cargado):

| Vista | Draw calls | Triángulos | Segmentos de línea | Texturas |
| --- | --- | --- | --- | --- |
| General (entorno de locación) | 152 | 532 540 | 111 320 | 13 |
| Vista CAD (solo SK-575, noche) | 75 | 268 233 | 85 405 | — |

Estado actual relevante: `renderer.toneMapping = ACESFilmic`, `scene.environment = null` (solo los materiales SK-575 reciben
el PMREM "room" de `entorno()` en `84-modelo-sk575.js`), fondo plano `#26313E` (`#0C111B` de noche) con niebla del mismo color,
`HemisphereLight` + 1 `DirectionalLight` 2048 con sombra ±40 m, suelo `PlaneGeometry(260)` gris liso con piedras dispersas,
`preserveDrawingBuffer: true` permanente, render bajo demanda. Presupuesto: < 300 draw calls y < 1,5 M tris (performance-review).

| Aspecto | Referencia | Nuestro | Cambio propuesto | Costo de rendimiento | Archivo donde va |
| --- | --- | --- | --- | --- | --- |
| Entorno / reflejos | Cielo HDRI exterior, metales reflejan nubes y horizonte (A.2) | PMREM de "habitación" gris solo en SK-575; el resto sin entorno | PMREM de **cielo exterior procedural** (gradiente cenit/horizonte/suelo + disco solar difuso) como `scene.environment` para toda la escena; reemplaza `entorno()` | 1 PMREM al iniciar (~5–15 ms), 0 por frame, ~1,5 MB VRAM | `legacy-ext/84-modelo-sk575.js` (`entorno()`); nativo: `src/scene/lighting/sky.ts` ya lo hace — reusar el mismo gradiente |
| Fondo / cielo | Cielo con nubes; equipo recortado contra cielo claro | Color plano oscuro azul pizarra | Fondo = mismo gradiente del entorno (o `scene.background` = textura equirect baja, 512×256); niebla del color del horizonte, empezando a 150 m | ~0 (1 textura 0,5 MB) | `legacy-ext/84-modelo-sk575.js` o nuevo `legacy-ext/87-ambiente.js`; nativo `Lighting.tsx` |
| Sol | Sol duro, ángulo bajo, sombras largas y nítidas | Direccional blanca 2,2, alta (30,55,25), sombra radio 4 | Sol cálido (`#fff1dc`), elevación ~35°, azimut que proyecte el reticulado sobre la locación visible; hemisférica cielo/suelo coherente con el entorno (intensidad menor, el entorno aporta el relleno) | 0 (mismo shadow map 2048) | idem |
| Sombras de contacto / AO | AO en rincones y bajo el equipo | Ninguna | **AO horneado**: decal oscuro bajo carrier, piletas, piso y planchada (textura radial 256 px, `MeshBasicMaterial` multiplicativo). Nativo: `ContactShadows frames={1}` ya existe | +1 draw call por decal (≈6), sin costo por frame | `legacy-ext/40-wellsite.js` (entorno); nativo `Lighting.tsx` |
| Suelo / locación | Ripio fotográfico con variación macro | Plano gris liso + puntos | Textura de ripio tileable 1024 (albedo + roughness en un canal) **+ variación macro procedural** (ruido de baja frecuencia en shader, ya existe el de `desgaste`) para que no se note el tile; planchada compactada más clara; huellas de rodado como decal | 1 textura 1024 webp/KTX2 ≈ 5,6 MB VRAM; 0 draw calls extra | `legacy-ext/40-wellsite.js`; texturas en `public/textures/` |
| Pintura (rojo, amarillo, azul) | Dieléctrico brillante con reflejo del cielo | `metalness 0.3–0.4`, `roughness 0.40–0.45` | Pintura industrial = **metalness 0**, roughness 0,45–0,6; color de catálogo de la pintura si hay fuente, si no el actual (C) | 0 | `cad/sk575/exportar.py` (`MATS`) **o** override por sufijo de material en `84-modelo-sk575.js` sin reexportar |
| Acero desnudo | Solo en vástagos, pasadores, cañería | `acero` metal 1 / rough 0,26 usado ampliamente → aspecto cromado | Reservar `acero` (1 / 0,25–0,3) para vástagos y mecanizados; estructura del mástil y carrier = pintura o galvanizado | 0 | `exportar.py` (asignación de material por pieza) |
| Galvanizado | Gris claro con micro-variación ("spangle") | No existe; `grating` (0,8 / 0,55) se acerca | Nuevo `galvanizado`: `#a9adb0`, metal 1, rough 0,5 + ruido de brillo en shader (reusar `desgaste`, escala alta) | 0 (1 variante de shader) | `exportar.py` `MATS` + `84-modelo-sk575.js` |
| Cable de acero | Hebras visibles, brillo anisótropo | `cable` gris oscuro metal 1 / 0,5, cilindro liso | Rayado helicoidal procedural en shader (función de la coordenada a lo largo del cable) que modula roughness; vientos como tubo de 6–8 lados, no línea | 0 por frame; vientos: +tris despreciables | `84-modelo-sk575.js`; geometría en `cad/sk575/` (vientos) |
| Goma / mangueras | Negra mate, curvas suaves | `goma` 0 / 0,9 | Correcto; subir segmentos de curva en mangueras visibles del malacate y BOP | +tris bajos | `cad/sk575/` |
| Grating / pisos | Rejilla real, se ve el suelo a través | Material plano | Textura alpha de rejilla 512 (`alphaTest`, sin transparencia ordenada) en piso pulling, piso de enganche y planchada | 1 textura 512 (~1,4 MB); 0 draw calls extra | `exportar.py` (UV planares) + `84-modelo-sk575.js` |
| Aristas | Las referencias no usan aristas | Aristas negras 0,55 siempre | De día bajar a 0,25 o apagarlas por defecto; mantener el botón "Aristas" (presentación CAD) | Apagadas: −85–111 k segmentos | `84-modelo-sk575.js` (`lineaMat`) |
| Desgaste | Polvo y variación por pieza | Suciedad por altura (`smoothstep` bajo 2,2 m) + variación de brillo | Mantener; agregar chorreado bajo uniones solo en pintura, nunca en galvanizado ni cromo. **Rotular "efecto visual — no representa el estado del equipo"** | 0 | `84-modelo-sk575.js` (`desgaste`) |
| Reticulado del mástil | Perfiles con espesor, cartelas, recortes, bisel | Barras amarillas de sección cuadrada; diagonales finas | Perfiles L/C reales por extrusión, cartelas en nudos, juntas de tramos con platinas (sección C.4) | +100–200 k tris (instancias para cartelas) | `cad/sk575/` (build123d) |
| Encuadre por componente | Una toma autorada por componente | `focusOn` genérico (caja + distancia) | Cámara autorada por parada del recorrido (sección C.5) | 0 | datos del recorrido |
| Callouts / ficha | Números + leyenda + modal con paginador | Árbol de componentes + inspector lateral | Recorrido con paradas numeradas, pin 3D, ficha con anterior/siguiente | Pins HTML reproyectados cada 2 frames | nuevo `legacy-ext/87-recorrido.js`; nativo `src/components/training/` |
| Captura | — | `preserveDrawingBuffer: true` permanente | Render + `toBlob` en el mismo tick (performance-review §6) | Mejora | V2 parche en `scripts/build-legacy.mjs` |

---

## C. Plan priorizado

Presupuesto que no se negocia (skill `performance-review`): < 300 draw calls, < 1,5 M tris, texturas ≤ 2048 comprimidas,
un solo direccional con sombra 2048, sin SSAO/bloom permanentes, render bajo demanda. Cada paso anota antes/después
(calls, tris, frame time) en el PR. Referencia de partida: 152 calls / 533 k tris / 111 k segmentos.

### C.1 Materiales PBR

**P1 — corregir la física de los materiales existentes (sin texturas, costo cero).**

| Material | Uso | color | metalness | roughness | Nota |
| --- | --- | --- | --- | --- | --- |
| `pintura_roja` (hoy `rojo`) | carrier, cuadro, BOP | actual | **0** | 0,50 | La pintura es dieléctrica: metalness > 0 la vuelve "plástico metalizado". |
| `pintura_amarilla` (hoy `amarillo`) | mástil, barandas | actual | **0** | 0,50 | Amarillo del mástil: color sin fuente → C, igual que hoy. |
| `pintura_azul` (hoy `azul`) | acumulador, bomba | actual | **0** | 0,45 | |
| `acero` | vástagos HYCO, pasadores, ejes | `#a3a8ae` | 1 | 0,25 | Solo mecanizados. |
| `acero_oscuro` | tornillería, placas sin pintar | `#5f646b` | 1 | 0,45 | |
| `galvanizado` (nuevo) | grating, escaleras, barandas galvanizadas si la fuente lo indica | `#a9adb0` | 1 | 0,50 + ruido ±0,12 | Usarlo **solo** donde una foto o plano muestre galvanizado; si no, pintura. |
| `cable` | líneas, vientos | `#4a4e54` | 1 | 0,40 + rayado | Rayado helicoidal procedural (P2). |
| `goma` | mangueras, neumáticos | `#161616` | 0 | 0,90 | Sin cambios de fondo. |
| `grating` | pisos | `#8d9196` | 1 | 0,55 | Pasa a textura alpha (P2). |
| `vidrio` | cabina | `#1b2630`, opacity 0,35 | 0 | 0,05 | Necesita entorno para verse vidrio (depende de C.2). |

Implementación: en `cad/sk575/exportar.py` → `MATS` (fuente de verdad, reexportar con `publicar.mjs`) o, para probar sin
reexportar, un mapa de overrides por sufijo `<id>_<material>` en `leerGlb()` de `84-modelo-sk575.js`. Recomendado: probar
con override, consolidar en `MATS`.

**P2 — texturas mínimas, compartidas, comprimidas.** Rejilla alpha 512 (pisos), ripio 1024 (suelo), una "detail normal"
de chapa/pintura 512 tileada en espacio de mundo (triplanar barato en el shader de `desgaste`) para romper el reflejo
perfecto. Total ≈ 8 MB VRAM. Sin UV nuevas salvo pisos.

**P3 — roughness horneada por pieza** (AO + suciedad en atlas por componente desde build123d/Blender) solo si P1+P2 no
alcanzan; implica UVs y un pipeline nuevo (skill `gltf-pipeline`, KTX2).

### C.2 Iluminación y entorno

- **P1** Cielo exterior procedural único (mismo gradiente que `src/scene/lighting/sky.ts` para que ambos motores se vean
  igual) → PMREM → `scene.environment` para **toda** la escena y `scene.background`. Reemplaza el `entorno()` tipo "room"
  de `84-modelo-sk575.js`. `envMapIntensity` ~0,8.
- **P1** Sol cálido único con sombra (2048, ±40 m, ya acotada), elevación ~35°; hemisférica a 0,4–0,6 (el entorno aporta
  el relleno). Revisar `shadow.bias`/`normalBias` para el reticulado fino (acné en barras de 5 cm).
- **P1** Preset de luz "Día" por defecto y "Noche" actual (`Yd()` del V2) conservado: la noche usa las luminarias con
  fuente (7+5 luminarias, 3 reflectores).
- **P2** AO horneado por decals bajo equipos (C.3). En el nativo, `ContactShadows frames={1}` ya existe.
- **P3** HDRI real CC0 1k (`public/environments/`, ≈1,5 MB) como alternativa al procedural; N8AO/SSAO **solo** en
  "Exportar PNG de presentación" (un frame), nunca permanente.

### C.3 Terreno y locación

- **P1** Suelo: ripio tileable + variación macro por ruido (sin tile visible), color tierra patagónica neutra; planchada
  compactada más clara. Los límites de la locación salen del layout de locación (fuente existente); no inventar cotas nuevas.
- **P2** Decals: huellas de rodado hacia la entrada, manchas bajo bomba y acumulador (efecto visual), AO de contacto.
- **P2** Horizonte: anillo de terreno bajo (cilindro abierto con gradiente) a 200 m para que el fondo no corte en línea.
- **P3** Vegetación rala instanciada (1 `InstancedMesh`, ≤ 300 matas) solo fuera del vallado. Estético, rotulado así.

### C.4 Nivel de detalle por pieza del SK-575

Criterio: el detalle va donde se detiene la cámara del recorrido. Simplificar primero componentes C repetidos o lejanos;
no bajar la reconocibilidad de mástil, aparejo, malacate, BOP, llave ni vientos (performance-review §13). Ninguna cota
nueva sin fuente: la geometría de detalle (cartelas, recortes, espesores) es **estética, confianza C** y se comenta así en
`cad/sk575/`.

| Pieza | Hoy | Detalle propuesto | Tris extra est. | Prioridad |
| --- | --- | --- | --- | --- |
| Mástil reticulado (`sk575_mastil`, 28 k publicados) | Barras de sección cuadrada | Montantes como **perfil L o C** extruido (sección D como referencia de topología, no de medidas); diagonales y horizontales en L; cartelas en nudos (una geometría, `InstancedMesh`); platinas y bulones en la junta de tramos; escalera con jaula; poleas de la corona visibles con su eje | +60–120 k | P1 |
| Corona | Bloque en voladizo | Poleas (revolución) con garganta, guarda, pasarela con baranda, ojal de izaje; líneas que entran a cada polea | +15 k | P1 |
| Piso de enganche (`sk575_enganche`, 68') | Plataforma simple | Peines (dedos) para tiros, baranda con rodapié, canasta del enganchador, punto de anclaje; grating alpha | +10 k | P1 |
| Piso pulling (`sk575_piso`) | Losa + escaleras | Grating alpha, rodapiés, barandas con postes, escalera 45° con largueros C (helper `stair` de `rig10.py`), cuñas y tapa de pozo | +10 k | P2 |
| Malacate / cuadro (`sk575_cuadro`) | Tambores y discos | Cable enrollado en el tambor (textura/normal de espiras, no geometría), bandas de freno, guardas de metal desplegado (alpha), embragues con bulones | +20 k | P2 |
| Cabina (`sk575_cabina`) | Volumen con vidrio | Vidrios con reflejo del entorno (depende de C.2), espejos, peldaños, manijas; interior no | +8 k | P2 |
| Cilindros HYCO (`sk575_izaje`) | Camisa/etapas/vástago (B) | Acero cromado en vástagos, mangueras con sweep, orejas con pasador | +5 k | P2 |
| Vientos (`sk575_vientos`) | Líneas | Tubo de 6 lados con material cable; grilletes y tensores en extremos | +5 k | P3 |
| Manifold (`sk575_manifold`, 68 k) | Detallado | **Bajar** (simplify más agresivo, es C y lejano) para pagar el mástil | −20–30 k | P2 |

Resultado esperado: ~600–700 k tris y ~160–180 calls en la vista general; dentro del presupuesto.

### C.5 Recorrido visual por componente (patrón de UI)

Toma de A.1 la numeración estable y el paginador; de A.2, la cámara autorada por componente. Superficie "Operate"
(impeccable): legibilidad y consistencia antes que expresión; usa los tokens actuales del V2 (`#141B26`, borde `#303B4B`,
texto `#DDE3EC`, acento `#DDBB65`), no un estilo nuevo.

**Paradas (orden del flujo de trabajo de un pulling, propuesto; validar con el usuario):** 1 Carrier y gatos ·
2 Cabina · 3 Motor y transmisión · 4 Cilindros de izaje · 5 Mástil · 6 Corona · 7 Piso de enganche · 8 Aparejo ·
9 Malacate/cuadro · 10 Piso pulling · 11 Llave hidráulica · 12 BOP y acumulador · 13 Vientos y anclajes · 14 Planchada
y caballetes · 15 Circulación (bomba, piletas, manifold). Cada parada referencia `componentId` existentes; ninguna crea
componentes.

**Datos de una parada** (JSON compartido por ambos motores, p. ej. `src/data/training/rig10-recorrido.json`):

```jsonc
{
  "n": 7,
  "componentId": "enganche",
  "titulo": "Piso de enganche",
  "camara": { "pos": [x, y, z], "target": [x, y, z], "fov": 42 },   // autorada, en metros, origen boca de pozo
  "aislar": "atenuar",            // "atenuar" | "ocultar" | "ninguno"
  "pins": [{ "pos": [x, y, z], "texto": "Peines para tiros" }],   // posición del modelo: "aproximada"
  "cotas": ["mast.monkeyBoardHeight"],                              // claves de Specification → valor + sourceId + conflicto
  "qhse": ["drops:ENG-1"],                                          // ids existentes; el badge de estatus sale del dataset
  "texto": "Qué es y para qué sirve (sin requisitos)."
}
```

**Comportamiento:**

- Cámara: interpolar posición **y** objetivo a la vez, ~600 ms, ease-in-out cúbico (threejs-expert); `invalidate()` por
  frame de la transición; respetar `prefers-reduced-motion` (corte directo).
- Aislamiento: "atenuar" baja la saturación/luminancia del resto vía color de material clonado (reversible, sin
  transparencia ordenada); el componente actual conserva su material. "ocultar" solo para piezas internas.
- Ficha (panel lateral derecho en escritorio, hoja inferior en móvil): número/total ("7 / 15"), título, badge de
  confianza A/B/C del componente, texto, cotas con fuente (y "Fuente en conflicto" cuando la hay), QHSE con badge de
  estatus (solo `confirmed`/`procedure` como requisito), pie fijo: "Referencia CAD · no as-built · animación ilustrativa".
- Navegación: Anterior / Siguiente en la ficha, ← → en teclado, Esc sale, paginador numerado (como A.1) con la parada
  actual marcada por forma y color (no solo color). Enlace profundo `?parada=7`.
- Pins: círculo numerado proyectado (HTML, reproyección cada 2 frames, oculto fuera del frustum); clic en pin = ir a
  la parada. Clic en una pieza durante el recorrido = salta a su parada si tiene una.
- Integración: entrada desde el modo TRAINING (`modeStore`) y desde el menú "Vista"; mientras está activo, aplica el
  "modo enfoque" de `83-layout-escena.js` (oculta cartas). Sale restaurando cámara y capas previas.
- Lugar: V2 primero como `legacy-ext/87-recorrido.js` (el V2 es el motor por defecto); nativo después con la skill
  `legacy-migration` y una fila nueva en `docs/FEATURE_PARITY.md`.
- Costo: 0 draw calls de escena; DOM de ≤ 15 pins; sin postproceso.

---

## D. Referencia de topología: mástil reticulado workover (Chagoyén-Méndez et al., 2015)

**Equipo del artículo: XJ-350 (SJ Petroleum Machinery). No es Equipo 10 ni el SK-575.** Páginas = numeración de la revista (página n del PDF = p. 20+n). Lo que sigue se usa solo como
referencia de **forma** para modelar el reticulado con verosimilitud: **confianza C**, sin trasladar ninguna medida.

| Elemento | Qué dice / muestra el artículo | Página |
| --- | --- | --- |
| Tipo de estructura | Torre mástil telescópica de perfiles de acero sobre vehículo con neumáticos; **dos secciones** que deslizan una dentro de otra mediante gato hidráulico; estructura **tipo celosía, asimétrica** | p. 22 |
| Tipos de perfil | Sección **I, canal (C), angular (L) y tubular**, unidos principalmente por **soldadura de filete** | p. 22 |
| Montantes (columnas) | Los **angulares** actúan como columnas (de allí se tomó la muestra M1); el modelo se arma sobre los ejes centroidales de las columnas | pp. 23, 25 |
| Diagonales | Elementos diagonales (muestra M2); en las fotos se ven diagonales en V/N entre montantes y horizontales | pp. 23 (Fig. 1), 25 |
| Horizontales | Travesaños entre montantes; el elemento deformado estudiado es una horizontal de la sección inferior (Fig. 1, fotos inferiores) | p. 23 |
| Plataformas / cunas | Dos "cunas": una para mazos de varillas (cabillas) y otra de respaldo a la tubería que apoya en el suelo; Fig. 2 b) y c) muestran el bastidor de cada una (marco perimetral, largueros y dedos) | pp. 22, 25 |
| Corona | Marco superior donde baja el aparejo (Fig. 2 a) | p. 25 |
| Base | La torre apoya en un conjunto llamado **"tijera"** y este en una **base de vigas** sobre el suelo, ambas unidas entre sí y al camión | p. 23 |
| Vientos | La torre se fija a tierra con cables; Fig. 3 muestra vientos a anclajes perimetrales y a nivel de plataforma | pp. 22, 26 |
| Inclinación | El artículo declara inclinación respecto de la vertical para **su** equipo. **No se usa**: la inclinación del equipo 10 sale de sus propias fuentes | p. 22 |

Aplicación a `cad/sk575/` (estética, C): montantes en L o C según la foto/plano del SK-575 cuando exista; si no, L;
diagonales y horizontales en L; cartelas soldadas en nudos; junta entre tramos con platinas. Ninguna sección, espesor,
ancho o paso de diagonal se toma de este artículo.

### D.1 Datos del artículo que NO se usan (referencia de otro equipo, no aplicable)

Se listan para que nadie los importe por error. **No entran a `src/data/`, ni como `Specification`, ni como límite
operativo, ni como carga, ni en la UI.**

| Dato del artículo | Valor | Página | Estado |
| --- | --- | --- | --- |
| Carga en corona (capacidad máx. del bloque + peso) — rotulada C1 en Fig. 4 | 950 kN, excéntrica 10 cm / 3 cm | pp. 24, 27 | referencia de otro equipo, no aplicable |
| Cargas en cunas — rotuladas C2 y C3 en Fig. 4 | 0,15 kN/m (tubería), 45 kN/m (varillas), 0,84 kN/m (enganchador) | pp. 24, 27 | referencia de otro equipo, no aplicable |
| P (rotulado en el fuste en Fig. 4; el texto no lo define) | — | p. 27 | referencia de otro equipo, no aplicable |
| Peso de escaleras, mangueras, etc. por pata | 0,1746 kN/m | p. 24 | referencia de otro equipo, no aplicable |
| Presión de viento (NC-285) y carga lineal | 0,697 kN/m²; 0,053 kN/m | p. 24 | referencia de otro equipo, no aplicable |
| Coeficiente de balasto del suelo | 2 500 kN/m³ | p. 24 | referencia de otro equipo, no aplicable |
| Altura en operación / solapamiento telescópico | 31,7 m / 2,53 m | p. 22 | referencia de otro equipo, no aplicable |
| Material homologado | AISI 1030 laminado, fluencia 350 MPa, rotura 550 MPa, 175 HB | pp. 25–26 | referencia de otro equipo, no aplicable |
| FEA ANSYS: von Mises máx., desplazamiento, FS | 208,44 MPa; 26,7 mm; 1,19 | p. 27 | referencia de otro equipo, no aplicable |
| FEA elemento deformado | 18,911 MPa; 0,9261 mm | p. 28 | referencia de otro equipo, no aplicable |
| Dimensiones del modelo simplificado | > 15 m alto, 1,63 m ancho, 1,03 m | p. 27 | referencia de otro equipo, no aplicable |

Los colores de las figuras FEA (Fig. 5–6, p. 28) tampoco se usan como estilo: un mapa de tensiones en el visor sugeriría
un cálculo que no existe.

### D.2 Fuente propuesta (no agregada al repo)

```ts
{
  id: 'src-ref-chagoyen-2015-xj350',
  kind: 'estimate',   // provisional: SourceKind no tiene "literatura"; 'estimate' impide que respalde confirmed/procedure
  title: 'Chagoyén-Méndez et al., Modelado y análisis de la torre del equipo de intervención de pozos de petróleo y gas (XJ-350 Workover Rig)',
  ref: 'Centro Azúcar 42(2):21-30, 2015 · topología del reticulado: pp. 22-27 (Fig. 1-4) · otro equipo, no equipo 10',
  verified: false,
}
```

Decisión pendiente del usuario: agregar `'literature'` a `SourceKind` (`src/types/rig.ts`) o mantener `'estimate'`. En
cualquier caso solo puede respaldar notas de geometría C ("topología de referencia"), nunca un valor numérico del equipo 10.

---

## E. Orden sugerido de ejecución

1. P1 materiales por override (C.1) + cielo/sol/fondo (C.2) → captura antes/después con `npm run snap`, mismas cámaras.
2. P1 recorrido V2 con 5 paradas piloto (mástil, corona, enganche, malacate, BOP) → validar el patrón con el usuario.
3. P1 detalle de mástil, corona y enganche en `cad/sk575/` (C.4) pagando con simplify del manifold.
4. P2 suelo, decals, grating alpha, cable rayado, resto de paradas.
5. P3 HDRI real, PNG de presentación con AO de un frame, vegetación.

Nota de herramienta: `scripts/snap.mjs --file` sirve solo la carpeta del HTML, así que el fetch de
`../models/rig10/*.glb` da 404 y el V2 usa el respaldo base64 (funciona, pero las capturas no miden la ruta de carga
servida).
