// Viewpoints del recorrido en primera persona (src/data/viewpoints/rig10-viewpoints.json → legacy-ext/87-recorridos.js).
// Sumar un viewpoint = sumar un registro: este test cuida que el registro sea coherente sin mirar la lógica.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'Digital_Rig_V2.html'), 'utf8')
const D = JSON.parse(
  fs.readFileSync(path.join(root, 'src', 'data', 'viewpoints', 'rig10-viewpoints.json'), 'utf8'),
)

test('el V2 trae el módulo y los datos', () => {
  assert.ok(html.includes('/* 87-recorridos.js */'))
  assert.ok(html.includes('window.__RIG_VIEWPOINTS='))
  assert.ok(html.includes('raycaster:Sl'), '__rig expone el raycaster del V2')
})

test('cada viewpoint: id único, campos completos, ojos = cota del piso + 1,70 m, dentro de la locación', () => {
  const ids = D.viewpoints.map((v) => v.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(D.alturaOjos, 1.7)
  for (const v of D.viewpoints) {
    assert.ok(v.nombre && Array.isArray(v.objeto3D), v.id)
    assert.ok(D.pisos[v.piso], `${v.id}: piso desconocido ${v.piso}`)
    assert.ok(Math.abs(v.camPos[1] - (D.pisos[v.piso].cota + D.alturaOjos)) < 0.011, `${v.id}: altura de ojos`)
    assert.ok(v.fov >= 40 && v.fov <= 90, v.id)
    const [x, , z] = v.camPos
    assert.ok(x >= D.locacion.min[0] && x <= D.locacion.max[0] && z >= D.locacion.min[1] && z <= D.locacion.max[1], v.id)
    assert.deepEqual(Object.keys(v.ficha).sort(), ['EPP', 'controles', 'funcion', 'riesgos'], v.id)
  }
})

test('fichas QHSE: completas y riesgos/EPP/controles rotulados como referencia genérica pendiente de validación', () => {
  for (const v of D.viewpoints) {
    for (const [k, t] of Object.entries(v.ficha)) assert.ok(t.trim().length > 20, `${v.id}.${k}`)
    for (const k of ['riesgos', 'EPP', 'controles'])
      assert.ok(v.ficha[k].endsWith('(referencia genérica, pendiente de validación)'), `${v.id}.${k}`)
  }
})

test('recorrido guiado: paradas existentes y tiempo por parada', () => {
  const ids = new Set(D.viewpoints.map((v) => v.id))
  assert.deepEqual(D.recorrido.paradas, ['acceso', 'acumulador', 'manifold', 'bop', 'piso-trabajo'])
  for (const id of D.recorrido.paradas) assert.ok(ids.has(id), id)
  assert.ok(D.recorrido.segundosPorParada > 0)
  assert.equal(D.caminata.velocidad, 1.4)
})
