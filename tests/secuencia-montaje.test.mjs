// Secuencia de montaje ilustrativa (legacy-ext/76): 8 pasos, sin inventos, marcada pendiente de validar, y en el HTML generado.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'Digital_Rig_V2.html'), 'utf8')
const src = fs.readFileSync(path.join(root, 'legacy-ext', '76-secuencia-montaje.js'), 'utf8')
const doc = fs.readFileSync(path.join(root, 'docs', 'secuencia-montaje-tipica.md'), 'utf8')
const COMPONENT_IDS = ['mastil', 'subestructura', 'malacate', 'aparejo', 'motor', 'cabina', 'bop', 'llave', 'caballetes', 'circulacion', 'vientos', 'enganche', 'camion']

test('el módulo entra en el HTML generado', () => {
  assert.ok(html.includes('/* 76-secuencia-montaje.js */'))
  assert.ok(html.includes('__rigSeq'))
})

test('8 pasos numerados, cada uno con título', () => {
  const titles = [...src.matchAll(/n: (\d),\s*titulo:\s*'([^']+)'/g)]
  assert.equal(titles.length, 8)
  assert.deepEqual(titles.map((m) => Number(m[1])), [1, 2, 3, 4, 5, 6, 7, 8])
})

test('solo referencia componentes que existen y cada uno entra una sola vez', () => {
  const adds = [...src.matchAll(/add: \[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1]))
  for (const id of adds) assert.ok(COMPONENT_IDS.includes(id), id)
  assert.equal(new Set(adds).size, adds.length, 'un componente no entra dos veces')
  assert.deepEqual([...new Set(adds)].sort(), [...COMPONENT_IDS].sort(), 'al final del paso 8 están los 13')
})

test('se declara ilustrativa y pendiente de validar, y no inventa números', () => {
  assert.match(src, /pendingValidation/)
  assert.match(src, /no es el procedimiento de la empresa ni un requisito/i)
  assert.match(doc, /pendingValidation/)
  // sin cargas, tiempos ni distancias en los textos de los pasos
  const textos = [...src.matchAll(/texto:\s*(?:\n\s*)?'([^']+)'/g)].map((m) => m[1]).join(' ')
  assert.ok(!/\d+\s*(m|min|h|kg|t|psi|°)\b/.test(textos), textos)
})
