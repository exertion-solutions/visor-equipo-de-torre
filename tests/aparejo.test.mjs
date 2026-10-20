// Componente 04 (aparejo, amelas y elevadores): el HTML generado trae los textos y la ficha nuevos, y la geometría de legacy-ext/41-aparejo.js
// (ejecutada aquí con la clase real de three) cumple la jerarquía, el presupuesto de mallas/triángulos y no rompe el estado animado del visor.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { test } from 'node:test'
import * as THREE from 'three'

const root = path.resolve(import.meta.dirname, '..')
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'Digital_Rig_V2.html'), 'utf8')
const read = (f) => fs.readFileSync(path.join(root, 'legacy-ext', f), 'utf8')
const aparejoSrc = read('41-aparejo.js')

test('el componente 04 se renombra, describe el elevador de varillas como pendiente y agrega peligros de referencia', () => {
  assert.ok(html.includes('at.aparejo.name="Aparejo, amelas y elevadores";'))
  assert.ok(!html.includes('at.aparejo.name="Aparejo, amelas y elevador";'))
  assert.ok(html.includes('elevador de varillas (sucker rod) apoyado en el piso de trabajo'))
  assert.ok(html.includes('pendientes de confirmar'))
  for (const h of ['Atrapamiento de manos en la bisagra', 'Elevador de varillas mal asentado', 'Desgaste o fisura en los ojos de las amelas']) {
    const i = html.indexOf(h)
    assert.ok(i > 0, h)
    assert.ok(html.slice(i, i + 160).includes('pendiente de validación'), h)
  }
})

test('la ficha del 04: geometría SK-575 (C) y líneas como fuente en conflicto (C1), con pendientes', () => {
  const meta = read('41-meta-aparejo.js')
  assert.match(meta, /grade: 'C',\s*status: 'Fuente en conflicto'/)
  assert.ok(meta.includes('placa 8') && meta.includes('folleto 6'), 'C1 rotulado, no elegido')
  assert.ok(meta.includes('Pendientes: enhebrado real'))
  assert.ok(meta.includes("document.addEventListener('rig:boot'"))
  assert.ok(html.includes('/* 41-meta-aparejo.js */'))
})

test('color y ubicación del elevador de varillas son configurables y están marcados como pendientes', () => {
  assert.match(aparejoSrc, /const APAREJO_COLOR = 'YELLOW'/)
  assert.ok(/PENDIENTE: el color real del equipo/.test(aparejoSrc))
  assert.match(aparejoSrc, /const ROD_ELEVATOR = \{ visible: true, x: -0\.85, y: 2\.34, z: -0\.95, yaw: 0\.5 \}/)
  assert.ok(/UBICACIÓN PENDIENTE/.test(aparejoSrc))
  assert.ok(html.includes('/* 41-aparejo.js */'))
})

test('wrapAparejo delega en 41-aparejo.js y no toca la paleta ni el kit Batch', () => {
  const wellsite = read('40-wellsite.js')
  assert.ok(wellsite.includes('window.__rigAparejo'))
  assert.ok(wellsite.includes('redesign.build(g, api, { K, Batch, dropsGroup })'))
})

