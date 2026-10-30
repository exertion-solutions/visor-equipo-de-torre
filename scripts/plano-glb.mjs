// Planos ortogonales del carrier del Equipo 10 con el mástil abatido, generados a partir de los GLB del visor.
//
// Uso: node scripts/plano-glb.mjs [--eps 0] [--luz 0.10] [--out docs/planos] [--png]
//
// Lee public/models/rig10/sk575_{carrier,cuadro,mastil,izaje}.glb, pone el mástil y los cilindros de izaje en la pose abatida
// transformando su geometría (el modelo está armado), proyecta lateral / planta / frontal con eliminación de líneas ocultas (z-buffer
// de los triángulos) y dibuja las aristas de rasgo horneadas en cada GLB. Las cotas se miden sobre esa geometría.
// Marco del modelo: 1 u = 1 m, Y arriba, +X hacia el mástil, carrier hacia −X, Z lateral (lado conductor = +Z).
// NO es as-built ni apto para fabricación; la pose abatida no está documentada (ver las notas de la hoja).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'

const root = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const opt = (k, d) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d)
const EPS = Number(opt('eps', 0)) // elevación del mástil sobre la horizontal (°)
const LUZ = Number(opt('luz', 0.1)) // cara inferior del mástil sobre el techo de cabina/capot (m)
const OUT = path.resolve(root, opt('out', 'docs/planos'))
const R = 250 // px/m del z-buffer
const IN = 0.0254

// Datos documentados (reference/v2-previo/src/technical-spec.js, RIG_10.sk575) usados solo como comparación.
const DOC = {
  roadH: 4.2926,
  roadW: 2.8956,
  roadL: 20.7264,
  deckW: 102 * IN,
  cabRoof: 114 * IN,
  frame: 12.192,
}
const MX = -1.0 // pivote del mástil armado (modelo)
const ZB = 48 * IN
const LEAN = (3.5 * Math.PI) / 180

await MeshoptDecoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })

// ── lectura de los GLB ──────────────────────────────────────────────────────────────────────────────────────────────────
/** parts: [{ tag, tris: Float32Array (9 por triángulo, mundo), lines: Float32Array (6 por segmento, mundo) }] */
async function collect(file, { skip = () => false, tagOf }) {
  const doc = await io.read(path.join(root, 'public/models/rig10', file))
  const out = []
  const v = [0, 0, 0]
  const visit = (node) => {
    const mesh = node.getMesh()
    const name = node.getName()
    if (mesh && !skip(name)) {
      const m = node.getWorldMatrix()
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION')
        const n = pos.getCount()
        const w = new Float32Array(n * 3)
        for (let i = 0; i < n; i++) {
          pos.getElement(i, v)
          w[3 * i] = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12]
          w[3 * i + 1] = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13]
          w[3 * i + 2] = m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]
        }
        const idx = prim.getIndices()
        const cnt = idx ? idx.getCount() : n
        const ix = (i) => (idx ? idx.getScalar(i) : i)
        const mode = prim.getMode()
        if (mode === 4) {
          const t = new Float32Array(cnt * 3)
          for (let i = 0; i < cnt; i++) {
            const k = ix(i) * 3
            t[3 * i] = w[k]
            t[3 * i + 1] = w[k + 1]
            t[3 * i + 2] = w[k + 2]
          }
          out.push({ tag: tagOf(name), tris: t, lines: new Float32Array(0) })
        } else if (mode === 1) {
          const l = new Float32Array(cnt * 3)
          for (let i = 0; i < cnt; i++) {
            const k = ix(i) * 3
            l[3 * i] = w[k]
            l[3 * i + 1] = w[k + 1]
            l[3 * i + 2] = w[k + 2]
          }
          out.push({ tag: tagOf(name), tris: new Float32Array(0), lines: l })
        }
      }
    }
    node.listChildren().forEach(visit)
  }
  doc.getRoot().listScenes()[0].listChildren().forEach(visit)
  return out
}

