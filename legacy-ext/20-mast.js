/*
 * Equipo 10 · 20-mast.js — rediseño visual del mástil, la corona, el piso de enganche y los vientos.
 *
 * Reemplaza `Ot.mastil` y `Ot.enganche` y envuelve `Ot.vientos` (las originales quedan como base de los vientos).
 * SOLO ESTÉTICO: los detalles (luminarias, poleas, grilletes, jaula del piso de enganche, etc.) sirven de soporte
 * visual a los puntos DROPS del Libro DROPS 2024 (RCCO Rev.03). Ninguna cota nueva es dato documentado.
 *
 * ANCLAS FIJAS (otros módulos dependen de ellas; NO se mueven):
 *   - eje de las poleas de corona = t 30,4 sobre el eje local del mástil, x local .35 (`mn` = ni(30.4,.35,0));
 *     los cables del malacate y del aparejo terminan ahí.
 *   - piso de enganche = y local 18,5 (`ni(18.5)`).
 *   - largo del mástil 31,6992 m (`gt`), base en (gt.bx, gt.by). Mástil 104 ft: no se modifica.
 *   - anclajes de vientos (±25 m, base de `Ot.vientos`): no se tocan (fuente en conflicto 25 ± 3 m vs 20 m).
 *
 * Marco local del mástil (`Ml`): y = a lo largo del eje (escalado gt.scale), x = hacia la boca de pozo (frente),
 * z = lateral. Cada punto DROPS se dibuja como `Group` `drops_<ID>` con `userData.dropsId` (solo el grupo, no los
 * meshes, para que la capa DROPS calcule bien el centroide). El origen del grupo = centro aproximado del detalle.
 *
 * Rendimiento: cada bloque de geometría se FUSIONA por material (un mesh por material y por punto DROPS) en vez de
 * un mesh por barra; el reticulado del mástil original (~230 meshes) pasa a ~8. Las clases de three no se exponen
 * en `onPre`: se derivan de los helpers del visor (`le().constructor`, etc.).
 *
 * Materiales luminosos: `setMode()` del visor pone `emissive=0` en todos los materiales estándar, por eso las
 * lentes y la baliza se convierten a MeshBasicMaterial en `onPost` (y allí se maneja el parpadeo y la vista nocturna).
 */
