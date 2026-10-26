// Módulos de campo del V2: almacén/envío (90), enlaces profundos (91), checklist DROPS (92), inducción (93) y ajustes móviles (94).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'Digital_Rig_V2.html'), 'utf8')
const ext = (f) => fs.readFileSync(path.join(root, 'legacy-ext', f), 'utf8')

test('el V2 incluye los cinco módulos de campo', () => {
  for (const m of ['90-almacen', '91-enlaces', '92-checklist-drops', '93-induccion', '94-ui-movil'])
    assert.ok(html.includes(`/* ${m}.js */`), m)
})

test('90: almacén solo con claves campo:, delega en la app dentro del iframe y envía sin CORS', () => {
  const s = ext('90-almacen.js')
  assert.match(s, /const PREFIX = 'campo:'/)
  assert.match(s, /type: 'rig:kvSet'/)
  assert.match(s, /type: 'rig:kvGet'/)
  assert.match(s, /mode: 'no-cors'/)
  assert.match(s, /\^https:\\\/\\\/\\S\+\$/, 'solo URLs https')
})

test('91: enlaces ?comp / ?vp validados contra listas conocidas y botón en Exportar', () => {
  const s = ext('91-enlaces.js')
  assert.match(s, /\^\[a-z0-9-\]\{1,40\}\$/)
  assert.match(s, /R\.COMPONENTS\[id\]/)
  assert.match(s, /__rigToolbar\.add\('exportar', btn\)/)
})

test('92: checklist sobre los puntos del dataset, registro de campo (no aprueba) y CSV', () => {
  const s = ext('92-checklist-drops.js')
  assert.match(s, /el visor no evalúa ni aprueba/)
  assert.match(s, /checklist-drops-/)
  assert.match(ext('50-drops-layer.js'), /li\.dataset\.pointId = p\.id/)
})

test('93: evaluación armada con las fichas de "Ir a equipo"; no es habilitación', () => {
  const s = ext('93-induccion.js')
  assert.match(s, /no una habilitación/)
  assert.match(s, /const APRUEBA = 0\.75/)
})
