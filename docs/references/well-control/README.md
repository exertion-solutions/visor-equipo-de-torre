# Control de pozo · referencias visuales y estado de los datos

Componente 07 del visor V2: **BOP, acumulador y choke manifold** (`legacy-ext/40-wellsite.js`, funciones
`buildBop`, `buildChoke`, `buildAcumulador`; parámetros `BOP_COLOR`, `CHOKE`, `CHOKE_ROUTING`).

## Imágenes de referencia (unidades genéricas)

**No son el equipo 10.** Sirven para la tipología y el nivel de detalle, nunca como cota as-built.
Origen y licencia sin verificar (fotos de catálogo de terceros): no se embeben en el HTML y **no están versionadas en git** (ver `.gitignore`); se guardan solo en la copia local de esta carpeta.

| Archivo                                | Qué muestra                                                                     | Se usó para                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `bop-anular-doble-carretel-simple.jpg` | Anular + doble ariete + carretel + simple                                       | Bonetes rectangulares, cilindros operadores, vástagos de traba, color rojo  |
| `bop-serie-800-700-cad.jpg`            | Render CAD del mismo tipo de stack                                              | Corona de espárragos del anular, bridas con espárragos pasantes             |
| `bop-stack-render.webp`                | Stack de frente                                                                 | Proporciones de niveles del ariete doble                                    |
| `choke-manifold-tres-ramales.webp`     | Choke manifold sobre patín, válvulas con volante, manómetro                     | Distribución de ramales, cruz, patín con orejas                             |
| `choke-manifold-jg35.avif`             | Choke manifold con colector largo, dos manómetros, patín con bolsillos y orejas | Colector de salida, manómetros, bolsillos de autoelevador                   |
| `acumulador-skid-bancos-laterales.jpg` | Acumulador grande con tablero, bancos de botellones y colector                  | Colector con válvulas, tablero de control, patín                            |
| `acumulador-compacto-4-botellones.avif`| Acumulador compacto en bastidor con botellones, motor y caja de control         | Botellones con casquetes y etiqueta, jaula, orejas de izaje, caja de control |

## Estado de los datos

| Dato                                                        | Estado        | Fuente / nota                                                                                               |
| ----------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| BOP Cameron anular + doble ariete, 7 1/16", 5M              | confirmado    | Folleto Equipo 10 rev. 26/06/2024; acta de prueba del acumulador equipo 10 (06/10/2023)                         |
| HCR de 2 1/16" (lado choke/kill)                            | confirmado    | Acta de prueba del acumulador equipo 10 (06/10/2023). No se modela un tercer ariete ni drilling spool             |
| Acumulador 8 × 2,4 m, 5 botellones, 3.000 psi               | confirmado    | Folleto / layout de locación. El acta equipo 10 dice "abiertos 4 líneas": no contradice, se mantienen los 5 botellones |
| Posición del choke manifold (x≈3,4 · z≈−4,3)                | confirmado    | Jorge (posición en locación)                                                                                |
| Envolvente del choke 2,30 × 2,10 × 1,45 m                   | aproximado    | Estampada en la foto de una unidad genérica (DIM 210×230×145 cm)                                            |
| Volantes Ø≈0,40 m, cotas internas del choke                 | aproximado    | Tipología de las fotos                                                                                      |
| Presión de trabajo del choke manifold                       | pendiente     | Sin dato                                                                                                    |
| Tipo de válvula de entrada del choke (manual / HCR)         | pendiente     | Se dibujan 2 válvulas manuales en serie                                                                     |
| Color del BOP y del acumulador                              | pendiente     | Rojo de las referencias; `BOP_COLOR = 'BLUE'` vuelve al azul original                                      |
| Ruteo de líneas BOP → choke → pileta y bomba → kill         | pendiente     | Requiere P&ID / procedimiento de control de pozo (`CHOKE_ROUTING = 'legacy'` restaura el anterior)          |
| Asignación de lados choke (x=−0,2) y kill (x=+0,2) del BOP  | pendiente     | Se conservan los puntos de conexión existentes                                                              |
| Zona de exclusión / DROPS alrededor del BOP y del choke     | pendiente     | El Libro DROPS no trae puntos para el choke; las zonas ilustrativas del visor solo lo cubren en parte         |

Peligros del choke manifold agregados al panel (rotulados "referencia, pendiente de validación", nunca requisitos):
erosión o lavado del choke, gas en el retorno (H₂S), golpe de ariete al maniobrar válvulas.

## Chequeo de interferencias (envolvente x 2,25–4,55 · z −5,35…−3,25 · y 0–1,45)

Triángulo contra caja sobre toda la escena. No hay colisiones: se mantiene W = 2,10 m.

| Objeto más cercano                                    | Distancia |
| ----------------------------------------------------- | --------- |
| Zonas de riesgo ilustrativas (superposición gráfica)  | se cruzan (5 triángulos): no es un objeto físico |
| BOP (válvulas de choke/kill)                          | 1,77 m    |
| Estructuras de locación (malla fusionada: torres de luz, carteles, tráilers; no se distingue cuál) | 1,84 m |
| Subestructura (patas PT-3/PT-4, tensores)             | ≈ 2,0 m   |
| Planchada de caballetes                               | 1,98 m    |
| Vientos del mástil                                    | 4,66 m    |

Las cañerías de entrada y salida del choke (`circulacion_acero`) solo tocan la envolvente en sus extremos (a 3 cm con la
envolvente reducida 8 cm).

## Presupuesto de rendimiento

| Métrica                     | Antes  | Después | Límite       |
| --------------------------- | ------ | ------- | ------------ |
| Triángulos de la escena     | 94.298 | 105.254 | +15.000      |
| Draw calls                  | 347    | 349     | +3           |
| Mallas nuevas               | —      | `choke_pintura`, `choke_acero` | — |

Distribución (triángulos): BOP 8.244 (pintura 1.672 · acero 5.036 · mangueras 1.536), choke 6.500, acumulador 3.588.

## Fuentes que no se pudieron leer

`CHOKE MANIFOLD equipo 05 2376-2111.PDF` y `P&DI Diagram Workover equipo 10.pdf` (carpeta `diagramas equipos`): la lectura
fue denegada. Con ellos se podría cerrar el ruteo y afinar la tipología del choke con un equipo de la empresa real.

## Otros componentes

Bloque viajero y elevadores, llaves hidráulicas, piso del enganchador y piletas se documentan en `docs/references/bloque-viajero-elevadores/`,
`docs/references/llaves/`, `docs/references/enganche/` y `docs/references/piletas/`. `choke-manifold-3d-valvulas.webp` (modelo 3D de válvulas) queda
como referencia adicional para afinar el choke manifold.
