// 86-textos-sk575.js y 50-drops-layer.js: textos y marcadores alineados con el SK-575 (único equipo visible).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, 'legacy-ext', f), 'utf8')
const src = read('86-textos-sk575.js')
const original = fs.readFileSync(path.join(root, 'reference', 'legacy', 'TACKER10_Digital_Rig_V2.html'), 'utf8')

test('86: fichas con la confianza de la geometría SK-575 (C), nunca A/B', () => {
  assert.doesNotMatch(src, /grade: '[AB]'/)
  for (const id of ['mastil', 'subestructura', 'motor', 'camion', 'malacate', 'caballetes', 'vientos'])
    assert.match(src, new RegExp(`\\n    ${id}: \\{\\n      grade: 'C'`), id)
  assert.ok(src.includes('325.725 lb') && src.includes('330.000 lb'), 'capacidad: placa vs designación')
})

test('86: los fragmentos del modal que reemplaza existen en el original inmutable', () => {
  const frag = [...src.matchAll(/\[\s*'([^']+)',\s*'/g)].map((m) => m[1])
  assert.equal(frag.length, 4)
  for (const f of frag) assert.ok(original.includes(f), f)
})

test('86: controles de aparejo y vientos como recomendación pendiente de validación', () => {
  const epp = src.slice(src.indexOf('const EPP'), src.indexOf('const FUNCION_VIENTOS'))
  assert.doesNotMatch(epp, /certificad|Nadie debajo/)
  assert.equal((epp.match(/\+\s*PV/g) || []).length, 8)
})

test('50: marcadores DROPS siempre aproximados y sin anclar en geometría oculta', () => {
  const drops = read('50-drops-layer.js')
  assert.match(drops, /m\.approx = true/)
  assert.match(drops, /if \(!o\.layers\.isEnabled\(0\)\) return/)
  assert.match(drops, /case 'piso-enganche':[\s\S]{0,300}onMast\(20\.629\)/)
})
