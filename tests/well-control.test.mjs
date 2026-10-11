// Componente 07 (BOP + acumulador + choke manifold): el HTML generado debe traer el subconjunto, los metadatos y los patches de texto.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'TACKER10_Digital_Rig_V2.html'), 'utf8')
const wellsite = fs.readFileSync(path.join(root, 'legacy-ext', '40-wellsite.js'), 'utf8')

test('el componente 07 se renombra e incluye el choke manifold en su descripción', () => {
  assert.ok(html.includes('at.bop.name="BOP, acumulador y choke manifold";'))
  assert.ok(!html.includes('at.bop.name="BOP y acumulador";'))
  assert.ok(html.includes('Choke manifold (subconjunto, tipología genérica de referencia)'))
})

test('los peligros nuevos del choke manifold se rotulan pendientes de validación (no son requisitos)', () => {
  for (const h of ['Erosión o lavado del choke', 'Gas en el retorno del choke manifold', 'Golpe de ariete']) {
    const i = html.indexOf(h)
    assert.ok(i > 0, h)
    assert.ok(html.slice(i, i + 160).includes('pendiente de validación'), h)
  }
})

test('el choke manifold es un subconjunto de bop con mallas fusionadas y nombradas', () => {
  assert.ok(html.includes("gc.name = 'choke_manifold'"))
  assert.ok(html.includes("'choke_pintura'") && html.includes("'choke_acero'"))
  assert.match(html, /const CHOKE = \{ cx: 3\.4, cz: -4\.3, L: 2\.3, W: 2\.1, H: 1\.45 \}/)
})

test('el ruteo de líneas es configurable y por defecto usa el choke manifold', () => {
  assert.match(wellsite, /const CHOKE_ROUTING = 'choke'/)
  assert.ok(wellsite.includes("CHOKE_ROUTING === 'legacy'"))
})

test('el color del BOP es configurable y está marcado como pendiente', () => {
  assert.match(wellsite, /const BOP_COLOR = 'RED'/)
  assert.ok(wellsite.includes("BOP: '#B3262B'"))
  assert.ok(/PENDIENTE: el color del equipo real/.test(wellsite))
})

test('la ficha del 07: geometría SK-575 (C), diámetro en conflicto (C2) y manifold que no es del TKR-10', () => {
  assert.match(wellsite, /grade: 'C',\s*status: 'Fuente en conflicto'/)
  assert.ok(wellsite.includes('no es el manifold del TKR-10'))
  assert.ok(wellsite.includes('Pendientes: placa del BOP instalado'))
})
