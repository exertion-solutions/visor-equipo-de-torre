// Componente 08 (llave hidráulica, contrafuerza y cuñas): el HTML generado debe traer el rediseño, los textos, la ficha y los grupos DROPS.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import patches from '../scripts/patches/08-llave.mjs'

const root = path.resolve(import.meta.dirname, '..')
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'Digital_Rig_V2.html'), 'utf8')
const original = fs.readFileSync(path.join(root, 'reference', 'legacy', 'Digital_Rig_V2.base.html'), 'utf8')
const wellsite = fs.readFileSync(path.join(root, 'legacy-ext', '40-wellsite.js'), 'utf8')
const meta = fs.readFileSync(path.join(root, 'legacy-ext', '42-meta-llave.js'), 'utf8')
const start = wellsite.indexOf('function buildLlave(')
const fn = wellsite.slice(start, wellsite.indexOf('function buildCaballetes(', start))

test('los patches del 08 exportan un array y cada `find` tiene exactamente 1 coincidencia en el original', () => {
  assert.ok(Array.isArray(patches) && patches.length >= 3)
  for (const p of patches) {
    assert.ok(p.name && p.find && p.replace, p.name)
    assert.equal(original.split(p.find).length - 1, 1, p.name)
  }
})

test('el componente 08 se renombra e incluye la contrafuerza y el brazo de reacción en su descripción', () => {
  assert.ok(html.includes('llave:{n:8,name:"Llave hidráulica, contrafuerza y cuñas"'))
  assert.ok(!html.includes('name:"Llave hidr\\xE1ulica y cu\\xF1as"'))
  assert.ok(html.includes('la llave de contrafuerza (backup) sujeta la rosca opuesta'))
  assert.ok(html.includes('fabricante, modelo, torque, capacidad y rango de diámetros pendientes'))
})

test('los peligros nuevos se rotulan pendientes de validación (no son requisitos)', () => {
  for (const h of ['Aplastamiento entre el brazo de reacción', 'Pinzamiento de manos en palancas', 'Caída de la llave por falla']) {
    const i = html.indexOf(h)
    assert.ok(i > 0, h)
    assert.ok(html.slice(i, i + 200).includes('pendiente de validación'), h)
  }
})

test('la llave se construye con mallas fusionadas y nombradas (5 propias + los grupos DROPS)', () => {
  for (const n of ['llave_pintura', 'llave_acero', 'llave_mangueras', 'llave_cunas', 'llave_manometro'])
    assert.ok(fn.includes(`'${n}'`), n)
  assert.equal((fn.match(/\.flush\(g,/g) || []).length, 5, 'solo 5 mallas propias (presupuesto: +2 draw calls)')
  assert.ok(html.includes("'llave_cunas'") && html.includes("'llave_manometro'"))
})

test('se conservan los grupos DROPS PRL-1, PRL-2 y PRL-3 con sus puntos de anclaje', () => {
  assert.ok(fn.includes("'PRL-1',\n      4.4,"))
  assert.match(fn, /clamp\(\s*'PRL-2',\s*2\.95,/)
  assert.ok(fn.includes("'PRL-3',\n      'Libro DROPS p.25"))
  for (const s of ["id + '_grampa'", 'PRL-3_perno', 'PRL-3_cadena']) assert.ok(fn.includes(s), s)
  assert.ok(fn.includes('dropsGroup('))
})

test('el poste de retenida va sujeto al mástil (grampas al montante), sin base ni apoyo en el piso de trabajo', () => {
  assert.ok(fn.includes('api.ni('), 'la posición sale del eje inclinado del mástil')
  assert.ok(fn.includes('const legAt = (y)') && fn.includes('const postAt = (y)'))
  assert.ok(fn.includes('M.rod(C.GRAY_L, postAt(2.75), postAt(4.75)'), 'poste paralelo al montante, extremo inferior libre')
  // nada del poste anterior apoyado en el piso: columna de apoyo, placa base, bulones de anclaje, rigidizadores
  for (const gone of ['placa base', 'bulones de anclaje', 'rigidizadores', 'FL + 1.3, 1.35']) assert.ok(!fn.includes(gone), gone)
  // el extremo inferior queda por encima del piso (FL = 2,36 m)
  assert.ok(2.75 > 2.36)
})

test('el color de la llave es configurable y está marcado como pendiente', () => {
  assert.match(fn, /const LLAVE_COLOR = 'RED'/)
  assert.ok(fn.includes("LLAVE_COLOR === 'RED'"))
  assert.ok(/PENDIENTE: el color del equipo real/.test(fn))
})

test('el manómetro no indica ningún valor de torque (aguja en cero) y no hay modelo/fabricante', () => {
  assert.ok(fn.includes('aguja en cero'))
  assert.ok(/PENDIENTE: modelo\/fabricante|modelo\/fabricante PENDIENTE/.test(fn))
  assert.ok(!/\b\d[\d.,]*\s*(ft-?lb|lbf|N·?m|kN·?m|psi)\b/i.test(fn), 'no se inventan torques ni presiones')
})

test('la ficha de confiabilidad del 08 es C / Aproximado y se aplica al arrancar el producto', () => {
  assert.match(meta, /grade: 'C',\s*status: 'Aproximado'/)
  assert.ok(meta.includes("document.addEventListener('rig:boot', applyMeta, { once: true })"))
  assert.ok(meta.includes('Pendientes: fabricante y'))
  assert.ok(html.includes('/* 42-meta-llave.js */'))
})
