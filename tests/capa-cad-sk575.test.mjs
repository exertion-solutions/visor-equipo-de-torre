// Modelo SK-575 de referencia en la capa CAD del V2 (cad/sk575/capa.py → src/data/cad/capa-cad.json, grupo 'sk575').
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const dataPath = path.join(root, 'src', 'data', 'cad', 'capa-cad.json')
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
const sk = data.items.filter((i) => i.grupo === 'sk575')
const coords = (eje) =>
  sk.flatMap((i) => [...(i.tris || []), ...(i.lineas || [])].flatMap((t) => t.p.filter((_, k) => k % 3 === eje)))

test('una entrada por componente, anclada en el mundo, con procedencia honesta (no as-built)', () => {
  assert.ok(sk.length >= 10)
  for (const id of ['sk575_mastil', 'sk575_carrier', 'sk575_cuadro', 'sk575_piso', 'sk575_bop', 'sk575_manifold', 'sk575_piletas'])
    assert.ok(sk.some((i) => i.id === id), id)
  for (const i of sk) {
    assert.equal(i.ancla, 'mundo', i.id)
    assert.match(i.estado, /no as-built/, i.id)
    assert.match(i.fuente, /no as-built/, i.id)
    assert.ok(i.tris || i.lineas, i.id)
  }
  assert.equal(new Set(sk.map((i) => i.color)).size, sk.length)
})

test('marco V2: boca de pozo en el origen, carrier hacia −X, Y arriba, mástil de ~31,7 m', () => {
  const car = sk.find((i) => i.id === 'sk575_carrier').tris[0].p.filter((_, k) => k % 3 === 0)
  assert.ok(Math.max(...car) < 2 && Math.min(...car) < -12, 'carrier hacia −X')
  const ys = coords(1)
  assert.ok(Math.min(...ys) > -1.5, 'nada muy por debajo del terreno')
  const mast = sk.find((i) => i.id === 'sk575_mastil')
  const my = [...(mast.tris || []), ...(mast.lineas || [])].flatMap((t) => t.p.filter((_, k) => k % 3 === 1))
  assert.ok(Math.max(...my) > 30 && Math.max(...my) < 36, 'tope del mástil')
})

test('presupuesto: la capa completa pesa menos de 4 MB', () => {
  assert.ok(fs.statSync(dataPath).size < 4_000_000)
})
