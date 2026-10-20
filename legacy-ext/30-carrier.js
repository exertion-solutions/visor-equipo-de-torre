/*
 * Equipo 10 · 30-carrier.js — rediseño visual del carrier y su equipamiento.
 *
 * Reemplaza `Ot.camion`, `Ot.subestructura`, `Ot.cabina`, `Ot.motor` y `Ot.malacate` (esta última conserva el grupo
 * `tambor_principal` del visor, que el aparejo hace girar). SOLO ESTÉTICO: el modelo sirve de soporte visual a los
 * puntos DROPS del Libro DROPS 2024 (RCCO Rev.03). Ninguna cota nueva es dato documentado.
 *
 * DATOS DOCUMENTADOS que se respetan (folleto Equipo 10 rev. 26/06/2024 y layout TKR-10):
 *   - carrier Service King SK-575 de 5 ejes; envolvente operativa ~18 m × 4 m;
 *   - piso de trabajo 2,6 (largo, x) × 3,3 m (ancho, z), telescópico y deslizante, altura regulable 1–4 m
 *     (el modelo lo mantiene en 2,30 m, como el visor y como el resto de los componentes: llave, BOP, mástil);
 *   - motor Detroit Serie 60 (x = −13,2), tambor principal con cable de 1" (x = −8,5), tambor de pistoneo,
 *     cabina del maquinista (x = −5,4), tanques cilíndricos de gas-oil (12.465 l) y agua (8.300 l).
 *   Todo lo demás (largueros, gatos, tanques laterales, escaleras, tensores, ...) es ESTÉTICO y va marcado así.
 *
 * PUNTOS DROPS que dibuja (cada uno es un `Group` `drops_<ID>` con `userData.dropsId`; los meshes internos NO se
 * etiquetan para que la capa DROPS calcule bien el centroide):
 *   subestructura: SUB-1 (6 tensores + 2 pistones), SUB-4 (reflector led con eslinga), PT-1 (escalera lateral),
 *                  PT-2 (cuna y bujes de escalera), PT-3 (barandas y rodapié), PT-4 (barandas del plano inclinado),
 *                  PT-5 (4 patas de apoyo), PT-6 (aleros rebatibles y pasadores)
 *   camion:        SUB-2 (escaleras y plataformas de tránsito), SUB-3 (barandas y rodapié), SUB-4 (reflector)
 *   cabina:        CAS-1 (mangueras y comandos con grampas cepo), CAS-2 (soporte y pernos), CAS-3 (escalera y pasadores)
 *   malacate:      BP-1 (guinche: cable de pistoneo 9/16" con guardacabo, grillete y giratorio sobre la boca de pozo)
 *   BP-2 (power swivel) es "NA" en el Libro: no se dibuja. BP-3 (aparejo) no es de este módulo.
 *
 * Rendimiento: la geometría se FUSIONA por material (un mesh por material y por punto DROPS) con colores por vértice
 * para el desgaste sutil de la pintura (sin texturas). Las clases de three no se exponen en `onPre`: se derivan de los
 * helpers del visor (`le().constructor`, ...). Los primitivos (caja, cilindro, tubo) se generan aquí.
 *
 * Marco de coordenadas: origen = boca de pozo, +X hacia el mástil, carrier hacia −X, Z lateral, metros, Y arriba.
 */
