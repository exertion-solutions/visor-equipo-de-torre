// Uso: npm run gltf:optimize -- <nombre.glb> [flags de gltf-transform optimize]
// Lee de assets/source/<nombre> y escribe en public/models/tacker10/<nombre>.
// NUNCA modifica ni sobrescribe el original.
//
// Defaults pensados para un gemelo digital (selección/jerarquía/aislamiento por componente):
//  --flatten false / --join false  → conserva el árbol de nodos y sus nombres (los defaults del CLI los destruyen)
//  --compress meshopt              → decodificador incluido en el loader (src/scene/loaders/gltf.ts)
//  --texture-compress webp         → no requiere binarios externos (KTX2 exige `toktx`; ver skill gltf-pipeline)
import fs from 'node:fs'
import path from 'node:path'
import { outputDir, runGltfTransform, sourceDir } from './_gltf-cli.mjs'

const [name, ...extra] = process.argv.slice(2)
if (!name || name.startsWith('-')) {
  console.error('Uso: npm run gltf:optimize -- <nombre.glb> [flags]   (origen: assets/source/)')
  process.exit(1)
}

const input = path.resolve(sourceDir, name)
const output = path.resolve(outputDir, path.basename(name))

if (path.dirname(input) !== sourceDir && !input.startsWith(sourceDir + path.sep)) {
  console.error(`El origen debe estar dentro de assets/source/: ${input}`)
  process.exit(1)
}
if (!fs.existsSync(input)) {
  console.error(`No existe: ${input}`)
  process.exit(1)
}
if (path.resolve(input) === path.resolve(output)) {
  console.error('Origen y destino coinciden; abortado para no tocar el original.')
  process.exit(1)
}

fs.mkdirSync(outputDir, { recursive: true })
runGltfTransform([
  'optimize',
  input,
  output,
  '--flatten',
  'false',
  '--join',
  'false',
  '--compress',
  'meshopt',
  '--texture-compress',
  'webp',
  // palette fusiona los materiales en un `PaletteMaterial` con textura: se pierden los nombres `<id>_<material>` y el PBR
  '--palette',
  'false',
  ...extra,
])
console.log(`\nOptimizado → ${path.relative(process.cwd(), output)} (original intacto)`)