const carrier = await collect('sk575_carrier.glb', {
  skip: (n) => n.includes('casilla'), // casilla del maquinista: posición C, sin dato en transporte
  tagOf: (n) => (n.includes('cabina') ? 'cabina' : n.includes('motor') ? 'motor' : 'carrier'),
})
const cuadro = await collect('sk575_cuadro.glb', {
  skip: (n) => n.endsWith('_cable'),
  tagOf: () => 'cuadro',
})
for (const p of cuadro) {
  // las aristas del cuadro incluyen los cables hasta la corona (mástil armado): se descartan los segmentos altos
  const keep = []
  for (let i = 0; i < p.lines.length; i += 6) {
    if (p.lines[i + 1] < 3.2 && p.lines[i + 4] < 3.2) keep.push(...p.lines.slice(i, i + 6))
  }
  if (p.lines.length) p.lines = Float32Array.from(keep)
}
const mast = await collect('sk575_mastil.glb', {
  skip: (n) => n.includes('enganche'),
  tagOf: () => 'mast',
})
const izaje = await collect('sk575_izaje.glb', {
  tagOf: (n) => {
    const m = n.match(/cil(\d)_(camisa|etapa1|etapa2|vastago)/)
    if (m) return `cil${m[1]}.${m[2]}`
    return n.includes('orejas_mastil') ? 'mast' : 'carrier'
  },
})
const meta = JSON.parse(
  fs.readFileSync(path.join(root, 'public/models/rig10/sk575_izaje.meta.json'), 'utf8'),
)

// ── utilidades de geometría ─────────────────────────────────────────────────────────────────────────────────────────────
const all = () => [...carrier, ...cuadro, ...mast, ...izaje]
function apply(parts, f) {
  const p = [0, 0, 0]
  for (const part of parts) {
    for (const arr of [part.tris, part.lines]) {
      for (let i = 0; i < arr.length; i += 3) {
        f([arr[i], arr[i + 1], arr[i + 2]], p)
        arr[i] = p[0]
        arr[i + 1] = p[1]
        arr[i + 2] = p[2]
      }
    }
  }
}
function bbox(parts, filter = () => true) {
  const b = { x: [Infinity, -Infinity], y: [Infinity, -Infinity], z: [Infinity, -Infinity] }
  for (const part of parts) {
    for (const arr of [part.tris, part.lines]) {
      for (let i = 0; i < arr.length; i += 3) {
        if (!filter(arr[i], arr[i + 1], arr[i + 2])) continue
        for (const [k, j] of [
          ['x', 0],
          ['y', 1],
          ['z', 2],
        ]) {
          b[k][0] = Math.min(b[k][0], arr[i + j])
          b[k][1] = Math.max(b[k][1], arr[i + j])
        }
      }
    }
  }
  return b
}
const rotZ = (c, th) => {
  const cs = Math.cos(th)
  const sn = Math.sin(th)
  return (v, o) => {
    const dx = v[0] - c[0]
    const dy = v[1] - c[1]
    o[0] = c[0] + dx * cs - dy * sn
    o[1] = c[1] + dx * sn + dy * cs
    o[2] = v[2]
  }
}

