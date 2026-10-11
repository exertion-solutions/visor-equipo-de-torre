# Simplificación de mallas en `gltf:optimize` (lote SK-575)

`scripts/gltf-optimize.mjs` corre `gltf-transform optimize` (CLI 4.5.1). Ese comando aplica **simplify** (meshoptimizer)
por defecto con `--simplify-error 0.0001` (fracción de la extensión de la malla). Hasta el 2026-10-11 el wrapper no lo
declaraba: los GLB publicados en `public/models/tacker10/` tienen menos triángulos que los originales de `assets/source/`
y que lo que documenta cada `.meta.json`.

Desde esa fecha el wrapper declara `--simplify true --simplify-error 0.0001` (el mismo resultado que antes, ahora
explícito). Para publicar sin simplificar: `npm run gltf:optimize -- <x>.glb --simplify false`.

**Estado: decisión pendiente.** La simplificación no se validó contra las cotas documentadas (en particular el mástil,
componente crítico). La geometría publicada sigue siendo **aproximada (confianza B/C), no as-built**; la simplificación
no cambia esa clasificación, pero sí puede mover aristas y caras finas.

## Triángulos: origen vs publicado

Medido con `gltf-transform inspect --format csv` (suma de `glPrimitives` de las mallas), 2026-10-11.

| GLB | Origen (`assets/source`) | Publicado (`public/models/tacker10`) |
|---|---:|---:|
| sk575_acumulador | 37 772 | 32 042 |
| sk575_aparejo | 37 740 | 25 608 |
| sk575_bomba | 11 290 | 8 864 |
| sk575_bop | 106 556 | 64 696 |
| sk575_carrier | 298 842 | 117 020 |
| sk575_cuadro | 124 512 | 41 354 |
| sk575_izaje | 62 392 | 32 128 |
| sk575_llave | 4 636 | 4 134 |
| sk575_manifold | 152 392 | 68 320 |
| sk575_mastil | 46 924 | 25 194 |
| sk575_piletas | 46 228 | 20 924 |
| sk575_piso | 26 752 | 19 436 |
| sk575_planchada | 89 964 | 27 706 |
| sk575_pozo_vecino | 13 680 | 12 252 |
| sk575_tiros | 2 296 | 706 |
| sk575_vientos | 23 908 | 5 444 |
| **Total** | **1 085 884** | **505 828** (−53 %) |

## Para cerrar la decisión

1. Verificar las cotas del mástil (y las demás de `technical-spec.js`) sobre el GLB **optimizado**, no solo sobre el modelo
   build123d.
2. Elegir: mantener `--simplify-error 0.0001`, ajustarlo, o `--simplify false` (el total sin simplificar, ~1,09 M tris,
   sigue bajo el tope nativo de 1,5 M).
3. Registrar los triángulos publicados en cada `.meta.json` (hoy guardan los del origen).
