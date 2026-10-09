# TACKER DIGITAL RIG

Plataforma digital para equipos **Pulling/Workover** de servicios petroleros. Primera implementación:
**TACKER 10 — Pulling / Workover Digital Twin**. Después: TACKER 05, 06, 11 y otros equipos.

> Este workspace hereda `../CLAUDE.md` (proyectos de check lists SharePoint). Aquello NO aplica acá:
> este proyecto no usa SharePoint ni Power Automate.

## Reglas permanentes

- **No convertir ni reinterpretar el equipo como drilling rig.** Es un mobile pulling/workover
  (mástil telescópico sobre carrier, sin top drive / mesa rotary de perforación).
- No alterar dimensiones ni capacidades documentadas sin fuente trazable. No inventar
  especificaciones, **certificados, límites operativos, barreras ni distancias de exclusión**.
- Diferenciar siempre dato **confirmado** (A), **parcial** (B), **aproximado** (C) y **pendiente**.
- Nunca presentar geometría aproximada como as-built, apta para fabricación o certificada. No
  reemplazar datos reales con estimaciones.
- **La animación visual no es cálculo, simulación dinámica ni validación de seguridad.** No presentar
  simulaciones visuales como cálculos de ingeniería.
- Preservar trazabilidad: todo dato numérico o QHSE lleva `sourceId` (ver `src/types/rig.ts`).
- **1 unidad 3D = 1 metro**, eje Y arriba. Origen = boca de pozo a nivel de terreno, +X hacia el
  mástil, carrier hacia −X, Z lateral. Cambiarlo requiere decisión documentada en `docs/`.
- Fuentes en conflicto (p. ej. anclajes de vientos 25 ± 3 m vs 20 m) se registran ambas y se rotulan
  "Fuente en conflicto"; no se elige una en silencio.
- Mantener compatibilidad GLB/glTF (Draco, Meshopt, KTX2). Originales en `assets/source/`
  (nunca se modifican), optimizados en `public/models/`.
- Priorizar performance (skill `performance-review`). Componentes tipados y desacoplados.
- Sin cambios masivos innecesarios. **Revisar antes de instalar dependencias** (nombre exacto,
  origen, scripts de instalación).
- Sin secretos en Git. `.env*` ignorados salvo `.env.example`.

## QHSE

- Estatus de evidencia, solo estos: `confirmed`, `procedure`, `goodPractice`, `pendingValidation`.
  Solo `confirmed` y `procedure` pueden presentarse como requisito.
- Modelo bow-tie: **Risk = hazard → event → consequence**; `Barrier` con tipo `preventive` |
  `mitigative`; cada `Source` con `verified`; `Rig.service` (tipo de servicio). Se implementa en
  `src/types`; detalle y reglas en `.claude/skills/qhse-visualization`.
- Una recomendación genérica nunca se promueve a requisito de empresa, cliente o legal sin evidencia.
  Las zonas ilustrativas no son controles operacionales aprobados.

## Política de migración

- **El visor V2 HTML se mantiene hasta paridad verificada** de cada función con el motor nativo R3F.
- `reference/legacy/` = evidencia **inmutable** (nunca se edita; hashes en `SHA256SUMS.txt`).
  `public/legacy/` = copia runtime que la app embebe en un iframe (motor `legacy`, por defecto).
- La UI alterna "V2 compatible" / "R3F nativo" (`src/stores/viewerStore.ts`: `engine`,
  `selectedComponentId`); los modos viven en `src/stores/modeStore.ts` (EXPLORE / OPERATION / QHSE /
  TRAINING). Ambos stores son la fuente de verdad.
- No se retira `public/legacy/` hasta que todas las filas críticas de `docs/FEATURE_PARITY.md`
  estén "verificado". Migrar una función: skill `legacy-migration`.

## Estado de migración

Tabla de paridad V2 → nativo (estado, patrón y gate de verificación por función):
**`docs/FEATURE_PARITY.md`**. Arquitectura por capas y coexistencia legacy/nativo: `docs/ARCHITECTURE.md`.

## Stack y comandos

React 19 · TypeScript 6 (estricto) · Vite 8 · three + @react-three/fiber 9 + drei 10 · zustand ·
Tailwind 4 · shadcn/ui (radix, estilo nova) · Vitest 5 · ESLint 10 · Prettier. **Gestor: npm**
(`package-lock.json`). No mezclar con pnpm/yarn.

