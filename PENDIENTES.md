# PENDIENTES — TACKER 10 / SK-575

Objetivo: incorporar al proyecto los datos reales del TACKER 10 relevados el 2026-10-09 (Service King SK-575, placa API del
mástil, planos TACKER, manual SK 575, inspecciones) y el modelo CAD completo, sin romper el V2 ni la trazabilidad.

Línea base (antes de tocar nada): `npm test` → legacy 100/100, unit 131/131, **2 errores previos de vitest** (timeout al
levantar workers de `App.test.tsx` y `LegacyBridge.test.tsx`; máquina lenta, no son fallas de test).

## Fases

1. [x] **Datos y fuentes**: `src/data/rigs/tacker10.ts` (sources nuevas con `verified` honesto, specs nuevas, conflictos
       rotulados), `reference/v2-previo/src/technical-spec.js` (cotas nuevas que usa `cad/`), informe
       `docs/pdf-review/informe-sk575-2026-10-09.md`. Los PDF NO se suben (repo público, planos con reproducción prohibida).
2. [x] **CAD**: `cad/components/sk575.py` (build123d, origen en la boca de pozo, partes por material, contrato
       `<id>_<rol>`), en `build.py` con verificaciones de cotas → `assets/source/` → `npm run gltf:optimize` → `public/models/tacker10/`.
3. [x] **Nativo R3F**: componentes `sk575_equipo` / `sk575_locacion` en `TACKER10_SCENE` (mástil ya ubicable: base documentada).
4. [x] **V2**: Capa CAD con el modelo SK-575 superpuesto (`cad/capa.py` → `capa-cad.json` → `npm run build:legacy`).
       Sin tocar la geometría base ni los DROPS.
5. [x] **Mejoras skill `equipo-3d`**: aristas en el nativo (`edges.ts`); `gltf:optimize` con `--palette false`;
       `exportar.py` sin soldar vértices + normales (antes el sombreado aplanaba los filos); V2: botón Capas → "Modelo SK-575"
       (`legacy-ext/84-modelo-sk575.js`, GLB incrustados + meshopt, PBR, entorno room, aristas 28°, desgaste) que reemplaza
       al procedural mientras está encendido. Pendiente: noche en V2; revisar el nativo con los GLB nuevos (ahora con normales).
6. [x] typecheck, lint, format, test, build; PR #12 mergeado (520d93c); deploy de Pages OK y verificado en vivo
       (https://exertion-solutions.github.io/visor-equipo-de-torre/legacy/TACKER10_Digital_Rig_V2.html, botón
       "Modelo SK-575" carga los 16 componentes, consola sin errores).

## Estado (checkpoint 2026-10-11)

- Rama `feat/sk575-acumulador`: acumulador del BOP (ref. CPC 4650, C); pozo a 76" del **pie/bisagra** del mástil (C6,
  decisión del usuario) → corona centrada y poleas a plomo del pozo; C11 HYCO (manda el plano del equipo); piso de enganche
  abisagrado y plegado en transporte/izado (ilustrativo). Verificado: legacy 115/115, unit 137/137 (+ timeouts de workers
  conocidos), e2e V2 20/20.
- Falta:
  - **Choque piso de trabajo ↔ patas del mástil** (≈ 0,26 m, informe §4.1): relevar en el equipo el ancho real del mástil en
    la base o cómo abraza el piso las patas.
  - Izamiento V2 gira en el pivote procedural (−2,2; 2,0), no en la bisagra SK (≈ −1,93; 1,22): regenerar `cad/izamiento.py` (C10).
  - Modo noche en el V2; revisar el nativo R3F con los GLB nuevos; sincronizar la copia de OneDrive (sin definir cuál).

## Próximo comando

`npm run dev` → motor "R3F nativo" → revisar `sk575_equipo` con los GLB nuevos (materiales por pieza + normales).
