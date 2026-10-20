# Llave hidráulica, contrafuerza y cuñas · referencias visuales y estado de los datos

Componente 08 del visor V2 (`llave`): **llave hidráulica de tubing, llave de contrafuerza (backup), cuñas manuales, línea de
suspensión y poste de retenida** (`legacy-ext/40-wellsite.js`, función `buildLlave`; textos en `scripts/patches/08-llave.mjs`;
ficha de confiabilidad en `legacy-ext/42-meta-llave.js`; parámetro `LLAVE_COLOR`).

## Imágenes de referencia (unidades genéricas)

**No son el equipo 10.** Sirven para la tipología y el nivel de detalle, nunca como cota as-built. Origen y licencia sin
verificar (fotos de catálogo de terceros): no se embeben en el HTML y **no están versionadas en git**; quedan en la copia local
`.tmp/refs-png/llaves/` del checkout principal.

| Archivo                | Qué muestra                                                                                                                                      | Se usó para                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `llave_hidraulica.png` | Llave de garganta abierta tipo placa, estructura tubular en arco, cilindro hidráulico, mangueras y franjas de advertencia amarillo/negro          | Placa con garganta y bulones, franjas de advertencia en los labios, arco tubular, color rojo              |
| `llaves_hidraulicas.png` | Llave con cabezal y contrafuerza, manómetro grande, cilindro superior con mangueras, patas con resorte, palancas y válvulas de mando            | Manómetro sobre la caja, cilindro superior, patas con resorte de la contrafuerza, bloque de válvulas, látigos |

## Qué se modeló

- **Cabezal** (y 2,96–3,14): placa en herradura con garganta abierta hacia +X (ancho 0,14 m), labios con franjas de advertencia,
  3 dados fijos + 2 en la puerta, tapa con bulones, cola con caja de engranajes, motor hidráulico, bloque de 2 palancas + mando en T,
  empuñadura en D.
- **Contrafuerza** (y 2,68–2,80): segunda placa en herradura con dados, 3 columnas, 3 patas de apoyo (2 con resorte helicoidal, 1 fija).
- **Estructura tubular y cilindro superior**: dos montantes con tornapuntas, cilindro hidráulico con vástago y bocas, cabo doble,
  argolla y línea de suspensión (~9 m) con contrapeso de discos y polea de remate (extremo superior sin cambios: −0,92 · 9,0 · −0,62).
- **Manómetro de torque** (`llave_manometro`): caja, esfera, 11 marcas, aguja **en cero**. No lleva escala ni valor.
- **Mangueras** (`llave_mangueras`): 2 principales (mismo recorrido y extremos que las anteriores, elevadas ~8 cm para no rozar la pata
  PT-3), 2 del motor y 2 del cilindro; conexiones de latón, abrazaderas y 2 látigos de seguridad (whip checks).
- **Brazo de reacción**: viga de sección rectangular con nervios y oreja de articulación, hasta una abrazadera sobre el poste de
  retenida, que ahora está sujeto al mástil (perno PRL-3 junto al poste).
- **Cuñas manuales y buje** (`llave_cunas`): buje cónico, 3 segmentos articulados con dados y estrías, 2 bisagras con pasador, 2 asas con
  empuñadura hacia el lado abierto.
- **Poste de retenida — vinculado al mástil (decisión del usuario)**: el brazo de retenida siempre está vinculado al mástil y no al piso de
  trabajo, porque un poste con base en el piso restaría espacio. Se eliminaron la columna de apoyo, la placa base, los bulones de anclaje y
  los rigidizadores. Ahora es un poste redondo paralelo al montante delantero del mástil (lado +z, y 2,75…4,75 m; extremo inferior libre
  sobre el piso) sujeto con dos grampas al montante. La posición sale del eje inclinado del mástil (`api.ni`, semiancho local 0,8 m y
  montante de 0,16 m: **aproximados**, medidos sobre el modelo actual).
- **DROPS PRL-1 / PRL-2 / PRL-3**: mismos grupos `drops_PRL-x`, `userData.dropsId` y nombres de malla; las grampas PRL-1 (y 4,4 m) y
  PRL-2 (y 2,95 m) ahora abrazan montante y poste (placas laterales y bulones por fuera de ambos). PRL-3 se mueve con el extremo del brazo.

## Estado de los datos

