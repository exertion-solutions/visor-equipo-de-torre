// Componente 12 (escalera y plataforma del enganchador): el HTML generado debe traer el detalle del piso, los grupos DROPS PE-x,
// la ficha de confiabilidad y los patches de texto. Las cifras de rendimiento (triángulos / draw calls) se miden en navegador
// (ver docs/references/enganche/README.md), no aquí.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'Digital_Rig_V2.html'), 'utf8')
const mast = fs.readFileSync(path.join(root, 'legacy-ext', '20-mast.js'), 'utf8')
const meta = fs.readFileSync(path.join(root, 'legacy-ext', '43-meta-enganche.js'), 'utf8')
const drops = JSON.parse(
  fs.readFileSync(path.join(root, 'src', 'data', 'qhse', 'rig10-drops.json'), 'utf8'),
)

/** Bloque `Ot.enganche = (g) => {…}` hasta el comentario de VIENTOS (zona propia de este componente). */
const engBlock = mast.slice(mast.indexOf('Ot.enganche = (g) =>'), mast.indexOf('// ═══════════════════════════════ VIENTOS'))

test('el piso de enganche conserva TODOS los grupos DROPS PE-x que dibujaba (los que no son vientos)', () => {
  const drawn = [...engBlock.matchAll(/spot\(t, '(PE-\d+)'/g)].map((m) => m[1])
  assert.deepEqual(
    drawn.sort((a, b) => Number(a.slice(3)) - Number(b.slice(3))),
    ['PE-1', 'PE-2', 'PE-3', 'PE-4', 'PE-5', 'PE-6', 'PE-7', 'PE-8', 'PE-9', 'PE-11', 'PE-12'],
  )
  // PE-10 y PE-13 (vientos) los dibuja `Ot.vientos`; todos existen en el dataset DROPS del Libro
  const ids = new Set(drops.points.map((p) => p.id))
  for (let i = 1; i <= 13; i++) assert.ok(ids.has(`PE-${i}`), `PE-${i} en rig10-drops.json`)
})

test('la altura del piso (N = 18,5) y el anclaje al marco local del mástil no cambian', () => {
  assert.match(mast, /const N = 18\.5 \/\/ piso de enganche \(y local\) — ANCLA FIJA/)
  assert.ok(engBlock.includes('const t = Ml(g)'))
  assert.ok(engBlock.includes("t.name = 'acceso_y_enganchador'"))
})

test('el detalle nuevo está en mallas nombradas (piso_chapa, arco_contencion, patines) y fusionadas por material', () => {
  for (const n of ['piso_chapa', 'arco_contencion', 'patines']) {
    assert.ok(mast.includes(`'${n}'`), n)
    assert.ok(html.includes(`'${n}'`), `${n} en el HTML generado`)
  }
  assert.ok(html.includes("'chapa_antideslizante'"))
  assert.match(engBlock, /B\.flush\(t, 'jaula'\)/)
})

test('peines con dedos individuales (8) y puertas con cadena de eslabones alternados', () => {
  assert.match(engBlock, /for \(let i = 0; i < 8; i\+\+\)/)
  assert.ok(engBlock.includes('chain(s, [1.0, N + 0.98, -1.115]'))
  assert.ok(engBlock.includes('chain(s, [2.96, N + 0.5, 0.36]'))
})

test('los textos del componente 12 se aplican y los peligros nuevos son "pendiente de validación"', () => {
  assert.ok(html.includes('Detalle del piso (aproximado; tipología de una referencia CAD genérica, no cota as-built)'))
  for (const h of ['Atrapamiento de manos entre los dedos del peine', 'Caída de tubulares desde los peines', 'Puerta de ingreso o cadena de retención mal cerrada']) {
    const i = html.indexOf(h)
    assert.ok(i > 0, h)
    assert.ok(html.slice(i, i + 160).includes('pendiente de validación'), h)
  }
})

test('la ficha de confiabilidad del 12 sigue en grado C / Aproximado y detalla lo pendiente', () => {
  assert.match(meta, /grade: 'C',\s*status: 'Aproximado'/)
  assert.ok(meta.includes('Pendientes: cotas reales del piso y del peine'))
  assert.ok(meta.includes("document.addEventListener('rig:boot'"))
  assert.ok(html.includes('/* 43-meta-enganche.js */'))
})

test('el detalle del piso queda rotulado como aproximado (no as-built)', () => {
  assert.ok(engBlock.includes('APROXIMADO'))
})
