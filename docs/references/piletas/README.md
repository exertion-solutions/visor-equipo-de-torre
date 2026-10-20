# Pileta de ensayo con golpeador · referencias visuales y estado de los datos

Componente 10 del visor V2: **sistema de circulación** (`legacy-ext/40-wellsite.js`, función `buildCirculacion`; textos en
`scripts/patches/10-circulacion.mjs`; ficha en `legacy-ext/44-meta-circulacion.js`).

**Decisión del usuario: hay UNA sola pileta, la pileta de ensayo, que es la "pileta con golpeador".** Se había modelado además una
pileta de acumulación (tipología de otras fotos, ubicación y dimensiones supuestas); se **quitó** por pedido del usuario. Las fotos
de esa pileta quedan solo como referencia local.

Este trabajo rediseña la **pileta de ensayo** (tanque contenedor corrugado, patín de vigas, escalera, cubierta con barandas, equipo
rojo de cubierta, bocas de inspección, visor de nivel, cubicador) y su **golpeador**, que es el mismo equipo que el desgasificador
("gas buster") que el visor ya dibujaba (se rediseñó el existente; no hay dos equipos).

## Imágenes de referencia (unidades de campo genéricas)

**No son el equipo 10.** Sirven para tipología y nivel de detalle, nunca como cota as-built. Origen y licencia sin
verificar: **no están versionadas en git** (copia local en `.tmp/refs-png/piletas/` del checkout principal).

| Archivo                                             | Qué muestra                                                                                              | Uso                                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `PILETA_DE_ENSAYO1.png`                             | **Pileta de ensayo con golpeador**: tanque blanco, recipiente vertical rojo, cañería roja, equipo rojo en cubierta, rampa | Golpeador, equipo de cubierta, rampa, regla graduada, barandas                   |
| `33d74e_2fed…`, `33d74e_9e67…`, `4468_1725288301…`  | Tanques contenedor corrugados con barandas, escalera y bocas de descarga                                | Solo el corrugado, el patín de vigas con rodillos y la escalera de la pileta de ensayo |

## Estado de los datos

| Dato                                                                             | Estado                          | Fuente / nota                                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| Pileta de ensayo 12 × 2,4 m en planta, 40 m³                                     | confirmado                      | Folleto Equipo 10 rev. 26/06/2024; LAYOUT TKR-10. Sin cambios                                 |
| Cubicador 3,5 m³ (Ø 1,3 × 2,4 m)                                                 | confirmado (capacidad) / aproximado (forma) | Folleto / LAYOUT                                                                  |
| Barandas y rodapié (PIL-2), luminarias (PIL-1)                                   | confirmado                      | Libro DROPS p.21. Se conservan `drops_PIL-1` / `drops_PIL-2` (baranda abierta 0,8 m en la escalera) |
| La pileta de ensayo es la pileta con golpeador                                   | confirmado                      | Jorge                                                                                         |
| Golpeador = el recipiente vertical rojo (desgasificador) de la foto              | interpretación                  | Inferido de la foto; pendiente de confirmar con Jorge                                         |
| Golpeador: Ø 0,6 × 2,3 m, posición, cañerías, válvulas, cuello de ganso          | aproximado                      | Tipología de la foto; cotas heredadas del desgasificador anterior. Presión, caudal, conexiones: **pendiente** |
| Altura de cubierta 2,0 m, corrugado, patín, escalera, tapas, regla de nivel      | aproximado                      | Estético; tipología de las fotos                                                              |
| Equipo rojo de cubierta; rampa/escalón                                           | pendiente                       | Solo se ven en la foto; función y tamaño sin dato                                             |
| Ruteo choke → pileta y bomba → kill                                              | pendiente (sin cambios)         | Componente 07 (`CHOKE_ROUTING`)                                                               |
| Posición de la bomba triplex 6 × 2,4 m                                           | confirmado (sin cambios)        | —                                                                                             |

Peligros agregados al panel (rotulados "referencia, pendiente de validación", nunca requisitos): gas o vapores en el golpeador y su
venteo (incl. H₂S), rebalse de la pileta de ensayo, ingreso a espacio confinado por las bocas de inspección, proyección de fluido a
presión en cañerías y válvulas del golpeador. La ficha se mantiene en **B / Parcial**.

## Ambigüedades

1. **Lado del golpeador.** En la foto está al extremo del tanque; aquí va en el costado −z (cerca del extremo −x) porque el +z está
   ocupado por las líneas de matar y de llegada. Desde el lado del pozo queda tapado por el tanque.
2. **Equipo rojo de cubierta:** puede ser una zaranda, una bomba u otro módulo; se dibuja como bloque rojo genérico.
3. **Rampa/escalón:** interpretada como chapa inclinada bajo el borde de la cubierta.
4. **"Planta de efluentes" del LAYOUT:** no se asumió que sea otra pileta (sin cotas).

## Pruebas

`tests/circulacion.test.mjs` (incluye que no quede rastro de la pileta de acumulación). Capturas en `docs/preview/10-piletas-*.png`.
