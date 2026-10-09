# PENDIENTES — rama `feat/tkr10-datos-reales-sk575`

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
5. [ ] **Mejoras skill `equipo-3d`**: aristas en el nativo (hecho: `edges.ts`, toggle "Aristas"); GLB sin paso
       `palette` en `gltf:optimize` (agente A, en curso); V2 Capa CAD con los GLB reales PBR + aristas (agente B, en curso).
       Noche y desgaste de `visor.py` (en curso: nativo agente principal, V2 agente B), rotulados como efectos visuales.
6. [ ] `npm run typecheck`, `lint`, `test`, `build`; capturas con `npm run snap`; commit, push, PR, merge a `main`,
       deploy de GitHub Pages y verificación de la URL en vivo. Sincronizar la copia de OneDrive.

## Estado (checkpoint)

- Hecho (código): fases 1–4. Modelo canónico `cad/sk575/modelo.py` (reemplaza `~/cad/tacker10/tacker10.py`), 16 GLB
  `sk575_*`, escena nativa, Capa CAD V2, aristas nativas. Skills del proyecto y `FEATURE_PARITY.md` actualizados con las
  lecciones de `equipo-3d` (aristas 28°, trampa `palette`).
- En curso (agentes): A `gltf:optimize` sin `palette` + regenerar `public/models`; B Capa CAD V2 con GLB reales.
- Falta: verificación completa, capturas (`npm run snap`), commit, push, PR, merge a `main`, deploy de GitHub Pages y
  verificación de la URL en vivo, sincronizar la copia de OneDrive.

## Próximo comando

`npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
