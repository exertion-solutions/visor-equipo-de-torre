---
name: threejs-expert
description: Use when writing or reviewing 3D scene code in this project (three, @react-three/fiber, drei) — scene components, selection/hover, raycasting, clipping/section cut, measurement, exploded view, camera views/focus/ortho, lighting, GLB loading. Encodes the project's scale/axis conventions and the interaction patterns proven in the legacy viewer.
---

# threejs-expert

## Convenciones (no negociables)

- 1 unidad = 1 m, Y arriba. **Origen = boca de pozo a nivel de terreno, +X hacia el mástil, el carrier se extiende hacia −X, Z lateral** (convención del visor legacy; ver `src/scene/cameras/presets.ts`). Nunca reescalar un modelo "para que quede bien": corregir en el GLB o en los datos.
- Versiones: three 0.186 · r3f 9 · drei 10 (React 19). Consultar docs vigentes (context7) antes de usar APIs. `THREE.Clock` está deprecado (aviso interno de r3f; no usarlo en código propio).
- Renderer: sRGB, ACESFilmic, entorno procedural (`src/scene/lighting`). HDRI reales van en `public/environments/`. Sin CDN externos: los decoders son locales (`src/scene/loaders/gltf.ts`).
- **Sombras: `PCFSoftShadowMap` está deprecado.** En r3f el prop `shadows` por defecto es "soft" y avisa en consola: pasar `shadows={{ type: PCFShadowMap }}` (ya así en `Viewport`).

## Componentes y picking

- Un `Group` por componente con `userData.id` = `Component.id`; cada mesh hereda `userData.id` y se nombra `<id>_parte` si no tiene nombre. Resolver el componente por `userData.id`, no por parseo de strings.
- Precalcular la lista de meshes "pickables" una vez (al montar/cambiar visibilidad) y raycastear contra esa lista con `recursive=false`; no `intersectObjects(scene.children, true)` en cada movimiento.
- Filtrar hits: ignorar componentes ocultos (`visible=false`) y, si hay corte activo, los puntos del lado recortado (el raycaster **no** respeta los clipping planes).

## Selección y hover

- Línea base barata: **`emissive` en materiales clonados por componente** (hover ≈0.28, selección ≈0.55 de intensidad, color cálido). Clonar los materiales por componente al montar para no contaminar otros; guardarlos en un mapa `id → materiales`.
- `@react-three/postprocessing` (`Selection` + `Outline`) solo si el emissive no alcanza; montar el composer una sola vez y limitar a la selección.
- Los modos (EXPLORE/OPERATION/QHSE/TRAINING) son **estado derivado** del store que se aplica y se revierte; nunca mutar materiales de forma irreversible (el legacy sube metalness/roughness al entrar en Operación y no lo restaura).

## Cámara

- Vistas estándar en `src/scene/cameras/presets.ts` (iso, front, side, top, well). La vista superior usa Z=0,02 para evitar el bloqueo de OrbitControls mirando exactamente a −Y.
- Transición entre vistas: interpolar posición **y** objetivo a la vez, ~600 ms, ease-in-out cúbico; guardar la vista previa para "Volver" (restaurar también zoom y modo ortográfico).
- Enfocar un componente: `Box3.setFromObject` → centro y tamaño; distancia = `clamp(max(size) × 1,35 + 3, 6, 70)` a lo largo de la dirección actual de la cámara; si esa dirección es casi vertical (|y|>0,8) o rasante (<0,05), usar una diagonal por defecto.
- Ortográfica ↔ perspectiva: conservar posición y objetivo al alternar; recalcular el frustum ortográfico con el aspecto (`half = span/2`, `left/right = ±half·aspect`) y reasignar `controls.object`. Al enfocar en ortográfica, recalcular `span` según el tamaño del componente.
- Límites: `minDistance` 3, `maxDistance` 160, `maxPolarAngle` ≤ π/2 (no bajo el terreno).

## Corte, medición y despiece

