# DIGITAL RIG

Gemelo digital web de equipos **Pulling / Workover** de servicios petroleros (no es un drilling rig).
Primera implementación: **Equipo 10**. Después: Equipo 05, 06, 11 y otros.

## Estado

Migración por etapas desde el visor HTML V2 hacia una app React + React Three Fiber:

- El visor V2 (`public/legacy/Digital_Rig_V2.html`) se embebe en un iframe y es el motor por
  defecto ("V2 compatible"). El motor nativo ("R3F nativo") se alterna desde la UI y todavía no tiene paridad.
- Hecho en nativo: vistas estándar de cámara, carga GLB (Draco/Meshopt/KTX2), stores, modelo de datos con
  validación zod (incluye QHSE bow-tie) y el estado de modos (EXPLORE / OPERATION / QHSE / TRAINING).
  Los modos ya gobiernan el V2 embebido (puente `postMessage`); el motor nativo aún no los consume.
- El V2 embebido incluye la **capa DROPS** (botón "Zonas DROPS", se activa sola en modo QHSE): 66 puntos de
  control de caída de objetos del Libro DROPS 2024 clasificados por zona del layout POWSG020-A2, con
  panel por punto (sujeción primaria, retención secundaria, fuente y página) y hallazgos de la inspección TK10.
  Ver `docs/drops/README.md`.
- Pendiente: el resto de las funciones del V2. Estado por función en `docs/FEATURE_PARITY.md`.
- Sin modelos GLB reales todavía (`assets/source/` y `public/models/rig10/` vacíos).

## Comandos

Requiere Node >= 22.12 y npm (`package-lock.json`); las dependencias ya están instaladas en esta copia.

```
npm run dev            # servidor de desarrollo (Vite)
npm run build          # tsc -b + vite build
npm run typecheck      # tsc app + node, sin emitir
npm run lint           # eslint
npm run test           # legacy (node --test tests/) + unit (vitest, src/**)
npm run gltf:inspect -- assets/source/x.glb     # unidades, nombres, materiales, triángulos
npm run gltf:optimize -- x.glb                  # → public/models/rig10/x.glb (original intacto)
npm run assets:decoders                         # refresca public/decoders desde three
npm run build:legacy                            # regenera public/legacy (visor V2) desde reference/legacy + legacy-ext/
npm run snap -- --file x.html --out x.png       # captura headless con el Chrome instalado (playwright-core)
```

`ABRIR_DIGITAL_RIG.cmd` abre el visor HTML legacy (`public/legacy/Digital_Rig_V2.html`) con doble
clic, sin servidor ni instalación.

## Estructura

```
src/            app · components/{viewer,ui,...} · scene/{cameras,controls,lighting,loaders} · stores · data · lib · types
legacy-ext/     módulos JS que extienden el visor V2 (mástil, carrier, locación, capa DROPS)
public/         legacy/ (copia runtime del V2, GENERADA) · models/rig10 · decoders · textures · environments
reference/      legacy/ (evidencia inmutable + SHA256SUMS.txt) · v2-previo/ (cotas y paleta del visor anterior)
scripts/        build-legacy · snap · gltf-inspect/optimize · copy-decoders
tests/          node --test (build del visor legacy, HTML autocontenido, datos del visor previo)
assets/source/  GLB originales (solo lectura, ignorados por git)
docs/           arquitectura, paridad, auditoría legacy, setup
  fuentes/      documentos originales (rig10/: folleto y layouts · drops/: Libro DROPS, POWSG020, TK10…)
  drops/        análisis y síntesis de los documentos DROPS
  pdf-review/ · references/ · preview/   informe técnico, imágenes de referencia, capturas
.claude/skills/ skills del proyecto (threejs-expert, digital-twin-architecture, gltf-pipeline,
                qhse-visualization, performance-review, legacy-migration)
```

## Política de migración y gate de paridad

- El visor V2 se mantiene hasta paridad verificada. `reference/legacy/` es evidencia inmutable (nunca se
  edita); `public/legacy/` es la copia que usa la app.
- **No se retira `public/legacy/` hasta que todas las filas críticas de `docs/FEATURE_PARITY.md` estén
  "verificado"** (gate probado con test o prueba manual anotada).
- No se inventan certificados, límites operativos, barreras ni distancias de exclusión; la animación
  visual no es cálculo ni validación de seguridad.

## Documentación

- `CLAUDE.md`: reglas permanentes del proyecto.
- `docs/ARCHITECTURE.md`: capas, coexistencia legacy/nativo, pipeline GLB.
- `docs/FEATURE_PARITY.md`: tabla de paridad V2 → nativo.
- `docs/legacy-audit-2026-09-25.md`: auditoría del visor V2 (patrones, inconsistencias, rendimiento).
- `docs/setup-2026-09-25.md`: preparación del entorno, decisiones, MCP y unificación con el scaffold paralelo.
- `reference/legacy/README.md`: evidencia legacy y verificación de hashes.
