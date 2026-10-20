// Los GLB que registra src/data/rigs/rig10.ts existen en public/ y conservan el contrato de nombres
// (nodo raíz = id del componente). Se generan con `python cad/build.py` + `npm run gltf:optimize`.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const src = fs.readFileSync(path.join(root, 'src', 'data', 'rigs', 'rig10.ts'), 'utf8')
const urls = [...new Set([...src.matchAll(/'(\/models\/rig10\/[\w-]+\.glb)'/g)].map((m) => m[1]))]

test('hay modelos registrados', () => {
  assert.ok(urls.length >= 4, urls.join(','))
})

for (const url of urls) {
  test(`existe ${url} y el nodo raíz se llama como el componente`, () => {
    const file = path.join(root, 'public', url)
    assert.ok(fs.existsSync(file), file)
    const buf = fs.readFileSync(file)
    assert.equal(buf.toString('ascii', 0, 4), 'glTF')
    const jsonLen = buf.readUInt32LE(12)
    const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen))
    const id = path.basename(url, '.glb')
    assert.ok(json.nodes.some((n) => n.name === id), `nodo raíz ${id} en ${url}`)
  })
}