- Corte de sección: un plano global (`renderer.clippingPlanes = [plane]`) es lo más simple para cortar todo el rig; la etiqueta debe decir "superficies abiertas, sin tapas ni sólidos CAD". Estado del plano en el store.
- Medición: 2 puntos sobre la superficie, línea con `depthTest:false` y `renderOrder` alto, esferita en cada punto, etiqueta HTML proyectada (`Vector3.project`; ocultar si z∉[−1,1] o fuera de pantalla). Un tercer clic reinicia. **Rotular siempre "≈ x,xx m · modelo"**: es distancia sobre geometría aproximada, no una cota de ingeniería. Cálculo en `src/lib/geometry`.
- Despiece: desplazamiento **autorado** por componente (`Component.explodeOffset`, metros a factor 1) × factor animado con lerp; no calcularlo desde centros. Al despiezar (factor>0) ocultar cotas, etiquetas y zonas QHSE porque quedan desalineadas.
- Exportar GLB/PNG: nombrar el archivo según la confianza (p. ej. `TACKER10_Modelo_Aproximado.glb`). Para PNG, renderizar y llamar `toBlob` en el mismo tick en vez de `preserveDrawingBuffer:true` permanente.

## Reglas de código

- Nada de `useFrame` que asigne objetos/vectores nuevos por frame; reutilizar temporales. Etiquetas HTML reproyectadas cada 2 frames como máximo.
- Cleanup: `dispose()` de geometrías/materiales/texturas creados a mano.
- Estado de UI en zustand; la escena lee slices con selectores.
- BVH (`three-mesh-bvh`): solo con un cuello de botella de raycast medido. drei ya trae 0.8.x; no instalar 0.9 en paralelo sin resolver el duplicado.

## Alcance de las herramientas visuales

- Corte, medición y animación (aparejo, transiciones) son **herramientas visuales, no validadas**: no son cálculo de ingeniería, simulación dinámica ni validación de seguridad. La UI lo rotula donde corresponda.
- **No inferir dimensiones no documentadas desde la apariencia** de un modelo o de una captura: una cota sale de un dato con fuente, no de medir la geometría aproximada.
- Mientras una función no tenga paridad verificada (`docs/FEATURE_PARITY.md`), el visor V2 embebido sigue siendo la referencia; migrarla con la skill `legacy-migration`.

## Geometría fusionada por material

- Fusionar geometría **por material y por punto/componente** con color por vértice (desgaste, suciedad) reduce miles de meshes a decenas sin perder la selección por componente. No fusionar entre componentes.
- Primitivas propias (extrusiones, cajas biseladas) generadas en el módulo; reutilizar la misma geometría entre meshes; pocos segmentos en cilindros.
- Los materiales emisivos del visor legacy los apaga `setMode()`; luces que deben persistir (lentes, baliza) van en `MeshBasicMaterial`.
- Render bajo demanda: para animaciones sueltas (baliza) hay que pedir frame con `R.invalidate()`, no con eventos sintéticos.
- Estética con fuente: cada detalle no documentado se comenta `// estético`; las cantidades (luminarias 7+5, reflectores 3, bulones) salen del Libro.

## Aristas ("sombreado con aristas", estilo AutoCAD/SolidWorks)

- Patrón del visor CAD de referencia (`~/cad/visor.py`, skill de usuario `equipo-3d`), en `src/scene/loaders/edges.ts`: a cada Mesh un `LineSegments` hijo con `EdgesGeometry(geometry, EDGE_ANGLE = 28°)` y un único `LineBasicMaterial` compartido (`#0b0d10`, `opacity 0.55`, transparente). Idempotente (`userData.edges`).
- Las líneas **no participan del picking**: `lines.raycast = () => {}` (y no son Mesh, así que el contorno las ignora).
- Toggle por store (`viewerStore.edges` / `toggleEdges`, botón "Aristas" de `StatusBar`, solo motor nativo): `setEdgesVisible` + `invalidate()` porque el frameloop es bajo demanda. Nunca recrear la geometría al alternar.
- **Noche y desgaste** (`noche=1` / `desgaste=1` de `visor.py`): toggles `viewerStore.night` / `wear`, botones "Noche" / "Desgaste" de `StatusBar`. Noche = luminarias emisivas como luces puntuales (agrupadas por cercanía, tope de luces) + sombras; desgaste = `onBeforeCompile` sobre los materiales del GLB (suciedad cerca del suelo y variación de brillo en coordenadas de mundo, sin texturas). Ambos reversibles (restaurar el shader/luces al apagar) y con `invalidate()`.
- Son **efectos visuales de presentación**: no son datos, no representan una condición QHSE (suciedad ≠ estado del equipo) ni un diseño o cálculo de iluminación. Rotularlos así en la UI.