// ── pose abatida ────────────────────────────────────────────────────────────────────────────────────────────────────────
// El mástil armado apunta (sen 3,5°, cos 3,5°) sobre el pivote (MX, ZB). Se gira hasta apuntar hacia −X con elevación EPS y se sube
// lo necesario para que su cara inferior quede LUZ sobre el techo medido del carrier (cabina y capot).
// Telescopado: el GLB trae el mástil extendido (tramo 1 = 16,4 m, tramo 2 = 15,2992 m con 1 m de solape y corona). Se separa el 2.º tramo
// por componentes conectados de la malla y por su altura en el marco del mástil, y se lo desliza hacia adentro hasta que su tope
// queda a ras del tramo 1 (embutido total: supuesto C; el visor V2 deja 1,3 m asomando).
const H_INF = 16.4
const H_TOT = 31.6992
const zMast = (x, y) => (x - MX) * Math.sin(LEAN) + (y - ZB) * Math.cos(LEAN) + ZB // altura sobre el eje del mástil armado
function telescope(parts) {
  const key = (a, i) =>
    `${Math.round(a[i] * 1e4)},${Math.round(a[i + 1] * 1e4)},${Math.round(a[i + 2] * 1e4)}`
  const parent = new Map()
  const find = (k) => {
    let r = k
    while (parent.get(r) !== r) r = parent.get(r)
    while (parent.get(k) !== r) {
      const n = parent.get(k)
      parent.set(k, r)
      k = n
    }
    return r
  }
  const union = (a, b) => {
    for (const k of [a, b]) if (!parent.has(k)) parent.set(k, k)
    parent.set(find(a), find(b))
  }
  for (const part of parts) {
    const a = part.tris
    for (let i = 0; i < a.length; i += 9) {
      union(key(a, i), key(a, i + 3))
      union(key(a, i + 3), key(a, i + 6))
    }
  }
  const zmax = new Map()
  for (const part of parts) {
    const a = part.tris
    for (let i = 0; i < a.length; i += 3) {
      const r = find(key(a, i))
      zmax.set(r, Math.max(zmax.get(r) ?? -Infinity, zMast(a[i], a[i + 1])))
    }
  }
  const dS = H_TOT - H_INF
  const dx = -dS * Math.sin(LEAN)
  const dy = -dS * Math.cos(LEAN)
  let moved = 0
  let kept = 0
  for (const part of parts) {
    const a = part.tris
    for (let i = 0; i < a.length; i += 9) {
      if (zmax.get(find(key(a, i))) > 17.1) {
        for (let j = 0; j < 9; j += 3) {
          a[i + j] += dx
          a[i + j + 1] += dy
        }
        moved++
      } else kept++
    }
    const l = part.lines
    for (let i = 0; i < l.length; i += 6) {
      const z1 = zMast(l[i], l[i + 1])
      const z2 = zMast(l[i + 3], l[i + 4])
      if (Math.max(z1, z2) > 17.1 || Math.min(z1, z2) > 16.7) {
        for (let j = 0; j < 6; j += 3) {
          l[i + j] += dx
          l[i + j + 1] += dy
        }
      }
    }
  }
  return { moved, kept }
}
telescope(mast)

const hinge = [MX, ZB]
const theta = Math.PI / 2 + LEAN - (EPS * Math.PI) / 180
const rot = rotZ(hinge, theta)
const mastParts = [
  ...mast.filter((p) => p.tag === 'mast'),
  ...izaje.filter((p) => p.tag === 'mast'),
]
apply(mastParts, rot)
const cabX = (x) => (x >= -14.2 && x <= -12.6) || (x >= -12.1 && x <= -10.2)
const roofY = Math.max(
  bbox(carrier.filter((p) => p.tag === 'cabina')).y[1],
  bbox(
    carrier.filter((p) => p.tag === 'motor'),
    (x, y) => y < 3.1,
  ).y[1],
)
const mastLow = bbox(mast, (x) => cabX(x)).y[0]
const lift = roofY + LUZ - mastLow
apply(mastParts, (v, o) => {
  o[0] = v[0]
  o[1] = v[1] + lift
  o[2] = v[2]
})
const mastT = (v) => {
  const o = [0, 0, 0]
  rot(v, o)
  o[1] += lift
  return o
}

// cilindros de izaje: regla de animación del meta (camisa gira sobre el pie; etapas se reparten la carrera)
const cylReport = []
for (const c of meta.cilindros.lista) {
  const n = c.id.replace('cil', '')
  const P = c.pivote_carrier
  const pin = mastT(c.empuje_mastil)
  const dx = pin[0] - P[0]
  const dy = pin[1] - P[1]
  const L = Math.hypot(dx, dy)
  const u1 = [dx / L, dy / L]
  const a0 = Math.atan2(c.eje_unitario[1], c.eje_unitario[0])
  const alpha = Math.atan2(u1[1], u1[0]) - a0
  const e = L - c.largo_cerrado_m
  const exts = []
  let acc = 0
  for (const s of c.carrera_etapas_m) {
    const ext = Math.max(0, Math.min(s, e - acc))
    exts.push(ext)
    acc += s
  }
  const rotAbout = (o) => rotZ([o[0], o[1]], alpha)
  apply(
    izaje.filter((p) => p.tag === `cil${n}.camisa`),
    rotAbout(P),
  )
  c.carrera_etapas_m.forEach((_, k) => {
    const back = c.carrera_etapas_m.slice(0, k + 1).reduce((s, v, j) => s + (v - exts[j]), 0)
    const Onew = [
      P[0] + u1[0] * (c.largo_extendido_m - back),
      P[1] + u1[1] * (c.largo_extendido_m - back),
    ]
    const r = rotZ([c.empuje_mastil[0], c.empuje_mastil[1]], alpha)
    apply(
      izaje.filter((p) => p.tag === `cil${n}.${['etapa1', 'etapa2', 'vastago'][k]}`),
      (v, o) => {
        r(v, o)
        o[0] += Onew[0] - c.empuje_mastil[0]
        o[1] += Onew[1] - c.empuje_mastil[1]
      },
    )
  })
  cylReport.push({
    id: c.id,
    L,
    cerrado: c.largo_cerrado_m,
    extendido: c.largo_extendido_m,
    imposible: L < c.largo_cerrado_m - 1e-3,
  })
}

