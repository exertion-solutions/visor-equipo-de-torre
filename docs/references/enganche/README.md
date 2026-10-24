# Piso del enganchador · referencias visuales y estado de los datos

Componente 12 del visor V2: **escalera y plataforma del enganchador** (`Ot.enganche` en `legacy-ext/20-mast.js`; helpers
`buildDeckPlate`, `buildContainmentArch`, `buildSkids`, `chain`). Ficha en `legacy-ext/43-meta-enganche.js` y textos en
`scripts/patches/12-enganche.mjs`.

## Imagen de referencia (modelo CAD genérico)

**No es el equipo 10.** Sirve para la tipología y el nivel de detalle, nunca como cota as-built. Origen y licencia sin
verificar: el PNG no se versiona (ver `.gitignore`); queda solo en la copia local de esta carpeta.

| Archivo                                      | Qué muestra                                                                                                                                                       | Se usó para                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `modelado_piso_enganchador-encuellador.png`  | Render CAD de un piso de enganchador: piso de chapa, peines de tubulares en un lado, paneles laterales con barandas de caños, arco tubular trasero, patines de apoyo | Chapa antideslizante, peine de dedos individuales, barandas horizontales, arco de contención, patines |

Ubicación y altura **no** salen de esa imagen: se conservan las del visor (piso a 18,5 m sobre el eje local del mástil, `boardHeight` del
visor; huella x 0,35–2,90 · z ±1,05 en el marco local del mástil) y una foto real del equipo (no publicada) ("plataforma del enganchador
lateral y elevada").

## Qué cambió

| Elemento (nodo del GLB)                                   | Antes                                              | Ahora                                                                                                          |
| --------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `piso_chapa` (malla nueva, material `chapa_antideslizante`) | Reja de 22 barras finas sobre una placa oscura     | 2 cuadriláteros con textura de chapa antideslizante (canvas, losanges alternados); 4 triángulos               |
| `drops_PE-6` (peines)                                     | 11 listones iguales cruzando todo el ancho         | 8 dedos individuales (paso 0,12 m), punta biselada, bulón de fijación, travesaño raíz, larguero y guía lateral |
| `jaula_*` (paneles laterales)                             | Barrotes verticales                                | Barandas de 3 caños horizontales, nervios y cantonera en los paneles, panel trasero, rodapiés, postes frontales |
| `arco_contencion` (nodo y malla nuevos)                   | —                                                  | Arco tubular (semicírculo) en el lado del mástil, dos paneles de 3 travesaños y dos tirantes al aro superior    |
| `patines` (nodo y malla nuevos)                           | —                                                  | 2 patines tubulares con tapas, cartelas y 2 travesaños bajo el marco rojo                                      |
| `drops_PE-5` (trampolín)                                  | Chapa roja lisa                                    | Tacos antideslizantes, rodapiés laterales, bisagras con pasador                                                |
| `drops_PE-7`, `drops_PE-11` (puertas)                     | Marco con una cadena de 3 tramos                   | Travesaños intermedios, diagonal, pestillo y cadena de retención de eslabones alternados (8 y 5)               |
| `drops_PE-4` (rejilla desplegable)                        | Placa con travesaños                               | Largueros longitudinales y baranda baja exterior                                                               |

Grupos DROPS **sin cambios de nombre ni de `userData.dropsId`**: PE-1 … PE-9, PE-11, PE-12 (PE-10 y PE-13 los dibuja `Ot.vientos`).
Cada sección DROPS `piso-enganche` sigue anclando su marcador al centroide de los grupos `drops_PE-x`; verificado: el marcador queda a
≈ 13 px del centro de los PE-x proyectados y sin el borde punteado de "posición aproximada".

Comportamiento con el mástil: el enganche va en el grupo local del mástil (`Ml`), con la inclinación y la escala fijas de `gt` (el mástil no se
anima); el despiece solo desplaza el grupo `enganche` completo (+5, +3, 0), de modo que las mallas nuevas lo acompañan.

## Estado de los datos

| Dato                                                                | Estado     | Fuente / nota                                                                                                  |
| ------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| Existencia del piso de enganche y de los puntos DROPS PE-1 … PE-13  | confirmado | Libro DROPS 2024 (RCCO Rev.03), págs. 7–11; extracto interno (no publicado)         |
| Piso a 18,5 m (`boardHeight`) y anclaje al mástil                   | aproximado | Heredado del visor; el piso real no tiene cotas en los documentos                                              |
| Huella 2,55 × 2,10 m, altura de paneles y del aro superior          | aproximado | Heredado del visor (envolvente sin cambios)                                                                    |
| Chapa antideslizante (existencia y patrón)                          | aproximado | Tipología de la referencia CAD; espesor y tipo de chapa pendientes                                             |
| 8 dedos de peine, paso 0,12 m, ancho 0,04 m, largo 0,86 m           | aproximado | Tipología de la referencia; el Libro DROPS solo dice "peines abulonados con eslinga 3/8"" (PE-6)              |
| Peines en el lado −z del frente                                     | aproximado | Ubicación plausible respecto de PE-3 (pirosalva), PE-4 y PE-11; no documentada                                 |
| Arco tubular de contención (x 1,05 · abertura ±0,5 m · cima N + 2,3) | aproximado | Tipología de la referencia; su existencia en el equipo 10 es **pendiente**                                     |
| Patines de apoyo (tubo Ø 0,11 m, x 0,25–3,00, z ±0,95)              | aproximado | Tipología de la referencia; su existencia en el equipo 10 es **pendiente**                                     |
| Paneles con barandas de 3 caños horizontales, nervios, rodapiés     | aproximado | Tipología de la referencia y foto del folleto (jaula con logo de la empresa)                                          |
| Trampolín (PE-5): bisagras, tacos, rodapiés                         | aproximado | El Libro solo documenta "abulonado, eslinga 3/8" con 4 eslabones"; el detalle es ilustrativo                   |
| Puertas PE-7 y PE-11 con cadena de 8 y 5 eslabones                  | aproximado | El Libro documenta "bisagras soldadas, cadenas soldadas"; cantidad y forma de eslabones ilustrativas          |
| Capacidad de carga del piso, del peine y del arco                   | pendiente  | Sin dato; no se muestra ninguna                                                                                |
| Certificaciones / inspecciones del piso                             | pendiente  | Sin dato                                                                                                       |
| Peligros nuevos (atrapamiento en peine, caída de tubulares, puerta)  | pendiente  | Rotulados "referencia, pendiente de validación" en el panel; ninguno se presenta como requisito              |

Ficha de confiabilidad (`window.__RIG_META.enganche`): se mantiene **C / Aproximado**; la nota lista lo pendiente.

## Presupuesto de rendimiento (renderer.info, escena completa, 1440 × 900)

| Métrica                            | Antes (HEAD `60d7972`) | Después | Límite       |
| ---------------------------------- | ---------------------- | ------- | ------------ |
| Triángulos renderizados            | 105.254                | 106.730 | + 6.000      |
| Draw calls                         | 349                    | 349     | + 2          |
| Triángulos del grupo `enganche`    | 5.446                  | 6.922   | —            |
| Mallas del grupo `enganche`        | 46                     | 46      | —            |

Las 3 mallas nuevas (`piso_chapa`, `arco_contencion_blanco_jaula`, `patines_negro_acero`) se compensan fusionando materiales de un solo
uso (pasarela de la escalera y cáncamo PE-8 pasan a acero galvanizado; PE-6 usa un solo material). Distribución (triángulos):
`piso_chapa` 4 · `arco_contencion` 344 · `patines` 376 · `jaula_*` 864 (antes 828) · `drops_PE-6` 398 (antes 130) · PE-5 254 (antes 70) ·
PE-7 284 (antes 156) · PE-11 176 (antes 100).

## Verificación

Con Chrome headless (swiftshader), standalone y `?embedded`: sin errores ni avisos de consola; modos EXPLORE / OPERATION / QHSE / TRAINING,
despiece, aislar, hover y selección por clic sobre `piso_chapa`, medición de 2 puntos y capa DROPS (marcador `piso-enganche`) funcionan; el GLB
exportado trae los nodos `piso_chapa`, `arco_contencion`, `patines`, `jaula_*` y todos los `drops_PE-x`. Capturas: `docs/preview/09-enganche-*.png`.

## No verificado

- Nada de esto es geometría as-built: falta el relevamiento dimensional del piso real (o fotogrametría). La ficha queda en C.
- No se midió en GPU real (solo swiftshader); no se probó en móvil.
- El aspecto del patrón de chapa depende de la iluminación del visor; el patrón no es un dato del equipo.