;(() => {
  'use strict'
  if (!window.__rigExt) return

  const PI = Math.PI
  /** Paleta de pintura observada (imágenes de referencia). */
  const RED = '#A72A32'
  const YELLOW = '#F2B632'
  const GREY = '#6F767C'
  const TIRE = '#10121C'

  /** Alturas y cotas del carrier (estético salvo lo indicado). */
  const DECK = 1.375 // cubierta del carrier (y). Las cabinas, motor y malacate ya apoyan a esta cota.
  const RZ = 1.72 // borde exterior de la pasarela lateral (ancho total 3,44 m; con gatos ~4 m)
  const AXLES = [-16, -14.6, -6.3, -4.9, -3.5] // 5 ejes (folleto): tándem delantero + tridem trasero
  const FY = 2.3 // piso de trabajo (documentado 1–4 m; el visor lo fija en 2,30 m)

  window.__rigExt.onPre((api) => {
    const { Ot } = api
    const kit = createKit(api)

    const origMalacate = Ot.malacate
    const origCamion = Ot.camion

    Ot.camion = (g, e) => buildCamion(kit, api, g, origCamion, e)
    Ot.subestructura = (g) => buildSubestructura(kit, api, g)
    Ot.cabina = (g) => buildCabina(kit, api, g)
    Ot.motor = (g) => buildMotor(kit, api, g)
    Ot.malacate = (g, e) => buildMalacate(kit, api, g, origMalacate, e)
  })

  /* Las lentes se pasan a MeshBasicMaterial: `setMode()` del visor pone emissive=0 en los estándar. */
  window.__rigExt.onPost((R) => {
    const Basic = R.three.MeshBasicMaterial
    for (const id of ['camion', 'subestructura', 'cabina', 'malacate', 'motor']) {
      R.groups[id]?.traverse((o) => {
        if (o.isMesh && o.material && /_lens$/.test(o.material.name || '')) {
          const old = o.material
          o.material = new Basic({ color: '#FFF2C4' })
          o.material.name = old.name
          old.dispose()
        }
      })
    }
  })

  /* ══════════════════════════════════════════════════════════════════════════════════════════════
   *  KIT: primitivos fusionados por material con color por vértice (desgaste) y transformación anidada
   * ══════════════════════════════════════════════════════════════════════════════════════════════ */
  function createKit(api) {
    const sink = { add() {} }
    const probe = api.le(sink, api.pn('#000000'), 1, 1, 1, 0, 0, 0)
    const Mesh = probe.constructor
    const BufferGeometry = Object.getPrototypeOf(probe.geometry.constructor)
    const Attr = probe.geometry.attributes.position.constructor
    const Group = api.Ml(sink).constructor
    probe.geometry.dispose()
    if (typeof BufferGeometry.prototype.setAttribute !== 'function')
      throw new Error('BufferGeometry no disponible')

    // ── álgebra 3×4 (fila mayor: r00 r01 r02 r10 r11 r12 r20 r21 r22 tx ty tz) ──
    const I3 = () => [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
    const mul = (A, B) => {
      const r = new Array(12)
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++)
          r[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]
        r[9 + i] = A[i * 3] * B[9] + A[i * 3 + 1] * B[10] + A[i * 3 + 2] * B[11] + A[9 + i]
      }
      return r
    }
    const tr = (x, y, z) => [1, 0, 0, 0, 1, 0, 0, 0, 1, x, y, z]
    const rx = (a) => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0]
    const ry = (a) => [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a), 0, 0, 0]
    const rz = (a) => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1, 0, 0, 0]
    const eul = (r) => mul(rx(r[0]), mul(ry(r[1]), rz(r[2])))
    /** Rotación que lleva +Y a la dirección (dx,dy,dz) (Rodrigues). */
    const alignY = (dx, dy, dz) => {
      const l = Math.hypot(dx, dy, dz) || 1
      dx /= l
      dy /= l
      dz /= l
      const s = Math.hypot(dx, dz)
      if (s < 1e-6) return dy > 0 ? I3() : rx(PI)
      const kx = dz / s
      const kz = -dx / s
      const c = dy
      const K = [0, -kz, 0, kz, 0, -kx, 0, kx, 0]
      const kk = [kx * kx, 0, kx * kz, 0, 0, 0, kz * kx, 0, kz * kz]
      const R = new Array(12).fill(0)
      for (let i = 0; i < 9; i++) R[i] = (i % 4 === 0 ? c : 0) + s * K[i] + (1 - c) * kk[i]
      return R
    }

    // ── generadores de geometría (three: BoxGeometry / CylinderGeometry) ──
    const FACES = [
      [
        [1, 0, 0],
        [
          [1, -1, 1],
          [1, -1, -1],
          [1, 1, -1],
          [1, 1, 1],
        ],
      ],
      [
        [-1, 0, 0],
        [
          [-1, -1, -1],
          [-1, -1, 1],
          [-1, 1, 1],
          [-1, 1, -1],
        ],
      ],
      [
        [0, 1, 0],
        [
          [-1, 1, 1],
          [1, 1, 1],
          [1, 1, -1],
          [-1, 1, -1],
        ],
      ],
      [
        [0, -1, 0],
        [
          [-1, -1, -1],
          [1, -1, -1],
          [1, -1, 1],
          [-1, -1, 1],
        ],
      ],
      [
        [0, 0, 1],
        [
          [-1, -1, 1],
          [1, -1, 1],
          [1, 1, 1],
          [-1, 1, 1],
        ],
      ],
      [
        [0, 0, -1],
        [
          [1, -1, -1],
          [-1, -1, -1],
          [-1, 1, -1],
          [1, 1, -1],
        ],
      ],
    ]
    const boxData = (w, h, d) => {
      const P = []
      const N = []
      const X = []
      const hx = w / 2
      const hy = h / 2
      const hz = d / 2
      for (const [n, vs] of FACES) {
        const b = P.length / 3
        for (const v of vs) {
          P.push(v[0] * hx, v[1] * hy, v[2] * hz)
          N.push(n[0], n[1], n[2])
        }
        X.push(b, b + 1, b + 2, b, b + 2, b + 3)
      }
      return { P, N, X }
    }
    const cylData = (rt, rb, h, segs, open, ts, tl) => {
      const P = []
      const N = []
      const X = []
      const hh = h / 2
      const slope = (rb - rt) / h
      for (let i = 0; i <= segs; i++) {
        const th = ts + (tl * i) / segs
        const s = Math.sin(th)
        const c = Math.cos(th)
        const l = Math.hypot(s, slope, c)
        P.push(rt * s, hh, rt * c, rb * s, -hh, rb * c)
        N.push(s / l, slope / l, c / l, s / l, slope / l, c / l)
      }
      for (let i = 0; i < segs; i++) {
        const a = 2 * i
        const b = a + 1
        const c = 2 * (i + 1) + 1
        const d = 2 * (i + 1)
        X.push(a, b, d, b, c, d)
      }
      if (!open) {
        for (const top of [true, false]) {
          const r = top ? rt : rb
          if (r <= 0) continue
          const cy = top ? hh : -hh
          const ny = top ? 1 : -1
          const c0 = P.length / 3
          P.push(0, cy, 0)
          N.push(0, ny, 0)
          const st = P.length / 3
          for (let i = 0; i <= segs; i++) {
            const th = ts + (tl * i) / segs
            P.push(r * Math.sin(th), cy, r * Math.cos(th))
            N.push(0, ny, 0)
          }
          for (let i = 0; i < segs; i++) {
            if (top) X.push(st + i, st + i + 1, c0)
            else X.push(st + i + 1, st + i, c0)
          }
        }
      }
      return { P, N, X }
    }

    // PRNG determinista: el desgaste es siempre el mismo entre cargas.
    let seed = 0x30c0ffee
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    /** Variación de brillo por pieza (pintura repintada/desteñida): rojo y amarillo varían más. */
    const WEAR = { red: 0.16, redTwo: 0.16, yellow: 0.12, grey: 0.1 }
    /** Salpicado de barro: oscurece hasta ~30 % cerca del suelo (y < 1,6 m). */
    const dirt = (y) => 1 - 0.3 * Math.max(0, Math.min(1, 1 - y / 1.6)) ** 1.5

    function builder(prefix) {
      const store = new Map()
      let T = I3()
      const stack = []
      const slot = (key) => {
        let s = store.get(key)
        if (!s) store.set(key, (s = { P: [], N: [], C: [], X: [] }))
        return s
      }
      const emit = (key, M, d) => {
        const s = slot(key)
        const base = s.P.length / 3
        const shade = 1 + (rnd() - 0.6) * (WEAR[key] ?? 0.06)
        for (let i = 0; i < d.P.length; i += 3) {
          const x = d.P[i]
          const y = d.P[i + 1]
          const z = d.P[i + 2]
          const wy = M[3] * x + M[4] * y + M[5] * z + M[10]
          s.P.push(
            M[0] * x + M[1] * y + M[2] * z + M[9],
            wy,
            M[6] * x + M[7] * y + M[8] * z + M[11],
          )
          const nx = d.N[i]
          const ny = d.N[i + 1]
          const nz = d.N[i + 2]
          s.N.push(
            M[0] * nx + M[1] * ny + M[2] * nz,
            M[3] * nx + M[4] * ny + M[5] * nz,
            M[6] * nx + M[7] * ny + M[8] * nz,
          )
          const c = shade * dirt(wy)
          s.C.push(c, c, c)
        }
        for (const k of d.X) s.X.push(base + k)
      }
      const local = (x, y, z, rot) => mul(T, rot ? mul(tr(x, y, z), eul(rot)) : tr(x, y, z))

      const B = {
        /** Caja w×h×d centrada en (x,y,z); `rot` = [rx,ry,rz] (Euler XYZ, rad). */
        box(key, w, h, d, x, y, z, rot) {
          emit(key, local(x, y, z, rot), boxData(w, h, d))
        },
        /** Cilindro (rTop, rBot, h) centrado; eje 'y' | 'x' | 'z'; `o` = { rot, ts, tl } (arco). */
        cyl(key, rt, rb, h, x, y, z, axis = 'y', segs = 10, open = false, o = {}) {
          const ax = axis === 'x' ? rz(PI / 2) : axis === 'z' ? rx(PI / 2) : I3()
          const L = mul(local(x, y, z, o.rot), ax)
          emit(key, L, cylData(rt, rb, h, segs, open, o.ts ?? 0, o.tl ?? 2 * PI))
        },
        /** Barra cilíndrica entre dos puntos [x,y,z]. */
        rod(key, p1, p2, r, segs = 6, open = false) {
          const dx = p2[0] - p1[0]
          const dy = p2[1] - p1[1]
          const dz = p2[2] - p1[2]
          const len = Math.hypot(dx, dy, dz)
          if (len < 1e-6) return
          const R = alignY(dx, dy, dz)
          const L = mul(
            T,
            mul(tr((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2), R),
          )
          emit(key, L, cylData(r, r, len, segs, open, 0, 2 * PI))
        },
        /** Viga de sección w×d entre dos puntos (giro `roll` sobre su eje). */
        beam(key, p1, p2, w, d, roll = 0) {
          const dx = p2[0] - p1[0]
          const dy = p2[1] - p1[1]
          const dz = p2[2] - p1[2]
          const len = Math.hypot(dx, dy, dz)
          if (len < 1e-6) return
          const R = mul(alignY(dx, dy, dz), ry(roll))
          const L = mul(
            T,
            mul(tr((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2), R),
          )
          emit(key, L, boxData(w, len, d))
        },
        /** Manguera / cable: polilínea suavizada (Chaikin) hecha de tramos cilíndricos. */
        path(key, pts, r, segs = 5, subdiv = 2) {
          let p = pts.map((q) => q.slice())
          for (let k = 0; k < subdiv; k++) {
            const n = [p[0]]
            for (let i = 0; i < p.length - 1; i++) {
              const a = p[i]
              const b = p[i + 1]
              n.push(
                [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25, a[2] * 0.75 + b[2] * 0.25],
                [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75, a[2] * 0.25 + b[2] * 0.75],
              )
            }
            n.push(p[p.length - 1])
            p = n
          }
          for (let i = 0; i < p.length - 1; i++) B.rod(key, p[i], p[i + 1], r, segs)
        },
        /** Traslada/gira el marco local mientras corre `fn` (giro Y y luego Z). */
        place(x, y, z, yaw, fn, roll = 0) {
          stack.push(T)
          T = mul(T, mul(tr(x, y, z), mul(ry(yaw), rz(roll))))
          fn()
          T = stack.pop()
        },
        /** Crea un mesh por material dentro de `parent`. */
        flush(parent, mats) {
          for (const [key, s] of store) {
            if (!s.X.length) continue
            const geo = new BufferGeometry()
            geo.setAttribute('position', new Attr(new Float32Array(s.P), 3))
            geo.setAttribute('normal', new Attr(new Float32Array(s.N), 3))
            geo.setAttribute('color', new Attr(new Float32Array(s.C), 3))
            geo.setIndex(s.X)
            const mesh = new Mesh(geo, mats[key])
            api.ir(mesh)
            mesh.name = `${prefix}_${key}`
            parent.add(mesh)
          }
          store.clear()
        },
      }
      return B
    }

    /** Materiales de pintura (color por vértice = desgaste). `name` = id del componente. */
    function materials(name) {
      const P = (hex, r, m, extra) =>
        api.pn(hex, r, m, Object.assign({ vertexColors: true }, extra))
      const M = {
        red: P(RED, 0.5, 0.26),
        redTwo: P(RED, 0.5, 0.26, { side: 2 }), // cáscaras abiertas (guardabarros, guardas)
        yellow: P(YELLOW, 0.44, 0.2),
        grey: P(GREY, 0.55, 0.35),
        steel: P('#B4BBC2', 0.3, 0.8),
        dark: P('#2A2F35', 0.6, 0.5),
        tire: P(TIRE, 0.95, 0),
        glass: P('#0E1B27', 0.1, 0.6),
        glassT: P('#1B3346', 0.1, 0.6, { transparent: true, opacity: 0.4, depthWrite: false }),
        rubber: P('#16181C', 0.85, 0.05),
        lens: P('#FFF3C6', 0.25, 0),
        white: P('#D8DCDD', 0.5, 0.2),
      }
      for (const [k, m] of Object.entries(M)) m.name = `${name}_${k}`
      return M
    }

    /** Punto DROPS: Group `drops_<ID>` con `userData.dropsId` (solo el grupo). */
    function drops(parent, id, extra) {
      const gp = new Group()
      gp.name = `drops_${id}`
      gp.userData.dropsId = id
      Object.assign(gp.userData, extra || {})
      parent.add(gp)
      return gp
    }
    const group = (name, parent) => {
      const gp = new Group()
      gp.name = name
      if (parent) parent.add(gp)
      return gp
    }

    return { builder, materials, drops, group }
  }

  /* ══════════════════════════════════════════════════════════════════════════════════════════════
   *  Piezas compartidas
   * ══════════════════════════════════════════════════════════════════════════════════════════════ */

  /**
   * Escalera con peldaños y pasamanos amarillos. Marco local: origen al pie del borde superior; +x = sentido de
   * descenso; z = ancho. `o` = { x, z, ry, H, run, w, n }: sitúa el borde superior en (x, H, z), con yaw `ry`.
   * ESTÉTICO: pendiente, peldaños y ancho aproximados.
   */
  function stair(b, o) {
    b.place(o.x, o.y ?? 0, o.z, o.ry, () => {
      const { H, run, w, n } = o
      const len = Math.hypot(H, run)
      const ang = -Math.atan2(H, run)
      const h = H / n
      for (const s of [-1, 1]) {
        const z = (s * w) / 2
        b.box('yellow', len, 0.17, 0.045, run / 2, H / 2 - 0.09, z, [0, 0, ang]) // larguero
        b.rod('yellow', [-0.04, H + 0.92, z], [run + 0.04, 0.92, z], 0.03, 6) // pasamanos
        b.rod('yellow', [0, H + 0.48, z], [run, 0.48, z], 0.022, 6) // baranda intermedia
        const posts = Math.max(1, Math.round(n / 3))
        for (let i = 0; i <= posts; i++) {
          const xp = (run * i) / posts
          const yb = H - (xp * H) / run
          b.box('yellow', 0.05, 0.95, 0.05, xp, yb + 0.47, z)
        }
      }
      for (let k = 1; k < n; k++) {
        const xk = ((k - 0.5) * run) / n
        b.box('grey', run / n + 0.02, 0.035, w - 0.06, xk, H - k * h - 0.02, 0) // peldaño (chapa antideslizante)
        b.box('dark', 0.03, 0.04, w - 0.06, xk + run / n / 2 - 0.01, H - k * h - 0.018, 0) // nariz
      }
      b.box('grey', 0.45, 0.05, w, -0.2, H - 0.025, 0) // rellano superior
    })
  }

  /** Tramo de baranda amarilla con rodapié y postes sobre tinteros (perno + seguro). a,c = [x,z]. */
  function railRun(b, a, c, y0, o = {}) {
    const h = o.h ?? 1.05
    const toe = o.toe ?? 0.14
    const step = o.step ?? 1.5
    const dx = c[0] - a[0]
    const dz = c[1] - a[1]
    const len = Math.hypot(dx, dz)
    const alongX = Math.abs(dx) >= Math.abs(dz)
    b.rod('yellow', [a[0], y0 + h, a[1]], [c[0], y0 + h, c[1]], 0.03, 6)
    b.rod('yellow', [a[0], y0 + h * 0.5, a[1]], [c[0], y0 + h * 0.5, c[1]], 0.022, 6)
    b.box(
      'yellow',
      alongX ? len : 0.025,
      toe,
      alongX ? 0.025 : len,
      (a[0] + c[0]) / 2,
      y0 + toe / 2 + 0.02,
      (a[1] + c[1]) / 2,
    )
    const n = Math.max(1, Math.ceil(len / step))
    for (let i = 0; i <= n; i++) {
      const x = a[0] + (dx * i) / n
      const z = a[1] + (dz * i) / n
      b.box('yellow', 0.06, h + 0.04, 0.06, x, y0 + h / 2 + 0.02, z)
      b.box('red', 0.11, 0.14, 0.11, x, y0 + 0.07, z) // tintero soldado
      b.cyl('steel', 0.011, 0.011, 0.17, x, y0 + 0.09, z, alongX ? 'z' : 'x', 6) // perno
      b.box('dark', 0.03, 0.03, 0.03, alongX ? x : x + 0.085, y0 + 0.09, alongX ? z + 0.085 : z) // seguro
    }
  }

  /**
   * Reflector led sobre soporte, con grampas y eslinga de seguridad (SUB-4: eslinga de 3 mm; el diámetro se
   * exagera para que se vea). Marco local: origen = extremo superior del poste, el reflector apunta a +x.
   */
  function reflector(b, x, y, z, dirX, dirZ, tilt) {
    b.place(x, y, z, Math.atan2(-dirZ, dirX), () => {
      b.box('dark', 0.05, 0.6, 0.05, 0, -0.3, 0) // poste
      b.box('steel', 0.075, 0.035, 0.075, 0, -0.12, 0) // grampas
      b.box('steel', 0.075, 0.035, 0.075, 0, -0.42, 0)
      b.box('dark', 0.08, 0.05, 0.36, 0.04, 0.02, 0) // horquilla
      b.place(
        0.15,
        0.06,
        0,
        0,
        () => {
          b.box('dark', 0.15, 0.24, 0.34, 0, 0, 0) // cuerpo del reflector
          b.box('lens', 0.012, 0.2, 0.3, 0.08, 0, 0) // lente
          b.box('steel', 0.03, 0.03, 0.03, -0.09, 0.09, 0.13) // bulón
          b.box('steel', 0.03, 0.03, 0.03, -0.09, 0.09, -0.13)
        },
        -tilt,
      )
      b.path(
        'steel',
        [
          [0.08, 0.2, 0.1],
          [0.02, 0.32, 0.14],
          [-0.06, 0.1, 0.06],
          [0, -0.14, 0.04],
        ],
        0.007,
        4,
        1,
      ) // eslinga
    })
  }

  /* ══════════════════════════════════════════════════════════════════════════════════════════════
   *  CAMIÓN PORTAEQUIPO (carrier SK-575, 5 ejes)
   * ══════════════════════════════════════════════════════════════════════════════════════════════ */
  // ESTÉTICO salvo: 5 ejes SK-575 (posiciones aproximadas), envolvente ~18 × 4 m, tanques cilíndricos gas-oil/agua.
  function buildCamion(kit, api, g, origCamion, e) {
    const M = kit.materials('camion')
    const b = kit.builder('camion')

    // El cartel "Equipo 10" del visor usa una textura de canvas: se rescata del original y se reubica.
    const scratch = {
      kids: [],
      add(o) {
        this.kids.push(o)
      },
    }
    origCamion(scratch, e)
    const sign = scratch.kids.find((k) => k.material && k.material.map)

    // ── chasis: largueros en I, travesaños y cubierta ──
    for (const s of [-1, 1]) {
      b.box('red', 15.3, 0.34, 0.05, -9.45, 1.0, s * 0.5) // alma
      b.box('red', 15.3, 0.04, 0.14, -9.45, 0.83, s * 0.5) // ala inferior
      b.box('red', 15.3, 0.04, 0.14, -9.45, 1.17, s * 0.5) // ala superior
    }
    for (let x = -16.6; x <= -1.9; x += 1.47) b.box('dark', 0.09, 0.28, 1.0, x, 1.0, 0) // travesaños
    b.box('red', 13.45, 0.1, 2 * RZ, -8.525, 1.325, 0) // cubierta
    for (const s of [-1, 1]) {
      b.box('grey', 13.3, 0.012, 0.6, -8.5, DECK + 0.006, s * 1.4) // pasarela de chapa antideslizante
      b.box('red', 13.45, 0.14, 0.04, -8.525, 1.2, s * (RZ - 0.02)) // faldón lateral
    }
    b.box('dark', 0.1, 0.34, 3.0, -1.72, 1.1, 0) // parachoques trasero
    b.box('dark', 0.55, 0.05, 2.9, -1.95, 1.3, 0) // escalón trasero
    for (let i = 0; i < 7; i++)
      b.box('yellow', 0.06, 0.34, 0.15, -1.66, 1.1, -1.2 + i * 0.4, [0.5, 0, 0]) // franjas de peligro

    // ── cabina del camión (cab-over, ESTÉTICO) ──
    b.box('red', 1.95, 1.0, 2.5, -16.27, 1.65, 0) // cuerpo inferior
    b.box('red', 1.75, 1.2, 2.4, -16.17, 2.75, 0) // habitáculo
    b.box('dark', 0.35, 0.05, 2.3, -17.15, 3.38, 0) // visera
    b.box('red', 1.95, 0.08, 2.5, -16.15, 3.39, 0) // techo
    b.box('glass', 0.03, 0.95, 2.2, -17.06, 2.75, 0, [0, 0, 0.12]) // parabrisas
    for (const s of [-1, 1]) {
      b.box('glass', 1.05, 0.72, 0.02, -16.3, 2.78, s * 1.205) // ventanilla
      b.box('dark', 0.012, 1.0, 0.025, -16.87, 2.5, s * 1.21) // junta de puerta
      b.box('dark', 0.012, 1.0, 0.025, -15.6, 2.5, s * 1.21)
      b.box('steel', 0.14, 0.03, 0.03, -15.75, 2.35, s * 1.225) // manija
      b.box('dark', 0.35, 0.04, 0.3, -16.5, 1.02, s * 1.35) // estribo
      b.beam('steel', [-16.95, 2.9, s * 1.2], [-17.05, 2.9, s * 1.62], 0.025, 0.025) // brazo del espejo
      b.box('dark', 0.05, 0.5, 0.2, -17.05, 2.9, s * 1.66) // espejo
      b.box('lens', 0.05, 0.22, 0.4, -17.28, 1.55, s * 0.92) // faro
    }
    b.box('dark', 0.05, 0.7, 1.35, -17.28, 1.6, 0) // parrilla
    for (let i = 0; i < 4; i++) b.box('steel', 0.03, 0.03, 1.35, -17.31, 1.36 + i * 0.16, 0)
    b.box('dark', 0.34, 0.3, 2.7, -17.5, 1.18, 0) // paragolpes
    for (let i = 0; i < 5; i++) b.box('yellow', 0.05, 0.06, 0.1, -17.2, 3.29, -0.8 + i * 0.4) // luces de gálibo
    b.cyl('steel', 0.085, 0.085, 2.5, -15.15, 2.65, 1.05, 'y', 8) // escape del camión
    b.cyl('steel', 0.11, 0.11, 0.05, -15.15, 3.92, 1.05, 'y', 8)
    for (let i = 0; i < 5; i++)
      b.box('yellow', 0.05, 0.3, 0.16, -17.27, 1.02, -1.0 + i * 0.5, [0.5, 0, 0]) // franjas bajo el paragolpes

    // ── 5 ejes con ruedas dobles ──
    const tire = (x, z) => {
      b.cyl('tire', 0.545, 0.545, 0.22, x, 0.55, z, 'z', 20)
      b.cyl('tire', 0.5, 0.545, 0.045, x, 0.55, z + 0.1325, 'z', 20)
      b.cyl('tire', 0.545, 0.5, 0.045, x, 0.55, z - 0.1325, 'z', 20)
    }
    for (const x of AXLES) {
      b.cyl('grey', 0.09, 0.09, 2.7, x, 0.55, 0, 'z', 8) // eje
      b.cyl('dark', 0.21, 0.21, 0.4, x, 0.55, 0, 'x', 10) // diferencial
      for (const s of [-1, 1]) {
        tire(x, s * 0.77) // rueda interior
        tire(x, s * 1.09) // rueda exterior
        b.cyl('steel', 0.3, 0.3, 0.03, x, 0.55, s * 1.26, 'z', 16) // llanta
        b.cyl('dark', 0.13, 0.13, 0.06, x, 0.55, s * 1.28, 'z', 10) // tapa de cubo
        for (let k = 0; k < 8; k++) {
          const a = (k * PI) / 4
          b.cyl(
            'steel',
            0.02,
            0.02,
            0.04,
            x + 0.2 * Math.cos(a),
            0.55 + 0.2 * Math.sin(a),
            s * 1.285,
            'z',
            5,
          ) // tuercas
        }
        // guardabarros (cáscara abierta sobre las dos ruedas)
        b.cyl('redTwo', 0.72, 0.72, 0.7, x, 0.55, s * 0.93, 'z', 14, true, {
          ts: 0.4 * PI,
          tl: 1.2 * PI,
        })
      }
    }
    for (const [x0, x1] of [
      [-15.3, -14.6],
      [-6.3, -3.5],
    ]) {
      for (const s of [-1, 1]) {
        b.box('dark', x1 - x0 + 0.5, 0.11, 0.16, (x0 + x1) / 2, 0.82, s * 0.62) // balancín de suspensión
        b.rod('steel', [x0, 0.6, s * 0.66], [x0, 1.1, s * 0.66], 0.03, 6) // amortiguadores
      }
    }
    b.rod('dark', [-15.6, 0.95, 0], [-3.4, 0.95, 0], 0.055, 8) // cardán
    for (const x of [-14.05, -2.95])
      for (const s of [-1, 1]) b.box('tire', 0.02, 0.5, 0.55, x + 0.18, 0.32, s * 0.95) // bandas
    // ── tanques laterales cilíndricos (ESTÉTICO: proporción de largos 3,9 : 2,6 ≈ 12.465 l : 8.300 l) ──
    for (const [len, x0, s] of [
      [3.9, -12.7, 1],
      [2.6, -12.2, -1],
    ]) {
      const xc = x0 + len / 2
      b.cyl('grey', 0.42, 0.42, len, xc, 0.75, s * 1.05, 'x', 16) // tanque
      b.cyl('grey', 0.45, 0.45, 0.04, x0 + 0.4, 0.75, s * 1.05, 'x', 16) // cintas de sujeción
      b.cyl('grey', 0.45, 0.45, 0.04, x0 + len - 0.4, 0.75, s * 1.05, 'x', 16)
      b.cyl('dark', 0.06, 0.06, 0.08, xc, 1.2, s * 1.05, 'y', 8) // tapa de llenado
    }
    // ── estabilizadores / gatos ──
    for (const x of [-13.5, -2.7]) {
      for (const s of [-1, 1]) {
        b.box('red', 0.32, 0.26, 0.9, x, 1.0, s * 0.85) // caja fija (viga de la extensión)
        b.box('steel', 0.24, 0.2, 0.7, x, 1.0, s * 1.55) // extensión telescópica
        b.cyl('red', 0.1, 0.1, 0.42, x, 0.72, s * 1.85, 'y', 10) // camisa del gato
        b.cyl('steel', 0.06, 0.06, 0.55, x, 0.32, s * 1.85, 'y', 8) // vástago
        b.cyl('dark', 0.3, 0.3, 0.06, x, 0.04, s * 1.85, 'y', 10) // patín
        b.box('dark', 0.05, 0.3, 0.05, x + 0.13, 0.9, s * 1.85) // rigidizador
      }
    }

    // ── barandas laterales (SUB-3: barandas y rodapié) ──
    const sub3 = kit.drops(g, 'SUB-3', {
      dropsNote: 'Barandas y rodapié amarillos en tinteros con perno y seguro',
    })
    const rb = kit.builder('camion_SUB-3')
    for (const s of [-1, 1]) {
      railRun(rb, [-14.9, s * (RZ - 0.04)], [-8.5, s * (RZ - 0.04)], DECK)
      railRun(rb, [-7.3, s * (RZ - 0.04)], [-2.05, s * (RZ - 0.04)], DECK)
    }
    railRun(rb, [-14.9, -(RZ - 0.04)], [-14.9, RZ - 0.04], DECK)
    rb.flush(sub3, M)

    // ── escaleras de acceso a cubierta y rellanos (SUB-2) ──
    const sub2 = kit.drops(g, 'SUB-2', {
      dropsNote: 'Escaleras y plataformas de tránsito con perno y seguro',
      dropsQty: 2,
    })
    const sb = kit.builder('camion_SUB-2')
    stair(sb, { x: -7.9, z: RZ, ry: -PI / 2, H: DECK, run: 1.5, w: 0.8, n: 5 })
    stair(sb, { x: -7.9, z: -RZ, ry: PI / 2, H: DECK, run: 1.5, w: 0.8, n: 5 })
    for (const s of [-1, 1]) {
      for (const dx of [-0.4, 0.4]) {
        sb.box('red', 0.1, 0.12, 0.1, -7.9 + dx, DECK - 0.05, s * (RZ - 0.06)) // cuna de la escalera en cubierta
        sb.cyl('steel', 0.011, 0.011, 0.14, -7.9 + dx, DECK - 0.05, s * (RZ - 0.06), 'z', 6) // perno
      }
    }
    sb.flush(sub2, M)

    // ── reflector led (SUB-4, segunda unidad; la otra está en el piso de trabajo) ──
    const sub4 = kit.drops(g, 'SUB-4', {
      dropsNote: 'Reflector led con grampas, bulones y eslinga de 3 mm',
      dropsInstance: 'carrier',
    })
    const lb = kit.builder('camion_SUB-4')
    reflector(lb, -2.05, DECK + 1.5, -(RZ - 0.04), 1, 0.35, 0.35)
    lb.flush(sub4, M)

    b.flush(g, M)
    if (sign) {
      sign.position.set(-11.5, DECK + 0.72, RZ + 0.06)
      g.add(sign)
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════════════════════════
   *  SUBESTRUCTURA Y PISO DE TRABAJO (2,6 × 3,3 m, telescópico y deslizante)
   * ══════════════════════════════════════════════════════════════════════════════════════════════ */
  // Documentado: piso 2,6 × 3,3 m, telescópico y deslizante, 1–4 m (aquí fijo en 2,30 m). Lo demás es ESTÉTICO.
  function buildSubestructura(kit, api, g) {
    const M = kit.materials('subestructura')
    const b = kit.builder('subestructura')

    // ── piso: 2,6 (x) × 3,3 (z) con abertura central para la boca de pozo ──
    for (const s of [-1, 1]) {
      b.box('red', 0.75, 0.12, 2.7, s * 0.925, FY - 0.06, 0) // tramos laterales (x)
      b.box('red', 1.1, 0.12, 0.8, 0, FY - 0.06, s * 0.95) // tramos frontal y trasero (z)
      for (let k = 0; k < 4; k++)
        b.box('grey', 1.06, 0.012, 0.05, 0, FY + 0.006, s * (0.62 + k * 0.22)) // chapa antideslizante
    }
    for (let k = 0; k < 13; k++) {
      const z = -1.32 + k * 0.22
      b.box('grey', 0.72, 0.012, 0.05, -0.925, FY + 0.006, z)
      b.box('grey', 0.72, 0.012, 0.05, 0.925, FY + 0.006, z)
    }
    for (const s of [-1, 1]) {
      b.box('steel', 1.14, 0.03, 0.05, 0, FY + 0.012, s * 0.57) // marco de la abertura
      b.box('steel', 0.05, 0.03, 1.14, s * 0.57, FY + 0.012, 0)
      b.box('red', 2.6, 0.16, 0.1, 0, FY - 0.2, s * 1.3) // vigas perimetrales
      b.box('red', 0.1, 0.16, 2.7, s * 1.25, FY - 0.2, 0)
      // deslizadores telescópicos (manga roja + tramo interior de acero)
      b.box('red', 1.7, 0.24, 0.22, -1.05, 1.97, s * 0.85)
      b.box('steel', 1.5, 0.18, 0.16, 0.55, 1.97, s * 0.85)
      b.cyl('dark', 0.03, 0.03, 0.26, -0.2, 1.97, s * 0.85, 'z', 6) // perno de bloqueo
    }
    b.box('red', 1.3, 0.14, 0.14, -0.3, FY - 0.2, 0) // travesaños bajo la abertura
    for (const s of [-1, 1]) b.box('dark', 0.3, 0.05, 0.3, -1.95, 1.4, s * 1.2) // apoyos sobre la cubierta del carrier

    // ── barandas del piso (PT-3 laterales y lado mástil; PT-4 lado plano inclinado) ──
    const pt3 = kit.drops(g, 'PT-3', {
      dropsNote: 'Barandas y rodapié en tinteros con perno pasante y seguro',
    })
    const r3 = kit.builder('subestructura_PT-3')
    railRun(r3, [-0.25, 1.65], [1.3, 1.65], FY)
    railRun(r3, [-1.3, -1.65], [1.3, -1.65], FY)
    railRun(r3, [-1.3, 0.95], [-1.3, 1.65], FY, { step: 0.9 })
    railRun(r3, [-1.3, -1.65], [-1.3, -0.95], FY, { step: 0.9 })
    r3.flush(pt3, M)
    const pt4 = kit.drops(g, 'PT-4', {
      dropsNote: 'Barandas de acceso del plano inclinado',
      dropsQty: 2,
    })
    const r4 = kit.builder('subestructura_PT-4')
    railRun(r4, [1.3, 0.6], [1.3, 1.65], FY, { step: 0.9 })
    railRun(r4, [1.3, -1.65], [1.3, -0.6], FY, { step: 0.9 })
    r4.flush(pt4, M)

    // ── PT-1: escalera lateral de acceso (peldaños y pasamanos amarillos) ──
    const pt1 = kit.drops(g, 'PT-1', { dropsNote: 'Escalera lateral de acceso con perno y seguro' })
    const s1 = kit.builder('subestructura_PT-1')
    stair(s1, { x: -0.775, z: 1.65, ry: -PI / 2, H: FY, run: 3.5, w: 0.95, n: 11 })
    s1.flush(pt1, M)

    // ── PT-2: cuna del piso y bujes de la escalera, con pernos y seguros ──
    const pt2 = kit.drops(g, 'PT-2', {
      dropsNote: 'Bujes de escalera en cuna de piso de trabajo con pernos y seguros',
      dropsQty: 2,
    })
    const c2 = kit.builder('subestructura_PT-2')
    for (const x of [-1.2, -0.35]) {
      c2.box('red', 0.14, 0.3, 0.16, x, FY - 0.22, 1.6) // cuna
      c2.cyl('steel', 0.05, 0.05, 0.16, x, FY - 0.28, 1.68, 'x', 10) // buje
      c2.cyl('steel', 0.022, 0.022, 0.3, x, FY - 0.28, 1.68, 'x', 6) // perno
      c2.box('dark', 0.03, 0.05, 0.03, x + 0.16, FY - 0.28, 1.68) // seguro
    }
    c2.flush(pt2, M)

    // ── PT-5: 4 patas de apoyo telescópicas (regulan 1–4 m) con pernos pasantes y seguro ──
    const pt5 = kit.drops(g, 'PT-5', {
      dropsNote: 'Patas de apoyo del piso con pernos pasantes y seguro',
      dropsQty: 4,
    })
    const l5 = kit.builder('subestructura_PT-5')
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const x = sx * 1.15
        const z = sz * 1.2
        l5.box('red', 0.2, 1.05, 0.2, x, 1.655, z) // manga exterior
        l5.box('steel', 0.14, 0.95, 0.14, x, 0.65, z) // tramo interior
        l5.box('dark', 0.5, 0.07, 0.5, x, 0.035, z) // patín
        l5.cyl('steel', 0.022, 0.022, 0.32, x, 1.05, z, 'x', 6) // perno pasante
        l5.box('dark', 0.03, 0.05, 0.03, x + 0.17, 1.05, z) // seguro
        for (const dx of [-1, 1])
          for (const dz of [-1, 1])
            l5.cyl('steel', 0.018, 0.018, 0.03, x + dx * 0.19, 0.075, z + dz * 0.19, 'y', 5)
      }
    }
    l5.flush(pt5, M)

    // ── PT-6: aleros rebatibles (2) con 4 pasadores y seguros ──
    const pt6 = kit.drops(g, 'PT-6', {
      dropsNote: 'Pasadores de sujeción de aleros rebatibles',
      dropsQty: 4,
    })
    const w6 = kit.builder('subestructura_PT-6')
    for (const s of [-1, 1]) {
      w6.box('red', 2.6, 0.1, 0.3, 0, FY - 0.05, s * 1.5) // alero
      w6.cyl('steel', 0.025, 0.025, 2.6, 0, FY - 0.03, s * 1.35, 'x', 6) // bisagra
      for (let k = 0; k < 9; k++)
        w6.box('grey', 0.5, 0.012, 0.05, -1.1 + k * 0.27, FY + 0.006, s * 1.5)
      for (const x of [-1.1, 1.1]) {
        w6.box('red', 0.12, 0.16, 0.1, x, FY - 0.16, s * 1.62) // orejas
        w6.cyl('steel', 0.02, 0.02, 0.3, x, FY - 0.14, s * 1.62, 'y', 6) // pasador
        w6.box('dark', 0.05, 0.03, 0.03, x, FY + 0.02, s * 1.62) // seguro
      }
    }
    w6.flush(pt6, M)

    // ── SUB-1: 6 tensores (4 diagonales laterales + 2 tirantes al carrier) y 2 pistones de deslizamiento ──
    const sub1 = kit.drops(g, 'SUB-1', {
      dropsNote:
        '6 tensores abulonados con seguros, tuerca autofrenante y chaveta (cantidad del Libro); geometría estética',
      dropsQty: 6,
    })
    const tensor = (p1, p2, name) => {
      const tb = kit.builder(`subestructura_SUB-1_${name}`)
      const sub = kit.group(`tensor_${name}`, sub1)
      const dx = p2[0] - p1[0]
      const dy = p2[1] - p1[1]
      const dz = p2[2] - p1[2]
      const len = Math.hypot(dx, dy, dz)
      const u = [dx / len, dy / len, dz / len]
      const at = (t) => [p1[0] + dx * t, p1[1] + dy * t, p1[2] + dz * t]
      tb.rod('steel', p1, p2, 0.028, 6)
      tb.rod('dark', at(0.5 - 0.16 / len), at(0.5 + 0.16 / len), 0.06, 8) // tensor (tornillo tensor)
      for (const p of [p1, p2]) {
        tb.cyl('dark', 0.05, 0.05, 0.08, p[0], p[1], p[2], 'z', 8) // ojal
        tb.cyl('steel', 0.017, 0.017, 0.14, p[0], p[1], p[2], 'z', 6) // perno
        tb.box('steel', 0.02, 0.02, 0.05, p[0] + u[0] * 0.04, p[1] + u[1] * 0.04, p[2] + 0.07) // chaveta
      }
      tb.flush(sub, M)
    }
    let ti = 0
    for (const sz of [-1, 1]) {
      const z = sz * 1.2
      tensor([-1.15, 0.3, z + sz * 0.13], [1.15, 2.05, z + sz * 0.13], ++ti)
      tensor([1.15, 0.3, z + sz * 0.13], [-1.15, 2.05, z + sz * 0.13], ++ti)
    }
    for (const sz of [-1, 1]) tensor([-1.32, 2.05, sz * 1.2], [-2.3, 1.5, sz * 1.2], ++ti) // tirantes piso → carrier
    const p1b = kit.builder('subestructura_SUB-1_pistones')
    for (const s of [-1, 1]) {
      p1b.cyl('dark', 0.08, 0.08, 1.0, -1.4, 1.83, s * 0.45, 'x', 10) // cilindro hidráulico
      p1b.cyl('steel', 0.045, 0.045, 0.8, -0.5, 1.83, s * 0.45, 'x', 8) // vástago
      p1b.box('dark', 0.1, 0.12, 0.14, -1.95, 1.83, s * 0.45) // horquilla
    }
    p1b.flush(kit.group('pistones', sub1), M)

    // ── SUB-4: reflector led con eslinga sobre la baranda del piso ──
    const sub4 = kit.drops(g, 'SUB-4', {
      dropsNote: 'Reflector led con grampas, bulones y eslinga de 3 mm',
      dropsInstance: 'piso',
    })
    const lb = kit.builder('subestructura_SUB-4')
    reflector(lb, 1.3, FY + 1.05, -1.65, -1.3, 1.65, 0.4)
    lb.flush(sub4, M)

    b.flush(g, M)
  }

  /* ══════════════════════════════════════════════════════════════════════════════════════════════
   *  CABINA DEL MAQUINISTA (x = −5,4) Y CONSOLA
   * ══════════════════════════════════════════════════════════════════════════════════════════════ */
  // Posición x = −5,4 (visor). Interior, consola y detalle de la casilla: ESTÉTICO.
  function buildCabina(kit, api, g) {
    const M = kit.materials('cabina')
    const b = kit.builder('cabina')
    const CX = -5.4
    const X0 = CX - 1.0
    const X1 = CX + 1.0
    const Z1 = 1.1
    const FL = 1.85 // piso de la casilla
    const TOP = 3.75

    /** Pared con ventana: 4 paneles alrededor del hueco (plano 'z' o 'x'). */
    const wall = (plane, fixed, a0, a1, y0, y1, win, key = 'red') => {
      const t = 0.06
      const box = (u0, u1, v0, v1) => {
        if (u1 - u0 < 1e-3 || v1 - v0 < 1e-3) return
        if (plane === 'z') b.box(key, u1 - u0, v1 - v0, t, (u0 + u1) / 2, (v0 + v1) / 2, fixed)
        else b.box(key, t, v1 - v0, u1 - u0, fixed, (v0 + v1) / 2, (u0 + u1) / 2)
      }
      if (!win) return box(a0, a1, y0, y1)
      box(a0, a1, y0, win[2])
      box(a0, a1, win[3], y1)
      box(a0, win[0], win[2], win[3])
      box(win[1], a1, win[2], win[3])
    }
    const pane = (plane, fixed, win) => {
      if (plane === 'z')
        b.box(
          'glassT',
          win[1] - win[0],
          win[3] - win[2],
          0.02,
          (win[0] + win[1]) / 2,
          (win[2] + win[3]) / 2,
          fixed,
        )
      else
        b.box(
          'glassT',
          0.02,
          win[3] - win[2],
          win[1] - win[0],
          fixed,
          (win[2] + win[3]) / 2,
          (win[0] + win[1]) / 2,
        )
    }
    const frame = (plane, fixed, win) => {
      const f = 0.045
      const [u0, u1, v0, v1] = win
      const s = (u0i, u1i, v0i, v1i) => {
        if (plane === 'z')
          b.box('dark', u1i - u0i, v1i - v0i, 0.075, (u0i + u1i) / 2, (v0i + v1i) / 2, fixed)
        else b.box('dark', 0.075, v1i - v0i, u1i - u0i, fixed, (v0i + v1i) / 2, (u0i + u1i) / 2)
      }
      s(u0 - f, u1 + f, v0 - f, v0)
      s(u0 - f, u1 + f, v1, v1 + f)
      s(u0 - f, u0, v0, v1)
      s(u1, u1 + f, v0, v1)
    }

    // ── casilla: piso, paredes con ventanas, techo (ESTÉTICO) ──
    b.box('red', X1 - X0 + 0.3, 0.12, 2.5, CX, FL - 0.06, 0) // plataforma
    b.box('grey', X1 - X0, 0.012, 2.2, CX, FL + 0.006, 0) // piso de chapa
    const winFront = [-0.85, 0.85, 2.5, 3.4]
    const winSide = [X0 + 0.4, X1 - 0.35, 2.55, 3.35]
    wall('x', X1, -Z1, Z1, FL, TOP, winFront) // pared frontal (mira al mástil)
    pane('x', X1 - 0.01, winFront)
    frame('x', X1, winFront)
    wall('x', X0, -Z1, Z1, FL, TOP, null) // pared trasera
    for (const s of [-1, 1]) {
      wall('z', s * Z1, X0, X1, FL, TOP, winSide)
      pane('z', s * Z1, winSide)
      frame('z', s * Z1, winSide)
    }
    b.box('dark', 2.3, 0.1, 2.5, CX, TOP + 0.05, 0) // techo con alero
    b.box('grey', 0.6, 0.22, 0.7, CX - 0.3, TOP + 0.21, 0.2) // equipo de aire (ESTÉTICO)
    b.box('yellow', 0.05, 0.05, 0.05, X1 + 0.02, TOP + 0.12, 0.9) // luces de trabajo
    b.box('lens', 0.1, 0.12, 0.3, X1 + 0.1, TOP - 0.05, -0.5)
    b.box('lens', 0.1, 0.12, 0.3, X1 + 0.1, TOP - 0.05, 0.5)
    // puerta trasera (lado escalera) con manija
    b.box('red', 0.03, 1.5, 0.78, X0 - 0.03, FL + 0.85, 0.35)
    b.box('steel', 0.04, 0.03, 0.14, X0 - 0.06, FL + 0.8, 0.62)
    // interior visible por los vidrios: butaca y pupitre (ESTÉTICO)
    b.box('dark', 0.5, 0.12, 0.5, CX - 0.35, FL + 0.5, 0)
    b.box('dark', 0.08, 0.6, 0.5, CX - 0.62, FL + 0.82, 0)
    b.box('dark', 0.5, 0.06, 1.5, X1 - 0.35, FL + 0.7, 0)
    b.box('dark', 0.05, 0.7, 1.5, X1 - 0.12, FL + 0.35, 0)
    for (let i = 0; i < 4; i++)
      b.cyl('steel', 0.04, 0.04, 0.02, X1 - 0.35, FL + 0.74, -0.5 + i * 0.33, 'y', 8) // instrumentos

    // ── consola de comandos frente al parabrisas (palancas, manómetros e indicador de peso) ──
    b.box('dark', 0.55, 0.95, 1.3, -3.55, DECK + 0.475, 0.05)
    b.box('dark', 0.6, 0.06, 1.3, -3.5, 2.4, 0.05, [0, 0, 0.45]) // tablero inclinado hacia el operador
    for (let i = 0; i < 4; i++) {
      b.cyl('steel', 0.06, 0.06, 0.03, -3.5 - 0.12, 2.42 + 0.05, -0.4 + i * 0.28, 'y', 10, false, {
        rot: [0, 0, 0.45],
      })
      b.cyl(
        'white',
        0.045,
        0.045,
        0.034,
        -3.5 - 0.12,
        2.42 + 0.05,
        -0.4 + i * 0.28,
        'y',
        10,
        false,
        { rot: [0, 0, 0.45] },
      )
    }
    for (const z of [-0.3, 0.05, 0.4]) {
      b.rod('steel', [-3.4, 2.45, z + 0.05], [-3.3, 2.85, z + 0.05], 0.014, 6) // palancas de izaje
      b.box(z > 0.3 ? 'red' : 'yellow', 0.06, 0.06, 0.06, -3.3, 2.88, z + 0.05)
    }
    b.rod('dark', [-3.6, 2.4, 0.75], [-3.6, 3.0, 0.75], 0.02, 6) // soporte del indicador de peso (Martin Decker)
    b.cyl('steel', 0.15, 0.15, 0.05, -3.6, 3.08, 0.75, 'x', 16)
    b.cyl('white', 0.125, 0.125, 0.054, -3.6, 3.08, 0.75, 'x', 16)

    b.flush(g, M)

    // ── CAS-2: soporte de la casilla en tinteros soldados, con perno y seguro ──
    const cas2 = kit.drops(g, 'CAS-2', {
      dropsNote: 'Casilla fijada en tinteros soldados con perno y seguro',
      dropsQty: 4,
    })
    const s2 = kit.builder('cabina_CAS-2')
    for (const x of [X0 + 0.1, X1 - 0.1]) {
      for (const z of [-1.1, 1.1]) {
        s2.box('red', 0.22, DECK + 0.355 - DECK, 0.22, x, DECK + 0.18, z) // pata
        s2.box('red', 0.3, 0.18, 0.3, x, FL - 0.2, z) // tintero soldado
        s2.cyl('steel', 0.03, 0.03, 0.42, x, FL - 0.2, z, 'x', 8) // perno
        s2.cyl('dark', 0.045, 0.045, 0.02, x + 0.22, FL - 0.2, z, 'x', 8) // arandela
        s2.box('dark', 0.03, 0.06, 0.03, x + 0.24, FL - 0.2, z + 0.03) // seguro
      }
    }
    s2.flush(cas2, M)

    // ── CAS-3: escalera de la casilla (3 peldaños) y baranda del rellano, con pasadores ──
    const cas3 = kit.drops(g, 'CAS-3', {
      dropsNote: 'Escalera con perno y seguro; baranda en tinteros soldados con perno y seguro',
    })
    const s3 = kit.builder('cabina_CAS-3')
    s3.box('grey', 0.4, 0.05, 0.9, X0 - 0.35, FL - 0.03, 0.35) // rellano
    stair(s3, { x: X0 - 0.55, z: 0.35, ry: PI, H: FL - DECK, run: 0.65, w: 0.8, n: 3, y: DECK })
    railRun(s3, [X0 - 0.55, -0.1], [X0 - 0.55, -0.1], FL) // poste de esquina (tintero)
    railRun(s3, [X0 - 0.5, -0.1], [X0 - 0.15, -0.1], FL, { h: 0.95, step: 1 })
    for (const z of [-0.05, 0.75]) {
      s3.cyl('steel', 0.02, 0.02, 0.1, X0 - 0.55, DECK + 0.05, z, 'z', 6) // pasador de la escalera
      s3.box('dark', 0.03, 0.03, 0.03, X0 - 0.55, DECK + 0.05, z + 0.06)
    }
    s3.flush(cas3, M)

    // ── CAS-1: mangueras de comando con grampas cepo abulonadas al soporte de mástil ──
    const cas1 = kit.drops(g, 'CAS-1', {
      dropsNote: 'Mangueras y comandos de izaje sujetos con grampas cepo abulonadas',
      dropsQty: 4,
    })
    const h1 = kit.builder('cabina_CAS-1')
    h1.box('red', 0.12, 1.75, 0.12, -3.3, DECK + 0.875, -0.95) // soporte
    h1.box('red', 0.3, 0.06, 0.3, -3.3, DECK + 0.03, -0.95)
    for (let k = 0; k < 4; k++) {
      const d = k * 0.05
      h1.path(
        'rubber',
        [
          [-3.55, 2.0, -0.62],
          [-3.55, 1.55, -0.8 - d],
          [-3.4 + d, 1.5, -0.95 - d],
          [-3.2 - d, 1.7, -0.95 - d],
          [-3.2 - d, 2.4, -0.95 - d],
          [-3.15 - d, 3.0, -0.95 - d],
          [-2.9, 3.4, -0.9 - d],
        ],
        0.026,
        6,
        2,
      )
    }
    for (const y of [1.9, 2.4, 2.9]) {
      h1.box('dark', 0.1, 0.12, 0.3, -3.16, y, -1.0) // grampa cepo
      for (const dz of [-0.11, 0.11])
        h1.cyl('steel', 0.014, 0.014, 0.05, -3.1, y, -1.0 + dz, 'x', 6) // bulón
    }
    h1.flush(cas1, M)
  }

  /* ══════════════════════════════════════════════════════════════════════════════════════════════
   *  MOTOR Detroit Serie 60 + transmisión Allison (x = −13,2)
   * ══════════════════════════════════════════════════════════════════════════════════════════════ */
  // Documentado: Detroit Serie 60 (475 HP), Allison OFS-4500, x = −13,2. Radiador, filtros y silenciadores: ESTÉTICO.
  function buildMotor(kit, api, g) {
    const M = kit.materials('motor')
    const b = kit.builder('motor')
    const Y = DECK
    // patín y bancada
    b.box('dark', 5.0, 0.18, 2.0, -12.0, Y + 0.09, 0)
    for (const s of [-1, 1]) b.box('red', 5.0, 0.14, 0.14, -12.0, Y + 0.25, s * 0.9)
    // radiador y ventilador (frente hacia el camión)
    b.box('dark', 0.3, 1.5, 1.85, -14.6, Y + 1.0, 0)
    for (const s of [-1, 1]) {
      b.box('red', 0.34, 1.6, 0.08, -14.6, Y + 1.0, s * 0.96)
      b.box('red', 0.34, 0.08, 1.9, -14.6, Y + 1.0 + s * 0.78, 0)
    }
    for (let i = 0; i < 15; i++) b.box('steel', 0.012, 1.4, 0.02, -14.76, Y + 1.0, -0.84 + i * 0.12)
    b.cyl('grey', 0.78, 0.78, 0.14, -14.32, Y + 1.0, 0, 'x', 20) // cubierta del ventilador
    b.cyl('dark', 0.16, 0.16, 0.2, -14.32, Y + 1.0, 0, 'x', 10)
    for (let k = 0; k < 6; k++)
      b.box('dark', 0.03, 0.62, 0.12, -14.22, Y + 1.0, 0, [(k * PI) / 3, 0, 0]) // aspas
    // bloque del motor, tapa de válvulas, múltiples
    b.box('dark', 2.0, 0.75, 0.95, -13.2, Y + 0.68, 0)
    b.box('red', 1.55, 0.3, 0.6, -13.2, Y + 1.2, 0)
    b.cyl('steel', 0.09, 0.09, 1.4, -13.2, Y + 1.5, 0.42, 'x', 8) // múltiple de admisión
    b.cyl('grey', 0.18, 0.18, 0.9, -13.85, Y + 1.72, -0.2, 'x', 12) // filtro de aire
    b.cyl('steel', 0.17, 0.17, 0.3, -12.35, Y + 1.25, -0.5, 'z', 12) // turbocompresor
    for (const z of [0.55, 0.72]) b.cyl('dark', 0.07, 0.07, 0.3, -13.6, Y + 1.0, z, 'y', 8) // filtros
    // escapes: dos chimeneas con silenciador (altura como el visor: hasta y = 5,1)
    for (const s of [-1, 1]) {
      const z = s * 0.7
      b.rod('steel', [-12.35, Y + 1.3, s * -0.5], [-12.6, 2.95, z], 0.06, 8)
      b.rod('steel', [-12.6, 2.9, z], [-12.6, 5.1, z], 0.1, 10)
      b.cyl('grey', 0.19, 0.19, 0.75, -12.6, 3.5, z, 'y', 12) // silenciador
      b.cyl('dark', 0.14, 0.14, 0.03, -12.6, 5.13, z, 'y', 10) // sombrerete
      b.cyl('grey', 0.14, 0.14, 0.05, -12.6, 4.2, z, 'y', 10)
    }
    // transmisión Allison, campana y cardán
    b.cyl('grey', 0.46, 0.42, 0.4, -12.0, Y + 0.78, 0, 'x', 14)
    b.box('grey', 1.05, 0.85, 0.9, -11.3, Y + 0.7, 0)
    b.box('dark', 0.55, 0.32, 0.06, -11.3, Y + 0.7, 0.48) // enfriador
    b.rod('steel', [-10.75, Y + 0.25, 0], [-9.75, Y + 0.25, 0], 0.06, 8)
    b.box('grey', 0.6, 0.4, 0.7, -9.75, Y + 0.25, 0) // caja angular hacia los tambores
    // protector de correas
    b.box('red', 0.03, 0.9, 0.5, -14.15, Y + 0.85, 0.42)
    b.flush(g, M)
  }

  /* ══════════════════════════════════════════════════════════════════════════════════════════════
   *  MALACATE: tambor principal (cable 1"), tambor de pistoneo (BP-1), guardas, frenos y cañerías
   * ══════════════════════════════════════════════════════════════════════════════════════════════ */
  // Documentado: tambor principal con cable 1" (x = −8,5), tambor de pistoneo (cable 9/16"). Frenos, guardas y cañerías: ESTÉTICO.
  function buildMalacate(kit, api, g, origMalacate, e) {
    const { mn, Zt } = api
    const M = kit.materials('malacate')

    // El visor hace girar el grupo `tambor_principal` (Ch) con el aparejo: se rescata del original y se rehace.
    const scratch = {
      kids: [],
      add(o) {
        this.kids.push(o)
      },
    }
    origMalacate(scratch, e)
    const drum = scratch.kids.find((k) => k.name === 'tambor_principal')
    for (const c of drum.children.slice()) {
      drum.remove(c)
      c.geometry?.dispose?.()
    }
    g.add(drum)

    // ── parte giratoria (origen local = eje del tambor; eje z) ──
    const d = kit.builder('malacate_tambor')
    d.cyl('grey', 0.55, 0.55, 1.6, 0, 0, 0, 'z', 24) // núcleo
    for (let k = 0; k < 15; k++) d.cyl('steel', 0.585, 0.585, 0.045, 0, 0, -0.7 + k * 0.1, 'z', 24) // vueltas de cable de 1"
    for (const s of [-1, 1]) {
      d.cyl('red', 0.85, 0.85, 0.12, 0, 0, s * 0.85, 'z', 32) // bridas
      d.cyl('dark', 0.24, 0.24, 0.16, 0, 0, s * 0.85, 'z', 14) // cubo
      for (let k = 0; k < 8; k++) {
        const a = (k * PI) / 4
        d.cyl('dark', 0.1, 0.1, 0.02, 0.66 * Math.cos(a), 0.66 * Math.sin(a), s * 0.915, 'z', 8) // aligeramientos
      }
    }
    d.cyl('dark', 0.78, 0.78, 0.22, 0, 0, 1.0, 'z', 24) // tambor de freno de bandas
    d.box('steel', 0.06, 0.06, 1.5, 0.6, 0, 0) // fijación del extremo del cable
    d.flush(drum, M)

    // ── parte fija ──
    const b = kit.builder('malacate')
    const X = Zt.x
    const Y = Zt.y
    b.box('red', 2.0, 0.15, 2.5, X - 0.05, DECK + 0.075, 0) // bancada
    for (const s of [-1, 1]) b.box('dark', 2.0, 0.1, 0.12, X - 0.05, DECK + 0.2, s * 1.1)
    for (const s of [-1, 1]) {
      b.box('red', 1.5, 1.1, 0.12, X, DECK + 0.7, s * 1.14) // cabezales del tambor
      b.cyl('steel', 0.22, 0.22, 0.16, X, Y, s * 1.16, 'z', 14) // caja de rodamiento
      // guarda de brida (cáscara abierta sobre el borde de la brida)
      b.cyl('redTwo', 0.95, 0.95, 0.24, X, Y, s * 0.85, 'z', 20, true, {
        ts: 0.52 * PI,
        tl: 0.96 * PI,
      })
      for (const x of [-0.6, 0.6])
        b.cyl('steel', 0.03, 0.03, 0.05, X + x, DECK + 0.3, s * 1.22, 'z', 6) // bulones de anclaje
    }
    // freno: cilindro, palanca y cañerías
    b.cyl('dark', 0.09, 0.09, 0.5, X + 0.55, Y - 0.85, 1.35, 'y', 8)
    b.box('yellow', 0.05, 0.4, 0.05, X + 0.75, Y - 0.55, 1.35, [0, 0, 0.5])
    b.box('dark', 0.3, 0.25, 0.35, X + 1.35, DECK + 0.35, 1.3) // válvula de mando de frenos
    b.path(
      'steel',
      [
        [X + 1.3, DECK + 0.5, 1.3],
        [X + 1.1, Y - 1.0, 1.45],
        [X + 0.6, Y - 1.05, 1.4],
        [X + 0.55, Y - 0.6, 1.35],
      ],
      0.02,
      6,
      1,
    )
    b.path(
      'steel',
      [
        [X + 1.35, DECK + 0.5, 1.4],
        [X + 1.5, DECK + 0.1, 1.5],
        [X - 0.6, DECK + 0.1, 1.55],
        [X - 0.9, DECK + 0.4, 1.4],
      ],
      0.018,
      6,
      1,
    )
    b.path(
      'rubber',
      [
        [X - 0.9, DECK + 0.4, 1.4],
        [X - 1.4, DECK + 0.15, 1.6],
        [X - 2.4, DECK + 0.12, 1.3],
        [X - 3.4, DECK + 0.3, 1.0],
      ],
      0.035,
      6,
      1,
    )

    // tambor de pistoneo (14.000 ft, cable 9/16"): coaxial más pequeño, junto a la caja angular
    const PX = -10.15
    const PY = 2.25
    b.box('red', 1.1, 0.12, 0.9, PX, DECK + 0.06, 0)
    for (const s of [-1, 1]) {
      b.box('red', 0.9, 0.85, 0.1, PX, DECK + 0.55, s * 0.4)
      b.cyl('steel', 0.13, 0.13, 0.12, PX, PY, s * 0.4, 'z', 12)
    }
    b.cyl('grey', 0.34, 0.34, 0.68, PX, PY, 0, 'z', 18) // núcleo
    for (let k = 0; k < 6; k++)
      b.cyl('steel', 0.365, 0.365, 0.045, PX, PY, -0.28 + k * 0.11, 'z', 18)
    for (const s of [-1, 1]) {
      b.cyl('red', 0.5, 0.5, 0.07, PX, PY, s * 0.36, 'z', 20)
      b.cyl('dark', 0.5, 0.5, 0.05, PX, PY, s * 0.435, 'z', 20) // freno
    }
    // cable de 1": línea rápida hacia la corona (como el original) y línea muerta a su anclaje
    b.rod('steel', [X + 0.1, Y + 0.6, 0.2], [mn.x - 0.45, mn.y, 0.45], 0.022, 5)
    b.rod('steel', [mn.x + 0.6, mn.y, -0.45], [-2.6, 1.6, -0.9], 0.022, 5)
    b.box('red', 0.45, 0.45, 0.5, -2.6, 1.6, -0.9) // ancla de la línea muerta
    b.cyl('steel', 0.05, 0.05, 0.3, -2.6, 1.85, -0.9, 'x', 8)
    // cable de pistoneo 9/16" hacia la corona (ESTÉTICO: recorrido rectilíneo)
    const hx = mn.x + 0.3 // bajada por delante de la cara frontal del mástil
    const hz = -0.72
    const top = 4.2
    b.rod('steel', [PX, PY + 0.4, -0.15], [hx, mn.y - 0.15, hz], 0.011, 4)
    b.rod('steel', [hx, mn.y - 0.15, hz], [hx, top, hz], 0.011, 4) // bajada del cable (fuera del punto DROPS)
    b.flush(g, M)

    // ── BP-1: guinche — cable de 9/16" sobre la boca de pozo con guardacabo, grillete de 4 cuerpos y giratorio ──
    const bp1 = kit.drops(g, 'BP-1', {
      dropsNote:
        'Cable de 9/16" ojo/ojo con guardacabo, grillete de 4 cuerpos y giratorio (guinche)',
    })
    const w = kit.builder('malacate_BP-1')
    w.cyl('steel', 0.03, 0.03, 0.12, hx, top - 0.06, hz, 'y', 8) // guardacabo
    w.box('dark', 0.04, 0.22, 0.04, hx, top - 0.19, hz) // giratorio
    w.cyl('steel', 0.035, 0.035, 0.1, hx, top - 0.35, hz, 'y', 8)
    w.cyl('dark', 0.045, 0.045, 0.06, hx, top - 0.44, hz, 'z', 8) // grillete de 4 cuerpos
    w.box('steel', 0.1, 0.02, 0.02, hx, top - 0.5, hz)
    w.flush(bp1, M)
  }
})()