// ── medidas sobre la geometría ──────────────────────────────────────────────────────────────────────────────────────────
const bAll = bbox(all())
const bCarrier = bbox([...carrier, ...cuadro])
const bDeck = bbox(
  carrier.filter((p) => p.tag === 'carrier'),
  (x, y, z) => y > 1.3 && y < 1.35 && Math.abs(z) < 1.4,
)
const bCab = bbox(carrier.filter((p) => p.tag === 'cabina'))
const bHood = bbox(
  carrier.filter((p) => p.tag === 'motor'),
  (x, y) => y < 3.1,
)
const bMast = bbox(mast.filter((p) => p.tag === 'mast'))
const bStack = bbox(
  carrier.filter((p) => p.tag === 'motor'),
  (x, y) => y > 3.1,
)
const mastDepthAt = (x) => {
  const b = bbox(mast, (xx) => Math.abs(xx - x) < 0.3)
  return { lo: b.y[0], hi: b.y[1] }
}
const dCab = mastDepthAt(-13)
const dMid = mastDepthAt(-8)
const meas = {
  largoTotal: bAll.x[1] - bAll.x[0],
  anchoTotal: bAll.z[1] - bAll.z[0],
  alturaTotal: bAll.y[1],
  largoCarrier: bCarrier.x[1] - bCarrier.x[0],
  anchoCarrier: bCarrier.z[1] - bCarrier.z[0],
  anchoCubierta: bDeck.z[1] - bDeck.z[0],
  techoCabina: bCab.y[1],
  techoCapot: bHood.y[1],
  escape: bStack.y[1],
  mastilLargo: bMast.x[1] - bMast.x[0],
  mastilTope: bMast.y[1],
  mastilBase: dCab.lo,
  espesorCabina: dCab.hi - dCab.lo,
  espesorMedio: dMid.hi - dMid.lo,
  mastilAncho: bMast.z[1] - bMast.z[0],
  luzEscape: bStack.y[1] > 0 ? dCab.lo - bStack.y[1] : 0,
}

// ── proyección con z-buffer ─────────────────────────────────────────────────────────────────────────────────────────────
// vista: u (derecha de la hoja), v (arriba), d (hacia el observador: mayor = más cerca)
const VIEWS = {
  lateral: { u: [1, 0, 0], v: [0, 1, 0], d: [0, 0, 1] },
  planta: { u: [1, 0, 0], v: [0, 0, -1], d: [0, 1, 0] },
  frontal: { u: [0, 0, 1], v: [0, 1, 0], d: [-1, 0, 0] },
}
const dot = (a, b, o = 0) => a[0] * b[o] + a[1] * b[o + 1] + a[2] * b[o + 2]