```
npm run dev | build | preview | typecheck | lint | format
npm test              # legacy (node --test tests/) + unit (vitest, src/**)
npm run gltf:inspect -- assets/source/x.glb
npm run gltf:optimize -- x.glb        # → public/models/tacker10/x.glb, original intacto
npm run assets:decoders               # refresca public/decoders desde three
```

- TypeScript se mantiene en `~6.0`: `typescript-eslint` declara peer `<6.1.0` (TS 7 no soportado aún).
- Alias `@/` → `src/`. `src/components/ui/` lo genera shadcn (excluido de lint/prettier).

## Estructura

```
src/app · components/{viewer,equipment,qhse,operation,training,ui} · scene/{cameras,lighting,controls,loaders,effects}
src/data/{rigs,equipment,qhse,training} · stores · hooks · lib/{three,geometry,units} · types
public/{legacy,models/tacker10,textures,environments,decoders} · assets/source
cad/ (CadQuery paramétrico → GLB en assets/source, ver cad/README.md; cad/sk575/ = modelo SK-575 en build123d, entorno aparte, ver cad/sk575/README.md) · legacy-ext/ (módulos del visor V2) · scripts/ (build-legacy, snap, gltf-*) · tests/ (node --test)
docs/{fuentes/{tacker10,drops},drops,pdf-review,references,preview} · reference/{legacy,v2-previo}
```

- `src/data/schema.ts` (zod) valida integridad: fuentes existentes, ids únicos, QHSE con fuente salvo
  `pendingValidation`, zonas con geometría confirmadas o `illustrative` (sin validar, con leyenda).
  Todo dato nuevo debe pasarlo.
- Auditoría del legacy (patrones a migrar, inconsistencias, rendimiento): `docs/legacy-audit-2026-09-25.md`.

## Visor legacy (NO tocar sin pedido explícito)

- `public/legacy/TACKER10_Digital_Rig_V2.html` es un **archivo GENERADO**: no se edita a mano.
  `npm run build:legacy` (`scripts/build-legacy.mjs`) parte del original inmutable de `reference/legacy/`, le
  aplica parches (PCFShadowMap, favicon, puente de modo `?embedded`, hooks) y le inyecta los módulos
  `legacy-ext/NN-*.js` (`20-mast`, `30-carrier`, `40-wellsite`, `50-drops-layer`, `60-ui-controls`) y los datos
  `src/data/qhse/tacker10-drops.json`. Un test falla si la copia de trabajo no coincide con el build.
  La abre `ABRIR_TACKER10_DIGITAL_RIG.cmd`. Capturas headless: `npm run snap -- --file … --out …`.
- **DROPS**: `docs/drops/README.md` (síntesis de los documentos de `docs/fuentes/drops/`), dataset canónico
  `src/data/qhse/tacker10-drops.json` (66 puntos, zonas A2 Alto/Medio/Bajo **cualitativas**, sin radios).
- `reference/v2-previo/src/`: datos del visor V2 anterior que siguen vigentes (`technical-spec.js` = cotas
  documentadas de Tacker 10, fuente de datos a migrar; `asset-manifest.js` = paleta física y manifiesto GLB).
  El resto del visor previo se eliminó (recuperable en el historial de git).

## Fuentes documentales

Ver `docs/pdf-review/informe-tecnico-tacker.md` y los PDF de `docs/fuentes/tacker10/` (folleto Tacker 10 rev. 26/06/2024,
layout TKR-10). Los documentos Tacker 11 son referencia de layout/seguridad: **no** alteran la
geometría de Tacker 10 sin comprobar equivalencia. Anotaciones manuscritas no son cotas técnicas.

TACKER 10 = **Service King SK-575** (mástil DKA104-330-08). Relevamiento 2026-10-09 (placa API, spec sheet, planos TACKER,
manuales SK, layout WS10): `docs/pdf-review/informe-sk575-2026-10-09.md` (cotas A/B/C y conflictos). Esos documentos
**no se versionan** (propiedad TACKER / repo público): índice en `docs/fuentes/tacker10/README-sk575.md`.

## Skills de proyecto (`.claude/skills/`)

`threejs-expert` · `digital-twin-architecture` · `gltf-pipeline` · `qhse-visualization` ·
`performance-review` · `legacy-migration`.
