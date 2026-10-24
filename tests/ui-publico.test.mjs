// Ajustes del sitio público: modal Referencia sin secciones de fuentes, textos para visitantes, coma decimal,
// rótulo fijo de la vista nocturna, ficha de sector vacía y panel "Ir a equipo" sin tapar la ficha de componente.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'Digital_Rig_V2.html'), 'utf8')
const ext = (f) => fs.readFileSync(path.join(root, 'legacy-ext', f), 'utf8')
const original = fs.readFileSync(
  path.join(root, 'reference', 'legacy', 'Digital_Rig_V2.base.html'),
  'utf8',
)

test('la base no trae las secciones de fuentes internas ni la foto del equipo real', () => {
  assert.ok(!original.includes('<h3>Datos específicos'))
  assert.ok(!original.includes('<h3>Fuentes descriptivas complementarias</h3>'))
  assert.ok(!original.includes('Fotografía suministrada'))
})

test('sin marca ni códigos de documentos internos de la empresa en el visor publicado', () => {
  const prohibidos = /tacker|\bTKR[- ]?\d|\bTK-?10\b|\bWS10\b|PO-?WSG|POSGI|REVDJL|8123-1002|8114-1006|DK-3033|Mantenimiento WS|X:\\/i
  assert.doesNotMatch(html, prohibidos)
  assert.doesNotMatch(original, prohibidos)
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'public', 'legacy', 'sk575-glb.js'), 'utf8'), /tacker/i)
})

test('textos visibles sin "aportada por el usuario" / "la declara el usuario"', () => {
  assert.doesNotMatch(ext('76-secuencia-montaje.js'), /sq-warn">[^<]*aportada por el usuario/)
  const drops = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'qhse', 'rig10-drops.json'), 'utf8'))
  assert.doesNotMatch(drops.meta.disclaimer, /usuario/)
})

test('cotas dinámicas con coma decimal y rótulo fijo de vista nocturna', () => {
  assert.equal(html.split('.toFixed(2).replace(".",",")').length - 1, 2)
  assert.equal(html.split('.toFixed(1).replace(".",",")').length - 1, 1)
  assert.ok(!html.includes('Luz de estudio'))
})

test('87: ficha de sector vacía muestra aviso y el panel se corre al abrir la ficha de componente', () => {
  const src = ext('87-recorridos.js')
  assert.ok(src.includes('Ficha del sector pendiente de completar.'))
  assert.match(src, /new MutationObserver\(acomodar\)\.observe\(detail/)
})
