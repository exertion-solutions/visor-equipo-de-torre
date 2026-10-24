# Auditoría del visor legacy — `Digital_Rig_V2.html`

Fecha: 2026-09-25. Lectura del código propio (no del bundle de three) y prueba en Chromium.
Resultado funcional: carga sin errores, 43 botones sin fallas, PNG y GLB se generan, los 4 modos cambian.

## Qué conviene conservar (migrar tal cual el concepto)

| Patrón del legacy                                                                                                         | Destino en la app nueva                                   |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Convención de escena: origen = boca de pozo, +X hacia el mástil, carrier hacia −X, Z lateral, Y arriba, 1 u = 1 m         | `src/scene/cameras/presets.ts` (comentario) + CLAUDE.md   |
| 5 vistas (iso, frontal, lateral, superior, boca de pozo) con posición/objetivo                                            | `src/scene/cameras/presets.ts` ✔ hecho                    |
| Transición de cámara: lerp de posición y objetivo, 600 ms, ease-in-out cúbico; "Volver" restaura la vista guardada        | hook `useCameraTransition` (pendiente)                    |
| Enfocar: distancia = clamp(dimensión máx. × 1,35 + 3, 6, 70); conserva la dirección salvo vista casi cenital              | hook de foco (pendiente)                                  |
| Ortográfica/perspectiva: al alternar se conserva posición y objetivo; el frustum ortográfico se recalcula con el aspecto  | `CameraRig` (pendiente)                                   |
| Un `Group` por componente con `userData.id`; meshes con `name` = `<id>_parte`; materiales `<id>_<rol>`                    | contrato de GLB (skill `gltf-pipeline`)                   |
| Materiales **clonados por componente** para resaltar con `emissive` sin contaminar otros componentes                      | selección/hover (skill `threejs-expert`)                  |
| Lista de "pickables" precalculada para el raycast (no recorrer la escena en cada clic)                                    | hook de picking                                           |
| Despiece con tabla de desplazamientos **autorada** por componente + factor animado; se ocultan cotas y zonas al despiezar | `Component.explodeOffset` ✔ hecho                         |
| Corte por plano global (`renderer.clippingPlanes`) y filtro manual de hits del raycast detrás del plano                   | skill `threejs-expert`                                    |
| Medición: 2 puntos sobre superficie, línea sin depth-test, etiqueta HTML proyectada, rótulo "≈ x m · modelo"              | herramienta de medición (rótulo "aproximado" obligatorio) |
| Ficha por componente con `grade` A/B/C, `status`, `basis` y `note` ("alcance")                                            | `Component.confidence` + `Component.scope` ✔ hecho        |
| Estado **"Fuente en conflicto"** (vientos: layout 25 ± 3 m vs folleto anterior 20 m)                                      | `Specification.conflicts` ✔ hecho                         |
| Leyenda "ZONAS ILUSTRATIVAS — SIN VALIDAR" y aviso "las distancias del modelo no sustituyen exclusiones aprobadas"        | `ExclusionZone.illustrative` ✔ hecho                      |
| Exportar GLB con nombre `..._Modelo_Aproximado.glb` y PNG con captura de la vista                                         | nombrar exportaciones según confianza                     |

## Inconsistencias encontradas (corregir al migrar, no copiar)

1. **Anclajes de vientos**: el código coloca anclajes en (−18, ±13) y (15, ±14) m; el layout de locación documenta 25 ± 3 m por eje (diagonal 35,4 m). El propio visor los marca "Fuente en conflicto". Migrar como especificación con `conflicts`, no elegir uno.
2. **Texto "mástil ~30 m"** en la ficha vs. 31,6992 m (104 ft) usado por la geometría.
3. **Zona ilustrativa de caída de mástil**: radio = 1,1 × largo del mástil (~32,8 m). Es una envolvente gráfica inventada: migrar solo como `illustrative`, sin mostrar la cifra.
4. **Riesgos y controles por componente** (`riesgos`, `epp`): 13 textos sin fuente, varios redactados como requisito ("Prueba de presión del BOP antes de iniciar", "Respetar la capacidad nominal…", "Suspender la operación con viento fuerte…"). Migrar como `pendingValidation` hasta adjuntar fuente; nunca como `confirmed`.
5. **Grados A/B/C** del legacy (`META`): mástil, aparejo, subestructura, motor = A; camión, circulación, vientos, BOP, malacate, caballetes = B; enganche, llave = C. Punto de partida para `Component.confidence`, a revalidar contra el folleto.
6. Modo QHSE/Operación **muta materiales globalmente** (metalness/emissive) y no restaura los valores originales al salir de Operación. En la app nueva los modos deben ser estado derivado, no mutación.

## Rendimiento (línea base para `performance-review`)

- **890–982 draw calls** (footer del visor) con 13 conjuntos: cada barra del reticulado es un mesh (`Ne`/`Wd`). Objetivo nuevo: <300 → fusionar por material o `InstancedMesh` en reticulados, cables y tuberías.
- `preserveDrawingBuffer: true` permanente solo para la captura PNG. Alternativa: renderizar y llamar a `toBlob` en el mismo tick, sin retener el buffer.
- Bucle `requestAnimationFrame` continuo con la escena estática. Alternativa: `frameloop="demand"` e `invalidate()` al interactuar o animar.
- Etiquetas HTML reproyectadas cada 2 frames (aceptable; mantener el throttle).
- Sombra: `PCFSoftShadowMap` está deprecado en three 0.186 (avisa en consola) → `PCFShadowMap` (ya corregido en el HTML y en `Viewport`). En r3f, `shadows` por defecto es "soft": pasar `shadows={{ type: PCFShadowMap }}`.

## Datos técnicos del legacy útiles para tests de regresión

- Mástil: base (−2,2; 2,0), longitud efectiva `hypot(31,6992 − 2, 2,2)` ≈ 29,78 m, inclinado hacia la boca de pozo; modelado en 31 u locales y escalado.
- Aparejo a 14 m de altura sobre la boca de pozo; BOP en el origen; malacate en x = −8,5; cabina x = −5,4; motor x = −13,2; camión centro x ≈ −15.
