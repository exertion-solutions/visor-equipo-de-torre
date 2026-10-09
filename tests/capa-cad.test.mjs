// Capa CAD del V2 (legacy-ext/77): los datos vienen de cad/ (src/data/cad/capa-cad.json), entran en el HTML y se declaran
// confianza C / no as-built. El mástil es ILUSTRATIVO y todo lleva procedencia.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'TACKER10_Digital_Rig_V2.html'), 'utf8')
const dataPath = path.join(root, 'src', 'data', 'cad', 'capa-cad.json')
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

test('el módulo y los datos entran en el HTML generado', () => {
  assert.ok(html.includes('/* 77-capa-cad.js */'))
  assert.ok(html.includes('window.__TACKER_CAD='))
  assert.ok(html.includes('__tackerCad'))
})

test('4 ítems con procedencia y estado; el mástil es ILUSTRATIVO', () => {
  // los sk575_* (modelo de referencia) se prueban en capa-cad-sk575.test.mjs
  assert.deepEqual(
    data.items.filter((i) => i.grupo !== 'sk575').map((i) => i.id),
    ['carrier_huella', 'layout_tkr10', 'piso_trabajo', 'mastil'],
  )
  for (const i of data.items) {
    assert.ok(i.fuente && i.estado && i.nombre, i.id)
    assert.ok(i.tris || i.lineas, i.id)
  }
  assert.equal(data.items.find((i) => i.id === 'mastil').estado, 'ILUSTRATIVO')
  assert.equal(data.confianza, 'C')
  assert.match(data.aviso, /no es as-built/i)
})

test('geometría coherente: índices válidos, múltiplos de 3 y dentro del rango de vértices', () => {
  for (const i of data.items)
    for (const t of i.tris || []) {
      assert.equal(t.p.length % 3, 0)
      assert.equal(t.i.length % 3, 0)
      const n = t.p.length / 3
      assert.ok(t.i.every((k) => Number.isInteger(k) && k >= 0 && k < n), i.id)
    }
  for (const i of data.items) for (const l of i.lineas || []) assert.equal(l.p.length % 6, 0)
})

test('las cotas documentadas se reproducen: carrier 18 × 4 m terminando a 1,3 m de la boca', () => {
  const t = data.items.find((i) => i.id === 'carrier_huella').tris[0]
  const xs = t.p.filter((_, k) => k % 3 === 0)
  const zs = t.p.filter((_, k) => k % 3 === 2)
  assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - 18) < 0.01)
  assert.ok(Math.abs(Math.max(...zs) - Math.min(...zs) - 4) < 0.01)
  assert.ok(Math.abs(Math.max(...xs) - -1.3) < 0.01)
})

test('la altura del mástil es la documentada (31,6992 m) y pesa poco', () => {
  const ys = data.items.find((i) => i.id === 'mastil').lineas.flatMap((l) => l.p.filter((_, k) => k % 3 === 1))
  assert.ok(Math.abs(Math.max(...ys) - Math.min(...ys) - 31.6992) < 0.001)
  const base = { ...data, items: data.items.filter((i) => i.grupo !== 'sk575') }
  assert.ok(JSON.stringify(base).length < 400_000)
})

test('aviso del entorno de locación (78) en el HTML, sin afirmar marcas ni capacidades', () => {
  assert.ok(html.includes('/* 78-aviso-entorno.js */'))
  assert.match(html, /unidades simplificadas ubicadas según el layout TKR-10/)
})
