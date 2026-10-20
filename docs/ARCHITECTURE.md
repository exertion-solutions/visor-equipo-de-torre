# Arquitectura

DIGITAL RIG es una SPA React 19 + Vite + TypeScript que muestra el gemelo digital de un equipo
Pulling/Workover (primero Equipo 10). La migración desde el visor HTML V2 es **por etapas**: el V2 sigue
operativo dentro de la app (iframe) mientras cada función se reimplementa en el motor nativo R3F y se
verifica contra `docs/FEATURE_PARITY.md`. Evita una reescritura "big-bang" que pierda medición, corte,
raycast, despiece, exportación, QHSE o animación.

## Capas

```
   types / data          stores               scene                components            app
┌────────────────┐  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐  ┌────────────────┐
│ src/types      │  │ src/stores   │  │ src/scene        │  │ src/components    │  │ src/app        │
│ src/data       │─▶│ modeStore    │─▶│  cameras         │─▶│  viewer (Viewport,│─▶│ App, TopBar,   │
│  schema.ts(zod)│  │ viewerStore  │  │  controls        │  │   LegacyRigViewer)│  │ EngineToggle,  │
│  qhse/, rigs/  │  │ (fuente de   │  │  lighting        │  │  ui (shadcn)      │  │ ModeSwitcher,  │
│ src/lib        │  │  verdad)     │  │  loaders (GLB)   │  │  equipment/qhse/  │  │ StatusBar      │
│  geometry,units│  │              │  │                  │  │  operation/train. │  │                │
└────────────────┘  └──────────────┘  └──────────────────┘  └───────────────────┘  └────────────────┘
   sin React           zustand          three + r3f + drei       React + UI            composición
```

Regla de dependencia: cada capa solo importa de las de su izquierda. `src/types` y `src/lib` no dependen
de React ni de three (salvo tipos); la escena lee slices de los stores con selectores; los componentes
no calculan geometría (usan `src/lib/geometry`). Alias `@/` → `src/`.

- **Datos** (`src/types`, `src/data`): `Rig → Equipment → Component → Specification`, cada dato con su
  `Source` (`verified`) y confianza A/B/C. `src/data/schema.ts` (zod) valida integridad; todo dato nuevo
  debe pasarlo. QHSE bow-tie: `Risk` (hazard → event → consequence), `Barrier` (`preventive` |
  `mitigative`), estatus `confirmed` / `procedure` / `goodPractice` / `pendingValidation`; `Rig.service`.
  `src/data/rigs/rig10.ts` tiene el rig Equipo 10 (4 componentes con envolvente CAD, confianza C, generadas en `cad/`) y la lista de GLB de la escena nativa; `equipment` y `training` siguen vacíos (cotas en `reference/v2-previo/src/technical-spec.js`).
- **Stores** (`src/stores`): `modeStore` (EXPLORE / OPERATION / QHSE / TRAINING) y `viewerStore`
  (`engine`: `legacy` | `native`, `selectedComponentId`). Los modos son estado derivado, no mutan materiales.
  Con el motor `legacy`, `LegacyRigViewer` reenvía el modo al V2 por `postMessage` (`rig:setMode`,
  URL `?embedded` que oculta la barra de modos propia del V2): `modeStore` es la única fuente de verdad. Contrato completo (ready/state/select, capas, URL) en `docs/LEGACY_BRIDGE.md`.
- **Escena** (`src/scene`): `cameras/presets.ts` (vistas estándar), `controls/CameraRig.tsx`,
  `lighting/Lighting.tsx` (entorno procedural), `loaders/gltf.ts` (Draco + Meshopt + KTX2 con decoders
  locales) y `loaders/RigModel.tsx`. `scene/effects` existe vacío (`.gitkeep`).
- **Componentes** (`src/components`): `viewer/Viewport.tsx` (Canvas r3f, chunk lazy),
  `viewer/LegacyRigViewer.tsx` (iframe), `ui/` (shadcn, generado). `equipment`, `qhse`, `operation` y
  `training` están vacíos (pendientes).
- **App** (`src/app`): composición, barra superior, alternador de motor y de modo, barra de estado.

## Coexistencia legacy ↔ nativo

```
                    viewerStore.engine
                           │
          ┌────────────────┴─────────────────┐
     'legacy' (por defecto)              'native'
          │                                   │
  <LegacyRigViewer> (iframe)            <Viewport> (Canvas R3F)
          │                                   │
  public/legacy/Digital_Rig_V2.html  src/scene + src/components
  (copia runtime, autocontenida)              (paridad según FEATURE_PARITY.md)
          ▲
          │ copia (otro agente/paso)
  reference/legacy/  ── evidencia INMUTABLE + SHA256SUMS.txt (nunca se edita)
```

- UI: alternador "V2 compatible" / "R3F nativo". El iframe usa `sandbox="allow-scripts allow-downloads"`
  **sin** `allow-same-origin` (con `allow-scripts` lo anularía): el V2 corre en origen opaco y no accede al
  DOM, storage ni cookies de la app. Es autocontenido (sin red ni storage), así que no lo necesita.
  Ruta con `import.meta.env.BASE_URL`; comunicación solo app → V2 por `postMessage` (el V2 valida
  `e.source === window.parent`).
- `reference/legacy/` no se sirve ni se importa; `public/legacy/` es la copia que la app usa.
  `public/legacy/Digital_Rig_V2.html` se abre también con doble clic desde
  `ABRIR_DIGITAL_RIG.cmd` y lo cubren `tests/*.test.mjs`.
- El iframe y el motor `legacy` se retiran solo cuando todas las filas críticas de
  `docs/FEATURE_PARITY.md` estén "verificado".

## Pipeline de assets GLB

```
assets/source/<x>.glb  ──▶  npm run gltf:inspect  ──▶  npm run gltf:optimize -- <x>.glb  ──▶  public/models/rig10/<x>.glb
 (original, ignorado                (unidades, nombres,        (wrapper de @gltf-transform:            (versionado; se registra en
  por git, NUNCA se edita)           materiales, tris)          preserva jerarquía, meshopt + webp)      Component.model y se carga con
                                                                                                        src/scene/loaders/gltf.ts)
```

`scripts/gltf-optimize.mjs` fuerza `--flatten false --join false` (los defaults del CLI destruyen la
jerarquía que necesitan selección, aislamiento y despiece). `npm run assets:decoders` refresca
`public/decoders/{draco,basis}` desde three. Contrato de nombres y materiales: skill `gltf-pipeline`.

## Convenciones

- **Escala y ejes**: 1 unidad = 1 m, Y arriba; origen = boca de pozo, +X hacia el mástil, carrier hacia −X.
- **Trazabilidad**: todo dato lleva `sourceId`; conflictos entre fuentes se registran ("Fuente en conflicto").
- **Sin invenciones**: no se inventan certificados, límites operativos, barreras ni distancias; la
  animación visual no es cálculo ni validación de seguridad.
- **Un rig = un archivo de datos** (`src/data/rigs/<id>.ts`) que pasa `rigSchema`; sin ramas por rig en componentes.
- **Rendimiento** (objetivos): render bajo demanda, sin `preserveDrawingBuffer`, `PCFShadowMap` (ya en `Viewport`); ver skill `performance-review`.
- **Tests**: `npm test` = legacy (`node --test tests/`) + unit (vitest, `src/**`). Gestor: npm.
