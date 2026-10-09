---
name: gltf-pipeline
description: Use when receiving, inspecting, optimizing or integrating GLB/glTF models (Draco, Meshopt, KTX2), or when a model loads wrong (scale, axes, missing names, huge size), or when replacing a procedural legacy component with a real model. Covers the assets/source → public/models flow with the local @gltf-transform CLI.
---

# gltf-pipeline

## Flujo

1. Original en `assets/source/<nombre>.glb` (ignorado por git, **nunca se edita**).
2. `npm run gltf:inspect -- assets/source/<nombre>.glb` → revisar unidades (m), nombres de nodo estables, materiales PBR, texturas, triángulos.
3. `npm run gltf:optimize -- <nombre>.glb` → escribe `public/models/tacker10/<nombre>.glb`.
4. Registrar la ruta en `Component.model` (`/models/tacker10/<nombre>.glb`) y validar en el visor.

## Contrato del modelo (heredado del visor legacy)

- Un nodo raíz por componente con `name` = `Component.id` (el legacy usa `mastil`, `subestructura`, `malacate`…). Los meshes hijos se nombran `<id>_parte` (o algo más específico con ese prefijo) y los materiales `<id>_<rol>` (`main`, `dark`, `light`, `cable`, `glass`, `pipe`, `hose`).
- Metros, Y arriba, transforms aplicados. **Origen = boca de pozo a nivel de terreno, +X hacia el mástil, carrier hacia −X**; el origen del GLB de cada componente debe coincidir con el del componente procedural que reemplaza.
- Sin cámaras ni luces embebidas. Materiales metallic/roughness PBR.
- Un GLB aproximado se registra con `confidence: 'C'` (o B) y se exporta/rotula "aproximado"; nunca como as-built.
- Reemplazo progresivo: el legacy `reference/v2-previo/src/asset-manifest.js` declara mástil, malacate y camión como GLB opcionales con `enabled:false` y fallback procedural. Mantener ese fallback hasta validar visualmente cada GLB.

## Por qué el wrapper cambia defaults del CLI

`gltf-transform optimize` usa por defecto `--flatten true --join true`, que **destruyen la jerarquía y los nombres** que necesitan selección, aislamiento y exploded view. `scripts/gltf-optimize.mjs` fuerza `--flatten false --join false --compress meshopt --texture-compress webp`. Se pueden pasar flags extra después del nombre.

## Reducir draw calls sin perder componentes

El legacy tiene ~900 draw calls porque cada barra de reticulado, cable y caño es un mesh. Al modelar/exportar: fusionar **dentro** de un componente por material (los `join` del CLI operan sobre todo el árbol: usarlos solo por componente, no globalmente) o usar `EXT_mesh_gpu_instancing` para repetidos (`--instance`, ≥5). Un componente = una unidad seleccionable; no fusionar entre componentes.

## Export desde build123d / trimesh (`cad/sk575/exportar.py`)

- **Un GLB por componente**: `trimesh.Scene` con nodo raíz = `Component.id` y una malla por material `<id>_<rol>` (fusiona dentro del componente → ~1 draw call por material). Junto a cada GLB, `<id>.meta.json` con confianza, alcance, triángulos y `as_built: false`.
- **Verificar cotas antes de exportar**: el script compara las constantes del modelo con `technical-spec.js` (leído con `node`) y sale con exit 1 si una no cierra. Nunca exportar un modelo cuyas cotas documentadas no se verificaron.
- **Presupuesto de triángulos por componente**: imprimir tris por componente y total (nativo < 1,5 M tris, < 300 draw calls). Teselar más grueso lo fino (`cable`, `goma`: tolerancia propia).
- **Cables de tambores**: no modelar cada vuelta del cable enrollado; usar un cilindro/envolvente por capa y tramos rectos a la corona (el enrollado helicoidal multiplica los triángulos sin aportar dato).
- **Modelo canónico: `cad/sk575/modelo.py`** (reemplaza a `~/cad/tacker10/tacker10.py`: misma geometría + cotas exactas 48", 15.2992, 20.629, 72", tambor de cable más liviano y etiquetas `comp()`). Editar ahí, no en `~/cad`.
- **Trampa: el paso `palette` de `gltf-transform optimize`** convierte los materiales PBR por material en `PaletteMaterial` con texturas → rompe el contrato `<id>_<mat>` (y los factores metalness/roughness). Por eso `gltf:optimize` lo desactiva. Verificar tras optimizar: materiales nombrados `<id>_<mat>` con `baseColorFactor`/`metallicFactor`/`roughnessFactor` y **sin texturas** (`gltf:inspect`).
- Meshopt sobre el lote SK-575: ~23 MB → **1,6 MB**, sin perder nombres (wrapper con `--flatten false --join false`).

## Notas

- Meshopt: el decoder viene en el loader. Draco: `--compress draco` (decoders en `public/decoders/draco`). KTX2: `--texture-compress ktx2` requiere el binario `toktx` (no instalado); hasta entonces, webp.
- `--instance` puede romper componentes que deban seleccionarse por separado: verificar tras optimizar.
- Exportaciones desde el visor: nombrar por confianza, p. ej. `TACKER10_Modelo_Aproximado.glb`.
- **Inspeccionar antes de optimizar** (`gltf:inspect`): revisar unidades, nombres, materiales y triángulos del original; no optimizar a ciegas.
- **Registrar todo cambio de material o escala que afecte la interpretación** (reescalado, cambio de metalness/color, texturas recomprimidas, fusión de nodos) en una nota en `docs/` junto al modelo; un cambio así puede alterar cómo se lee el componente (p. ej. un color que parezca un estado de seguridad).
- Preferir dedup/prune/meshopt y compresión de texturas solo cuando la equivalencia visual esté verificada; nunca sobrescribir CAD/GLB originales.