function project(viewName) {
  const V = VIEWS[viewName]
  const pts = (arr, o) => [dot(V.u, arr, o), dot(V.v, arr, o), dot(V.d, arr, o)]
  let umin = Infinity
  let umax = -Infinity
  let vmin = Infinity
  let vmax = -Infinity
  for (const part of all()) {
    for (const arr of [part.tris, part.lines]) {
      for (let i = 0; i < arr.length; i += 3) {
        const [u, v] = pts(arr, i)
        umin = Math.min(umin, u)
        umax = Math.max(umax, u)
        vmin = Math.min(vmin, v)
        vmax = Math.max(vmax, v)
      }
    }
  }
  const W = Math.ceil((umax - umin) * R) + 4
  const H = Math.ceil((vmax - vmin) * R) + 4
  const z = new Float32Array(W * H).fill(-1e9)
  const px = (u) => (u - umin) * R + 2
  const py = (v) => (vmax - v) * R + 2
  for (const part of all()) {
    const t = part.tris
    for (let i = 0; i < t.length; i += 9) {
      const a = pts(t, i)
      const b = pts(t, i + 3)
      const c = pts(t, i + 6)
      const ax = px(a[0])
      const ay = py(a[1])
      const bx = px(b[0])
      const by = py(b[1])
      const cx = px(c[0])
      const cy = py(c[1])
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
      if (Math.abs(den) < 1e-9) continue
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)))
      const x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)))
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy)))
      const y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)))
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const l1 = ((by - cy) * (x + 0.5 - cx) + (cx - bx) * (y + 0.5 - cy)) / den
          const l2 = ((cy - ay) * (x + 0.5 - cx) + (ax - cx) * (y + 0.5 - cy)) / den
          const l3 = 1 - l1 - l2
          if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02) continue
          const d = l1 * a[2] + l2 * b[2] + l3 * c[2]
          const k = y * W + x
          if (d > z[k]) z[k] = d
        }
      }
    }
  }
  // contornos: borde entre objeto y fondo, o salto de profundidad > 0,25 m (siluetas de superficies redondeadas, sin arista de rasgo)
  const THR = 0.25
  const BG = -1e8
  const segs = []
  const jump = (a, b) => a > BG !== b > BG || (a > BG && Math.abs(a - b) > THR)
  for (let y = 1; y < H; y++) {
    let x0 = -1
    for (let x = 0; x <= W; x++) {
      const on = x < W && jump(z[(y - 1) * W + x], z[y * W + x])
      if (on && x0 < 0) x0 = x
      else if (!on && x0 >= 0) {
        if (x - x0 >= 2) segs.push([x0, y, x, y])
        x0 = -1
      }
    }
  }
  for (let x = 1; x < W; x++) {
    let y0 = -1
    for (let y = 0; y <= H; y++) {
      const on = y < H && jump(z[y * W + x - 1], z[y * W + x])
      if (on && y0 < 0) y0 = y
      else if (!on && y0 >= 0) {
        if (y - y0 >= 2) segs.push([x, y0, x, y])
        y0 = -1
      }
    }
  }
  // aristas de rasgo: se muestrean cada ~1,5 px y se conservan los tramos con profundidad ≥ buffer − tolerancia
  const TOL = 0.04
  for (const part of all()) {
    const l = part.lines
    for (let i = 0; i < l.length; i += 6) {
      const a = pts(l, i)
      const b = pts(l, i + 3)
      const ax = px(a[0])
      const ay = py(a[1])
      const bx = px(b[0])
      const by = py(b[1])
      const len = Math.hypot(bx - ax, by - ay)
      const n = Math.max(1, Math.ceil(len / 1.5))
      let run = null
      for (let s = 0; s <= n; s++) {
        const t = s / n
        const x = ax + (bx - ax) * t
        const y = ay + (by - ay) * t
        const d = a[2] + (b[2] - a[2]) * t
        const xi = Math.min(W - 1, Math.max(0, Math.floor(x)))
        const yi = Math.min(H - 1, Math.max(0, Math.floor(y)))
        const vis = d >= z[yi * W + xi] - TOL
        if (vis) {
          if (!run) run = [x, y, x, y]
          else {
            run[2] = x
            run[3] = y
          }
        } else if (run) {
          segs.push(run)
          run = null
        }
      }
      if (run) segs.push(run)
    }
  }
  return { segs, umin, umax, vmin, vmax, px, py, W, H }
}

// ── hoja ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const K = 1000 / 60 // mm por m (1:60)
const f = (n, d = 2) => n.toFixed(d).replace('.', ',')
const out = []
const add = (s) => out.push(s)
const line = (x1, y1, x2, y2, w = 0.2, c = '#111', dash) =>
  add(
    `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`,
  )
const text = (x, y, t, size = 2.6, anchor = 'start', c = '#111', weight = 'normal') =>
  add(
    `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${size}" text-anchor="${anchor}" fill="${c}" font-weight="${weight}">${String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`,
  )
const ORG = '#d35400'
const RED = '#b00020'