// ───────────── geometría: se ejecutan 00-runtime + 40-wellsite + 41-aparejo con un `api` de juguete basado en three real ─────────────
function buildAparejo(patchSource = (s) => s) {
  const doc = { addEventListener() {} }
  const ctx = { window: null, document: doc, console }
  ctx.window = ctx
  vm.createContext(ctx)
  for (const f of ['00-runtime.js', '40-wellsite.js', '41-aparejo.js']) vm.runInContext(patchSource(read(f)), ctx, { filename: f })

  const add = (parent, o) => (parent.add(o), o)
  const mat = () => new THREE.MeshStandardMaterial()
  const api = {
    D: (x, y, z) => new THREE.Vector3(x, y, z),
    pn: (c, r, m, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...extra }),
    le: (p, m, w, h, d, x, y, z) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
      o.position.set(x, y, z)
      return add(p, o)
    },
    De: (p, m, rt, rb, h, x, y, z, axis = 'y', seg = 12, open = false) => {
      const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)
      if (axis === 'x') g.rotateZ(Math.PI / 2)
      else if (axis === 'z') g.rotateX(Math.PI / 2)
      const o = new THREE.Mesh(g, m)
      o.position.set(x, y, z)
      return add(p, o)
    },
    Ml: (p) => add(p, new THREE.Group()),
    ta: (p, m, pts, r) => add(p, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, r, 6, false), m)),
    Ot: {},
  }
  // aparejo ORIGINAL del bundle (mismos objetos y nombres que crea `Ot.aparejo` del visor)
  api.Ot.aparejo = (g) => {
    const t = new THREE.Group()
    t.name = 'bloque_viajero'
    t.position.y = 14
    g.add(t)
    for (const o of [-0.32, 0.32]) api.le(t, mat(), 0.9, 1.1, 0.13, 0, 0.1, o)
    for (const o of [-0.24, 0, 0.24]) {
      api.De(t, mat(), 0.36, 0.36, 0.085, 0, 0.28, o, 'z', 32) // polea $d: cilindro + 2 toros + cubo
      for (const dz of [-0.053, 0.053]) t.add(new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 6, 32), mat()))
      api.De(t, mat(), 0.11, 0.11, 0.18, 0, 0.28, o, 'z', 16)
    }
    api.De(t, mat(), 0.11, 0.11, 0.7, 0, -0.8, 0, 'y', 16) // vástago
    t.add(new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.075, 10, 28, Math.PI * 1.6), mat())) // gancho
    api.De(t, mat(), 0.022, 0.022, 0.4, 0, -1.3, 0, 'y', 8) // pasador
    const s = new THREE.Group()
    s.name = 'amelas'
    t.add(s)
    for (const z of [-0.27, 0.27]) {
      api.De(s, mat(), 0.045, 0.045, 1.25, 0, -2.2, z, 'y', 10)
      for (const y of [-1.62, -2.88]) s.add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 18), mat()))
    }
    const e = new THREE.Group()
    e.name = 'elevador'
    t.add(e)
    api.De(e, mat(), 0.3, 0.3, 0.28, 0, -3.04, 0, 'y', 24, true)
    for (const z of [-0.37, 0.37, 0]) api.le(e, mat(), 0.28, 0.16, 0.3, 0, -3.04, z)
    for (const x of [-0.36, 0.36]) for (const z of [-0.24, 0, 0.24]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 1, 8, 1, true), mat())
      c.name = 'ramal_visual'
      g.add(c)
    }
  }
  ctx.window.__rigExt.runPre(api)
  const g = new THREE.Group()
  g.name = 'aparejo'
  api.Ot.aparejo(g)
  g.updateMatrixWorld(true)
  return { g, ctx }
}

