/*
 * 41-aparejo.js · Equipo 10 · componente 04 `aparejo` (bloque viajero, gancho, amelas y elevadores).
 *
 * Lo invoca `wrapAparejo` (40-wellsite.js) justo después de que el visor construye su aparejo original:
 *   window.__rigAparejo.build(g, api, { K, Batch, dropsGroup })
 * Conserva las 6 líneas animadas del visor (`ramal_visual`, estado interno `Lh`) y el grupo `bloque_viajero` (`wh`, lo mueve el deslizador
 * `#hoist` / `#c-play`): todo lo que cuelga del bloque es HIJO de `bloque_viajero`, así sigue la animación. Reemplaza las placas, poleas, vástago,
 * gancho, amelas y elevador por versiones con más detalle y agrega un elevador de varillas (sucker rod) fuera del aparejo animado.
 *
 * Jerarquía (nombres estables):
 *   aparejo/bloque_viajero/drops_BP-3/bloque   carcasa, poleas, eje, guardas, placa de datos (decal en 40-wellsite.js) · bloque_viajero_pintura/_acero
 *   aparejo/bloque_viajero/drops_BP-3/gancho   giratorio (swivel), vástago, gancho forjado, pasadores · gancho_pintura/_acero
 *                                              └ pestillo (Object3D con pivote) · pestillo_acero
 *   aparejo/bloque_viajero/amelas              par de eslabones (bails) con ojo superior e inferior · amelas_pintura
 *   aparejo/bloque_viajero/elevador            elevador de tubing articulado · elevador_tubing_pintura/_acero
 *                                              └ puerta (Object3D con pivote en la bisagra) · elevador_puerta_pintura/_acero
 *   aparejo/elevador_varillas                  elevador de varillas (sucker rod), apoyado en el piso · elevador_varillas_pintura/_acero
 *
 * Técnica: geometría FUSIONADA por material (`Batch` → `flush`) con primitivas propias sobre BufferGeometry (extrusión con bisel, anillo,
 * revolución), porque el visor es un HTML autocontenido y no expone Lathe/Extrude. 1 u = 1 m · +X = boca del gancho · Z = ancho del bloque.
 *
 * ESTADO DE LOS DATOS (detalle en docs/references/bloque-viajero-elevadores/README.md):
 *   confirmado  · aparejo IDECO 110 t con 6 líneas, amelas BJ 150 t, elevador BJ 100 t (folleto Equipo 10 rev. 26/06/2024).
 *   aproximado  · toda la forma y las cotas (envolvente = tamaños del modelo anterior: placas 0,9 × 1,1 m, poleas r≈0,36 m, amelas ≈1,26 m entre
 *                 pasadores, elevador Ø0,60 m). Las fotos de referencia son unidades GENÉRICAS de catálogo: sirven de tipología, no de cota.
 *   pendiente   · color real, tipo/modelo del elevador y de las amelas, existencia y posición del elevador de varillas, dimensiones as-built.
 * Las capacidades pertenecen a cada componente y no se suman. Ninguna capacidad de las fotos (75 t, 42 t…) se transcribe.
 */
