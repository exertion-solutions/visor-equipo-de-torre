// Publica el SK-575: `npm run gltf:optimize` de cada assets/source/sk575_*.glb con simplify DECLARADO (mismo valor que el
// default del CLI 4.5: --simplify true, error 1e-4 de la extensión de la malla, sin ratio) y escribe
// public/models/tacker10/<id>.meta.json = meta de origen + triángulos/aristas publicados.
// Uso: node cad/sk575/publicar.mjs [sk575_carrier ...]        (sin argumentos: todos)
//      node cad/sk575/publicar.mjs --contar <glb...>            (solo cuenta triángulos/segmentos, p. ej. el "antes")
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const SRC = path.join(ROOT, 'assets', 'source')
const OUT = path.join(ROOT, 'public', 'models', 'tacker10')
const SIMPLIFY = ['--simplify', 'true', '--simplify-error', '0.0001', '--simplify-ratio', '0']

/** Triángulos (mode 4) y segmentos (mode 1) de un GLB, del JSON: el `count` de los accessors no requiere decodificar meshopt. */
function contar(file) {
  const bin = fs.readFileSync(file)
  const J = JSON.parse(bin.subarray(20, 20 + bin.readUInt32LE(12)).toString('utf8'))
  let tris = 0
  let segs = 0
  for (const node of J.nodes ?? []) {
    if (node.mesh === undefined) continue
    for (const p of J.meshes[node.mesh].primitives) {
      const n = J.accessors[p.indices ?? p.attributes.POSITION].count
      if ((p.mode ?? 4) === 4) tris += n / 3
      if (p.mode === 1) segs += n / 2
    }
  }
  return { tris, segs }
}

const args = process.argv.slice(2)
if (args[0] === '--contar') {
  for (const f of args.slice(1))
    console.log(path.basename(f), JSON.stringify(contar(path.resolve(f))))
  process.exit(0)
}
const ids = args.length
  ? args
  : fs
      .readdirSync(SRC)
      .filter((f) => /^sk575_[a-z_]+\.glb$/.test(f))
      .map((f) => f.slice(0, -4))
const total = { origen: 0, publicado: 0, aristas: 0 }
for (const id of ids) {
  const r = spawnSync('npm', ['run', 'gltf:optimize', '--', `${id}.glb`, ...SIMPLIFY], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
  const meta = JSON.parse(fs.readFileSync(path.join(SRC, `${id}.meta.json`), 'utf8'))
  const pub = contar(path.join(OUT, `${id}.glb`))
  meta.publicado = {
    archivo: `public/models/tacker10/${id}.glb`,
    optimize: `npm run gltf:optimize -- ${id}.glb ${SIMPLIFY.join(' ')}`,
    triangulos_origen: meta.triangulos,
    triangulos_publicados: pub.tris,
    segmentos_aristas: pub.segs,
    nota: 'simplify (meshoptimizer) quita triángulos con error ≤ 1e-4 de la extensión de cada malla; las LINES no se simplifican',
  }
  fs.writeFileSync(path.join(OUT, `${id}.meta.json`), JSON.stringify(meta, null, 2) + '\n')
  total.origen += meta.triangulos
  total.publicado += pub.tris
  total.aristas += pub.segs
  console.log(`${id}: ${meta.triangulos} → ${pub.tris} tris, ${pub.segs} aristas`)
}
console.log('TOTAL', JSON.stringify(total))
