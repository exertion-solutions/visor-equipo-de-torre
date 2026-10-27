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
  control de caída de objetos del Libro DROPS 2024 clasificados por zona del layout A2, con
  panel por punto (sujeción primaria, retención secundaria, fuente y página).
  Ver extracto interno (no publicado).
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
  fuentes/      documentos originales (rig10/: folleto y layouts · drops/: Libro DROPS, procedimiento DROPS, equipo 10…)
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

## Herramientas de campo (V2)

- **Checklist DROPS (campo)** (menú Capas): OK / NOK / N/A por punto desde el panel DROPS, resumen por sección, CSV para Excel y envío
  opcional a un disparador HTTP (Power Automate). Es un registro de campo: el visor no evalúa ni aprueba.
- **Evaluación de inducción** (modo Entrenamiento, recorrido guiado): 8 preguntas sobre las fichas de "Ir a equipo", registro con
  nombre/empresa/puntaje, CSV y envío opcional. No es una habilitación.
- **Enlaces profundos**: `?comp=bop`, `?vp=piso-enganche`; botón "Copiar enlace a esta vista" en Exportar.
- Los datos quedan en el navegador (localStorage de la app). Envío: el flujo recibe el cuerpo como texto; leerlo con `json(triggerBody())`.

## Sitio publicado: sin conexión, compartir y envío de registros

- **Sin conexión (PWA)**: `public/sw.js` + `public/manifest.webmanifest`. Después de la primera visita la app abre sin señal
  con el modelo completo (el iframe le pide los GLB a la app: `rig:glbGet`, ver `docs/LEGACY_BRIDGE.md`). Se puede instalar
  en el celular desde el navegador ("Agregar a pantalla de inicio"). Al cambiar archivos precargados, subir `VERSION` en `sw.js`.
- **Compartir**: tarjeta Open Graph en `index.html` con `public/og.jpg` (1200 × 630). Compartir el link de la app (raíz),
  no el del visor V2 directo.
- **Envío de checklist DROPS e inducción**: crear la variable de repositorio `RIG_WEBHOOK_URL` (Settings → Secrets and
  variables → Actions → Variables) con la URL del disparador HTTP de Power Automate; el deploy la escribe en el visor
  (`scripts/inject-webhook.mjs`). Un dispositivo puede seguir usando una URL propia. La URL queda visible en la página: el
  flujo tiene que validar el cuerpo (`tipo` = `checklist-drops` o `induccion`) y descartar lo demás.
- **Teclado**: con foco en el modelo (clic o Tab), flechas giran e inclinan, Mayús + flechas desplazan, + / − zoom, `?` atajos.
- three.js (≈ 470 KB comprimidos) solo se descarga con el motor nativo (`?dev=1`): React y zustand van en su propio chunk.

## Efectos y herramientas 3D (V2)

Todo es presentación o herramienta de lectura del modelo: no cambia cotas ni datos, y nada se presenta como cálculo,
umbral o zona aprobada.

- **Calidad** (menú Vista): Auto / Celular / PC / Presentación (pixel ratio, sombras, mapa de sombra 1024–4096, efectos).
- **Cielo** Día / Atardecer / Liso, **sombra de contacto** bajo las piezas apoyadas y **halos** de los proyectores en
  vista nocturna (`96-ambiente.js`).
- **Clima ilustrativo** (Capas): polvo, lluvia o nieve con viento 0–100 km/h; sobre 40 km/h avisa "consultar el
  procedimiento aplicable" sin fijar umbrales (`97-clima.js`).
- **Maniobra: sacar un tiro** (Animar) con **línea de fuego** = proyección vertical de la carga suspendida
  (`99-maniobra.js`).
- **Cortes Y y Z** y **Medir ángulo (3 puntos)** con desnivel (Medición) (`77-cortes.js`, `78-medicion-angulo.js`).
- **Entrar en VR** (Vista) si el navegador ofrece WebXR `immersive-vr` (`74-vr.js`; requiere verificación con visor real).
- Pendientes: LOD del equipo (depende de validar `docs/gltf-simplify.md` contra cotas) e instancing (el entorno ya está
  fusionado en 9 mallas: la ganancia medida es marginal).