function drawView(name, ox, oy, uOrigin, vOrigin) {
  // (ox, oy) = posición en la hoja (mm) del punto (uOrigin, vOrigin) del modelo
  const p = project(name)
  const sx = (u) => ox + (u - uOrigin) * K
  const sy = (v) => oy - (v - vOrigin) * K
  const mm = (px, py) => [
    ox + ((px - 2) / R + p.umin - uOrigin) * K,
    oy - (p.vmax - (py - 2) / R - vOrigin) * K,
  ]
  let d = ''
  for (const s of p.segs) {
    const [x1, y1] = mm(s[0], s[1])
    const [x2, y2] = mm(s[2], s[3])
    if (Math.hypot(x2 - x1, y2 - y1) < 0.08) continue
    d += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`
  }
  add(`<path d="${d}" fill="none" stroke="#111" stroke-width="0.16" stroke-linecap="round"/>`)
  return { sx, sy, p, count: p.segs.length }
}

function hdim(x0, x1, y, label, c = '#111') {
  line(x0, y, x1, y, 0.2, c)
  for (const x of [x0, x1]) line(x, y - 1.4, x, y + 1.4, 0.2, c)
  text((x0 + x1) / 2, y - 1.2, label, 2.3, 'middle', c)
}
function vdim(x, y0, y1, label, left = false, c = '#111') {
  line(x, y0, x, y1, 0.2, c)
  for (const y of [y0, y1]) line(x - 1.4, y, x + 1.4, y, 0.2, c)
  text(x + (left ? -1.8 : 1.8), (y0 + y1) / 2 + 0.8, label, 2.3, left ? 'end' : 'start', c)
}
const ext = (x1, y1, x2, y2) => line(x1, y1, x2, y2, 0.12, '#777', '1 1')

add(`<rect x="5" y="5" width="410" height="287" fill="none" stroke="#111" stroke-width="0.5"/>`)
text(
  12,
  14,
  'DIGITAL RIG · Equipo 10 (SK-575) · Carrier con mástil abatido · planos ortogonales del modelo del visor',
  4,
  'start',
  '#111',
  'bold',
)
text(
  12,
  19.5,
  `Geometría de los GLB del visor (aristas de rasgo, líneas ocultas eliminadas). NO es as-built ni apto para fabricación. Pose abatida sin dato: ε = ${f(EPS, 1)}°, luz ${f(LUZ)} m sobre cabina/capot.`,
  2.4,
  'start',
  ORG,
)

// lateral: el origen del hoja X0 deja el extremo izquierdo de la vista a 22 mm del borde
const GY = 112
const latOx = 22 - (bAll.x[0] - 0) * K
text(
  12,
  27,
  'VISTA LATERAL (lado conductor)  ·  1:60  ·  cotas en m, medidas sobre el modelo',
  3,
  'start',
  '#111',
  'bold',
)
const lat = drawView('lateral', latOx, GY, 0, 0)
line(lat.sx(bAll.x[0]) - 5, lat.sy(0), lat.sx(bAll.x[1]) + 5, lat.sy(0), 0.5)
// cotas lateral
const yb = lat.sy(0) + 7
hdim(lat.sx(bAll.x[0]), lat.sx(bAll.x[1]), yb + 8, `largo total del conjunto ${f(meas.largoTotal)}`)
hdim(
  lat.sx(bCarrier.x[0]),
  lat.sx(bCarrier.x[1]),
  yb,
  `carrier (paragolpes a trasero) ${f(meas.largoCarrier)}`,
)
for (const x of [bAll.x[0], bAll.x[1]]) ext(lat.sx(x), lat.sy(0), lat.sx(x), yb + 8)
for (const x of [bCarrier.x[0], bCarrier.x[1]]) ext(lat.sx(x), lat.sy(0), lat.sx(x), yb)
const xr = lat.sx(bAll.x[1]) + 12
vdim(xr, lat.sy(0), lat.sy(bAll.y[1]), `altura total ${f(meas.alturaTotal)}`)
ext(lat.sx(bAll.x[1]), lat.sy(bAll.y[1]), xr, lat.sy(bAll.y[1]))
vdim(xr + 22, lat.sy(0), lat.sy(meas.techoCabina), `techo de cabina ${f(meas.techoCabina)}`)
ext(lat.sx(bCab.x[1]), lat.sy(meas.techoCabina), xr + 22, lat.sy(meas.techoCabina))
const xl = lat.sx(bAll.x[0]) + 6
vdim(
  xl,
  lat.sy(0),
  lat.sy(meas.mastilBase),
  `cara inferior del mástil ${f(meas.mastilBase)}`,
  false,
  ORG,
)
if (meas.escape > 0)
  text(lat.sx(bStack.x[1]) + 2, lat.sy(meas.escape) - 1.5, `escape ${f(meas.escape)}`, 2.2)

// planta (+Z abajo = lado conductor)
const PY = 162
const plaOx = latOx
text(12, 130, 'PLANTA  ·  1:60', 3, 'start', '#111', 'bold')
const pla = drawView('planta', plaOx, PY, 0, 0)
const zBot = pla.sy(-bAll.z[0])
const xRear = pla.sx(bAll.x[1]) + 10
vdim(
  xRear,
  pla.sy(-bCarrier.z[1]),
  pla.sy(-bCarrier.z[0]),
  `ancho del carrier ${f(meas.anchoCarrier)}`,
)
hdim(pla.sx(bMast.x[0]), pla.sx(bMast.x[1]), zBot + 6, `mástil abatido ${f(meas.mastilLargo)}`, ORG)

// frontal (desde la cabina, +Z a la derecha)
const FY = 283
const froOx = 60
text(
  135,
  204,
  'VISTA FRONTAL (desde la cabina, lado conductor a la derecha)  ·  1:60',
  3,
  'start',
  '#111',
  'bold',
)
const fro = drawView('frontal', froOx, FY, 0, 0)
line(fro.sx(bAll.z[0]) - 6, fro.sy(0), fro.sx(bAll.z[1]) + 6, fro.sy(0), 0.5)
hdim(fro.sx(bAll.z[0]), fro.sx(bAll.z[1]), fro.sy(0) + 5, `ancho ${f(meas.anchoTotal)}`)
vdim(fro.sx(bAll.z[1]) + 8, fro.sy(0), fro.sy(bAll.y[1]), `altura ${f(meas.alturaTotal)}`)
line(
  fro.sx(bAll.z[0]) - 6,
  fro.sy(DOC.roadH),
  fro.sx(bAll.z[1]) + 6,
  fro.sy(DOC.roadH),
  0.2,
  '#0a58ca',
  '3 1.5',
)
text(
  fro.sx(bAll.z[1]) + 9,
  fro.sy(DOC.roadH) - 1,
  `ruta ${f(DOC.roadH, 4)} (A)`,
  2.1,
  'start',
  '#0a58ca',
)

// cuadro de medidas
const cx0 = 135
const cy0 = 214
text(cx0, cy0, 'MEDIDO SOBRE EL MODELO  vs  DOCUMENTADO', 3, 'start', '#111', 'bold')
const rows = [
  [
    'Altura total del conjunto',
    meas.alturaTotal,
    DOC.roadH,
    'A, altura de ruta',
    meas.alturaTotal > DOC.roadH + 0.02,
  ],
  [
    'Ancho de la cubierta',
    meas.anchoCubierta,
    DOC.deckW,
    'A, 102″ (bastidor)',
    Math.abs(meas.anchoCubierta - DOC.deckW) > 0.1,
  ],
  [
    'Ancho total (con escalera/pasarelas)',
    meas.anchoTotal,
    DOC.roadW,
    'A, ancho de ruta',
    meas.anchoTotal > DOC.roadW + 0.02,
  ],
  [
    'Largo total del conjunto',
    meas.largoTotal,
    DOC.roadL,
    'A, largo de ruta (no definido en esta pose)',
    false,
  ],
  [
    'Techo de cabina',
    meas.techoCabina,
    DOC.cabRoof,
    'B, 114″',
    Math.abs(meas.techoCabina - DOC.cabRoof) > 0.1,
  ],
]
text(cx0, cy0 + 5, 'magnitud', 2.2, 'start', '#555')
text(cx0 + 52, cy0 + 5, 'modelo', 2.2, 'end', '#555')
text(cx0 + 72, cy0 + 5, 'doc.', 2.2, 'end', '#555')
text(cx0 + 76, cy0 + 5, 'fuente', 2.2, 'start', '#555')
rows.forEach((r, i) => {
  const y = cy0 + 9.5 + i * 4.2
  const c = r[4] ? RED : '#111'
  text(cx0, y, r[0], 2.4, 'start', c)
  text(cx0 + 52, y, f(r[1]), 2.4, 'end', c)
  text(cx0 + 72, y, f(r[2], 3), 2.4, 'end', c)
  text(cx0 + 76, y, r[3] + (r[4] ? ' · NO COINCIDE' : ''), 2.2, 'start', c)
})
const y1 = cy0 + 9.5 + rows.length * 4.2 + 2
text(
  cx0,
  y1,
  `Mástil abatido (modelo): largo ${f(meas.mastilLargo)} · espesor ${f(meas.espesorCabina)} · ancho ${f(meas.mastilAncho)}`,
  2.3,
  'start',
  ORG,
)
cylReport.forEach((c, i) =>
  text(
    cx0,
    y1 + 4.2 * (i + 1),
    `Cilindro de izaje ${i + 1}: entre pernos ${f(c.L, 3)} m${c.imposible ? ` < cerrado ${f(c.cerrado, 3)} m (A): pivotes C incompatibles` : ` (cerrado ${f(c.cerrado, 3)} · extendido ${f(c.extendido, 3)} A)`}`,
    2.3,
    'start',
    c.imposible ? RED : '#111',
  ),
)
const y2 = y1 + 4.2 * (cylReport.length + 1)
text(
  cx0,
  y2,
  `Escape (modelo) a ${f(meas.escape)} m: ${meas.escape > meas.mastilBase ? `INTERFIERE con el mástil (cara inferior a ${f(meas.mastilBase)} m)` : 'libra'}`,
  2.3,
  'start',
  meas.escape > meas.mastilBase ? RED : '#111',
)

const nx = 275
text(nx, 205, 'NOTAS', 3, 'start', '#111', 'bold')
const notes = [
  'Fuente: GLB publicados del visor (carrier, cuadro de maniobras,',
  'mástil, cilindros de izaje); 1 u = 1 m. Las cotas se miden sobre esa',
  'geometría: no se dibujó ninguna forma a mano.',
  'El modelo está armado: el mástil y los cilindros se transformaron',
  'a la pose abatida (giro sobre el pivote y regla de carrera del meta).',
  'Pose abatida sin dato documentado: horizontal según fotos de',
  'referencia; luz y ángulo son parámetros (C). El espesor del mástil',
  'del modelo (1,9 m) es mayor que el de las fotos (≈ 1,25 m).',
  'Sin casilla, piso de enganche, aparejo ni cables (sin dato de pose).',
  'Líneas = aristas de rasgo del modelo: no son un plano de taller.',
]
notes.forEach((t, i) => text(nx, 210 + i * 3.8, t, 2.2))
add(`<rect x="275" y="258" width="135" height="30" fill="none" stroke="#111" stroke-width="0.4"/>`)
text(278, 264, 'Equipo 10 · carrier con mástil abatido', 3, 'start', '#111', 'bold')
text(278, 269, 'Hoja A3 · 1:60 · vistas lateral, planta y frontal', 2.3)
text(278, 273.5, `generado: scripts/plano-glb.mjs --eps ${EPS} --luz ${LUZ}`, 2.1)
text(
  278,
  278,
  `trazos visibles: lateral ${lat.count} · planta ${pla.count} · frontal ${fro.count}`,
  2.1,
  'start',
  '#555',
)
text(278, 283.5, 'Estado: borrador de referencia · pose pendiente de validación', 2.3, 'start', ORG)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297" font-family="Arial, Helvetica, sans-serif"><rect width="420" height="297" fill="#fff"/>${out.join('')}</svg>`
fs.mkdirSync(OUT, { recursive: true })
const svgPath = path.join(OUT, 'equipo10-carrier-mastil-abatido.svg')
fs.writeFileSync(svgPath, svg)
console.log(
  JSON.stringify(
    {
      eps: EPS,
      luz: LUZ,
      lift: +lift.toFixed(3),
      roofY: +roofY.toFixed(3),
      ...Object.fromEntries(Object.entries(meas).map(([k, v]) => [k, +v.toFixed(3)])),
      cilindros: cylReport.map((c) => ({ ...c, L: +c.L.toFixed(3) })),
    },
    null,
    1,
  ),
)
console.log('→', svgPath, (svg.length / 1e6).toFixed(2), 'MB')

if (args.includes('--png')) {
  const { chromium } = createRequire(import.meta.url)('playwright')
  const b = await chromium.launch()
  const pg = await b.newPage({ viewport: { width: 1587, height: 1123 }, deviceScaleFactor: 2 })
  await pg.goto(`file://${svgPath}`)
  await pg.screenshot({ path: svgPath.replace(/\.svg$/, '.png') })
  await b.close()
  console.log('→', svgPath.replace(/\.svg$/, '.png'))
}