| Dato                                                                            | Estado     | Fuente / nota                                                                                  |
| ------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| Posición de la llave sobre el piso de trabajo, junto al pozo (origen)            | confirmado | Se conserva la del visor (boca de pozo en el origen, piso en y = 2,36 m)                       |
| Grampas PRL-1/PRL-2, perno con cadena y eslinga PRL-3, poste de retenida         | confirmado | Libro DROPS Rev.03 pp. 24-25 (puntos y descripción); geometría de detalle aproximada           |
| Envolvente general (x −3,61…1,15 · y 2,34…9,06 · z −0,74…1,50 m)                | confirmado | Misma que la versión anterior (extremos de mangueras, línea de suspensión y poste)             |
| Diámetro de la garganta (0,14 m) y del cabezal (Ø 0,72 m), alturas de placas     | aproximado | Tipología de las fotos; sin dimensiones del equipo real                                        |
| Sarta de tubing 2 7/8" (Ø 0,09 m estético), cupla                                | aproximado | Se conserva el valor estético anterior                                                         |
| Forma de dados, bulones, cilindro, válvulas, patas y resortes, cuñas y asas       | aproximado | Tipología de las fotos (unidades genéricas)                                                    |
| Ruteo de mangueras y de los látigos de seguridad                                 | aproximado | Esquemático; sin P&ID hidráulico                                                               |
| Orientación de la cara del manómetro                                             | aproximado | Elegida por legibilidad; la aguja queda en cero (no indica torque)                             |
| Modelo y fabricante de la llave y de las cuñas                                   | pendiente  | Sin dato; la placa de datos se dibuja en blanco                                                |
| Torque máximo, capacidad y rango de diámetros de mordazas                        | pendiente  | Sin dato                                                                                       |
| Presión y caudal hidráulicos, tipo de motor y de cilindro                        | pendiente  | Sin dato                                                                                       |
| Color real del equipo                                                            | pendiente  | Rojo de las referencias; `LLAVE_COLOR = 'ORIGINAL'` vuelve al amarillo anterior                |
| Longitud y diámetro de la línea de suspensión, masa del contrapeso               | pendiente  | Se conserva la altura de amarre (9 m) del visor anterior                                       |
| Zona de exclusión / DROPS alrededor de la llave                                  | pendiente  | El Libro DROPS no la define para la llave; las zonas del visor son ilustrativas                |

Peligros nuevos agregados al panel (rotulados "referencia, pendiente de validación", nunca requisitos): aplastamiento entre el brazo y
el poste, pinzamiento de manos en palancas/válvulas/patas con resorte, caída de la llave por falla de la línea de suspensión o del
cabo doble. La ficha de confiabilidad sigue en grado **C / Aproximado**.

## Chequeo de interferencias (distancia mínima entre vértices de la llave y cada grupo)

| Grupo                 | Antes  | Después | Nota                                                                |
| --------------------- | ------ | ------- | ------------------------------------------------------------------- |
| BOP                   | 0,19 m | 0,20 m  | Sin colisión (el BOP queda bajo el piso)                            |
| Subestructura (piso)  | 0,02 m | 0,06 m  | Antes la manguera rozaba la pata PT-3; ahora libre                  |
| Mástil                | 0,04 m | 0,09 m  | Idem                                                                |
| Cabina / camión       | 0,49 / 0,23 m | 0,49 / 0,22 m | Sin cambios relevantes                                       |
| Choke manifold / pileta | > 2 m | > 2 m | Sin cambios                                                         |

Los patines de las patas delanteras quedan a y = 2,36 m junto al borde de la abertura del piso: una comprobación de planta indicó que solo la mitad de sus esquinas tiene chapa debajo (NO verificado que apoyen del todo; falta ajustar contra el plano real). Medición por muestreo de vértices
(no es una prueba de no-interferencia certificada).

## Presupuesto de rendimiento

| Métrica                  | Antes   | Después | Límite       |
| ------------------------ | ------- | ------- | ------------ |
| Triángulos de la escena  | 105.254 | 110.970 | +7.000       |
| Draw calls               | 349     | 351     | +2           |
| Triángulos del componente | 3.408  | 9.124   | —            |
| Mallas nuevas            | —       | `llave_cunas`, `llave_manometro` | — |

Distribución (triángulos, después): `llave_pintura` 1.648 · `llave_acero` 3.456 · `llave_mangueras` 1.304 · `llave_cunas` 928 ·
`llave_manometro` 344 · DROPS PRL-1/2/3 1.444 (sin cambios). Antes: pintura 336 · acero 860 · mangueras 768 · DROPS 1.444.

Técnica: geometrías fusionadas por material (color por vértice). Para no depender de `ta` (tubo fijo de 32 × 6 caras) se generan a
medida sectores anulares (placas, buje, cuñas), tubos (mangueras, arco, resortes) y toros con pocas caras.

## Capturas (`docs/preview/`)

`08-llave-antes.png` · `08-llave-despues.png` (mismo encuadre) · `08-llave-despues-posterior.png` · `08-llave-despues-planta.png` ·
`08-llave-despues-lateral.png`.

## Pendiente de verificar

- Aspecto en GPU real y en pantallas de alta densidad (las capturas son con renderizado por software).
- Que el color rojo y la disposición coincidan con el equipo real del equipo 10 (fotos propias del equipo).