;(() => {
  'use strict'

  const PI = Math.PI
  const DEG = PI / 180

  // ───────────────────────────── parámetros configurables ─────────────────────────────
  /**
   * Color de pintura del aparejo: 'YELLOW' (bloque/gancho amarillo, amelas naranja, elevadores rojo/naranja, como las fotos) | 'RED' (todo rojo).
   * PENDIENTE: el color real del equipo no está confirmado.
   */
  const APAREJO_COLOR = 'YELLOW'
  const PAINT = {
    YELLOW: { block: '#F2B632', bail: '#E4702A', elevator: '#B3262B', rod: '#D4571F' },
    RED: { block: '#B3262B', bail: '#B3262B', elevator: '#B3262B', rod: '#B3262B' },
  }[APAREJO_COLOR]
  // acero mecanizado, bronce, negro (constantes LOCALES: no usan la paleta `C` de 40-wellsite.js)
  const STEEL = '#C3CACE'
  const MACH = '#AEB6BC'
  const DARK = '#3A414A'
  const BLACK = '#1B1D22'
  const BRONZE = '#B98A3E'

  /**
   * Elevador de varillas (sucker rod): apoyado de pie sobre el piso de trabajo (cota superior 2,34 m), en la esquina −X/−Z, lejos de la llave, del
   * poste de retenida y de la boca de pozo. UBICACIÓN PENDIENTE: no hay dato de dónde se estiba en el equipo 10 (ni si el equipo lo usa).
   * `visible: false` lo oculta sin tocar el resto del aparejo.
   */
  const ROD_ELEVATOR = { visible: true, x: -0.85, y: 2.34, z: -0.95, yaw: 0.5 }

  /** Posición de los pivotes (coordenadas locales de `bloque_viajero`). */
  const HOOK = { cy: -1.4, rc: 0.225, pinY: -1.625 } // centro del gancho, radio medio y eje del pasador de amelas (aprox.)
  const LATCH_PIVOT = [0.095, -1.19]
  const ELEV = { y: -3.04, hinge: [-0.305, 0] } // centro del elevador de tubing (el del modelo original) y bisagra (x, z)

  // ───────────────────────────── primitivas de geometría propias ─────────────────────────────
  function createGeo(K) {
    /** Acumulador de vértices/triángulos; `geo()` orienta cada triángulo según sus normales y devuelve un BufferGeometry indexado. */
    class Acc {
      constructor() {
        this.p = []
        this.n = []
        this.i = []
      }
      v(x, y, z, nx, ny, nz) {
        const k = this.p.length / 3
        this.p.push(x, y, z)
        this.n.push(nx, ny, nz)
        return k
      }
      t(a, b, c) {
        this.i.push(a, b, c)
      }
      geo() {
        const { p, n, i } = this
        for (let k = 0; k < i.length; k += 3) {
          const a = i[k] * 3
          const b = i[k + 1] * 3
          const c = i[k + 2] * 3
          const ux = p[b] - p[a]
          const uy = p[b + 1] - p[a + 1]
          const uz = p[b + 2] - p[a + 2]
          const vx = p[c] - p[a]
          const vy = p[c + 1] - p[a + 1]
          const vz = p[c + 2] - p[a + 2]
          const d =
            (uy * vz - uz * vy) * (n[a] + n[b] + n[c]) +
            (uz * vx - ux * vz) * (n[a + 1] + n[b + 1] + n[c + 1]) +
            (ux * vy - uy * vx) * (n[a + 2] + n[b + 2] + n[c + 2])
          if (d < 0) {
            const tmp = i[k + 1]
            i[k + 1] = i[k + 2]
            i[k + 2] = tmp
          }
        }
        const g = new K.BufferGeometry()
        g.setAttribute('position', new K.Attr(new Float32Array(p), 3))
        g.setAttribute('normal', new K.Attr(new Float32Array(n), 3))
        g.setAttribute('uv', new K.Attr(new Float32Array((p.length / 3) * 2), 2))
        g.setIndex(i)
        return g
      }
    }

    const area2 = (pts) => {
      let s = 0
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k]
        const b = pts[(k + 1) % pts.length]
        s += a[0] * b[1] - b[0] * a[1]
      }
      return s
    }
    const ccw = (pts) => (area2(pts) >= 0 ? pts : pts.slice().reverse())

    /** Triangulación por recorte de orejas de un polígono simple ANTIHORARIO → índices. */
    function triangulate(pts) {
      const idx = pts.map((_, k) => k)
      const out = []
      const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
      const inside = (p, a, b, c) =>
        cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0
      let guard = 0
      while (idx.length > 3 && guard++ < 5000) {
        let cut = false
        for (let k = 0; k < idx.length; k++) {
          const ia = idx[(k + idx.length - 1) % idx.length]
          const ib = idx[k]
          const ic = idx[(k + 1) % idx.length]
          const a = pts[ia]
          const b = pts[ib]
          const c = pts[ic]
          if (cross(a, b, c) <= 1e-12) continue
          let ok = true
          for (const j of idx) {
            if (j === ia || j === ib || j === ic) continue
            if (inside(pts[j], a, b, c)) {
              ok = false
              break
            }
          }
          if (!ok) continue
          out.push(ia, ib, ic)
          idx.splice(k, 1)
          cut = true
          break
        }
        if (!cut) break
      }
      for (let k = 1; k + 1 < idx.length; k++) out.push(idx[0], idx[k], idx[k + 1]) // resto (o abanico si quedó degenerado)
      return out
    }

    const unit2 = (x, y) => {
      const l = Math.hypot(x, y) || 1
      return [x / l, y / l]
    }
    const unit3 = (x, y, z) => {
      const l = Math.hypot(x, y, z) || 1
      return [x / l, y / l, z / l]
    }

    /**
     * Pared + biseles de un lazo (polígono ANTIHORARIO). `sgn` = +1 si el material queda adentro (contorno exterior), −1 si queda afuera (agujero).
     * Devuelve el lazo achicado hacia el material (para las tapas).
     */
    function loopSides(A, pts, sgn, h, b) {
      const n = pts.length
      const en = pts.map((p, k) => {
        const q = pts[(k + 1) % n]
        const [ux, uy] = unit2(q[0] - p[0], q[1] - p[1])
        return [uy * sgn, -ux * sgn] // normal saliente del material
      })
      const LIM = 0.75 // ángulo entre caras menor a ~41°: normal suavizada (curvas); mayor: arista viva
      const vn = (k, end) => {
        const e = en[k]
        const o = end === 0 ? en[(k + n - 1) % n] : en[(k + 1) % n]
        if (e[0] * o[0] + e[1] * o[1] > LIM) return unit2(e[0] + o[0], e[1] + o[1])
        return e
      }
      const zt = h - b
      const inset = pts.map((p, k) => {
        const a = en[(k + n - 1) % n]
        const c = en[k]
        const kk = b / Math.max(1 + a[0] * c[0] + a[1] * c[1], 0.5)
        return [p[0] - (a[0] + c[0]) * kk, p[1] - (a[1] + c[1]) * kk]
      })
      for (let k = 0; k < n; k++) {
        const p0 = pts[k]
        const p1 = pts[(k + 1) % n]
        const n0 = vn(k, 0)
        const n1 = vn(k, 1)
        const a = A.v(p0[0], p0[1], -zt, n0[0], n0[1], 0)
        const c = A.v(p1[0], p1[1], -zt, n1[0], n1[1], 0)
        const d = A.v(p1[0], p1[1], zt, n1[0], n1[1], 0)
        const e = A.v(p0[0], p0[1], zt, n0[0], n0[1], 0)
        A.t(a, c, d)
        A.t(a, d, e)
        if (b > 0) {
          const q0 = inset[k]
          const q1 = inset[(k + 1) % n]
          for (const s of [1, -1]) {
            const m0 = unit3(n0[0], n0[1], s)
            const m1 = unit3(n1[0], n1[1], s)
            const w0 = A.v(p0[0], p0[1], s * zt, m0[0], m0[1], m0[2])
            const w1 = A.v(p1[0], p1[1], s * zt, m1[0], m1[1], m1[2])
            const u1 = A.v(q1[0], q1[1], s * h, m1[0], m1[1], m1[2])
            const u0 = A.v(q0[0], q0[1], s * h, m0[0], m0[1], m0[2])
            A.t(w0, w1, u1)
            A.t(w0, u1, u0)
          }
        }
      }
      return inset
    }

    /** Prisma de sección `pts` (polígono simple [[x,y],…]) extruido en Z de −depth/2 a +depth/2, con bisel `bevel` en los bordes. */
    function extrude(ptsIn, depth, bevel = 0) {
      const pts = ccw(ptsIn)
      const h = depth / 2
      const b = Math.min(bevel, h * 0.9)
      const A = new Acc()
      const cap = loopSides(A, pts, 1, h, b)
      const tri = triangulate(b > 0 ? cap : pts)
      for (const s of [1, -1]) {
        const base = (b > 0 ? cap : pts).map((q) => A.v(q[0], q[1], s * h, 0, 0, s))
        for (let k = 0; k < tri.length; k += 3)
          A.t(base[tri[k]], base[tri[k + 1]], base[tri[k + 2]])
      }
      return A.geo()
    }

    /** Anillo plano (ojo) entre dos lazos con el MISMO nº de puntos (`outer`, `inner`), extruido en Z, con bisel. */
    function ring(outerIn, innerIn, depth, bevel = 0) {
      const outer = ccw(outerIn)
      const inner = ccw(innerIn)
      const h = depth / 2
      const b = Math.min(bevel, h * 0.9)
      const A = new Acc()
      const co = loopSides(A, outer, 1, h, b)
      const ci = loopSides(A, inner, -1, h, b)
      const n = outer.length
      for (const s of [1, -1]) {
        const o = co.map((q) => A.v(q[0], q[1], s * h, 0, 0, s))
        const i = ci.map((q) => A.v(q[0], q[1], s * h, 0, 0, s))
        for (let k = 0; k < n; k++) {
          const k1 = (k + 1) % n
          A.t(o[k], o[k1], i[k1])
          A.t(o[k], i[k1], i[k])
        }
      }
      return A.geo()
    }

    /** Sólido de revolución alrededor de Y: `profile` [[r, h], …] recorrido de modo que la normal saliente sea (dh, −dr). */
    function lathe(profile, seg = 24) {
      const A = new Acc()
      for (let j = 0; j + 1 < profile.length; j++) {
        const [r0, h0] = profile[j]
        const [r1, h1] = profile[j + 1]
        const [nr, nh] = unit2(h1 - h0, -(r1 - r0))
        const row = []
        for (let k = 0; k <= seg; k++) {
          const f = (2 * PI * k) / seg
          const c = Math.cos(f)
          const s = Math.sin(f)
          row.push([
            A.v(r0 * c, h0, r0 * s, nr * c, nh, nr * s),
            A.v(r1 * c, h1, r1 * s, nr * c, nh, nr * s),
          ])
        }
        for (let k = 0; k < seg; k++) {
          A.t(row[k][0], row[k + 1][0], row[k + 1][1])
          A.t(row[k][0], row[k + 1][1], row[k][1])
        }
      }
      return A.geo()
    }

    /** Esfera (revolución de un semicírculo). */
    function sphere(r, seg = 10, rings = 6) {
      const prof = []
      for (let k = 0; k <= rings; k++) {
        const a = (PI * k) / rings
        prof.push([Math.max(r * Math.sin(a), 1e-4), -r * Math.cos(a)])
      }
      return lathe(prof, seg)
    }

    /** Cilindro/cono entre dos puntos (radios distintos en cada extremo). */
    function taper(p1, p2, r1, r2, seg = 8) {
      const dx = p2[0] - p1[0]
      const dy = p2[1] - p1[1]
      const dz = p2[2] - p1[2]
      const len = Math.hypot(dx, dy, dz)
      const g = new K.Cyl(r2, r1, len, seg, 1, false)
      g.rotateZ(-Math.acos(Math.max(-1, Math.min(1, dy / len))))
      g.rotateY(-Math.atan2(dz, dx))
      g.translate((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2)
      return g
    }

    /** Sector anular como polígono [[u,v],…] (antihorario si a0 < a1). */
    function sector(rOut, rIn, a0, a1, n = 10) {
      const pts = []
      for (let k = 0; k <= n; k++) {
        const a = a0 + ((a1 - a0) * k) / n
        pts.push([rOut * Math.cos(a), rOut * Math.sin(a)])
      }
      for (let k = n; k >= 0; k--) {
        const a = a0 + ((a1 - a0) * k) / n
        pts.push([rIn * Math.cos(a), rIn * Math.sin(a)])
      }
      return pts
    }

    /** Elipse antihoraria de `n` puntos. */
    function oval(cx, cy, a, b, n = 20) {
      const pts = []
      for (let k = 0; k < n; k++) {
        const f = (2 * PI * k) / n
        pts.push([cx + a * Math.cos(f), cy + b * Math.sin(f)])
      }
      return pts
    }

    /** Recorta un polígono conservando ax·x + ay·y ≤ c. */
    function clip(poly, ax, ay, c) {
      const out = []
      for (let k = 0; k < poly.length; k++) {
        const p = poly[k]
        const q = poly[(k + 1) % poly.length]
        const dp = ax * p[0] + ay * p[1] - c
        const dq = ax * q[0] + ay * q[1] - c
        if (dp <= 0) out.push(p)
        if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
          const t = dp / (dp - dq)
          out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
        }
      }
      return out
    }

    return { extrude, ring, lathe, sphere, taper, sector, oval, clip, area2 }
  }

  // ───────────────────────────── construcción ─────────────────────────────
  /** Materiales del aparejo: pintura (acero pintado, rugosidad ~0,6) y acero mecanizado (metalness alta, rugosidad ~0,3); color por vértice. */
  const materials = (api) => ({
    paint: api.pn('#ffffff', 0.6, 0.15, { vertexColors: true }),
    steel: api.pn('#ffffff', 0.32, 0.55, { vertexColors: true }),
  })

  function build(g, api, kit) {
    const { K, Batch, dropsGroup } = kit
    const blk = g.children.find((o) => o.name === 'bloque_viajero')
    if (!blk) return
    const H = createGeo(K)
    const m = materials(api)
    const group = (name, parent) => {
      const q = new K.Group()
      q.name = name
      parent.add(q)
      return q
    }
    const dispose = (parent) => {
      for (const ch of [...parent.children]) {
        if (!ch.isMesh) continue
        parent.remove(ch)
        ch.geometry.dispose()
      }
    }

    // retira todo lo que el visor dibuja en el bloque (placas, poleas, vástago, gancho, pasador) y el contenido de amelas/elevador
    dispose(blk)
    const amelas = blk.getObjectByName('amelas') || group('amelas', blk)
    const elevador = blk.getObjectByName('elevador') || group('elevador', blk)
    dispose(amelas)
    dispose(elevador)

    const bp3 = dropsGroup(
      blk,
      'BP-3',
      'Folleto: IDECO 110 t, 6 líneas (Libro DROPS BP-3 dice 8 líneas de 1 1/8": conflicto documental, se mantienen 6).',
    )
    buildBloque(bp3)
    buildGancho(bp3)
    buildAmelas(amelas)
    buildElevadorTubing(elevador)
    if (ROD_ELEVATOR.visible) buildElevadorVarillas(g)

    // ── bloque viajero: carcasa con placas laterales biseladas, poleas con garganta, eje y guardas ──
    function buildBloque(parent) {
      const gb = group('bloque', parent)
      const P = new Batch()
      const S = new Batch()
      const AX = 0.28 // eje de las poleas (el del visor: los ramales terminan tangentes a las poleas, x = ±0,36)

      // placas laterales: contorno con cúpula superior y faldón inferior (z = ±0,35; cara exterior en ±0,38, donde va la placa de datos)
      const plate = [
        [0.2, -0.5],
        [0.34, -0.4],
        [0.45, -0.1],
        [0.45, AX],
      ]
      for (let a = 12; a < 180; a += 12)
        plate.push([0.45 * Math.cos(a * DEG), AX + 0.45 * Math.sin(a * DEG)])
      plate.push([-0.45, AX], [-0.45, -0.1], [-0.34, -0.4], [-0.2, -0.5])
      for (const s of [-1, 1]) P.push(H.extrude(plate, 0.06, 0.012), 0, 0, s * 0.35, PAINT.block)

      // cubierta de cúpula entre placas (deja libres las gargantas por donde entran los ramales, x = ±0,36) y fajas inferiores
      P.push(H.extrude(H.sector(0.45, 0.4, 62 * DEG, 118 * DEG, 8), 0.66, 0), 0, AX, 0, PAINT.block)
      const lowR = [
        [0.45, -0.02],
        [0.45, -0.1],
        [0.34, -0.4],
        [0.2, -0.5],
        [0.19, -0.47],
        [0.318, -0.392],
        [0.42, -0.1],
        [0.42, -0.02],
      ]
      P.push(H.extrude(lowR, 0.64, 0), 0, 0, 0, PAINT.block)
      P.push(
        H.extrude(
          lowR.map(([x, y]) => [-x, y]),
          0.64,
          0,
        ),
        0,
        0,
        0,
        PAINT.block,
      )
      P.box(PAINT.block, 0.4, 0.1, 0.68, 0, -0.53, 0) // travesaño inferior
      P.cyl(PAINT.block, 0.14, 0.14, 0.09, 0, -0.625, 0, 'y', 16) // cuello

      // ventanas de ventilación (ranuras radiales oscuras) y franjas de advertencia (negro sobre el color del bloque) en cada placa
      const rect = [
        [-0.27, -0.44],
        [0.27, -0.44],
        [0.27, -0.29],
        [-0.27, -0.29],
      ]
      for (const s of [-1, 1]) {
        for (const a of [58, 79, 101, 122]) {
          const f = a * DEG
          const slot = new K.Box(0.04, 0.16, 0.012)
          slot.rotateZ(f - PI / 2)
          P.push(slot, 0.34 * Math.cos(f), AX + 0.34 * Math.sin(f), s * 0.388, BLACK)
        }
        for (let c0 = -0.71; c0 < -0.02; c0 += 0.12) {
          const poly = H.clip(H.clip(rect, -1, -1, -c0), 1, 1, c0 + 0.06)
          if (poly.length >= 3 && Math.abs(H.area2(poly)) > 1e-4)
            P.push(H.extrude(poly, 0.004, 0), 0, 0, s * 0.382, BLACK)
        }
        // guarda del eje (disco) con 6 bulones y tuerca; 4 bulones de armado en la placa
        P.cyl(PAINT.block, 0.15, 0.15, 0.02, 0, AX, s * 0.392, 'z', 20)
        S.cyl(STEEL, 0.085, 0.085, 0.035, 0, AX, s * 0.42, 'z', 6)
        for (let k = 0; k < 6; k++) {
          const f = (2 * PI * k) / 6
          S.cyl(
            STEEL,
            0.014,
            0.014,
            0.014,
            0.115 * Math.cos(f),
            AX + 0.115 * Math.sin(f),
            s * 0.406,
            'z',
            6,
          )
        }
        for (const [x, y] of [
          [0.39, 0.06],
          [-0.39, 0.06],
          [0.39, 0.42],
          [-0.39, 0.42],
        ])
          S.cyl(STEEL, 0.022, 0.022, 0.014, x, y, s * 0.387, 'z', 6)
      }

      // eje de las poleas y 3 poleas de garganta (r = 0,385 en el borde y 0,34 en el fondo; el ramal, r = 0,019, va en x = ±0,36)
      S.cyl(MACH, 0.055, 0.055, 0.86, 0, AX, 0, 'z', 12)
      const sheave = [
        [0.105, -0.055],
        [0.36, -0.055],
        [0.385, -0.042],
        [0.385, -0.03],
        [0.352, -0.013],
        [0.34, 0],
        [0.352, 0.013],
        [0.385, 0.03],
        [0.385, 0.042],
        [0.36, 0.055],
        [0.105, 0.055],
      ]
      for (const z of [-0.24, 0, 0.24]) {
        const geo = H.lathe(sheave, 28)
        geo.rotateX(PI / 2)
        S.push(geo, 0, AX, z, MACH)
        S.cyl(DARK, 0.11, 0.11, 0.1, 0, AX, z, 'z', 14)
      }

      // parte fija del giratorio: aro superior y cuerpo
      S.cyl(STEEL, 0.17, 0.17, 0.035, 0, -0.7, 0, 'y', 20)
      S.cyl(DARK, 0.15, 0.15, 0.13, 0, -0.8, 0, 'y', 20)

      P.flush(gb, m.paint, 'bloque_viajero_pintura')
      S.flush(gb, m.steel, 'bloque_viajero_acero')
    }

    // ── gancho: giratorio (aro inferior + tuerca), vástago, gancho forjado con boca a +X, pestillo con pivote y pasador de amelas ──
    function buildGancho(parent) {
      const gg = group('gancho', parent)
      const P = new Batch()
      const S = new Batch()
      S.cyl(STEEL, 0.17, 0.17, 0.035, 0, -0.895, 0, 'y', 20)
      S.cyl(MACH, 0.115, 0.115, 0.05, 0, -0.94, 0, 'y', 6)
      P.cyl(PAINT.block, 0.095, 0.095, 0.26, 0, -1.07, 0, 'y', 14)

      // gancho forjado: arco de ~300° (boca hacia arriba a la derecha, entre 25° y 96°), más grueso abajo y afinado en la punta
      const t0 = 96 * DEG
      const t1 = (360 + 25) * DEG
      const N = 30
      const outer = []
      const inner = []
      for (let k = 0; k <= N; k++) {
        const s = k / N
        const t = t0 + (t1 - t0) * s
        const w =
          s < 0.5 ? 0.125 + (0.16 - 0.125) * (s / 0.5) : 0.16 + (0.085 - 0.16) * ((s - 0.5) / 0.5)
        outer.push([(HOOK.rc + w / 2) * Math.cos(t), HOOK.cy + (HOOK.rc + w / 2) * Math.sin(t)])
        inner.push([(HOOK.rc - w / 2) * Math.cos(t), HOOK.cy + (HOOK.rc - w / 2) * Math.sin(t)])
      }
      P.push(H.extrude([...outer, ...inner.reverse()], 0.13, 0.012), 0, 0, 0, PAINT.block)
      P.cyl(PAINT.block, 0.085, 0.085, 0.17, 0, HOOK.pinY, 0, 'z', 14) // oreja/boquilla forjada del pasador
      S.cyl(MACH, 0.04, 0.04, 0.9, 0, HOOK.pinY, 0, 'z', 10) // pasador de las amelas
      for (const s of [-1, 1]) S.cyl(STEEL, 0.058, 0.058, 0.018, 0, HOOK.pinY, s * 0.447, 'z', 10)

      // pestillo de seguridad: placa desde el vástago hasta la punta, con pivote propio (Object3D) para animarlo después
      const tip = [HOOK.rc * Math.cos(25 * DEG), HOOK.cy + HOOK.rc * Math.sin(25 * DEG)]
      const dx = tip[0] - LATCH_PIVOT[0]
      const dy = tip[1] - LATCH_PIVOT[1]
      const len = Math.hypot(dx, dy)
      const pest = group('pestillo', gg)
      pest.position.set(LATCH_PIVOT[0], LATCH_PIVOT[1], 0)
      const Q = new Batch()
      const plateG = new K.Box(len, 0.022, 0.075)
      plateG.rotateZ(Math.atan2(dy, dx))
      Q.push(plateG, dx / 2, dy / 2, 0, DARK)
      Q.cyl(MACH, 0.022, 0.022, 0.1, 0, 0, 0, 'z', 8) // pasador del pestillo
      Q.cyl(MACH, 0.016, 0.016, 0.06, dx * 0.5, dy * 0.5 - 0.03, 0, 'z', 6) // resorte (esquemático)

      P.flush(gg, m.paint, 'gancho_pintura')
      S.flush(gg, m.steel, 'gancho_acero')
      Q.flush(pest, m.steel, 'pestillo_acero')
    }

    // ── amelas (bails): par de eslabones planos con ojo superior e inferior, en z = ±0,36 (por fuera del gancho) ──
    function buildAmelas(parent) {
      const P = new Batch()
      const upperC = -1.71 // ojos con holgura: el pasador (y = −1,625) apoya arriba del ojo superior y (y = −2,90) abajo del inferior
      const lowerC = -2.84
      const shank = [
        [-0.05, -1.8],
        [-0.036, -2.1],
        [-0.036, -2.45],
        [-0.05, -2.76],
        [0.05, -2.76],
        [0.036, -2.45],
        [0.036, -2.1],
        [0.05, -1.8],
      ]
      for (const s of [-1, 1]) {
        const z = s * 0.36
        P.push(
          H.ring(
            H.oval(0, upperC, 0.115, 0.185, 20),
            H.oval(0, upperC, 0.068, 0.125, 20),
            0.06,
            0.006,
          ),
          0,
          0,
          z,
          PAINT.bail,
        )
        P.push(
          H.ring(H.oval(0, lowerC, 0.1, 0.16, 20), H.oval(0, lowerC, 0.058, 0.1, 20), 0.06, 0.006),
          0,
          0,
          z,
          PAINT.bail,
        )
        P.push(H.extrude(shank, 0.055, 0.006), 0, 0, z, PAINT.bail)
      }
      P.flush(parent, m.paint, 'amelas_pintura')
    }

    /**
     * Semicuerpo del elevador de tubing (articulado tipo Y): dos escalones de sector anular, inserto de bronce (cuñas), tornillos, oreja con boquilla
     * y pasador para el ojo inferior de la amela, y asa con perilla. `s` = +1 (z>0, cuerpo) o −1 (z<0, puerta).
     */
    function halfElevator(s, P, S) {
      const y0 = ELEV.y
      const arc = s > 0 ? [0.05, PI - 0.05] : [PI + 0.05, 2 * PI - 0.05]
      const slab = (poly, h, cy, color, batch) => {
        const geo = H.extrude(poly, h, 0.008)
        geo.rotateX(PI / 2) // (u, v) → (x, z); la extrusión pasa a ser vertical
        batch.push(geo, 0, cy, 0, color)
      }
      slab(H.sector(0.3, 0.157, arc[0], arc[1], 10), 0.14, y0 + 0.05, PAINT.elevator, P)
      slab(H.sector(0.27, 0.157, arc[0], arc[1], 10), 0.1, y0 - 0.07, PAINT.elevator, P)
      slab(H.sector(0.161, 0.1, arc[0] + 0.11, arc[1] - 0.11, 8), 0.26, y0, BRONZE, S)
      for (const a of [0.35, 0.5, 0.65]) {
        const f = arc[0] + (arc[1] - arc[0]) * a
        S.cyl(MACH, 0.012, 0.012, 0.012, 0.13 * Math.cos(f), y0 + 0.136, 0.13 * Math.sin(f), 'y', 6)
      }
      // oreja (para el ojo inferior de la amela, en z = ±0,36) con boquilla y pasador con arandela
      P.box(PAINT.elevator, 0.18, 0.16, 0.06, 0, y0 + 0.07, s * 0.295)
      P.cyl(PAINT.elevator, 0.065, 0.065, 0.03, 0, y0 + 0.14, s * 0.31, 'z', 12)
      S.cyl(MACH, 0.04, 0.04, 0.19, 0, y0 + 0.14, s * 0.345, 'z', 10)
      S.cyl(STEEL, 0.058, 0.058, 0.018, 0, y0 + 0.14, s * 0.445, 'z', 10)
      // asa (palanca) hacia +X y abajo, con perilla
      const hp = [0.27, y0 - 0.06, s * 0.09]
      const he = [0.55, y0 - 0.3, s * 0.2]
      P.push(H.taper(hp, he, 0.026, 0.02, 8), 0, 0, 0, PAINT.elevator)
      P.push(H.sphere(0.045, 10, 6), he[0], he[1], he[2], PAINT.elevator)
    }

    // ── elevador de tubing (100 t BJ según folleto): dos mitades con bisagra en −X y traba en +X; la mitad z<0 es la puerta (pivote propio) ──
    function buildElevadorTubing(parent) {
      const P = new Batch()
      const S = new Batch()
      halfElevator(1, P, S)
      // traba superior (barra negra con 2 bulones), pasador de traba y bisagra
      S.box(BLACK, 0.16, 0.022, 0.14, 0.225, ELEV.y + 0.132, 0)
      for (const x of [0.17, 0.28])
        for (const z of [-0.045, 0.045])
          S.cyl(MACH, 0.022, 0.022, 0.02, x, ELEV.y + 0.152, z, 'y', 6)
      S.cyl(MACH, 0.02, 0.02, 0.2, 0.29, ELEV.y + 0.05, 0, 'y', 8)
      S.cyl(DARK, 0.045, 0.045, 0.26, ELEV.hinge[0], ELEV.y, 0, 'y', 10)
      S.cyl(MACH, 0.03, 0.03, 0.03, ELEV.hinge[0], ELEV.y + 0.145, 0, 'y', 8)

      const door = group('puerta', parent)
      door.position.set(ELEV.hinge[0], ELEV.y, ELEV.hinge[1])
      const PD = new Batch()
      const SD = new Batch()
      halfElevator(-1, PD, SD)
      for (const b of [PD, SD])
        for (const p of b.parts) p.geo.translate(-ELEV.hinge[0], -ELEV.y, -ELEV.hinge[1]) // geometría en coordenadas del pivote

      P.flush(parent, m.paint, 'elevador_tubing_pintura')
      S.flush(parent, m.steel, 'elevador_tubing_acero')
      PD.flush(door, m.paint, 'elevador_puerta_pintura')
      SD.flush(door, m.steel, 'elevador_puerta_acero')
    }

    // ── elevador de varillas (sucker rod), NUEVO: bloque con ranura y cuñas de bronce + asa en U (bail). Ubicación PENDIENTE (ROD_ELEVATOR) ──
    function buildElevadorVarillas(parent) {
      const ge = group('elevador_varillas', parent)
      ge.position.set(ROD_ELEVATOR.x, ROD_ELEVATOR.y, ROD_ELEVATOR.z)
      ge.rotation.y = ROD_ELEVATOR.yaw
      const P = new Batch()
      const S = new Batch()
      const hx = 0.11
      const hz = 0.08
      const sl = 0.028 // semiancho de la ranura de entrada (boca hacia +X)
      const body = [
        [-hx, -hz],
        [hx, -hz],
        [hx, -sl],
        [0, -sl],
      ]
      for (let a = -90 - 22.5; a >= -270 + 1; a -= 22.5)
        body.push([sl * Math.cos(a * DEG), sl * Math.sin(a * DEG)])
      body.push([0, sl], [hx, sl], [hx, hz], [-hx, hz])
      const bg = H.extrude(body, 0.085, 0.006)
      bg.rotateX(PI / 2)
      P.push(bg, 0, 0.0425, 0, PAINT.rod)
      for (const s of [-1, 1]) {
        S.box(BRONZE, 0.07, 0.06, 0.02, 0.055, 0.0425, s * 0.018) // cuñas de bronce
        S.cyl(MACH, 0.022, 0.022, 0.012, 0, 0.045, s * 0.106, 'z', 6) // tornillo de giro del asa
      }
      S.cyl(DARK, 0.03, 0.03, 0.003, 0, 0.0865, 0, 'y', 12) // boca del agujero
      // asa en U: patas por fuera del cuerpo, giran sobre los tornillos (eje Z)
      const R = 0.098
      const bail = [
        [0, 0.045, -R],
        [0, 0.2, -R],
        [0, 0.36, -R],
      ]
      for (let a = 20; a <= 160; a += 20)
        bail.push([0, 0.36 + R * Math.sin(a * DEG), -R * Math.cos(a * DEG)])
      bail.push([0, 0.36, R], [0, 0.2, R], [0, 0.045, R])
      P.tube(PAINT.rod, bail, 0.017)

      P.flush(ge, m.paint, 'elevador_varillas_pintura')
      S.flush(ge, m.steel, 'elevador_varillas_acero')
    }
  }

  window.__rigAparejo = { build, ROD_ELEVATOR, APAREJO_COLOR }
})()