const meshesOf = (o) => {
  const out = []
  o.traverse((c) => c.isMesh && out.push(c))
  return out
}
const trisOf = (m) => (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3

test('jerarquía estable: bloque, gancho, amelas, elevador y elevador de varillas con sus mallas nombradas', () => {
  const { g } = buildAparejo()
  const names = new Set()
  g.traverse((o) => o.name && names.add(o.name))
  for (const n of [
    'bloque_viajero',
    'drops_BP-3',
    'bloque',
    'gancho',
    'pestillo',
    'amelas',
    'elevador',
    'puerta',
    'elevador_varillas',
    'bloque_viajero_pintura',
    'bloque_viajero_acero',
    'gancho_pintura',
    'gancho_acero',
    'pestillo_acero',
    'amelas_pintura',
    'elevador_tubing_pintura',
    'elevador_tubing_acero',
    'elevador_puerta_pintura',
    'elevador_puerta_acero',
    'elevador_varillas_pintura',
    'elevador_varillas_acero',
  ])
    assert.ok(names.has(n), `falta ${n}`)
  const blk = g.getObjectByName('bloque_viajero')
  const bp3 = g.getObjectByName('drops_BP-3')
  assert.equal(bp3.userData.dropsId, 'BP-3')
  assert.equal(bp3.parent, blk)
  assert.ok(bp3.getObjectByName('bloque') && bp3.getObjectByName('gancho'))
  // el pivote del pestillo y de la puerta son Object3D propios, con su malla como hija
  assert.equal(g.getObjectByName('pestillo').children[0].name, 'pestillo_acero')
  assert.equal(g.getObjectByName('puerta').children.length, 2)
})

test('todo lo que cuelga del aparejo animado es hijo de bloque_viajero; el elevador de varillas y los 6 ramales quedan fuera', () => {
  const { g } = buildAparejo()
  const blk = g.getObjectByName('bloque_viajero')
  const inBlock = new Set(meshesOf(blk))
  for (const m of meshesOf(g)) {
    if (m.name === 'ramal_visual') assert.ok(!inBlock.has(m), 'los ramales pertenecen al grupo aparejo (los reestira el visor)')
    else if (m.name.startsWith('elevador_varillas')) assert.ok(!inBlock.has(m), 'el elevador de varillas no se mueve con el bloque')
    else assert.ok(inBlock.has(m), `${m.name} debe colgar de bloque_viajero (si no, no acompaña la animación)`)
  }
  assert.equal(meshesOf(g).filter((m) => m.name === 'ramal_visual').length, 6)
  // mover el bloque (wh.position.y = altura) arrastra el bloque, el gancho, las amelas y el elevador de tubing, no el de varillas
  const rod = g.getObjectByName('elevador_varillas')
  const before = { hook: new THREE.Vector3(), rod: new THREE.Vector3() }
  g.getObjectByName('gancho').getWorldPosition(before.hook)
  rod.getWorldPosition(before.rod)
  blk.position.y += 5
  g.updateMatrixWorld(true)
  const after = { hook: new THREE.Vector3(), rod: new THREE.Vector3() }
  g.getObjectByName('gancho').getWorldPosition(after.hook)
  rod.getWorldPosition(after.rod)
  assert.ok(Math.abs(after.hook.y - before.hook.y - 5) < 1e-9)
  assert.ok(after.rod.distanceTo(before.rod) < 1e-9)
})

test('presupuesto: mallas fusionadas por material (≤ 3 draw calls más que el original) y ≤ +9.000 triángulos', () => {
  const orig = buildAparejo((s) => s.replace('const redesign = window.__rigAparejo', 'const redesign = null'))
  const neu = buildAparejo()
  const stats = (g) => {
    const list = meshesOf(g)
    return { calls: list.length, tris: list.reduce((n, m) => n + trisOf(m), 0) }
  }
  const a = stats(orig.g)
  const b = stats(neu.g)
  assert.ok(b.calls - a.calls <= 3, `mallas: ${a.calls} → ${b.calls}`)
  assert.ok(b.tris - a.tris <= 9000, `triángulos: ${a.tris} → ${b.tris}`)
  // un solo mesh por material y parte (pintura/acero)
  for (const m of meshesOf(neu.g)) assert.ok(m.name, 'toda malla nueva lleva nombre')
})

test('geometría sana: sin NaN, normales unitarias, colores por vértice y envolvente coherente con el modelo anterior', () => {
  const { g } = buildAparejo()
  const blk = g.getObjectByName('bloque_viajero')
  for (const m of meshesOf(g)) {
    if (m.name === 'ramal_visual') continue
    const geo = m.geometry
    const pos = geo.attributes.position
    for (let i = 0; i < pos.array.length; i++) assert.ok(Number.isFinite(pos.array[i]), `${m.name}: NaN en position`)
    if (geo.attributes.normal && geo.attributes.color) {
      const n = geo.attributes.normal
      for (let i = 0; i < n.count; i += Math.max(1, Math.floor(n.count / 200))) {
        const l = Math.hypot(n.getX(i), n.getY(i), n.getZ(i))
        assert.ok(Math.abs(l - 1) < 1e-3, `${m.name}: normal no unitaria (${l})`)
      }
    }
    assert.ok(geo.attributes.color, `${m.name}: color por vértice`)
  }
  // envolvente del bloque (en coordenadas locales de bloque_viajero): ≈ placas 0,9 × 1,1 m del modelo anterior
  const box = new THREE.Box3().setFromObject(g.getObjectByName('bloque'))
  box.min.sub(blk.position)
  box.max.sub(blk.position)
  assert.ok(box.max.x - box.min.x < 1.0 && box.max.x - box.min.x > 0.85, `ancho del bloque ${box.max.x - box.min.x}`)
  assert.ok(box.max.z - box.min.z < 0.9, `espesor del bloque ${box.max.z - box.min.z}`)
  assert.ok(box.max.y < 0.8 && box.min.y > -0.9, 'alto del bloque (con la parte fija del giratorio) dentro de la envolvente anterior')
  // el elevador de tubing sigue en su cota del modelo original (y = −3,04) y con el diámetro del original (≈ 0,60 m)
  const eb = new THREE.Box3().setFromObject(g.getObjectByName('elevador'))
  eb.min.sub(blk.position)
  eb.max.sub(blk.position)
  assert.ok(eb.min.y < -3.04 && eb.max.y > -3.04)
  assert.ok(Math.abs(eb.max.z - eb.min.z - 1.0) < 0.2, 'ancho del elevador con las orejas de las amelas')
  // el elevador de varillas apoya sobre el piso de trabajo (2,34 m) y es pequeño (< 0,6 m)
  const rb = new THREE.Box3().setFromObject(g.getObjectByName('elevador_varillas'))
  assert.ok(Math.abs(rb.min.y - 2.34) < 1e-6)
  assert.ok(rb.max.x - rb.min.x < 0.6 && rb.max.z - rb.min.z < 0.6 && rb.max.y - rb.min.y < 0.6)
})

test('los ojos de las amelas cuelgan del pasador del gancho y el ojo inferior abraza el pasador del elevador', () => {
  const { g } = buildAparejo()
  const blk = g.getObjectByName('bloque_viajero')
  const al = new THREE.Box3().setFromObject(g.getObjectByName('amelas'))
  const hook = new THREE.Box3().setFromObject(g.getObjectByName('gancho'))
  const el = new THREE.Box3().setFromObject(g.getObjectByName('elevador'))
  const y = (b, k) => b[k].y - blk.position.y
  // pasador del gancho en y = −1,625 (dentro del ojo superior) y del elevador en y = −2,90 (dentro del ojo inferior)
  assert.ok(y(al, 'max') > -1.625 && y(hook, 'min') < -1.625)
  assert.ok(y(al, 'min') < -2.9 && y(el, 'max') > -2.9)
  // las amelas están por fuera del gancho en Z (±0,36) y separadas entre sí
  assert.ok(al.max.z > 0.36 && al.min.z < -0.36)
})
