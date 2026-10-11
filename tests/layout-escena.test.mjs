// Layout de la escena (legacy-ext/83 + dock de 76 + menú Animar de 65): cartas colapsadas, modo enfoque y comandos reubicados.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, ...f.split('/')), 'utf8')
const html = read('public/legacy/TACKER10_Digital_Rig_V2.html')
const layout = read('legacy-ext/83-layout-escena.js')
const menus = read('legacy-ext/65-toolbar-menus.js')
const seq = read('legacy-ext/76-secuencia-montaje.js')

test('módulo en el HTML y API expuesta', () => {
  assert.ok(html.includes('/* 83-layout-escena.js */') && html.includes('__tackerLayout'))
})

test('modo enfoque: oculta todas las cartas salvo la leyenda obligatoria de zonas', () => {
  for (const id of ['#tree', '#cad-inspector', '#detail', '#hint'])
    assert.ok(layout.includes(`body.focus-scene:not(.paneles-show) ${id}`), id)
  assert.ok(!/focus-scene[^{]*#legend/.test(layout), 'la leyenda de zonas ilustrativas no se oculta')
  for (const id of ['c-measure', 'c-cut', 'c-dims', 'c-wire', 't-explode', 't-labels', 'c-isolate'])
    assert.ok(layout.includes(`'${id}'`), id)
  assert.match(layout, /erect-playing/)
  assert.match(layout, /tacker:seq-step/)
})

test('no hay bucle con el observador: nunca se escribe la clase si no cambia', () => {
  assert.match(layout, /contains\('focus-scene'\) !== on/)
  assert.match(layout, /contains\('paneles-show'\)\) body\.classList\.remove/)
})

test('comandos reubicados en la barra: Vista nocturna en Vista y Animar aparejo en el menú Animar', () => {
  assert.match(menus, /items: \['views', 'c-ortho', 'c-night'\]/)
  assert.match(menus, /id: 'animar'/)
  assert.match(menus, /row: \['c-play', 'hoist', 'hoist-out'\]/)
})

test('la secuencia de montaje y el izamiento viven en el menú Montaje de la barra, sin panel flotante', () => {
  assert.match(menus, /id: 'montaje'/)
  assert.match(seq, /__rigToolbar\.add\('montaje', panel\)/)
  assert.doesNotMatch(seq, /position:fixed/)
  assert.match(seq, /open,\s*close/)
})
