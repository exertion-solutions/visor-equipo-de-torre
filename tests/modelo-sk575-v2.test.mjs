// Modelo SK-575 completo en el V2 (legacy-ext/84-modelo-sk575.js): GLB incrustados con materiales por pieza y normales.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const models = path.join(root, 'public', 'models', 'tacker10')
const glbs = fs.readdirSync(models).filter((f) => /^sk575_[a-z_]+\.glb$/.test(f))
const json = (f) => {
  const b = fs.readFileSync(path.join(models, f))
  return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'))
}

test('GLB sk575: materiales <id>_<material> (sin palette) y normales en cada primitiva', () => {
  assert.equal(glbs.length, 16)
  for (const f of glbs) {
    const j = json(f)
    const id = f.slice(0, -4)
    assert.ok(j.materials.length > 0, f)
    for (const m of j.materials) assert.ok(m.name.startsWith(id + '_'), `${f}: ${m.name}`)
    for (const m of j.meshes) for (const p of m.primitives) assert.ok(p.attributes.NORMAL !== undefined, f)
  }
})

test('el V2 incrusta los 16 GLB, el decodificador meshopt y el módulo 84', () => {
  const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'TACKER10_Digital_Rig_V2.html'), 'utf8')
  assert.match(html, /window\.__MeshoptDecoder=MeshoptDecoder/)
  assert.match(html, /\/\* 84-modelo-sk575\.js \*\//)
  const m = html.match(/window\.__TACKER_SK575_GLB=(\{[^;]*\});/)
  assert.ok(m)
  assert.deepEqual(Object.keys(JSON.parse(m[1])).sort(), glbs.map((f) => f.slice(0, -4)).sort())
})
