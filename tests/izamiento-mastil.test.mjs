// Izamiento del mástil ilustrativo (legacy-ext/81) y cabina desmontable (legacy-ext/79): entran en el HTML, declaran su fuente
// (usuario, pendingValidation), no inventan cargas/tiempos y el módulo del mástil deja el visor igual en 100 %.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'Digital_Rig_V2.html'), 'utf8')
const erect = fs.readFileSync(path.join(root, 'legacy-ext', '81-izamiento-mastil.js'), 'utf8')
const cab = fs.readFileSync(path.join(root, 'legacy-ext', '79-cabina-desmontable.js'), 'utf8')
const mast = fs.readFileSync(path.join(root, 'legacy-ext', '20-mast.js'), 'utf8')

test('módulos en el HTML generado y API expuesta', () => {
  for (const m of ['79-cabina-desmontable.js', '81-izamiento-mastil.js']) assert.ok(html.includes(`/* ${m} */`), m)
  assert.ok(html.includes('__rigErect') && html.includes('__rigCabina'))
})

test('la secuencia del izamiento respeta lo indicado: 3 fases en orden', () => {
  const f = erect.indexOf('Fase 1'), g = erect.indexOf('Fase 2'), h = erect.indexOf('Fase 3')
  assert.ok(f > 0 && g > f && h > g)
  assert.match(erect, /pistón de izaje del 1\.er tramo/)
  assert.match(erect, /extiende el tramo embutido/)
  assert.match(erect, /se tensan los vientos/)
})

test('se declara ilustrativo, de fuente usuario y pendiente de validar', () => {
  assert.match(erect, /pendingValidation/)
  assert.match(erect, /NO es una simulación/)
  assert.match(cab, /pendingValidation/)
  assert.match(cab, /desmontable/)
})

test('los pistones de izaje son un grupo propio en el mástil (para sustituirlos al animar)', () => {
  assert.ok(mast.includes("gp.name = 'pistones_izaje'"))
  assert.ok(!mast.includes("W.line(M.red, D(-5, 1.45, s)"), 'ya no van mezclados con las ménsulas de la base')
})

test('no hay cargas, presiones ni tiempos reales en los textos de la UI', () => {
  const note = erect.match(/er-note">([^<]+)</)[1]
  assert.ok(!/\b\d+\s*(kg|t|psi|bar|s|min|h)\b/.test(note), note)
})

test('cinemática del izamiento (cad/izamiento.py): datos inyectados y coherentes', () => {
  const d = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'cad', 'izamiento.json'), 'utf8'))
  assert.ok(html.includes('window.__RIG_IZAMIENTO='))
  assert.equal(d.estado, 'pendingValidation')
  assert.ok(d.elevacion_transporte > 0 && d.elevacion_transporte < 45, 'el mástil no puede acostarse a 0° sobre el equipo del V2')
  assert.ok(d.margen_libre >= 0.14, 'margen mínimo entre el mástil y el equipo')
  assert.ok(Math.abs(d.elevacion_final - 94.24) < 0.1, 'la pose final es la del V2')
  const l = d.pistones.tabla.map((t) => t.longitud)
  assert.ok(l.every((x, i) => i === 0 || x >= l[i - 1] - 1e-6), 'el pistón se extiende de forma monótona')
  assert.ok(d.soporte_traslado.alto > 0.3 && d.soporte_traslado.valido)
  assert.ok(d.notas.some((n) => /0°/.test(n)), 'se explica por qué no se parte de 0°')
})

test('el izamiento vive en el menú Montaje (sin panel flotante) y oculta la nota al reproducir', () => {
  assert.match(erect, /__rigToolbar\.add\('montaje', box\)/)
  assert.doesNotMatch(erect, /position:fixed/)
  assert.match(erect, /body\.erect-playing #rig-erect \.er-note\{display:none\}/)
  assert.match(erect, /classList\.toggle\('erect-playing'/)
  assert.match(erect, /raf = 0 \/\/ terminó/, 'al terminar vuelven los carteles y el botón dice Reproducir')
})

test('gatos de nivelación del carrier (82): 3 por lado, hijos de camion, se bajan antes de izar', () => {
  const gatos = fs.readFileSync(path.join(root, 'legacy-ext', '82-gatos-carrier.js'), 'utf8')
  assert.ok(html.includes('/* 82-gatos-carrier.js */') && html.includes('__rigGatos'))
  assert.match(gatos, /const XS = \[-15\.2, -9\.8, -1\.9\]/)
  assert.match(gatos, /camion\.add\(raiz\)/)
  assert.match(gatos, /pendingValidation/)
  assert.match(erect, /Fase 0 · se bajan los gatos de nivelación del carrier/)
  assert.match(erect, /__rigGatos\.set\(/)
})
