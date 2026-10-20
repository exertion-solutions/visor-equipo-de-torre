// Ajustes de UI/UX y accesibilidad del visor V2 (legacy-ext 60, 65, 75, 76, 83, 85): revisión 2026-10-11.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const ext = (f) => fs.readFileSync(path.join(root, 'legacy-ext', f), 'utf8')

test('Vista CAD: un cambio de modo con la vista encendida actualiza las capas a restaurar al apagarla', () => {
  assert.match(ext('85-vista-cad.js'), /addEventListener\('rig:mode',[\s\S]*?if \(previo\) previo\.layers = window\.__rigLayers/)
})

test('barra de modos: grupo con nombre accesible y aria-pressed sincronizado, 12 px sin mayúsculas', () => {
  const src = ext('75-mode-presets.js')
  assert.match(src, /setAttribute\('role', 'group'\)/)
  assert.match(src, /setAttribute\('aria-label', 'Modo de trabajo'\)/)
  assert.match(src, /setAttribute\('aria-pressed', String\(b\.classList\.contains\('on'\)\)\)/)
  assert.match(ext('60-ui-controls.js'), /#v2-modebar button\{font:600 12px[^}]*text-transform:none/)
})

test('menús: sin puntos de relevancia en EXPLORAR y presets de cámara con aria-pressed', () => {
  const src = ext('65-toolbar-menus.js')
  assert.match(src, /explore: \[\],/)
  assert.match(src, /#views button[\s\S]*?aria-pressed/)
})

test('60: un solo foco dorado, reduced motion, métricas solo con ?debug y el aviso de controles respeta la tarjeta SK-575', () => {
  const src = ext('60-ui-controls.js')
  assert.match(src, /--focus:#DFB64B/)
  assert.doesNotMatch(src, /139,92,246/)
  assert.doesNotMatch(ext('76-secuencia-montaje.js'), /139,92,246/)
  assert.match(src, /prefers-reduced-motion:reduce/)
  assert.match(src, /html:not\(\.debug\) #tris/)
  assert.match(src, /llamadas/)
})

test('Paneles va antes de Reset y la secuencia no dice que el manifold venía con el BOP', () => {
  assert.match(ext('83-layout-escena.js'), /insertBefore\(b, toolbar\.querySelector\('\.tm-sep'\)\)/)
  assert.doesNotMatch(ext('83-layout-escena.js'), /capa CAD/)
  const seq = ext('76-secuencia-montaje.js')
  assert.doesNotMatch(seq, /ya venía con el BOP/)
  assert.match(seq, /casilla desmontable del maquinista no está modelada \(pendiente\)/)
})