;(() => {
  'use strict'
  if (!window.__rigExt) return

  const PI = Math.PI
  /** IDs DROPS que este módulo dibuja (para verificación cruzada con los datos). */
  const drawn = []

  window.__rigExt.onPre((api) => {
    const { Ot, D, ni, le, De, Ne, Ml, pn, ir, gt } = api
    const baseVientos = Ot.vientos
    const baseEnganche = Ot.enganche

    // ───────────── clases de three derivadas de los helpers del visor ─────────────
    const sink = { add() {} }
    const Group = Ml(sink).constructor
    const probe = le(sink, pn('#000'), 1, 1, 1, 0, 0, 0)
    const Mesh = probe.constructor
    const BoxGeometry = probe.geometry.constructor
    const BufferGeometry = Object.getPrototypeOf(BoxGeometry)
    const FloatAttr = probe.geometry.attributes.position.constructor
    probe.geometry.dispose()

    // ───────────── materiales (pintura física observada; no colores de familia de la UI) ─────────────
    const mat = (name, hex, rough, metal, extra) => {
      const m = pn(hex, rough, metal, extra)
      m.name = name
      return m
    }
    const M = {
      cream: mat('crema_tramo_inf', '#C8C2AE', 0.55, 0.22),
      cream2: mat('crema_tramo_sup', '#DAD6C6', 0.5, 0.2),
      red: mat('rojo', '#A72A32', 0.5, 0.3),
      yellow: mat('amarillo', '#F2B632', 0.5, 0.25),
      steel: mat('acero', '#6F767C', 0.45, 0.6),
      steelL: mat('acero_galv', '#A9B1B7', 0.35, 0.7),
      dark: mat('negro_acero', '#2B2F35', 0.6, 0.4),
      rubber: mat('goma', '#1B1D22', 0.85, 0.05),
      white: mat('blanco_jaula', '#E4E1D4', 0.55, 0.12),
      orange: mat('bandera_naranja', '#E8632B', 0.75, 0, { side: 2 }),
      flagW: mat('bandera_blanca', '#EEEAE0', 0.75, 0, { side: 2 }),
      // luminosos: pasan a MeshBasicMaterial en onPost (ver `userData.glow`)
      lens: mat('lente_luminaria', '#FFE9A8', 0.3, 0, {
        emissive: '#FFD27A',
        emissiveIntensity: 1.2,
      }),
      beacon: mat('baliza_roja', '#FF3B2A', 0.3, 0, {
        emissive: '#FF2010',
        emissiveIntensity: 1.4,
      }),
    }
    M.lens.userData.glow = 'lens'
    M.beacon.userData.glow = 'beacon'

    // ───────────── utilidades de geometría ─────────────
    const V = (p) => (Array.isArray(p) ? D(p[0], p[1], p[2]) : p)
    /** Puntos de un arco en el plano 'xy' | 'xz' | 'zy' (el 3.er eje queda fijo). */
    const arcPts = (cx, cy, cz, r, a0, a1, n, plane = 'xy') => {
      const pts = []
      for (let i = 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n
        const c = r * Math.cos(a)
        const s = r * Math.sin(a)
        pts.push(
          plane === 'xy'
            ? D(cx + c, cy + s, cz)
            : plane === 'xz'
              ? D(cx + c, cy, cz + s)
              : D(cx, cy + s, cz + c),
        )
      }
      return pts
    }

    /** Fusiona los meshes de una lista (mismo material) en una sola BufferGeometry, con origen desplazado. */
    function mergeMeshes(meshes, origin) {
      const geos = meshes.map((m) => {
        m.updateMatrix()
        const g = m.geometry.clone()
        g.applyMatrix4(m.matrix)
        if (origin) g.translate(-origin.x, -origin.y, -origin.z)
        return g
      })
      let nv = 0
      let nix = 0
      for (const g of geos) {
        nv += g.attributes.position.count
        nix += g.index.count
      }
      const pos = new Float32Array(nv * 3)
      const nor = new Float32Array(nv * 3)
      const idx = new Array(nix)
      let vo = 0
      let io = 0
      for (const g of geos) {
        pos.set(g.attributes.position.array, vo * 3)
        nor.set(g.attributes.normal.array, vo * 3)
        const ix = g.index.array
        for (let i = 0; i < ix.length; i++) idx[io++] = ix[i] + vo
        vo += g.attributes.position.count
        g.dispose()
      }
      meshes.forEach((m) => m.geometry.dispose())
      const geo = new BufferGeometry()
      geo.setAttribute('position', new FloatAttr(pos, 3))
      geo.setAttribute('normal', new FloatAttr(nor, 3))
      geo.setIndex(idx)
      return geo
    }

    /**
     * Acumulador de piezas: usa los helpers del visor (le/De/Ne) contra un "grabador" en vez de un grupo, y al
     * terminar (`flush`) fusiona por material y agrega un mesh por material al grupo destino.
     */
    function makeBatch() {
      const list = []
      const rec = { add: (m) => list.push(m) }
      const B = {
        box: (m, w, h, d, x, y, z) => le(rec, m, w, h, d, x, y, z),
        cyl: (m, r0, r1, h, x, y, z, axis = 'y', segs = 10) =>
          De(rec, m, r0, r1, h, x, y, z, axis, segs),
        line: (m, p, q, r = 0.02, segs = 5) => Ne(rec, m, V(p), V(q), r, segs),
        poly(m, pts, r = 0.02, segs = 5) {
          for (let i = 1; i < pts.length; i++) B.line(m, pts[i - 1], pts[i], r, segs)
        },
        ring: (m, cx, cy, cz, r, tube, plane = 'xy', n = 10) =>
          B.poly(m, arcPts(cx, cy, cz, r, 0, 2 * PI, n, plane), tube, 5),
        flush(parent, name, origin) {
          const byMat = new Map()
          for (const m of list) {
            if (!byMat.has(m.material)) byMat.set(m.material, [])
            byMat.get(m.material).push(m)
          }
          for (const [material, meshes] of byMat) {
            const mesh = new Mesh(mergeMeshes(meshes, origin), material)
            ir(mesh)
            mesh.name = `${name}_${material.name || 'mat'}`
            parent.add(mesh)
          }
          list.length = 0
        },
      }
      return B
    }

    /** Punto DROPS: Group `drops_<ID>` en `ox,oy,oz` (marco del padre) + acumulador con coordenadas del padre. */
    function spot(parent, id, ox, oy, oz) {
      const g = new Group()
      g.name = `drops_${id}`
      g.userData.dropsId = id
      g.position.set(ox, oy, oz)
      parent.add(g)
      drawn.push(id)
      const B = makeBatch()
      B.done = () => B.flush(g, `drops_${id}`, D(ox, oy, oz))
      return B
    }

    // ───────────── piezas pequeñas reutilizadas ─────────────
    /** Grillete de 4 elementos: arco, perno, tuerca y chaveta (perno a lo largo de x; el arco cuelga hacia -y). */
    function shackle(B, x, y, z, s = 1) {
      const r = 0.055 * s
      B.poly(M.steelL, arcPts(x, y, z, r, PI, 2 * PI, 6, 'xy'), 0.011 * s, 5)
      B.cyl(M.steel, 0.013 * s, 0.013 * s, 2 * r + 0.03 * s, x, y, z, 'x', 8)
      B.cyl(M.steel, 0.024 * s, 0.024 * s, 0.014 * s, x - r - 0.012 * s, y, z, 'x', 8)
      B.cyl(M.dark, 0.021 * s, 0.021 * s, 0.02 * s, x + r + 0.012 * s, y, z, 'x', 6)
      B.box(M.yellow, 0.008 * s, 0.032 * s, 0.008 * s, x + r + 0.03 * s, y, z)
    }
    /** Cáncamo: aro + vástago (plano del aro según `plane`). */
    function eyebolt(B, x, y, z, r = 0.045, plane = 'xy') {
      B.ring(M.steelL, x, y, z, r, 0.012, plane, 8)
      B.cyl(M.steel, 0.018, 0.018, 0.05, x, y - r - 0.02, z, 'y', 6)
    }
    /** Grampa de cable (perro): caballete y tuerca. */
    function clamp(B, x, y, z, s = 1) {
      B.box(M.steel, 0.085 * s, 0.05 * s, 0.05 * s, x, y, z)
      B.box(M.dark, 0.05 * s, 0.03 * s, 0.075 * s, x, y, z)
    }
    /** Polea/pasteca: llanta, dos bridas y cubo (eje a lo largo de z). */
    function sheave(B, x, y, z, r, w = 0.085) {
      B.cyl(M.steelL, r, r, w, x, y, z, 'z', 28)
      B.cyl(M.steel, r * 1.05, r * 1.05, 0.012, x, y, z + w / 2, 'z', 28)
      B.cyl(M.steel, r * 1.05, r * 1.05, 0.012, x, y, z - w / 2, 'z', 28)
      B.cyl(M.dark, r * 0.25, r * 0.25, w + 0.05, x, y, z, 'z', 12)
    }
    /** Topes guía (bulones) alrededor de una polea. */
    function guideStops(B, x, y, z, r, len, angles = [0.55, 2.65, 4.75]) {
      for (const a of angles)
        B.cyl(
          M.dark,
          0.026,
          0.026,
          len,
          x + Math.cos(a) * (r + 0.07),
          y + Math.sin(a) * (r + 0.07),
          z,
          'z',
          6,
        )
    }

    // ───────────── reticulado telescópico (fusionado) ─────────────
    /** Collar rojo alrededor del tramo (marco de 4 barras). */
    function collar(B, y, hw) {
      const c = hw + 0.07
      B.box(M.red, 2 * c + 0.1, 0.16, 0.1, 0, y, c)
      B.box(M.red, 2 * c + 0.1, 0.16, 0.1, 0, y, -c)
      B.box(M.red, 0.1, 0.16, 2 * c + 0.1, c, y, 0)
      B.box(M.red, 0.1, 0.16, 2 * c + 0.1, -c, y, 0)
    }
    /** Tramo: 4 montantes, cordones cada bahía y arriostres en X en las 4 caras (diagonales bien visibles). */
    function truss(parent, name, y0, y1, hw, bays, chordMat, collars) {
      const g = new Group()
      g.name = name
      parent.add(g)
      const B = makeBatch()
      const corners = [
        [hw, hw],
        [hw, -hw],
        [-hw, -hw],
        [-hw, hw],
      ]
      for (const [cx, cz] of corners) B.box(chordMat, 0.12, y1 - y0, 0.12, cx, (y0 + y1) / 2, cz)
      const dy = (y1 - y0) / bays
      for (let l = 0; l <= bays; l++) {
        const y = y0 + l * dy
        for (let f = 0; f < 4; f++) {
          const a = corners[f]
          const b = corners[(f + 1) % 4]
          B.line(chordMat, [a[0], y, a[1]], [b[0], y, b[1]], 0.042, 6)
          if (l < bays) {
            B.line(chordMat, [a[0], y, a[1]], [b[0], y + dy, b[1]], 0.03, 5)
            B.line(chordMat, [a[0], y + dy, a[1]], [b[0], y, b[1]], 0.03, 5)
          }
        }
      }
      for (const y of collars) collar(B, y, hw)
      B.flush(g, name)
    }

    // ───────────── luminaria de mástil (DCO-1 / DPE-1) ─────────────
    /** Artefacto vertical sobre la cara +z, con lente emisiva, ménsulas y eslinga de seguridad de 3 mm. */
    function lamp(B, x, y, zf, half = 0.3) {
      B.box(M.dark, 0.16, 2 * half, 0.09, x, y, zf + 0.075)
      B.box(M.lens, 0.1, 2 * half - 0.08, 0.03, x, y, zf + 0.135)
      B.box(M.steel, 0.05, 0.05, 0.08, x, y + half - 0.06, zf + 0.03)
      B.box(M.steel, 0.05, 0.05, 0.08, x, y - half + 0.06, zf + 0.03)
      B.line(
        M.steelL,
        [x + 0.09, y + half, zf + 0.09],
        [x + 0.2, y + half + 0.35, zf - 0.01],
        0.009,
        4,
      )
    }

    // ═══════════════════════════════ MÁSTIL + CORONA ═══════════════════════════════
    const N = 18.5 // piso de enganche (y local) — ANCLA FIJA
    const CY = 30.4 // eje de poleas de corona — ANCLA FIJA

    Ot.mastil = (g) => {
      const t = Ml(g)
      t.name = 'mastil_pivote'

      // Reticulado: tramo inferior (0–16, crema) y superior (14,8–29,6, blanco), collares rojos en uniones y tomas de vientos.
      truss(t, 'tramo_inferior', 0, 16, 0.8, 8, M.cream, [0.45, 14.9, 15.7])
      truss(t, 'tramo_superior', 14.8, 29.6, 0.55, 8, M.cream2, [N, 26, 29.3])

      // Base: ménsulas de pivote, pistones de izaje y "caballete de pivoteo" (mundo).
      const W = makeBatch()
      for (const s of [-0.92, 0.92]) {
        W.box(M.red, 0.45, 1.2, 0.25, gt.bx, 1.72, s)
        W.cyl(M.steelL, 0.15, 0.15, 0.35, gt.bx, 2.02, s, 'z', 14)
      }
      W.flush(g, 'base_pivote')
      // Pistones de izaje del 1.er tramo (0 → 90°): grupo aparte para que 81-izamiento-mastil.js los sustituya por pistones
      // dinámicos durante el izamiento. En reposo se ven igual que antes (cuerpo rojo y vástago galvanizado).
      const Wp = makeBatch()
      for (const s of [-0.62, 0.62]) {
        Wp.line(M.red, D(-5, 1.45, s), ni(5, -0.5, s), 0.11, 12)
        Wp.line(M.steelL, D(-4, 2.7, s), ni(5, -0.5, s), 0.063, 12)
      }
      const gp = new Group()
      gp.name = 'pistones_izaje'
      g.add(gp)
      Wp.flush(gp, 'pistones_izaje')

      // Conducto eléctrico vertical (línea negra fina) por la arista posterior de la cara +z, hasta la última luminaria.
      const C = makeBatch()
      C.poly(
        M.dark,
        [D(-0.55, 2, 0.83), D(-0.55, 15.9, 0.83), D(-0.55, 16.2, 0.58), D(-0.55, 28.6, 0.58)],
        0.018,
        5,
      )
      C.flush(t, 'conducto')

      buildCrown(t)
      buildUnderCrown(t)
      buildUnderBoard(t, g)
    }

    // ───────────── CORONA (COR-1..10 + soporte de banderas) ─────────────
    function buildCrown(t) {
      const cor = new Group()
      cor.name = 'corona'
      t.add(cor)

      // Estructura general de la corona: plataforma roja, montantes, baranda amarilla, arriostres y ménsulas.
      const B = makeBatch()
      B.box(M.red, 1.9, 0.12, 1.8, 0, 29.9, 0)
      for (let x = -0.8; x <= 0.81; x += 0.2) B.box(M.steelL, 0.03, 0.02, 1.8, x, 29.97, 0)
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) B.box(M.red, 0.09, 1.1, 0.09, 0.95 * sx, 30.5, 0.9 * sz)
      // aro superior rojo (aprox. 31,0 local = altura del mástil) y viga central
      for (const sz of [-1, 1]) B.box(M.red, 1.9, 0.08, 0.08, 0, 31.02, 0.9 * sz)
      for (const sx of [-1, 1]) B.box(M.red, 0.08, 0.08, 1.8, 0.95 * sx, 31.02, 0)
      B.box(M.red, 0.08, 0.08, 1.8, 0, 31.02, 0)
      // baranda intermedia amarilla
      for (const sz of [-1, 1]) B.box(M.yellow, 1.9, 0.05, 0.05, 0, 30.5, 0.9 * sz)
      for (const sx of [-1, 1]) B.box(M.yellow, 0.05, 0.05, 1.8, 0.95 * sx, 30.5, 0)
      // arriostres laterales del cajón y ménsulas de la cabeza del mástil
      for (const sz of [-1, 1]) {
        B.line(M.red, [-0.95, 30, 0.9 * sz], [0.95, 31, 0.9 * sz], 0.03, 5)
        B.line(M.red, [-0.95, 31, 0.9 * sz], [0.95, 30, 0.9 * sz], 0.03, 5)
      }
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          B.line(M.red, [0.55 * sx, 29.6, 0.55 * sz], [0.9 * sx, 29.92, 0.85 * sz], 0.05, 6)
      // ejes de las dos hileras de poleas y apoyos (pillow blocks)
      B.cyl(M.steelL, 0.05, 0.05, 1.7, 0.35, CY, 0, 'z', 10)
      B.cyl(M.steelL, 0.04, 0.04, 1.7, -0.55, 30.3, 0, 'z', 10)
      for (const sz of [-1, 1]) {
        B.box(M.red, 0.14, 0.3, 0.08, 0.35, 30.3, 0.86 * sz)
        B.box(M.red, 0.14, 0.3, 0.08, -0.55, 30.2, 0.86 * sz)
      }
      B.flush(cor, 'corona')

      // COR-4 · poleas de líneas 1, 2 y 3 del aparejo (3 poleas + 3 topes guía). Eje = ancla t 30,4, x .35.
      let s = spot(cor, 'COR-4', 0.35, CY, 0)
      for (const z of [-0.45, 0, 0.45]) sheave(s, 0.35, CY, z, 0.4)
      for (const a of [0.5, 2.6, 4.7])
        s.cyl(
          M.dark,
          0.028,
          0.028,
          1.3,
          0.35 + Math.cos(a) * 0.47,
          CY + Math.sin(a) * 0.47,
          0,
          'z',
          6,
        )
      s.done()

      // COR-1 polea de pistón · COR-2 polea viajera · COR-3 polea de punto muerto (cada una con 3 topes guía)
      const singles = [
        ['COR-1', -0.55],
        ['COR-2', 0],
        ['COR-3', 0.55],
      ]
      for (const [id, z] of singles) {
        s = spot(cor, id, -0.55, 30.3, z)
        sheave(s, -0.55, 30.3, z, 0.28)
        guideStops(s, -0.55, 30.3, z, 0.28, 0.15)
        s.done()
      }

      // COR-5 · 4 pastecas de pasaje del cable del guinche, sujetas con bulones autofrenantes
      s = spot(cor, 'COR-5', 0.82, 30.8, 0)
      for (const z of [-0.66, -0.22, 0.22, 0.66]) {
        sheave(s, 0.82, 30.78, z, 0.13, 0.05)
        s.box(M.red, 0.04, 0.24, 0.05, 0.82, 30.9, z)
        s.cyl(M.dark, 0.022, 0.022, 0.09, 0.82, 30.9, z, 'z', 6)
      }
      s.done()

      // COR-6 · placa certificada de sujeción para T-5 (brazo de la corona, placa soldada + 4 bulones, arandelas Norlock)
      s = spot(cor, 'COR-6', -0.3, 30.5, 1.5)
      s.box(M.red, 0.16, 0.14, 0.85, -0.3, 30.5, 1.32)
      s.box(M.red, 0.32, 0.42, 0.04, -0.3, 30.5, 1.77)
      for (const dx of [-0.1, 0.1])
        for (const dy of [-0.14, 0.14]) {
          s.cyl(M.steelL, 0.03, 0.03, 0.05, -0.3 + dx, 30.5 + dy, 1.8, 'z', 6)
          s.cyl(M.dark, 0.042, 0.042, 0.012, -0.3 + dx, 30.5 + dy, 1.79, 'z', 8) // arandela Norlock
        }
      s.line(M.red, [-0.3, 30.05, 0.92], [-0.3, 30.43, 1.65], 0.035, 5)
      s.done()

      // COR-9 · dispositivo retráctil T5: grillete (retención primaria) + eslinga de 4 mm (secundaria)
      s = spot(cor, 'COR-9', -0.3, 29.85, 1.77)
      shackle(s, -0.3, 30.2, 1.77)
      s.cyl(M.steel, 0.1, 0.1, 0.3, -0.3, 29.9, 1.77, 'y', 12)
      s.cyl(M.yellow, 0.105, 0.105, 0.06, -0.3, 30.05, 1.77, 'y', 12)
      s.line(M.steelL, [-0.2, 29.98, 1.78], [-0.14, 30.4, 1.79], 0.012, 4)
      s.line(M.steelL, [-0.3, 29.73, 1.77], [-0.3, 28.85, 1.77], 0.01, 4)
      s.box(M.steel, 0.05, 0.09, 0.03, -0.3, 28.82, 1.77)
      s.done()

      // COR-7 · baliza roja de la corona (roscada, con eslinga de seguridad de 3 mm). Accesorio sobre el aro superior.
      s = spot(cor, 'COR-7', 0, 31.25, 0)
      s.box(M.steel, 0.18, 0.04, 0.18, 0, 31.08, 0)
      s.cyl(M.steel, 0.07, 0.07, 0.1, 0, 31.15, 0, 'y', 10)
      s.cyl(M.beacon, 0.085, 0.085, 0.22, 0, 31.31, 0, 'y', 14)
      s.cyl(M.beacon, 0.02, 0.085, 0.1, 0, 31.47, 0, 'y', 14)
      s.line(M.steelL, [0.05, 31.2, 0.06], [0.3, 31.05, 0.35], 0.009, 4)
      s.done()

      // COR-8 · banderas en el cajón de corona (grampas con bulones, prisioneros y eslingas de 3 mm)
      s = spot(cor, 'COR-8', 0.95, 31.3, 0)
      for (const sz of [-1, 1]) {
        s.cyl(M.steelL, 0.014, 0.014, 0.55, 0.95, 31.3, 0.9 * sz, 'y', 6)
        s.box(sz > 0 ? M.orange : M.flagW, 0.5, 0.26, 0.015, 1.2, 31.42, 0.9 * sz)
        for (const y of [31.1, 31.35]) s.box(M.dark, 0.05, 0.05, 0.05, 0.95, y, 0.9 * sz)
        s.line(M.steelL, [0.95, 31.28, 0.9 * sz], [0.9, 31.04, 0.9 * sz * 0.7], 0.009, 4)
      }
      s.done()

      // COR-10 · línea de vida T3 con amortiguador (grampas ancladas con bulones, arandelas Norlock)
      s = spot(cor, 'COR-10', -0.95, 31.4, 0)
      for (const sz of [-1, 1]) {
        s.box(M.yellow, 0.05, 0.42, 0.05, -0.95, 31.23, 0.9 * sz)
        clamp(s, -0.95, 31.4, 0.87 * sz, 1)
      }
      s.line(M.steelL, [-0.95, 31.42, -0.87], [-0.95, 31.42, 0.87], 0.012, 5)
      s.cyl(M.red, 0.04, 0.04, 0.32, -0.95, 31.42, 0, 'z', 10)
      s.done()

      // COR-11 (fila sin número en el Libro: "soporte de accesorios: banderas") · tintero soldado con mariposa, cadena y eslinga 6 mm
      s = spot(cor, 'COR-11', -0.5, 31.14, 0.9)
      s.cyl(M.dark, 0.045, 0.045, 0.2, -0.5, 31.14, 0.9, 'y', 8)
      s.box(M.steelL, 0.09, 0.03, 0.03, -0.44, 31.14, 0.9)
      s.box(M.steelL, 0.03, 0.06, 0.03, -0.39, 31.14, 0.9)
      s.poly(M.steelL, [D(-0.44, 31.12, 0.9), D(-0.4, 31.06, 0.9), D(-0.36, 31.03, 0.9)], 0.012, 4)
      s.line(M.steelL, [-0.5, 31.22, 0.9], [-0.7, 31.05, 0.62], 0.02, 5)
      s.done()
    }

    // ───────────── DEBAJO DE CORONA / ENCIMA DEL PISO (DCO-1, 2, 3, 9; DCO-4..8 están en `vientos`) ─────────────
    function buildUnderCrown(t) {
      // DCO-1 · luminarias de mástil ×7 (cara +z, eslinga 3 mm). Conjunto = 7 unidades (cantidad del Libro).
      let s = spot(t, 'DCO-1', -0.2, 24.5, 0.55)
      for (const y of [20.5, 21.6, 22.7, 23.8, 24.9, 27, 28.3]) lamp(s, -0.2, y, 0.55)
      s.done()

      // DCO-2 · reflector led (grampas, bulones, eslinga 3 mm), inclinado hacia abajo, cara +z
      s = spot(t, 'DCO-2', 0.3, 28.6, 0.7)
      {
        const th = 0.4
        const b = s.box(M.dark, 0.32, 0.24, 0.12, 0.3, 28.6, 0.68)
        b.rotation.x = th
        const l = s.box(
          M.lens,
          0.28,
          0.2,
          0.02,
          0.3,
          28.6 - 0.075 * Math.sin(th),
          0.68 + 0.075 * Math.cos(th),
        )
        l.rotation.x = th
        s.box(M.steel, 0.04, 0.04, 0.16, 0.16, 28.66, 0.6)
        s.box(M.steel, 0.04, 0.04, 0.16, 0.44, 28.66, 0.6)
        s.line(M.steelL, [0.42, 28.72, 0.7], [0.56, 29.05, 0.56], 0.009, 4)
      }
      s.done()

      // DCO-3 · depósito de purga dentro del mástil, con grampas laterales, bulones y eslinga 3 mm
      s = spot(t, 'DCO-3', -0.2, 24, -0.2)
      s.cyl(M.steel, 0.13, 0.13, 0.9, -0.2, 24, -0.2, 'y', 14)
      s.cyl(M.yellow, 0.06, 0.06, 0.1, -0.2, 24.5, -0.2, 'y', 8)
      for (const y of [23.7, 24.3]) {
        s.box(M.dark, 0.34, 0.05, 0.06, -0.2, y, -0.2)
        s.box(M.dark, 0.06, 0.05, 0.36, -0.2, y, -0.2)
      }
      s.line(M.steelL, [-0.2, 24.5, -0.1], [-0.5, 24.9, -0.5], 0.009, 4)
      s.done()

      // DCO-9 · 2 poleas superiores del piso de enganche (soldadas, perno eje + tuerca castillo y chaveta)
      s = spot(t, 'DCO-9', 1.0, 22.5, 0)
      for (const z of [-0.4, 0.4]) {
        s.box(M.red, 0.6, 0.1, 0.08, 0.85, 22.45, z)
        sheave(s, 1.05, 22.55, z, 0.16, 0.05)
        s.cyl(M.dark, 0.02, 0.02, 0.09, 1.05, 22.55, z, 'z', 6)
        s.box(M.yellow, 0.01, 0.03, 0.01, 1.05, 22.55, z + 0.05)
        s.line(M.steelL, [1.05, 22.4, z], [0.5, N + 2.3, z * 1.75], 0.015, 5) // cable que sostiene la jaula (esquema)
      }
      s.done()
    }

    // ───────────── DEBAJO DEL PISO / SOBRE 1.ª SECCIÓN (DPE-1, 2, 3, 5, 6, 7, 8, 9; DPE-4 en `vientos`) ─────────────
    function buildUnderBoard(t, g) {
      // DPE-1 · luminarias de mástil ×5 (cara +z del tramo inferior)
      let s = spot(t, 'DPE-1', -0.2, 8.2, 0.8)
      for (const y of [3, 5.6, 8.2, 10.8, 13.4]) lamp(s, -0.2, y, 0.8)
      s.done()

      // DPE-2 · reflectores led ×3 en el caballete de pivoteo del mástil (mundo). Lentes hacia la boca de pozo.
      s = spot(g, 'DPE-2', gt.bx - 0.35, 2.75, 0)
      for (const z of [-0.92, 0, 0.92]) {
        const x = gt.bx - 0.35
        s.box(M.dark, 0.05, 0.36, 0.05, x - 0.02, 2.5, z)
        const b = s.box(M.dark, 0.14, 0.24, 0.3, x, 2.78, z)
        b.rotation.z = 0.35
        const l = s.box(M.lens, 0.02, 0.2, 0.26, x + 0.08, 2.79, z)
        l.rotation.z = 0.35
        s.line(M.steelL, [x - 0.05, 2.9, z + 0.12], [x - 0.3, 2.6, z + 0.3], 0.009, 4)
      }
      s.done()

      // DPE-3 · interruptor de alimentación de luz del 2.º tramo (bulones, arandelas Norlock, eslinga 3 mm)
      s = spot(t, 'DPE-3', -0.4, 4.4, 0.86)
      s.box(M.dark, 0.16, 0.22, 0.09, -0.4, 4.4, 0.88)
      s.box(M.red, 0.04, 0.05, 0.03, -0.4, 4.44, 0.945)
      s.line(M.steelL, [-0.36, 4.5, 0.9], [-0.2, 4.85, 0.78], 0.009, 4)
      s.done()

      // DPE-6 · caja de conexión eléctrica de todo el mástil (abulonada, arandelas Norlock)
      s = spot(t, 'DPE-6', -0.55, 1.7, 0.92)
      s.box(M.dark, 0.34, 0.5, 0.2, -0.55, 1.7, 0.92)
      s.box(M.yellow, 0.36, 0.04, 0.22, -0.55, 1.98, 0.92)
      for (const dx of [-0.13, 0.13])
        for (const dy of [-0.2, 0.2])
          s.cyl(M.steelL, 0.02, 0.02, 0.03, -0.55 + dx, 1.7 + dy, 1.03, 'z', 6)
      s.done()

      // Stand pipe (tubo vertical por el frente del tramo inferior, hasta debajo del piso de enganche)
      const P = makeBatch()
      P.line(M.steel, [0.9, 2.6, 0.45], [0.9, 16.3, 0.45], 0.055, 8)
      P.flush(t, 'stand_pipe')

      // DPE-7 · soporte de stand pipe: grampas cepo abulonadas a la estructura del mástil
      s = spot(t, 'DPE-7', 0.86, 13.7, 0.45)
      for (const y of [13, 14.4]) {
        s.box(M.dark, 0.14, 0.1, 0.14, 0.9, y, 0.45)
        s.box(M.dark, 0.1, 0.06, 0.06, 0.83, y, 0.45)
        s.cyl(M.steelL, 0.018, 0.018, 0.2, 0.9, y, 0.45, 'z', 6)
      }
      s.done()

      // DPE-8 · grampas en el manguerote de cuello de cisne (arandelas Norlock; grillete de 4 elementos + eslinga)
      s = spot(t, 'DPE-8', 1.2, 16.8, 0.45)
      s.poly(
        M.steel,
        [
          D(0.9, 16.3, 0.45),
          D(0.9, 16.6, 0.45),
          D(1, 16.95, 0.45),
          D(1.25, 17.05, 0.45),
          D(1.5, 16.9, 0.45),
          D(1.58, 16.55, 0.45),
        ],
        0.055,
        8,
      )
      s.line(M.rubber, [1.58, 16.5, 0.45], [1.62, 15.3, 0.45], 0.07, 8)
      s.cyl(M.steel, 0.085, 0.085, 0.08, 1.62, 15.28, 0.45, 'y', 8)
      for (const [x, y] of [
        [1.0, 16.95],
        [1.55, 16.7],
      ]) {
        s.box(M.dark, 0.13, 0.08, 0.13, x, y, 0.45)
      }
      shackle(s, 1.25, 16.85, 0.62)
      s.line(M.steelL, [1.25, 17.0, 0.5], [1.25, 16.9, 0.6], 0.01, 4)
      s.done()

      // DPE-9 · pulmón del indicador de peso Martin Decker (prensado a cable; cadena de seguridad con grampa)
      s = spot(t, 'DPE-9', 0.15, 8.4, 0.92)
      s.cyl(M.steel, 0.15, 0.15, 0.09, 0.15, 8.4, 0.92, 'z', 16)
      s.cyl(M.dark, 0.08, 0.08, 0.05, 0.15, 8.4, 0.98, 'z', 10)
      s.box(M.steel, 0.24, 0.06, 0.06, 0.15, 8.62, 0.85)
      s.poly(
        M.steelL,
        [D(0.05, 8.3, 0.95), D(0.02, 8.15, 0.98), D(-0.02, 8.05, 0.9), D(0.02, 7.95, 0.85)],
        0.012,
        4,
      )
      clamp(s, 0.02, 8.05, 0.9)
      s.done()

      // DPE-5 · 2 poleas de deslizamiento interiores del piso (abulonadas a cáncamos soldados; en ruedas sobre el frente del tramo)
      s = spot(t, 'DPE-5', 0.68, N - 0.4, 0)
      for (const z of [-0.55, 0.55]) {
        sheave(s, 0.68, N - 0.4, z, 0.12, 0.06)
        s.box(M.red, 0.06, 0.28, 0.08, 0.6, N - 0.28, z)
      }
      s.done()
    }

    // ═══════════════════════════════ PISO DE ENGANCHE (jaula) ═══════════════════════════════
    // Estético / fuente: folleto Equipo 10 p1 (foto: jaula/caja grande colgada del mástil con logo de la empresa) y Libro DROPS
    // p7–11. El piso de enganche real NO tiene cotas en los documentos: huella y alturas aquí son aproximadas.
    // Detalle adicional: referencia CAD genérica `docs/references/enganche/` (tipología, no cota; ver README de esa carpeta).

    /** Cadena de retención: `n` eslabones cuadrados alternados (planos a 90°) entre `p` y `q` ([x, y, z]). */
    function chain(B, p, q, n) {
      for (let i = 0; i < n; i++) {
        const u = n > 1 ? i / (n - 1) : 0
        const x = p[0] + (q[0] - p[0]) * u
        const y = p[1] + (q[1] - p[1]) * u
        const z = p[2] + (q[2] - p[2]) * u
        if (i % 2) B.box(M.steelL, 0.012, 0.045, 0.028, x, y, z)
        else B.box(M.steelL, 0.028, 0.045, 0.012, x, y, z)
      }
    }

    /** Textura de chapa antideslizante (losanges alternados a 90°) a partir del constructor de la textura del logo. */
    function plateTexture(refMap) {
      if (!refMap || typeof document === 'undefined') return null
      try {
        const c = document.createElement('canvas')
        c.width = c.height = 128
        const ctx = c.getContext('2d')
        ctx.fillStyle = '#5f666c'
        ctx.fillRect(0, 0, 128, 128)
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 4; j++) {
            ctx.save()
            ctx.translate(16 + 32 * i, 16 + 32 * j)
            ctx.rotate(((i + j) % 2 ? 1 : -1) * (PI / 4))
            ctx.fillStyle = '#9aa2a8'
            ctx.fillRect(-11, -3, 22, 6)
            ctx.fillStyle = '#c3c9cd'
            ctx.fillRect(-11, -3, 22, 2)
            ctx.restore()
          }
        const tex = new refMap.constructor(c)
        tex.wrapS = tex.wrapT = 1000 // RepeatWrapping
        tex.colorSpace = refMap.colorSpace
        tex.anisotropy = 4
        tex.needsUpdate = true
        return tex
      } catch (e) {
        console.warn('[20-mast] textura de chapa no disponible', e)
        return null
      }
    }

    /** Piso de chapa antideslizante: 2 cuadriláteros (una malla, UV en metros / 0,32). Sin textura cae a color liso. */
    function buildDeckPlate(t, logo) {
      const tex = plateTexture(logo && logo.map)
      const plate = mat(
        'chapa_antideslizante',
        tex ? '#ffffff' : '#7d848a',
        0.55,
        0.45,
        tex ? { map: tex } : undefined,
      )
      const y = N + 0.036
      // x 0,62–1,95 (todo el ancho) y x 1,95–2,86 solo de z −0,05 a 1,0: en el resto se apoyan los dedos del peine (PE-6)
      const quads = [
        [0.62, -1.0, 1.95, 1.0],
        [1.95, -0.05, 2.86, 1.0],
      ]
      const pos = []
      const nor = []
      const uv = []
      const idx = []
      quads.forEach(([x0, z0, x1, z1], k) => {
        for (const [x, z] of [
          [x0, z0],
          [x0, z1],
          [x1, z1],
          [x1, z0],
        ]) {
          pos.push(x, y, z)
          nor.push(0, 1, 0)
          uv.push(x / 0.32, z / 0.32)
        }
        idx.push(4 * k, 4 * k + 1, 4 * k + 3, 4 * k + 1, 4 * k + 2, 4 * k + 3)
      })
      const geo = new BufferGeometry()
      geo.setAttribute('position', new FloatAttr(new Float32Array(pos), 3))
      geo.setAttribute('normal', new FloatAttr(new Float32Array(nor), 3))
      geo.setAttribute('uv', new FloatAttr(new Float32Array(uv), 2))
      geo.setIndex(idx)
      const mesh = new Mesh(geo, plate)
      ir(mesh)
      mesh.name = 'piso_chapa'
      t.add(mesh)
    }

    /** Arco tubular de contención (pórtico trasero, lado mástil) con panel de barandas a cada lado. Una malla blanca. */
    function buildContainmentArch(t) {
      const g = new Group()
      g.name = 'arco_contencion'
      t.add(g)
      const A = makeBatch()
      const AX = 1.05 // plano del arco (x local)
      const R = 0.5 // semiancho de la abertura de paso
      const top = N + 1.8 // arranque del semicírculo (cima N + 2,3 = aro superior de la jaula)
      for (const s of [-1, 1]) {
        A.line(M.white, [AX, N - 0.02, s * R], [AX, top, s * R], 0.035, 8)
        A.box(M.white, 0.14, 0.02, 0.14, AX, N + 0.04, s * R) // placa de base abulonada
        for (const y of [0.45, 0.9, 1.35])
          A.line(M.white, [AX, N + y, s * R], [AX, N + y, s * 1.05], 0.022, 6)
        A.line(M.white, [AX, top - 0.1, s * R], [0.4, N + 2.3, s * 1.05], 0.03, 6) // tirante trasero al aro
      }
      A.poly(M.white, arcPts(AX, top, 0, R, 0, PI, 12, 'zy'), 0.035, 8)
      A.flush(g, 'arco_contencion')
    }

    /** Patines de apoyo bajo el marco rojo (tubo con tapas, cartelas y travesaños). Una malla oscura. */
    function buildSkids(t) {
      const g = new Group()
      g.name = 'patines'
      t.add(g)
      const P = makeBatch()
      for (const z of [-0.95, 0.95]) {
        P.cyl(M.dark, 0.055, 0.055, 2.75, 1.625, N - 0.2, z, 'x', 10)
        for (const x of [0.25, 3.0]) P.cyl(M.dark, 0.07, 0.07, 0.03, x, N - 0.2, z, 'x', 10)
        for (const x of [0.7, 1.6, 2.5]) P.box(M.dark, 0.26, 0.14, 0.02, x, N - 0.14, z)
      }
      for (const x of [0.45, 2.7]) P.cyl(M.dark, 0.035, 0.035, 1.9, x, N - 0.2, 0, 'z', 8)
      P.flush(g, 'patines')
    }

    Ot.enganche = (g) => {
      const t = Ml(g)
      t.name = 'acceso_y_enganchador'

      // Logo: se reutiliza el material con textura del piso original (canvas "Equipo 10") corriendo la función original en vacío.
      let logo = null
      let Plane = null
      try {
        const scratch = new Group()
        baseEnganche(scratch, {})
        scratch.traverse((o) => {
          if (!logo && o.isMesh && o.material && o.material.map) {
            logo = pn('#ffffff', 0.6, 0.05, { map: o.material.map })
            logo.name = 'logo_EMPRESA'
            Plane = o.geometry.constructor
          }
        })
      } catch (e) {
        console.warn('[20-mast] logo no disponible', e)
      }

      // Escalera de acceso del enganchador (montantes amarillos, peldaños, aros de protección, cable de seguridad) + pasarela.
      const L = makeBatch()
      for (const z of [-0.3, 0.3]) L.box(M.yellow, 0.065, N + 0.7, 0.065, -0.92, (N + 0.7) / 2, z)
      for (let y = 0.25; y < N + 0.5; y += 0.3) L.box(M.steelL, 0.03, 0.03, 0.6, -0.94, y, 0)
      for (let y = 3; y < N; y += 1.1) {
        const hoop = []
        for (let i = 0; i <= 6; i++)
          hoop.push(D(-0.94 - 0.44 * Math.sin((PI * i) / 6), y, 0.44 * Math.cos((PI * i) / 6)))
        L.poly(M.steelL, hoop, 0.02, 5)
      }
      L.line(M.steelL, [-1.23, 0.4, 0], [-1.23, N + 0.8, 0], 0.017, 6)
      L.box(M.steelL, 1.45, 0.05, 0.7, -0.27, N - 0.02, 0)
      L.flush(t, 'escalera')

      // ── Detalle del piso según referencia CAD genérica (docs/references/enganche/README.md; APROXIMADO, sin cotas as-built):
      // piso de chapa antideslizante, peines con dedos individuales, paneles con barandas de caños horizontales,
      // arco tubular de contención y patines de apoyo. Huella y alturas = envolvente anterior (no cambian).
      // Mallas nuevas y nombradas: `piso_chapa`, `arco_contencion`, `patines` (el resto suma a `jaula_*` y a los `drops_PE-*`).
      buildDeckPlate(t, logo)

      // Jaula: sub-piso, marco rojo, montantes y aro superior blancos, paneles laterales con logo, barandas.
      const B = makeBatch()
      B.box(M.dark, 1.6, 0.06, 2.1, 1.15, N, 0) // sub-piso x 0,35–1,95
      B.box(M.dark, 0.95, 0.06, 1.1, 2.425, N, 0.5) // sub-piso x 1,95–2,90 (z ≥ −0,05); el resto queda abierto bajo los dedos del peine
      for (const z of [-1.05, 1.05]) B.box(M.red, 2.7, 0.14, 0.09, 1.6, N - 0.05, z)
      for (const x of [0.35, 2.9]) B.box(M.red, 0.09, 0.14, 2.2, x, N - 0.05, 0)
      for (const x of [0.9, 1.6, 2.3]) B.box(M.red, 0.06, 0.1, 2.0, x, N - 0.08, 0)
      // tirantes inferiores: esquinas delanteras hacia el mástil
      for (const z of [-1, 1]) {
        B.line(M.red, [0.55, N - 2.3, 0.75 * z], [2.8, N - 0.06, 1.0 * z], 0.05, 6)
        B.line(M.red, [0.55, N - 1.2, 0.75 * z], [2.0, N - 0.06, 1.0 * z], 0.04, 6)
      }
      // montantes y aro superior
      for (const x of [0.4, 1.6, 2.85])
        for (const z of [-1.05, 1.05]) B.box(M.white, 0.07, 2.3, 0.07, x, N + 1.15, z)
      for (const z of [-1.05, 1.05]) B.box(M.white, 2.5, 0.06, 0.06, 1.63, N + 2.3, z)
      for (const x of [0.4, 2.85]) B.box(M.white, 0.06, 0.06, 2.1, x, N + 2.3, 0)
      for (let x = 0.7; x < 2.8; x += 0.5) B.box(M.steelL, 0.03, 0.03, 2.1, x, N + 2.32, 0) // techo enrejado
      // largueros longitudinales bajo el piso y placas de base de los montantes (aproximado)
      for (const z of [-0.45, 0.45]) B.box(M.red, 2.5, 0.1, 0.05, 1.6, N - 0.08, z)
      for (const x of [0.4, 1.6, 2.85])
        for (const z of [-1.05, 1.05]) B.box(M.white, 0.14, 0.02, 0.14, x, N + 0.045, z)
      // paneles laterales (mitad inferior de chapa, con nervios y cantonera superior) y barandas de caños horizontales
      for (const z of [-1.06, 1.06]) {
        B.box(M.white, 1.8, 0.95, 0.035, 1.95, N + 0.6, z)
        B.box(M.white, 1.8, 0.03, 0.08, 1.95, N + 1.08, z * 1.01)
        for (const x of [1.4, 1.95, 2.5]) B.box(M.white, 0.04, 0.9, 0.02, x, N + 0.6, z * 0.97)
        for (const y of [1.4, 1.7, 2.0])
          B.cyl(M.steelL, 0.018, 0.018, 2.45, 1.625, N + y, z, 'x', 6)
        for (const x of [1.05, 2.2]) B.box(M.white, 0.05, 1.2, 0.05, x, N + 1.7, z)
        B.box(M.yellow, 2.5, 0.05, 0.06, 1.63, N + 1.12, z * 1.01)
      }
      // panel trasero lateral (lado +z, entre el mástil y el arco); en el lado −z queda la puerta PE-7
      B.box(M.white, 0.65, 0.5, 0.03, 0.725, N + 0.4, 1.06)
      // frente: barandas y rodapié
      for (const y of [N + 0.55, N + 1.1]) B.box(M.yellow, 0.05, 0.05, 2.1, 2.9, y, 0)
      B.box(M.red, 0.03, 0.15, 2.1, 2.9, N + 0.1, 0)
      for (const z of [-1.0, 1.0]) B.box(M.yellow, 0.05, 1.15, 0.05, 2.9, N + 0.58, z) // postes de la baranda frontal
      // rodapiés laterales de la zona de dedos (contienen tubulares y herramientas)
      for (const z of [-1.0, 1.0]) B.box(M.red, 0.9, 0.09, 0.02, 2.4, N + 0.06, z)
      B.flush(t, 'jaula')

      buildContainmentArch(t)
      buildSkids(t)

      // Logo de la empresa en ambos paneles laterales (el del lado -z se gira para que se lea)
      if (logo && Plane) {
        for (const sgn of [1, -1]) {
          const p = new Mesh(new Plane(1.68, 0.42), logo)
          p.position.set(1.95, N + 0.6, sgn * 1.085)
          if (sgn < 0) p.rotation.y = PI
          p.name = 'logo_EMPRESA'
          ir(p)
          t.add(p)
        }
      }

      // PE-1 · Karam/caran block del enganchador (sujeto a cáncamo con grillete)
      let s = spot(t, 'PE-1', 2.3, N + 1.85, 0)
      eyebolt(s, 2.3, N + 2.24, 0, 0.04, 'xy')
      shackle(s, 2.3, N + 2.16, 0)
      s.line(M.steelL, [2.3, N + 2.1, 0], [2.3, N + 1.75, 0], 0.014, 5)
      s.box(M.red, 0.12, 0.16, 0.09, 2.3, N + 1.65, 0)
      s.done()

      // PE-2 · sujeción del cable del pirosalva (cáncamos y grilletes de cuatro elementos)
      s = spot(t, 'PE-2', 2.95, N + 0.35, -0.9)
      for (const z of [-0.98, -0.82]) {
        eyebolt(s, 2.95, N + 0.4, z, 0.04, 'zy')
        shackle(s, 2.95, N + 0.32, z, 0.9)
      }
      s.done()

      // PE-3 · pirosalva: elemento original abulonado con 7 bulones (4 + 3); cable de escape (tramo corto, esquemático)
      s = spot(t, 'PE-3', 2.98, N + 0.45, -0.55)
      s.box(M.red, 0.03, 0.34, 0.44, 2.95, N + 0.45, -0.55)
      for (const dz of [-0.15, -0.05, 0.05, 0.15])
        s.cyl(M.steelL, 0.022, 0.022, 0.035, 2.98, N + 0.54, -0.55 + dz, 'x', 6)
      for (const dz of [-0.1, 0, 0.1])
        s.cyl(M.steelL, 0.022, 0.022, 0.035, 2.98, N + 0.36, -0.55 + dz, 'x', 6)
      s.line(M.steelL, [2.98, N + 0.6, -0.55], [4.6, N - 0.9, -0.7], 0.014, 5)
      s.done()

      // PE-4 · rejilla de material desplegable (abulonada con seguros, tuerca autofrenante, arandelas Norlock)
      s = spot(t, 'PE-4', 1.45, N, 1.4)
      s.box(M.dark, 1.3, 0.04, 0.55, 1.45, N - 0.02, 1.36)
      for (let x = 0.9; x <= 2.0; x += 0.22) s.box(M.steelL, 0.02, 0.03, 0.55, x, N + 0.005, 1.36)
      s.cyl(M.red, 0.03, 0.03, 1.3, 1.45, N + 0.02, 1.085, 'x', 8)
      for (const x of [0.85, 2.05]) s.box(M.yellow, 0.05, 0.05, 0.05, x, N + 0.06, 1.1)
      // detalle (aproximado): largueros longitudinales de la rejilla y baranda baja exterior con postes
      for (const z of [1.2, 1.5]) s.box(M.steelL, 1.3, 0.03, 0.02, 1.45, N + 0.005, z)
      s.box(M.yellow, 1.3, 0.04, 0.03, 1.45, N + 0.06, 1.63)
      for (const x of [0.85, 2.05]) s.box(M.yellow, 0.04, 0.12, 0.04, x, N + 0.05, 1.63)
      s.done()

      // PE-5 · trampolín (abulonado; eslinga de seguridad de 3/8" con 4 eslabones engrampados)
      s = spot(t, 'PE-5', 3.3, N, 0)
      s.box(M.red, 0.9, 0.05, 0.55, 3.35, N - 0.03, 0)
      s.line(M.steelL, [3.78, N, 0.25], [2.9, N + 2.3, 0.25], 0.012, 5)
      for (let i = 1; i <= 4; i++) {
        const u = i * 0.17
        s.box(M.dark, 0.05, 0.05, 0.05, 3.78 + (2.9 - 3.78) * u, N + 2.3 * u, 0.25)
      }
      // detalle (aproximado): tacos antideslizantes, rodapiés laterales y bisagras con pasador contra el borde del piso
      for (let x = 3.0; x <= 3.76; x += 0.15) s.box(M.steelL, 0.02, 0.012, 0.5, x, N, 0)
      for (const z of [-0.285, 0.285]) s.box(M.red, 0.9, 0.09, 0.02, 3.35, N + 0.03, z)
      for (const z of [-0.2, 0.2]) s.cyl(M.dark, 0.03, 0.03, 0.1, 2.93, N - 0.02, z, 'z', 8)
      s.cyl(M.dark, 0.012, 0.012, 0.6, 2.93, N - 0.02, 0, 'z', 6)
      s.done()

      // PE-6 · peines del piso de enganche (abulonados; eslinga 3/8"). Ocho dedos individuales (APROXIMADO: paso y ancho
      // de la referencia genérica, no cota del equipo) apoyados en un travesaño raíz y un larguero inferior.
      s = spot(t, 'PE-6', 2.4, N + 0.09, 0)
      for (let i = 0; i < 8; i++) {
        const z = -0.93 + 0.12 * i
        s.box(M.steelL, 0.86, 0.03, 0.04, 2.4, N + 0.04, z)
        const tip = s.box(M.steelL, 0.1, 0.03, 0.04, 2.87, N + 0.028, z) // punta biselada
        tip.rotation.z = -0.25
        s.cyl(M.steelL, 0.014, 0.014, 0.03, 2.02, N + 0.07, z, 'y', 5) // bulón de fijación
      }
      s.box(M.steelL, 0.05, 0.06, 0.9, 1.955, N + 0.05, -0.52) // travesaño raíz
      s.box(M.steelL, 0.05, 0.05, 0.9, 2.55, N, -0.52) // larguero inferior de apoyo
      s.box(M.steelL, 0.9, 0.09, 0.02, 2.4, N + 0.04, -0.03) // guía lateral hacia el paso central
      s.line(M.steelL, [2.88, N + 0.12, -0.98], [1.98, N + 0.1, -0.9], 0.012, 5)
      s.done()

      // PE-7 · puerta de ingreso al piso (bisagras soldadas, cadenas soldadas), lado -z junto al mástil
      s = spot(t, 'PE-7', 0.7, N + 0.55, -1.08)
      s.box(M.yellow, 0.6, 0.04, 0.04, 0.7, N + 1.05, -1.08)
      s.box(M.yellow, 0.6, 0.04, 0.04, 0.7, N + 0.12, -1.08)
      for (const x of [0.4, 1.0]) s.box(M.yellow, 0.04, 0.95, 0.04, x, N + 0.58, -1.08)
      s.box(M.yellow, 0.6, 0.03, 0.03, 0.7, N + 0.58, -1.08)
      for (const y of [N + 0.3, N + 0.85]) s.cyl(M.steel, 0.03, 0.03, 0.09, 0.4, y, -1.08, 'y', 6)
      // detalle (aproximado): travesaños intermedios, diagonal, pestillo y cadena de retención de eslabones alternados
      for (const y of [0.35, 0.82]) s.box(M.yellow, 0.6, 0.03, 0.03, 0.7, N + y, -1.08)
      s.line(M.yellow, [0.4, N + 0.12, -1.08], [1.0, N + 1.05, -1.08], 0.015, 4)
      s.cyl(M.steel, 0.02, 0.02, 0.09, 0.98, N + 0.58, -1.1, 'z', 6)
      chain(s, [1.0, N + 0.98, -1.115], [1.1, N + 0.6, -1.115], 8)
      for (const y of [N + 0.98, N + 0.6]) s.box(M.steelL, 0.05, 0.03, 0.03, 1.07, y, -1.12)
      s.done()

      // PE-8 · sujeción del piso de enganche (cáncamo soldado)
      s = spot(t, 'PE-8', 0.5, N - 0.14, 1.1)
      s.box(M.steelL, 0.1, 0.06, 0.06, 0.5, N - 0.13, 1.09)
      s.ring(M.steelL, 0.5, N - 0.22, 1.13, 0.045, 0.014, 'xy', 8)
      s.done()

      // PE-9 · cable de sujeción de seguridad del piso (grillete a cáncamo + 4 grampas), lado +z
      s = spot(t, 'PE-9', 0.3, N + 3.4, 0.85)
      shackle(s, 0.45, N + 2.4, 1.05)
      s.line(M.steelL, [0.45, N + 2.32, 1.05], [0.15, N + 4.5, 0.6], 0.016, 5)
      for (let i = 0; i < 4; i++) {
        const u = 0.7 + i * 0.075
        clamp(s, 0.45 + (0.15 - 0.45) * u, N + 2.32 + (4.5 - 2.32) * u, 1.05 + (0.6 - 1.05) * u, 1)
      }
      shackle(s, 0.15, N + 4.55, 0.6)
      s.done()

      // PE-11 · puerta de ingreso del pirosalva (bisagras soldadas; perno pasador sujeto a cadena soldada), frente +z
      s = spot(t, 'PE-11', 2.9, N + 0.58, 0.65)
      s.box(M.yellow, 0.04, 0.04, 0.6, 2.93, N + 1.05, 0.65)
      s.box(M.yellow, 0.04, 0.04, 0.6, 2.93, N + 0.12, 0.65)
      for (const z of [0.35, 0.95]) s.box(M.yellow, 0.04, 0.95, 0.04, 2.93, N + 0.58, z)
      s.box(M.yellow, 0.03, 0.03, 0.6, 2.93, N + 0.58, 0.65)
      s.cyl(M.steel, 0.028, 0.028, 0.1, 2.93, N + 0.58, 0.35, 'y', 6)
      // detalle (aproximado): travesaños intermedios, diagonal y cadena del perno pasador de eslabones alternados
      for (const y of [0.35, 0.82]) s.box(M.yellow, 0.03, 0.03, 0.6, 2.93, N + y, 0.65)
      s.line(M.yellow, [2.93, N + 0.12, 0.35], [2.93, N + 1.05, 0.95], 0.015, 4)
      chain(s, [2.96, N + 0.5, 0.36], [2.99, N + 0.28, 0.46], 5)
      s.done()

      // PE-12 · 2 poleas de deslizamiento del piso (viajeras, abulonadas a cáncamos soldados) sobre el frente del mástil
      s = spot(t, 'PE-12', 0.68, N + 2.15, 0)
      for (const z of [-0.55, 0.55]) {
        sheave(s, 0.68, N + 2.15, z, 0.12, 0.06)
        s.box(M.red, 0.07, 0.3, 0.09, 0.52, N + 2.25, z)
      }
      s.done()
    }

    // ═══════════════════════════════ VIENTOS ═══════════════════════════════
    Ot.vientos = (g, mats) => {
      baseVientos(g, mats) // cables, anclajes y vientos posteriores al carrier (posiciones intactas)

      // Tensores (torniquetes) amarillos en los 8 cables de anclaje.
      const T = makeBatch()
      const anchors = [D(-25, 0.12, 25), D(-25, 0.12, -25), D(25, 0.12, 25), D(25, 0.12, -25)]
      for (const a of anchors) {
        for (const n of [26, N]) {
          const m = ni(n, a.x < 0 ? -0.6 : 0.6, a.z < 0 ? -0.5 : 0.5)
          const p0 = a.clone().lerp(m, 0.058)
          const p1 = a.clone().lerp(m, 0.078)
          T.line(M.yellow, p0, p1, 0.045, 8)
          for (const p of [p0, p1]) T.cyl(M.steel, 0.06, 0.06, 0.06, p.x, p.y, p.z, 'y', 8)
        }
      }
      T.flush(g, 'tensores')

      // Puntos de toma sobre el mástil: ni(t, desplazamiento x local, z).
      const up = (xs, zs) => ni(26, 0.6 * xs, 0.5 * zs)
      const low = (xs, zs) => ni(N, 0.6 * xs, 0.5 * zs)

      // DCO-4 · vientos posteriores del 2.º tramo (2 grilletes de 4 elementos certificados)
      let s = spot(g, 'DCO-4', up(-1, 0).x, up(-1, 0).y, 0)
      for (const zs of [-1, 1]) shackle(s, up(-1, zs).x, up(-1, zs).y - 0.1, up(-1, zs).z, 1.2)
      s.done()

      // DCO-8 · vientos frontales del 2.º tramo (2 cáncamos certificados con perno y chaveta + grilletes)
      s = spot(g, 'DCO-8', up(1, 0).x, up(1, 0).y, 0)
      for (const zs of [-1, 1]) {
        const p = up(1, zs)
        eyebolt(s, p.x, p.y + 0.02, p.z, 0.06, 'xy')
        shackle(s, p.x, p.y - 0.1, p.z, 1.2)
      }
      s.done()

      // PE-10 · vientos de anclaje inferior (4 grilletes en la toma de y = 18,5)
      let c = low(0, 0)
      s = spot(g, 'PE-10', c.x, c.y, 0)
      for (const xs of [-1, 1])
        for (const zs of [-1, 1]) {
          const p = low(xs, zs)
          shackle(s, p.x, p.y - 0.05, p.z, 1.1)
        }
      s.done()

      // DCO-6 · vientos de carga traseros: grilletes en cáncamos de la estructura (mástil, y = 14)
      c = ni(14, -0.8, 0)
      s = spot(g, 'DCO-6', c.x, c.y, 0)
      for (const z of [-0.8, 0.8]) {
        const p = ni(14, -0.8, z)
        eyebolt(s, p.x, p.y + 0.02, p.z, 0.06, 'xy')
        shackle(s, p.x, p.y - 0.1, p.z, 1.2)
      }
      s.done()

      // DCO-5 · vientos de carga en el chasis: 2 grilletes de 4 elementos en el extremo del carrier (-9,6; 1,4; ±1,3)
      s = spot(g, 'DCO-5', -9.6, 1.5, 0)
      for (const z of [-1.3, 1.3]) shackle(s, -9.6, 1.5, z, 1.3)
      s.done()

      // DCO-7 · viento de anclaje terrestre trasero (mostrado en el anclaje -x,+z; 2 grilletes)
      s = spot(g, 'DCO-7', -25, 0.75, 25)
      for (const dx of [-0.16, 0.16]) shackle(s, -25 + dx, 0.75, 25, 1.4)
      s.done()

      // DPE-4 · grilletes de la rienda de carga del 1.er tramo (en la unión de los pistones de izaje con el mástil)
      c = ni(5, -0.5, 0)
      s = spot(g, 'DPE-4', c.x, c.y, 0)
      for (const z of [-0.62, 0.62]) {
        const p = ni(5, -0.5, z)
        shackle(s, p.x, p.y + 0.02, p.z + Math.sign(z) * 0.14, 1.2)
      }
      s.done()

      // PE-13 · vientos de sujeción superior: 2 cables jaula → mástil con grampa y cadena de seguridad (mundo, vía ni())
      c = ni(N + 3, 1.7, 0)
      s = spot(g, 'PE-13', c.x, c.y, 0)
      for (const z of [-1, 1]) {
        const a = ni(N + 2.3, 2.85, z * 1.0)
        const b = ni(N + 5.2, 0.55, z * 0.5)
        s.line(M.steelL, a, b, 0.016, 5)
        for (const u of [0.86, 0.93])
          clamp(s, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u, 1)
        shackle(s, b.x, b.y - 0.03, b.z, 1)
        const m1 = a.clone().lerp(b, 0.4)
        s.poly(
          M.steel,
          [
            a.clone().add(D(0, -0.03, 0)),
            m1.clone().add(D(0.06, -0.18, z * 0.03)),
            m1
              .clone()
              .lerp(b, 0.6)
              .add(D(0, -0.05, 0)),
          ],
          0.014,
          4,
        )
      }
      s.done()
    }
  })

  // ───────────── POST: luces (baliza intermitente, lentes, vista nocturna) ─────────────
  window.__rigExt.onPost((R) => {
    const T = R.three
    const cache = new Map()
    const glows = []
    Object.values(R.groups).forEach((gr) =>
      gr.traverse((o) => {
        const om = o.isMesh && o.material
        if (!om || !om.userData || !om.userData.glow) return
        let nm = cache.get(om)
        if (!nm) {
          nm = new T.MeshBasicMaterial({ color: om.color.clone() })
          nm.name = om.name
          nm.userData.glow = om.userData.glow
          cache.set(om, nm)
          glows.push(nm)
        }
        o.material = nm
      }),
    )
    let blink = false
    const paint = () => {
      const night = !!(R.view && R.view.night)
      blink = !blink
      for (const m of glows) {
        if (m.userData.glow === 'beacon')
          blink ? m.color.setRGB(3, 0.25, 0.1) : m.color.setRGB(0.4, 0.03, 0.03)
        else if (night) m.color.setRGB(2.4, 1.9, 0.8)
        else m.color.setRGB(0.95, 0.8, 0.45)
      }
    }
    // El visor renderiza bajo demanda (At() en 'input' de #app): tras cambiar colores se pide un frame por ese camino.
    const app = document.getElementById('app')
    const repaint = () => {
      paint()
      if (app && !document.hidden) app.dispatchEvent(new Event('input'))
    }
    paint()
    setInterval(repaint, 700)
    window.__rigExt.mastDropsIds = drawn.slice()
  })
})()
