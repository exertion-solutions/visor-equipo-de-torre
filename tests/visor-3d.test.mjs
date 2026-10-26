// Efectos y herramientas 3D del V2: 74-vr, 77-cortes, 78-medicion-angulo, 95-calidad, 96-ambiente, 97-clima, 98-personas, 99-maniobra.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'Digital_Rig_V2.html'), 'utf8')
const ext = (f) => fs.readFileSync(path.join(root, 'legacy-ext', f), 'utf8')
const MODS = ['74-vr', '77-cortes', '78-medicion-angulo', '95-calidad', '96-ambiente', '97-clima', '98-personas', '99-maniobra']

test('el V2 incluye los módulos 3D y expone las clases de three que usan', () => {
  for (const m of MODS) assert.ok(html.includes(`/* ${m}.js */`), m)
  for (const c of ['Plane:hn', 'BufferAttribute:Pt', 'CanvasTexture:wr', 'ShaderMaterial:bn', 'Vector2:Vc'])
    assert.ok(html.includes(c), c)
})

test('rotulado honesto: nada se presenta como cálculo, umbral o zona aprobada', () => {
  assert.match(ext('99-maniobra.js'), /NO cálculo ni simulación/)
  assert.match(ext('99-maniobra.js'), /No es una distancia ni una zona de exclusión aprobada/)
  assert.match(ext('97-clima.js'), /el visor no fija umbrales/)
  assert.match(ext('98-personas.js'), /NO representan puestos de trabajo definidos por procedimiento/)
  assert.match(ext('96-ambiente.js'), /no representa niveles de iluminación/)
})

test('personas: sin altura inventada (si el rayo no encuentra la superficie esperada, no se dibuja)', () => {
  assert.match(ext('98-personas.js'), /Math\.abs\(h\.point\.y - cota\) <= tol/)
})

test('VR: solo si el navegador ofrece immersive-vr; la app permite xr-spatial-tracking en el iframe', () => {
  assert.match(ext('74-vr.js'), /isSessionSupported\('immersive-vr'\)/)
  const app = fs.readFileSync(path.join(root, 'src', 'components', 'viewer', 'LegacyRigViewer.tsx'), 'utf8')
  assert.match(app, /allow="xr-spatial-tracking; fullscreen"/)
})
