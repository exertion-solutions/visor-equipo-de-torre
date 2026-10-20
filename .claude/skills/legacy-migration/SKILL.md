---
name: legacy-migration
description: Use when migrating a function of the legacy V2 HTML viewer (public/legacy/Digital_Rig_V2.html) to the native React/R3F engine, when marking or auditing rows of docs/FEATURE_PARITY.md, or before touching public/legacy/ or reference/legacy/. Defines the step-by-step flow and the immutability rules.
---

# legacy-migration

Migración por etapas: el V2 sigue operativo (iframe, motor `legacy`) hasta que el nativo tenga paridad **verificada**.

## Carpetas y qué se puede tocar

| Ruta                            | Rol                                                                                  | ¿Se edita?                        |
| ------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| `reference/legacy/`             | Evidencia inmutable (hashes en `SHA256SUMS.txt`)                                     | **Nunca**                         |
| `public/legacy/`                | Copia runtime GENERADA que embebe la app                                             | No: se regenera con el build      |
| `legacy-ext/`                   | Módulos que extienden el V2 (mástil, carrier, locación, capa DROPS, controles de UI) | Sí (luego `npm run build:legacy`) |
| `src/scene/`, `src/components/` | Implementación nativa                                                                | Sí                                |
| `docs/FEATURE_PARITY.md`        | Estado y gate de cada función                                                        | Sí, al terminar cada paso         |

## Flujo para migrar una función

1. **Elegir la fila** en `docs/FEATURE_PARITY.md` y leer su patrón. Si es la primera vez, leer la fila
   correspondiente de `docs/legacy-audit-2026-09-25.md` (patrón a conservar, inconsistencias a corregir, no copiar).
2. **Leer el comportamiento en el legacy** (solo lectura: `reference/legacy/` o el visor abierto). Anotar
   valores concretos (duraciones, distancias, ids de controles) para usarlos como casos de prueba.
3. **Implementar** en `src/scene/` (lógica de escena, hooks) o `src/components/` (UI), con el estado en
   `viewerStore` / `modeStore` y la lógica pura en `src/lib/` (sin React). Aplicar `threejs-expert`,
   `performance-review` y, si toca QHSE, `qhse-visualization`.
4. **Corregir, no copiar**, las inconsistencias listadas en la auditoría (anclajes de vientos, "mástil ~30 m",
   modos que mutan materiales, textos QHSE sin fuente).
5. **Test**: escribir el test vitest del gate (`src/**/*.test.ts[x]`) y correr `npm run typecheck`, `npm run lint`,
   `npm test`. Lo que no se pueda automatizar se prueba a mano contra el legacy.
6. **Marcar la fila** en `docs/FEATURE_PARITY.md`: `en curso` → `hecho` (implementado) → `verificado`
   (gate ejecutado y pasado, con fecha/evidencia). No saltar a "verificado" sin ejecutar el gate.
7. **No retirar nada**: `public/legacy/` y el iframe se retiran solo cuando todas las filas críticas estén "verificado".

## Reglas

- Nunca editar `reference/legacy/`; si el original necesita un cambio, se agrega como parche (ancla única) en `scripts/build-legacy.mjs` o como módulo de `legacy-ext/`, y se documenta la diferencia en `reference/legacy/README.md`.
- No inventar datos al migrar: cotas y textos salen de fuentes (`reference/v2-previo/src/technical-spec.js`, folleto, layout); lo demás es `pendingValidation` o aproximado.
- Una función migrada no debe empeorar el rendimiento base del legacy (ver `performance-review`).
- Cambios pequeños y por función; sin reescrituras masivas.

## Puente app ↔ visor V2 embebido

- El iframe corre con `sandbox="allow-scripts allow-downloads"` **sin** `allow-same-origin` (con `allow-scripts` anularía el sandbox). Origen opaco: la app no toca el DOM del V2 ni al revés.
- Comunicación solo por `postMessage`. Hoy existe un mensaje: app → V2 `{ type: 'rig:setMode', mode }` (`LegacyRigViewer`), activo con la URL `?embedded` (oculta la barra de modos del V2). El V2 valida `e.source === window.parent`.
- Para exponer otra función del V2 a la app (p. ej. selección → `viewerStore.selectComponent`), agregar un mensaje **tipado y con lista blanca** en ambos lados: el parche (ancla única) va en `scripts/build-legacy.mjs`, se regenera con `npm run build:legacy`, se documenta en `reference/legacy/README.md` y se cubre en `tests/rig10-html.test.mjs`.
- No aceptar mensajes con `eval`/HTML del otro lado ni cargar recursos externos en el V2: su seguridad depende de ser autocontenido.

## El V2 de trabajo se GENERA (no se edita a mano)

- `public/legacy/Digital_Rig_V2.html` sale de `npm run build:legacy` = original inmutable de `reference/legacy/` + parches con ancla única (el build falla si el original cambia) + módulos `legacy-ext/NN-*.js` + datos `window.__RIG_DROPS`. Un test (`tests/build-legacy.test.mjs`) falla si la copia de trabajo difiere del build.
- Módulos: `00-runtime.js` (`__rigExt.onPre(api)` antes de construir componentes, `onPost(R)` al terminar), `20-mast`, `30-carrier`, `40-wellsite` (geometría), `50-drops-layer` (capa), `60-ui-controls` (barras de opciones y card de referencia). Un error dentro de un módulo se captura y no rompe el visor.
- API `onPre`: `Ot` (registro de constructores por componente), helpers `le/De/Ne/vl/Wd/Ml/ta/pn/ir/D/ni`, `gt`, `Hn`, `Zt`, `mn`. API `onPost` (`R`): `scene`, `three.{Mesh,BoxGeometry,…}`, `camera()`, `groups`, `materials`, `pickables`, `state`, `invalidate`. Si un módulo necesita más, ampliar `PRE_API`/`THREE_CLASSES` en `scripts/build-legacy.mjs`.
- Flujo para una mejora del V2: editar/crear `legacy-ext/NN-*.js` → `node scripts/build-legacy.mjs --out .tmp/x/index.html --only NN-*.js` → `npm run snap -- --file .tmp/x/index.html --out .tmp/x/a.png` (Chrome headless propio; seguro en paralelo; con varios a la vez usar `--eval "el.click()"` en lugar de `--click` para evitar timeouts del render por software) → mirar la captura → `npm run build:legacy` → `npm test`.
- Cada punto DROPS dibujado en 3D es un `Group` `drops_<ID>` con `userData.dropsId` (ID del JSON); la capa ancla sus marcadores ahí. Presupuesto de rendimiento: no superar la línea base de `performance-review`; fusionar por material.
