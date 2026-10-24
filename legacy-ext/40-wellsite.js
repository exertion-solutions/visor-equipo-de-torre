/*
 * 40-wellsite.js · Equipo 10 · boca de pozo y locación.
 *
 * Rediseña 5 componentes del visor V2 y agrega el entorno de locación:
 *   - aparejo      → bloque IDECO amarillo con gancho forjado (envuelve el original: conserva sus ramales y el estado interno del visor)
 *   - bop          → BOP Cameron 7 1/16" 5M anular + doble (rojo, color PENDIENTE), choke manifold (posición confirmada, detalle aproximado),
 *                    líneas de choke/matar, eslinga de anclaje y acumulador de 5 botellones
 *   - llave        → llave hidráulica de tubing, cuñas, línea de suspensión y poste de retenida (sujeto al mástil, no al piso; grampas + brazo)
 *   - caballetes   → planchada 12×2,4 m, plano inclinado (bandeja) y caballetes de 2 m con tubing/varillas
 *   - circulacion  → pileta de ensayo 12×2,4 m, cubicador, desgasificador, bomba triplex 6×2,4 m, cañerías al pozo (el manifold de maniobra anterior es ahora el choke manifold del BOP)
 *   - entorno      → Group `locacion_entorno` (fuera de los 13 componentes: ni seleccionable ni en R.pickables): ripio, torres de luz,
 *                    vallado, conos, señalización, tráilers/tanques del layout de locación.
 *
 * Técnica: cada componente se construye con geometrías FUSIONADAS por material (color por vértice), así se agregan pocos meshes y
 * pocos draw calls. Las clases de three no están expuestas en `onPre`: se recuperan de los helpers del visor (ver bootKit).
 *
 * Convención: 1 u = 1 m · origen = boca de pozo · +X hacia el mástil · carrier hacia −X · Z lateral · Y arriba.
 * Datos documentados (FOLLETO Equipo 10 rev. 26/06/2024, layout de locación 11/07/2025, Libro DROPS Rev.03): BOP 7 1/16" 5000 psi anular+doble,
 * acumulador de 5 botellones (8×2,4 m), aparejo IDECO 110 t con 6 líneas, amelas 150 t, elevador 100 t, bomba triplex 6×2,4 m,
 * pileta de ensayo 12×2,4 m (40 m³) con cubicador 3,5 m³, caballetes de 2 m (4,5 t), planchada 12×2,4 m, anclaje de pirosalva a 45 m (layout de locación 2019; layout de locación 2025: 30 m, fuente en conflicto).
 * Todo lo demás (alturas, colores, detalle de forma) es ESTÉTICO y aproximado; no es as-built ni apto para fabricación.
 *
 * CONFLICTO DOCUMENTAL (aparejo): el folleto y el informe técnico dicen 6 líneas; el Libro DROPS (BP-3) dice "8 líneas de cable
 * 1 1/8"" (probablemente otro equipo de la empresa). Se mantienen las 6 líneas del folleto (`vt.reevingLines`) y se registra la discrepancia.
 *
 * Etiquetas DROPS (userData.dropsId + nombre `drops_<ID>`): BP-3, BP-4, PLA-1 (fila incompleta en el Libro: "BANDEJA HCA."),
 * PLA-2, PIL-1, PIL-2, PRL-1, PRL-2, PRL-3. BP-1 (guinche) y BP-2 (power swivel, "NA") no se dibujan aquí.
 */
;(() => {
  'use strict'

  // ───────────────────────────── paleta (pintura real del equipo) ─────────────────────────────
  const C = {
    RED: '#A72A32', // rojo corporativo
    YEL: '#F2B632', // amarillo seguridad
    BLUE: '#3E7896', // azul BOP
    BLUE_L: '#92B4C5', // acento BOP
    GRAY: '#6F767C',
    GRAY_L: '#A3AAAF',
    DARK: '#2B2F36',
    STEEL: '#B4BABE',
    WHITE: '#E7E9E4',
    HOSE: '#15171C',
    CABLE: '#9AA1A8',
    ORANGE: '#E4702A',
    CONC: '#8C8F89',
    GLASS: '#1B2733',
    SKID: '#4B5159', // patines y bastidores (gris grafito, más claro que DARK para que se lea)
    POWER: '#5C636B',
    BOP: '#B3262B', // rojo de las fotos de referencia de BOP/acumulador (unidades genéricas): color real del equipo PENDIENTE
    BOP_L: '#D4494E', // acento del BOP rojo
  }

  // ───────────────────────────── control de pozo: parámetros y ruteo ─────────────────────────────
  /**
   * Color de BOP y acumulador. 'RED' (referencias fotográficas genéricas) | 'BLUE' (azul original del visor).
   * PENDIENTE: el color del equipo real no está confirmado.
   */
  const BOP_COLOR = 'RED'
  const WELL_PAINT =
    BOP_COLOR === 'BLUE' ? { main: C.BLUE, acc: C.BLUE_L } : { main: C.BOP, acc: C.BOP_L }

  /**
   * Choke manifold (subconjunto del componente 07, `bop`).
   * cx, cz: posición en locación, CONFIRMADA por Jorge (x≈3,4 · z≈−4,3).
   * L (eje X), W (eje Z), H: envolvente APROXIMADA (dato estampado en la foto de una unidad genérica: DIM 210×230×145 cm).
   * Si interfiere con otros objetos, reducir W a 1,3 m (valor del patín anterior) sin mover el centro.
   */
  const CHOKE = { cx: 3.4, cz: -4.3, L: 2.3, W: 2.1, H: 1.45 }

  /**
   * Ruteo de las líneas de alta presión alrededor del BOP. PENDIENTE DE VALIDACIÓN (P&ID / procedimiento de control de pozo).
   *   'choke'  → línea de choke del BOP (x=−0,2) → choke manifold → pileta; bomba → línea de matar (x=+0,2).
   *   'legacy' → ruteo anterior (bomba → manifold de maniobra → BOP; retorno del BOP → pileta).
   */
  const CHOKE_ROUTING = 'choke'

  // ───────────────────────────── kit de geometría ─────────────────────────────
  /** Clases de three recuperadas de los helpers del visor (en `onPre`) o de `R.three` (en `onPost`). */
  const K = { ready: false, api: null }
  const SINK = { add() {} } // "padre" descartable para reutilizar los helpers del visor y extraer su geometría

  function bootKit(api) {
    if (K.ready) return
    K.api = api
    const box = api.le(SINK, undefined, 1, 1, 1, 0, 0, 0)
    K.Mesh = box.constructor
    K.Box = box.geometry.constructor
    K.BufferGeometry = Object.getPrototypeOf(K.Box)
    K.Attr = box.geometry.getAttribute('position').constructor
    K.Cyl = api.De(SINK, undefined, 1, 1, 1, 0, 0, 0).geometry.constructor
    K.Group = api.Ml(SINK).constructor
    K.Vec = api.D(0, 0, 0).constructor
    K.Color = api.pn('#000000').color.constructor
    K.ready = true
  }

  const rgbCache = new Map()
  function rgb(hex) {
    let c = rgbCache.get(hex)
    if (!c) {
      const col = new K.Color(hex) // ya en espacio lineal (color por vértice se espera lineal)
      c = [col.r, col.g, col.b]
      rgbCache.set(hex, c)
    }
    return c
  }

  /** Fusiona geometrías indexadas (position/normal/uv) en una sola con color RGBA por vértice. */
  function mergeGeometries(parts) {
    let nv = 0
    let ni = 0
    for (const p of parts) {
      nv += p.geo.attributes.position.count
      ni += p.geo.index.count
    }
    const pos = new Float32Array(nv * 3)
    const nor = new Float32Array(nv * 3)
    const uv = new Float32Array(nv * 2)
    const col = new Float32Array(nv * 4)
    const idx = new Array(ni)
    let vo = 0
    let io = 0
    for (const p of parts) {
      const g = p.geo
      const n = g.attributes.position.count
      pos.set(g.attributes.position.array, vo * 3)
      nor.set(g.attributes.normal.array, vo * 3)
      uv.set(g.attributes.uv.array, vo * 2)
      if (p.rgba) col.set(p.rgba, vo * 4)
      else {
        const [r, gg, b] = rgb(p.color || '#ffffff')
        for (let k = 0; k < n; k++) {
          const o = (vo + k) * 4
          col[o] = r
          col[o + 1] = gg
          col[o + 2] = b
          col[o + 3] = 1
        }
      }
      const src = g.index.array
      for (let k = 0; k < src.length; k++) idx[io + k] = src[k] + vo
      vo += n
      io += src.length
      g.dispose()
    }
    const out = new K.BufferGeometry()
    out.setAttribute('position', new K.Attr(pos, 3))
    out.setAttribute('normal', new K.Attr(nor, 3))
    out.setAttribute('uv', new K.Attr(uv, 2))
    out.setAttribute('color', new K.Attr(col, 4))
    out.setIndex(idx)
    return out
  }

  /** Acumula primitivas (con su color) y las emite como UN mesh. */
  class Batch {
    constructor() {
      this.parts = []
    }
    push(geo, x = 0, y = 0, z = 0, color, rgba) {
      if (x || y || z) geo.translate(x, y, z)
      this.parts.push({ geo, color, rgba })
      return this
    }
    box(c, w, h, d, x, y, z, ry = 0, rx = 0) {
      const g = new K.Box(w, h, d)
      if (rx) g.rotateX(rx)
      if (ry) g.rotateY(ry)
      return this.push(g, x, y, z, c)
    }
    /** Cilindro/tronco de cono; eje 'x' | 'y' | 'z' (misma convención que `De` del visor). */
    cyl(c, rt, rb, h, x, y, z, axis = 'y', seg = 10, open = false) {
      const g = new K.Cyl(rt, rb, h, seg, 1, open)
      if (axis === 'x') g.rotateZ(Math.PI / 2)
      else if (axis === 'z') g.rotateX(Math.PI / 2)
      return this.push(g, x, y, z, c)
    }
    /** Barra cilíndrica entre dos puntos [x,y,z]. */
    rod(c, p1, p2, r, seg = 6, open = false) {
      const dx = p2[0] - p1[0]
      const dy = p2[1] - p1[1]
      const dz = p2[2] - p1[2]
      const len = Math.hypot(dx, dy, dz)
      if (len < 1e-6) return this
      const g = new K.Cyl(r, r, len, seg, 1, open)
      g.rotateZ(-Math.acos(Math.max(-1, Math.min(1, dy / len))))
      g.rotateY(-Math.atan2(dz, dx))
      return this.push(g, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2, c)
    }
    /** Tubo curvo (Catmull-Rom) por puntos [x,y,z], con el `ta` del visor. */
    tube(c, pts, r) {
      const m = K.api.ta(
        SINK,
        undefined,
        pts.map((p) => K.api.D(p[0], p[1], p[2])),
        r,
      )
      return this.push(m.geometry, 0, 0, 0, c)
    }
    /** Arco/anillo de tubo: plano 'xy' | 'zy' | 'xz', ángulos en rad. */
    loop(c, cx, cy, cz, R, plane, a0, a1, r, n = 14) {
      const pts = []
      for (let k = 0; k <= n; k++) {
        const a = a0 + ((a1 - a0) * k) / n
        const u = R * Math.cos(a)
        const v = R * Math.sin(a)
        pts.push(
          plane === 'xy'
            ? [cx + u, cy + v, cz]
            : plane === 'zy'
              ? [cx, cy + v, cz + u]
              : [cx + u, cy, cz + v],
        )
      }
      return this.tube(c, pts, r)
    }
    /** Baranda con pasamanos, barra media, rodapié y montantes cada ~1,5 m. `pts` = polilínea [[x,z],…]. */
    rail(cPost, pts, y0, h = 1.05, kick = true) {
      for (let s = 1; s < pts.length; s++) {
        const [x1, z1] = pts[s - 1]
        const [x2, z2] = pts[s]
        const len = Math.hypot(x2 - x1, z2 - z1)
        const n = Math.max(1, Math.ceil(len / 1.5))
        for (let k = 0; k <= n; k++) {
          const t = k / n
          this.box(cPost, 0.05, h, 0.05, x1 + (x2 - x1) * t, y0 + h / 2, z1 + (z2 - z1) * t)
        }
        this.rod(cPost, [x1, y0 + h, z1], [x2, y0 + h, z2], 0.024, 6)
        this.rod(cPost, [x1, y0 + h * 0.5, z1], [x2, y0 + h * 0.5, z2], 0.018, 5)
        if (kick)
          this.box(
            cPost,
            len,
            0.1,
            0.015,
            (x1 + x2) / 2,
            y0 + 0.07,
            (z1 + z2) / 2,
            Math.atan2(-(z2 - z1), x2 - x1),
          )
      }
      return this
    }
    /** Emite el lote como un solo mesh en `parent`. */
    flush(parent, mat, name, { cast = true, receive = true } = {}) {
      if (!this.parts.length) return null
      const mesh = new K.Mesh(mergeGeometries(this.parts), mat)
      mesh.name = name || ''
      mesh.castShadow = cast
      mesh.receiveShadow = receive
      parent.add(mesh)
      this.parts.length = 0
      return mesh
    }
  }

  /** Materiales por componente (el visor los clona luego por componente para hover/selección). Color por vértice. */
  const mats = (api) => ({
    paint: api.pn('#ffffff', 0.55, 0.22, { vertexColors: true }),
    metal: api.pn('#ffffff', 0.42, 0.4, { vertexColors: true }),
    rubber: api.pn('#ffffff', 0.85, 0.02, { vertexColors: true }),
  })

  /** Grupo etiquetado para la capa DROPS (nombre `drops_<ID>` + userData.dropsId). */
  function dropsGroup(parent, id, note) {
    const grp = new K.Group()
    grp.name = 'drops_' + id
    grp.userData.dropsId = id
    if (note) grp.userData.dropsNote = note
    parent.add(grp)
    return grp
  }

  const PI = Math.PI

  /** Desplazamiento del acumulador (m en X) para ubicarlo como en el layout de locación (cad/components/layout_locacion.py). */
  const DX_ACUM = -3.2

  // ═════════════════════════════════════════ BOP + CHOKE MANIFOLD + ACUMULADOR ═════════════════════════════════════════
  /** Anillo de `n` bulones (cilindros cortos, pocos segmentos) alrededor de un eje 'x' | 'y' | 'z' centrado en (cx,cy,cz). */
  function boltRing(b, c, cx, cy, cz, axis, R, n, len, r = 0.015, seg = 5) {
    for (let k = 0; k < n; k++) {
      const a = (2 * PI * k) / n
      const p = Math.cos(a) * R
      const q = Math.sin(a) * R
      if (axis === 'y') b.cyl(c, r, r, len, cx + p, cy, cz + q, 'y', seg)
      else if (axis === 'x') b.cyl(c, r, r, len, cx, cy + p, cz + q, 'x', seg)
      else b.cyl(c, r, r, len, cx + p, cy + q, cz, 'z', seg)
    }
  }

  /** Volante horizontal: cubo, aro poligonal de `sides` barras y `spokes` rayos (en el plano XZ, a la altura y). */
  function handwheel(b, c, x, y, z, R, spokes = 4, sides = 12, r = 0.012) {
    b.cyl(c, 0.045, 0.045, 0.06, x, y, z, 'y', 8)
    for (let k = 0; k < sides; k++) {
      const a0 = (2 * PI * k) / sides
      const a1 = (2 * PI * (k + 1)) / sides
      b.rod(
        c,
        [x + R * Math.cos(a0), y, z + R * Math.sin(a0)],
        [x + R * Math.cos(a1), y, z + R * Math.sin(a1)],
        r,
        4,
        true,
      )
    }
    for (let k = 0; k < spokes; k++) {
      const a = (2 * PI * k) / spokes + PI / 4
      b.rod(c, [x, y, z], [x + R * Math.cos(a), y, z + R * Math.sin(a)], r * 0.9, 4, true)
    }
  }

  /**
   * CHOKE MANIFOLD · subconjunto del componente 07 (`bop`). Tipología GENÉRICA tomada de fotos de referencia de unidades comerciales
   * (no es el equipo 10): entrada por la línea de choke del BOP → 2 válvulas en serie → cruz de distribución → 3 ramales
   * (choke ajustable, choke fijo, línea directa/purga, cada uno con válvula aguas arriba) → colector de salida hacia la pileta.
   * Confirmado: posición en locación (CHOKE.cx/cz). Aproximado: envolvente, cotas y detalle. PENDIENTE: presión de trabajo, tipo de
   * válvula de entrada (manual / HCR) y ruteo real. Mallas fusionadas: `choke_pintura` (rojo) y `choke_acero` (bulones, vástagos, manómetros).
   */
  function buildChoke(g, m) {
    const { cx, cz, L, W } = CHOKE
    const hl = L / 2
    const hw = W / 2
    const gc = new K.Group()
    gc.name = 'choke_manifold'
    g.add(gc)
    const P = new Batch() // choke_pintura
    const M = new Batch() // choke_acero
    const Y = 0.76 // eje de las cañerías
    const R_PIPE = 0.055
    const X = (u) => cx + u
    const Z = (v) => cz + v

    // patín: largueros y travesaños en perfil, piso de chapa, 4 orejas de izaje y 2 bolsillos para autoelevador (lado +z)
    for (const s of [-1, 1]) P.box(C.SKID, L, 0.14, 0.1, cx, 0.09, cz + s * (hw - 0.05))
    for (const u of [-(hl - 0.05), 0, hl - 0.05]) P.box(C.SKID, 0.1, 0.14, W - 0.2, X(u), 0.09, cz)
    P.box(C.POWER, L - 0.1, 0.02, W - 0.1, cx, 0.17, cz)
    for (const su of [-1, 1])
      for (const sv of [-1, 1]) {
        const px = X(su * (hl - 0.07))
        const pz = Z(sv * (hw - 0.07))
        M.box(C.STEEL, 0.03, 0.16, 0.14, px, 0.26, pz)
        M.cyl(C.DARK, 0.035, 0.035, 0.045, px, 0.29, pz, 'x', 8) // ojo de la oreja
      }
    for (const u of [-0.55, 0.55]) P.box(C.DARK, 0.34, 0.09, 0.03, X(u), 0.09, Z(hw + 0.005))

    const pipe = (u1, v1, u2, v2, r = R_PIPE) =>
      P.rod(C.RED, [X(u1), Y, Z(v1)], [X(u2), Y, Z(v2)], r, 8, true)
    const flangeDisc = (u, v, axis, R = 0.11) => {
      P.cyl(C.RED, R, R, 0.04, X(u), Y, Z(v), axis, 14)
    }
    const bolts = (u, v, axis, R, n = 6) => boltRing(M, C.GRAY, X(u), Y, Z(v), axis, R, n, 0.07)

    // cruz de distribución (bloque con 4 bridas): entra por el oeste, sale al este (línea directa) y a ±z (ramales con choke)
    const cu = -0.02
    P.box(C.RED, 0.3, 0.3, 0.3, X(cu), Y, cz)
    for (const [du, dv, ax] of [
      [-0.17, 0, 'x'],
      [0.17, 0, 'x'],
      [0, 0.17, 'z'],
      [0, -0.17, 'z'],
    ]) {
      flangeDisc(cu + du, dv, ax)
      bolts(cu + du * 1.1, dv * 1.1, ax, 0.08)
    }

    // válvula esclusa: cuerpo bloque con bridas y bulones, bonete con brida, vástago y volante Ø≈0,40 m (aproximado)
    const gate = (u, v, axis, yw) => {
      const ax = axis === 'x'
      P.box(C.RED, ax ? 0.24 : 0.26, 0.3, ax ? 0.26 : 0.24, X(u), Y, Z(v))
      for (const s of [-1, 1]) {
        const du = ax ? s * 0.13 : 0
        const dv = ax ? 0 : s * 0.13
        flangeDisc(u + du, v + dv, axis, 0.125)
        bolts(u + du * 1.1, v + dv * 1.1, axis, 0.095)
      }
      P.cyl(C.RED, 0.085, 0.085, 0.12, X(u), Y + 0.21, Z(v), 'y', 12) // bonete
      P.cyl(C.RED, 0.12, 0.12, 0.03, X(u), Y + 0.28, Z(v), 'y', 14) // brida del bonete
      boltRing(M, C.GRAY, X(u), Y + 0.29, Z(v), 'y', 0.095, 6, 0.06)
      M.rod(C.STEEL, [X(u), Y + 0.29, Z(v)], [X(u), yw, Z(v)], 0.02, 5) // vástago
      handwheel(P, C.RED, X(u), yw, Z(v), 0.2)
    }

    // choke en ángulo (cuerpo a 90°): entra por −v, sale hacia +u
    const chokeBody = (v, adjustable) => {
      const sv = Math.sign(v)
      P.box(C.RED, 0.24, 0.24, 0.24, X(cu), Y, Z(v))
      flangeDisc(cu, v - sv * 0.13, 'z', 0.115)
      bolts(cu, v - sv * 0.145, 'z', 0.085)
      flangeDisc(cu + 0.13, v, 'x', 0.115)
      bolts(cu + 0.145, v, 'x', 0.085)
      P.cyl(C.RED, 0.085, 0.085, 0.14, X(cu), Y + 0.19, Z(v), 'y', 12)
      if (adjustable) {
        // choke ajustable: vástago con volante chico e indicador de posición
        P.cyl(C.RED, 0.06, 0.06, 0.1, X(cu), Y + 0.3, Z(v), 'y', 10)
        M.rod(C.STEEL, [X(cu), Y + 0.32, Z(v)], [X(cu), 1.3, Z(v)], 0.018, 5)
        handwheel(P, C.RED, X(cu), 1.3, Z(v), 0.15, 4, 10)
        M.box(C.WHITE, 0.03, 0.14, 0.012, X(cu) + 0.09, Y + 0.3, Z(v) + 0.07)
      } else {
        // choke positivo/fijo: capuchón
        P.cyl(C.RED, 0.075, 0.075, 0.16, X(cu), Y + 0.32, Z(v), 'y', 10)
        M.cyl(C.GRAY, 0.09, 0.09, 0.05, X(cu), Y + 0.44, Z(v), 'y', 6)
      }
    }

    // manómetro (esfera blanca con bisel) sobre un pie, mirando a +z
    const gauge = (u, v, yTop, yBase) => {
      M.rod(C.STEEL, [X(u), yBase, Z(v)], [X(u), yTop, Z(v)], 0.022, 5)
      M.cyl(C.STEEL, 0.088, 0.088, 0.04, X(u), yTop + 0.05, Z(v) + 0.02, 'z', 12) // bisel
      M.cyl(C.WHITE, 0.072, 0.072, 0.03, X(u), yTop + 0.05, Z(v) + 0.04, 'z', 12) // esfera
    }

    // ── tuberías (eje x: entrada → cruz → línea directa; eje z: ramales; colector de salida)
    const cuW = cu - 0.15 // cara oeste de la cruz
    const cuE = cu + 0.15
    const bufU = 0.95 // eje del colector de salida
    const bufV = 0.78 // semiancho del colector = posición de los ramales con choke
    pipe(-hl + 0.05, 0, cuW, 0) // entrada
    pipe(cuE, 0, bufU, 0) // línea directa/purga
    pipe(cu, 0.15, cu, bufV - 0.12) // ramal +z (choke ajustable)
    pipe(cu, -0.15, cu, -(bufV - 0.12)) // ramal −z (choke fijo)
    pipe(cu + 0.12, bufV, bufU, bufV) // descarga del ajustable
    pipe(cu + 0.12, -bufV, bufU, -bufV) // descarga del fijo
    P.cyl(C.RED, 0.075, 0.075, 2 * bufV, X(bufU), Y, cz, 'z', 14) // colector (buffer)
    pipe(bufU, -bufV, bufU, -hw + 0.02) // salida hacia la pileta
    // uniones de golpe: entrada (oeste) y salida (−z)
    P.cyl(C.RED, 0.095, 0.095, 0.1, X(-hl + 0.07), Y, cz, 'x', 12)
    P.cyl(C.RED, 0.095, 0.095, 0.1, X(bufU), Y, Z(-hw + 0.06), 'z', 12)

    // ── válvulas (5): 2 en serie en la entrada (manual + manual/HCR: PENDIENTE), 1 por ramal
    gate(-0.82, 0, 'x', 1.4)
    gate(-0.45, 0, 'x', 1.34)
    gate(0.45, 0, 'x', 1.4) // línea directa
    gate(cu, 0.4, 'z', 1.3) // aguas arriba del choke ajustable
    gate(cu, -0.4, 'z', 1.36) // aguas arriba del choke fijo
    chokeBody(bufV, true)
    chokeBody(-bufV, false)

    // ── manómetros: aguas arriba (sobre la cruz) y aguas abajo (sobre el colector)
    gauge(cu, 0, 1.12, Y + 0.15)
    gauge(bufU, 0.35, 1.0, Y + 0.075)

    // ── apoyos bajo tuberías y cuerpos
    for (const [u, v] of [
      [bufU, 0.5],
      [bufU, -0.5],
      [cu, bufV],
      [cu, -bufV],
      [-0.95, 0],
      [0.7, 0],
    ])
      P.box(C.SKID, 0.08, Y - 0.2, 0.08, X(u), 0.18 + (Y - 0.2) / 2, Z(v))

    P.flush(gc, m.paint, 'choke_pintura')
    M.flush(gc, m.metal, 'choke_acero')
  }

  function buildBop(g, api) {
    const m = mats(api)
    const P = new Batch() // pintura
    const M = new Batch() // acero / mecanizado
    const H = new Batch() // mangueras
    const { main: BC, acc: BA } = WELL_PAINT

    /**
     * Brida doble: dos discos con espárragos que las atraviesan (tuerca arriba y abajo). Reemplaza al disco simple con bulones
     * sueltos. Dimensiones aproximadas.
     */
    const flange = (y, R = 0.46, n = 10) => {
      M.cyl(C.STEEL, R, R, 0.05, 0, y - 0.03, 0, 'y', 20)
      M.cyl(C.STEEL, R, R, 0.05, 0, y + 0.03, 0, 'y', 20)
      for (let k = 0; k < n; k++) {
        const a = (2 * PI * k) / n
        const x = (R - 0.07) * Math.cos(a)
        const z = (R - 0.07) * Math.sin(a)
        M.cyl(C.GRAY, 0.013, 0.013, 0.14, x, y, z, 'y', 4)
        M.cyl(C.GRAY, 0.026, 0.026, 0.03, x, y + 0.075, z, 'y', 5)
        M.cyl(C.GRAY, 0.026, 0.026, 0.03, x, y - 0.075, z, 'y', 5)
      }
    }

    // losa de boca de pozo + cabezal y carretel (a nivel de terreno)
    P.box(C.CONC, 3.2, 0.06, 3.2, 0, 0.03, 0) // estético
    P.cyl(C.GRAY, 0.3, 0.3, 0.38, 0, 0.19, 0, 'y', 18)
    flange(0.415)
    P.cyl(C.GRAY, 0.28, 0.28, 0.2, 0, 0.55, 0, 'y', 18)
    flange(0.685)

    // BOP doble de ariete (Cameron, cierre parcial y total): cuerpo de 2 niveles; por lado y nivel, bonete rectangular abulonado
    // con placa de identificación, cilindro operador hidráulico coaxial y vástago de traba que sobresale
    const RAM_Y = [0.87, 1.19]
    for (const y of RAM_Y) P.box(BC, 0.74, 0.31, 0.64, 0, y, 0)
    P.box(BA, 0.76, 0.03, 0.66, 0, 1.03, 0) // banda entre niveles
    for (const s of [-1, 1]) {
      for (const y of RAM_Y) {
        P.box(BC, 0.16, 0.3, 0.34, s * 0.44, y, 0) // bonete
        for (const dy of [-0.09, 0.09])
          for (const dz of [-0.12, 0, 0.12])
            M.cyl(C.GRAY, 0.017, 0.017, 0.05, s * 0.525, y + dy, dz, 'x', 5)
        M.box(C.WHITE, 0.12, 0.07, 0.012, s * 0.44, y, 0.176) // placa de identificación
        P.cyl(BA, 0.105, 0.105, 0.28, s * 0.67, y, 0, 'x', 14) // cilindro operador hidráulico
        P.cyl(BC, 0.115, 0.115, 0.04, s * 0.83, y, 0, 'x', 14) // tapa
        M.rod(C.STEEL, [s * 0.85, y, 0], [s * 1.06, y, 0], 0.02, 5) // vástago de traba
        M.cyl(C.GRAY, 0.035, 0.035, 0.04, s * 1.05, y, 0, 'x', 6)
      }
    }
    flange(1.375)
    P.cyl(C.GRAY, 0.27, 0.27, 0.16, 0, 1.49, 0, 'y', 18)
    flange(1.605)

    // BOP anular: cuerpo robusto, anillos de acento, cabeza con corona de 16 espárragos y tuercas, tapa central
    P.cyl(BC, 0.4, 0.4, 0.3, 0, 1.79, 0, 'y', 24)
    P.cyl(BA, 0.41, 0.41, 0.035, 0, 1.665, 0, 'y', 24)
    P.cyl(BA, 0.41, 0.41, 0.035, 0, 1.94, 0, 'y', 24)
    P.cyl(BC, 0.385, 0.385, 0.1, 0, 1.99, 0, 'y', 24)
    for (let k = 0; k < 16; k++) {
      const a = (2 * PI * k) / 16
      M.cyl(C.GRAY, 0.016, 0.016, 0.1, 0.35 * Math.cos(a), 2.09, 0.35 * Math.sin(a), 'y', 5)
      M.cyl(C.GRAY, 0.028, 0.028, 0.03, 0.35 * Math.cos(a), 2.14, 0.35 * Math.sin(a), 'y', 6)
    }
    P.cyl(BC, 0.2, 0.24, 0.08, 0, 2.08, 0, 'y', 20)
    P.cyl(BA, 0.14, 0.14, 0.05, 0, 2.145, 0, 'y', 16)
    M.box(C.WHITE, 0.16, 0.1, 0.012, 0, 1.79, 0.404) // placa de identificación
    for (const s of [-1, 1]) M.cyl(C.STEEL, 0.03, 0.03, 0.1, s * 0.25, 1.8, 0.36, 'z', 8) // puertos hidráulicos (abrir/cerrar)

    // salidas laterales bridadas en el cuerpo de arietes: línea de choke (x=−0,2, ruedas amarillas) y línea de matar/kill (x=+0,2,
    // ruedas rojas), 2 válvulas c/u. La asignación de lados choke/kill queda PENDIENTE de validación.
    const valve = (x, z, wheel) => {
      P.box(C.GRAY, 0.2, 0.26, 0.2, x, 0.6, z)
      M.cyl(C.STEEL, 0.05, 0.05, 0.3, x, 0.86, z, 'y', 8)
      P.cyl(wheel, 0.13, 0.13, 0.03, x, 1.02, z, 'y', 14)
    }
    for (const [x, wheel] of [
      [-0.2, C.YEL],
      [0.2, C.RED],
    ]) {
      M.cyl(C.STEEL, 0.08, 0.08, 0.14, x, 1.03, -0.38, 'z', 8) // cuello de la salida
      P.cyl(BC, 0.15, 0.15, 0.05, x, 1.03, -0.47, 'z', 14) // brida de la salida
      boltRing(M, C.GRAY, x, 1.03, -0.5, 'z', 0.115, 6, 0.04)
      M.rod(C.STEEL, [x, 1.03, -0.46], [x, 1.03, -0.66], 0.055)
      M.rod(C.STEEL, [x, 1.03, -0.66], [x, 0.6, -0.66], 0.055)
      M.rod(C.STEEL, [x, 0.6, -0.66], [x, 0.6, -2.3], 0.055)
      valve(x, -1.0, wheel)
      valve(x, -1.45, wheel)
      M.cyl(C.STEEL, 0.1, 0.1, 0.08, x, 0.6, -2.34, 'z', 12) // unión de martillo: aquí se conecta la cañería de `circulacion`
    }

    // líneas hidráulicas de control desde el acumulador (cuatro: bonetes izq/der y anular)
    const trunk = [
      [-10.4 + DX_ACUM, 0.9, 3.75],
      [-8, 0.25, 3.3],
      [-3.5, 0.15, 2.6],
      [-1.6, 0.15, 2.3],
      [-0.6, 0.25, 1.9],
      [-0.6, 0.5, 1.0],
    ]
    H.tube(C.HOSE, [...trunk, [-0.8, 0.75, 0.35], [-0.67, 0.87, 0.11]], 0.022)
    H.tube(C.HOSE, [...trunk, [-0.8, 0.95, 0.4], [-0.67, 1.19, 0.11]], 0.022)
    H.tube(C.HOSE, [...trunk, [0, 0.6, 0.7], [0.85, 0.8, 0.4], [0.67, 0.87, 0.11]], 0.022)
    H.tube(C.HOSE, [...trunk, [0, 0.6, 0.7], [0, 1.6, 0.55], [0.25, 1.8, 0.41]], 0.022)

    P.flush(g, m.paint, 'bop_pintura')
    M.flush(g, m.metal, 'bop_acero')
    H.flush(g, m.rubber, 'bop_mangueras', { cast: false })

    // BP-4 · eslinga de sujeción y anclaje (grillete + eslinga 9/16" + eslinga de seguridad 1/2"), sobre la boca de pozo
    const bp4 = dropsGroup(
      g,
      'BP-4',
      'Libro DROPS p.15: grillete y eslinga de seguridad 9/16" + eslinga de seguridad 1/2". Geometría estética.',
    )
    const S4 = new Batch()
    const O4 = new Batch()
    S4.box(C.STEEL, 0.1, 0.12, 0.05, 0, 1.68, 0.41) // oreja de izaje del anular
    S4.loop(C.STEEL, 0, 1.68, 0.5, 0.06, 'zy', 0, 2 * PI, 0.014, 12) // grillete
    S4.cyl(C.STEEL, 0.014, 0.014, 0.16, 0, 1.68, 0.44, 'x', 6) // perno del grillete
    O4.cyl(C.RED, 0.008, 0.008, 0.05, 0.08, 1.68, 0.44, 'x', 5) // seguro del perno (chaveta)
    S4.tube(
      C.STEEL,
      [
        [0, 1.72, 0.55],
        [0.14, 1.82, 0.78],
        [0.42, 2.05, 0.92],
        [0.55, 2.2, 0.84],
      ],
      0.016,
    ) // eslinga 9/16"
    O4.tube(
      C.ORANGE,
      [
        [0.03, 1.72, 0.55],
        [0.2, 1.9, 0.84],
        [0.47, 2.08, 0.95],
        [0.58, 2.2, 0.86],
      ],
      0.012,
    ) // eslinga de seguridad 1/2"
    S4.cyl(C.STEEL, 0.04, 0.04, 0.05, 0.55, 2.22, 0.82, 'y', 8) // cáncamo bajo el piso de trabajo
    S4.flush(bp4, m.metal, 'bp4_acero')
    O4.flush(bp4, m.paint, 'bp4_seguridad')

    buildChoke(g, m)
    buildAcumulador(g, m)
  }

  /**
   * Acumulador (8×2,4 m, 5 botellones, layout de locación / folleto) — misma posición que el visor: x −18…−10, z=4,2. Se afina el detalle con
   * fotos de referencia de unidades genéricas: botellones con casquetes y etiqueta, bastidor/jaula, colector con válvulas, tablero de
   * control de acero inoxidable, orejas de izaje y bolsillos para autoelevador. Color PENDIENTE (ver BOP_COLOR).
   * Nota: el acta de prueba funcional equipo 10 (06/10/2023) registra "abiertos 4 líneas"; se mantienen los 5 botellones del folleto.
   */
  function buildAcumulador(g, m) {
    const { main: BC, acc: BA } = WELL_PAINT
    const ga = new K.Group()
    ga.name = 'acumulador_5_botellas'
    g.add(ga)
    ga.position.x = DX_ACUM // layout de locación: x −21,2…−13,2 (medido del vector del PDF); el modelo estaba en −18…−10. Lateral z 4,2 coincide
    const AP = new Batch()
    const AM = new Batch()
    const zc = 4.2
    AP.box(C.SKID, 8, 0.18, 2.4, -14, 0.15, zc) // patín 8×2,4 m (layout de locación)
    for (const dz of [-1.1, 1.1]) AM.box(C.GRAY, 8, 0.1, 0.12, -14, 0.27, zc + dz)
    for (let k = 0; k < 6; k++) AP.box(C.SKID, 0.1, 0.1, 2.1, -17.6 + k * 1.44, 0.27, zc) // travesaños
    for (const x of [-16, -12]) AP.box(C.DARK, 0.42, 0.1, 0.03, x, 0.15, zc + 1.21) // bolsillos de autoelevador
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        AM.box(C.STEEL, 0.14, 0.03, 0.16, -14 + sx * 3.9, 0.3, zc + sz * 1.1) // orejas de izaje
        AM.cyl(C.DARK, 0.035, 0.035, 0.05, -14 + sx * 3.9, 0.3, zc + sz * 1.1, 'y', 8)
      }
    for (let n = 0; n < 5; n++) {
      const x = -16 + n * 0.9
      AP.cyl(BC, 0.24, 0.13, 0.12, x, 0.31, zc, 'y', 18) // casquete inferior
      AP.cyl(BC, 0.24, 0.24, 1.26, x, 1.0, zc, 'y', 18) // botellón
      AP.cyl(BC, 0.1, 0.24, 0.14, x, 1.7, zc, 'y', 18) // casquete superior
      AM.cyl(C.STEEL, 0.07, 0.07, 0.1, x, 1.82, zc, 'y', 8)
      AP.box(C.RED, 0.1, 0.1, 0.1, x, 1.95, zc) // válvula de aislación sobre el botellón
      AM.rod(C.STEEL, [x, 2.0, zc], [x, 2.09, zc], 0.012, 4)
      AP.cyl(C.RED, 0.06, 0.06, 0.02, x, 2.1, zc, 'y', 10) // volante de la válvula
      AM.box(C.WHITE, 0.15, 0.24, 0.012, x, 1.0, zc + 0.245) // etiqueta
      for (const y of [0.6, 1.3]) AM.cyl(C.GRAY_L, 0.25, 0.25, 0.05, x, y, zc, 'y', 14) // zunchos
    }
    // jaula de sujeción de los botellones: parantes y barras en ambos lados
    for (const x of [-16.45, -12.1])
      for (const dz of [-0.3, 0.3]) AM.box(C.GRAY, 0.06, 1.5, 0.06, x, 0.9, zc + dz)
    for (const dz of [-0.3, 0.3])
      for (const y of [0.4, 1.5]) AM.box(C.GRAY, 4.4, 0.05, 0.05, -14.28, y, zc + dz)
    AM.rod(C.STEEL, [-16.2, 2.0, zc], [-11.2, 2.0, zc], 0.04) // colector superior
    AM.rod(C.STEEL, [-11.2, 2.0, zc], [-11.2, 1.5, zc], 0.04)
    AM.rod(C.STEEL, [-16.1, 0.44, zc - 0.38], [-12.2, 0.44, zc - 0.38], 0.04, 8) // colector inferior
    // tablero de control (acero inoxidable): manómetros con bisel, válvulas selectoras y regulador
    AP.box(C.GRAY_L, 1.3, 1.25, 0.55, -11.4, 0.865, zc)
    AP.box(BA, 1.1, 0.7, 0.03, -11.4, 0.95, zc + 0.29)
    for (const x of [-11.7, -11.4, -11.1]) {
      AM.cyl(C.STEEL, 0.105, 0.105, 0.03, x, 1.2, zc + 0.31, 'z', 14) // bisel
      AM.cyl(C.WHITE, 0.09, 0.09, 0.03, x, 1.2, zc + 0.33, 'z', 14) // manómetro
    }
    for (const x of [-11.8, -11.6, -11.2, -11.0]) {
      AM.cyl(C.RED, 0.045, 0.045, 0.06, x, 0.75, zc + 0.33, 'z', 8) // válvula selectora
      AM.rod(C.STEEL, [x, 0.75, zc + 0.36], [x + 0.06, 0.82, zc + 0.36], 0.012, 4) // palanca
    }
    AP.cyl(C.RED, 0.06, 0.06, 0.03, -11.4, 0.55, zc + 0.31, 'z', 10) // regulador
    AP.box(C.GRAY_L, 0.3, 0.32, 0.2, -10.4, 0.5, zc - 0.65) // caja de conexiones
    AP.box(C.DARK, 1.3, 0.9, 1.0, -17.3, 0.69, zc) // depósito/bomba de carga
    AM.cyl(C.STEEL, 0.18, 0.18, 0.55, -17.3, 1.4, zc, 'x', 12)
    AM.cyl(C.STEEL, 0.04, 0.04, 0.1, -17.6, 1.19, zc + 0.3, 'y', 8) // tapón de llenado
    AP.rail(
      C.YEL,
      [
        [-18, zc - 1.2],
        [-18, zc + 1.2],
        [-10, zc + 1.2],
      ],
      0.24,
      1.0,
      false,
    )
    AP.flush(ga, m.paint, 'acumulador_pintura')
    AM.flush(ga, m.metal, 'acumulador_acero')
  }

  // ═════════════════════════════════════════ APAREJO / GANCHO ═════════════════════════════════════════
  /**
   * Envuelve el aparejo original: éste crea `bloque_viajero` (que el visor anima vía `wh`), las amelas, el elevador y los 6 ramales (`Lh`) — estado
   * interno del visor que no está expuesto. Los ramales, el grupo animado y los grupos `amelas`/`elevador` se conservan; el rediseño (bloque con poleas
   * de garganta, gancho forjado con pestillo, amelas, elevador de tubing articulado y elevador de varillas nuevo) vive en legacy-ext/41-aparejo.js
   * (`window.__rigAparejo`). Sin ese módulo el visor conserva su aparejo original. Las 6 líneas del folleto se mantienen (ver conflicto en cabecera).
   */
  function wrapAparejo(api) {
    const original = api.Ot.aparejo
    api.Ot.aparejo = (g, e) => {
      original(g, e)
      const redesign = window.__rigAparejo
      if (redesign) redesign.build(g, api, { K, Batch, dropsGroup })
    }
  }

  // ═════════════════════════════════════════ LLAVE HIDRÁULICA + CUÑAS + POSTE DE RETENIDA ═════════════════════════════════════════
  /**
   * Componente 08 (`llave`): llave hidráulica de tubing con llave de contrafuerza (backup), cuñas manuales, línea de suspensión y poste
   * de retenida. Tipología GENÉRICA tomada de dos fotos de referencia de catálogo (no es el equipo 10): llave de garganta
   * abierta tipo placa con estructura tubular, cilindro hidráulico, mangueras y franjas de advertencia, y llave con cabezal, manómetro
   * de torque, patas con resorte, palancas y válvulas de mando.
   * Confirmado: posición del pozo/piso, libro DROPS (PRL-1/2/3: grampas, perno del brazo, eslinga). Aproximado: forma, cotas, ruteo de
   * mangueras, escala del manómetro (la aguja queda en cero: NO indica ningún valor). PENDIENTE: modelo/fabricante, torque y capacidad,
   * rango de diámetros, color real, presión hidráulica.
   * Mallas fusionadas: `llave_pintura`, `llave_acero`, `llave_mangueras`, `llave_cunas` (cuñas + buje) y `llave_manometro`.
   */
  function buildLlave(g, api) {
    const m = mats(api)
    const P = new Batch() // llave_pintura: chapa, brazo, estructura
    const M = new Batch() // llave_acero: dados, bulones, cilindro, tubería
    const H = new Batch() // llave_mangueras: mangueras y látigos
    const S = new Batch() // llave_cunas: cuñas manuales + buje
    const G = new Batch() // llave_manometro: manómetro de torque
    const dialMat = api.pn('#ffffff', 0.3, 0.08, { vertexColors: true })
    const FL = 2.36 // cota superior del piso de trabajo (subestructura)

    /**
     * Color de la pintura de la llave. 'RED' (fotos de referencia genéricas) | 'ORIGINAL' (amarillo del visor anterior).
     * PENDIENTE: el color del equipo real no está confirmado.
     */
    const LLAVE_COLOR = 'RED'
    const PAINT =
      LLAVE_COLOR === 'RED' ? { main: '#B3262B', acc: '#D4494E' } : { main: C.YEL, acc: '#F7CF6A' }
    const STEEL_D = '#4A4F55' // acero oscuro (dados, cuerpos de válvula)
    const BRASS = '#B08A3A' // conexiones de mangueras
    const SPRING = '#E9A21B' // resorte de las patas
    const cos = Math.cos
    const sin = Math.sin

    // ─────────── geometría a medida (más liviana que `ta`, que fija 32×6 caras por tubo) ───────────
    const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
    const cross3 = (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ]
    const norm3 = (a) => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1
      return [a[0] / l, a[1] / l, a[2] / l]
    }
    const mesh = () => ({ pos: [], nor: [], idx: [] })
    /** Cuadrilátero de 2 triángulos; el orden se corrige para que la cara mire hacia las normales declaradas. */
    const quad = (o, vs, ns) => {
      const i = o.pos.length / 3
      for (let k = 0; k < 4; k++) {
        o.pos.push(vs[k][0], vs[k][1], vs[k][2])
        o.nor.push(ns[k][0], ns[k][1], ns[k][2])
      }
      const c = cross3(sub3(vs[2], vs[0]), sub3(vs[3], vs[1]))
      const d =
        c[0] * (ns[0][0] + ns[2][0]) + c[1] * (ns[0][1] + ns[2][1]) + c[2] * (ns[0][2] + ns[2][2])
      if (d >= 0) o.idx.push(i, i + 1, i + 2, i, i + 2, i + 3)
      else o.idx.push(i, i + 2, i + 1, i, i + 3, i + 2)
    }
    const finish = (o) => {
      const geo = new K.BufferGeometry()
      geo.setAttribute('position', new K.Attr(new Float32Array(o.pos), 3))
      geo.setAttribute('normal', new K.Attr(new Float32Array(o.nor), 3))
      geo.setAttribute('uv', new K.Attr(new Float32Array((o.pos.length / 3) * 2), 2))
      geo.setIndex(o.idx)
      return geo
    }

    /**
     * Sector anular (o tronco de cono hueco): radios (interior, exterior) abajo `r0i,r0o` y arriba `r1i,r1o`, entre las alturas y0..y1
     * y los ángulos a0..a1 (rad; x = cos a, z = sin a), en `n` pasos. `bottom`/`caps` = false omiten la tapa inferior / los cortes.
     */
    const sectorGeo = (
      r0i,
      r0o,
      r1i,
      r1o,
      y0,
      y1,
      a0,
      a1,
      n,
      { bottom = true, caps = true } = {},
    ) => {
      const o = mesh()
      const at = (r, y, a) => [r * cos(a), y, r * sin(a)]
      const dy = y1 - y0
      for (let k = 0; k < n; k++) {
        const a = a0 + ((a1 - a0) * k) / n
        const b = a0 + ((a1 - a0) * (k + 1)) / n
        const up = [0, 1, 0]
        const dn = [0, -1, 0]
        quad(o, [at(r1i, y1, a), at(r1o, y1, a), at(r1o, y1, b), at(r1i, y1, b)], [up, up, up, up])
        if (bottom)
          quad(
            o,
            [at(r0i, y0, a), at(r0o, y0, a), at(r0o, y0, b), at(r0i, y0, b)],
            [dn, dn, dn, dn],
          )
        const no = (t) => norm3([cos(t) * dy, -(r1o - r0o), sin(t) * dy])
        quad(
          o,
          [at(r0o, y0, a), at(r1o, y1, a), at(r1o, y1, b), at(r0o, y0, b)],
          [no(a), no(a), no(b), no(b)],
        )
        const ni = (t) => norm3([-cos(t) * dy, r1i - r0i, -sin(t) * dy])
        quad(
          o,
          [at(r0i, y0, a), at(r1i, y1, a), at(r1i, y1, b), at(r0i, y0, b)],
          [ni(a), ni(a), ni(b), ni(b)],
        )
      }
      if (caps) {
        const n0 = [sin(a0), 0, -cos(a0)]
        const n1 = [-sin(a1), 0, cos(a1)]
        quad(
          o,
          [at(r0i, y0, a0), at(r0o, y0, a0), at(r1o, y1, a0), at(r1i, y1, a0)],
          [n0, n0, n0, n0],
        )
        quad(
          o,
          [at(r0i, y0, a1), at(r0o, y0, a1), at(r1o, y1, a1), at(r1i, y1, a1)],
          [n1, n1, n1, n1],
        )
      }
      return finish(o)
    }
    /** Interpolación Catmull-Rom uniforme: `per` muestras por tramo. */
    const spline = (pts, per) => {
      const out = []
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[Math.min(pts.length - 1, i + 2)]
        for (let s = 0; s < per; s++) {
          const t = s / per
          const t2 = t * t
          const t3 = t2 * t
          out.push(
            [0, 1, 2].map(
              (c) =>
                0.5 *
                (2 * p1[c] +
                  (-p0[c] + p2[c]) * t +
                  (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 +
                  (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3),
            ),
          )
        }
      }
      out.push(pts[pts.length - 1])
      return out
    }
    /** Tubo de radio `r` con `radial` caras a lo largo de la polilínea `path` (marcos por transporte paralelo). */
    const tubeGeo = (path, r, radial = 6) => {
      const n = path.length
      const tan = path.map((_, i) =>
        norm3(sub3(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)])),
      )
      const up = Math.abs(tan[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
      let nn = up
      const rings = []
      for (let i = 0; i < n; i++) {
        const t = tan[i]
        const d = nn[0] * t[0] + nn[1] * t[1] + nn[2] * t[2]
        nn = norm3([nn[0] - d * t[0], nn[1] - d * t[1], nn[2] - d * t[2]])
        const bb = cross3(t, nn)
        const ring = []
        for (let j = 0; j < radial; j++) {
          const th = (2 * PI * j) / radial
          const dir = [
            cos(th) * nn[0] + sin(th) * bb[0],
            cos(th) * nn[1] + sin(th) * bb[1],
            cos(th) * nn[2] + sin(th) * bb[2],
          ]
          ring.push({
            p: [path[i][0] + dir[0] * r, path[i][1] + dir[1] * r, path[i][2] + dir[2] * r],
            n: dir,
          })
        }
        rings.push(ring)
      }
      const o = mesh()
      for (let i = 0; i < n - 1; i++)
        for (let j = 0; j < radial; j++) {
          const j2 = (j + 1) % radial
          const a = rings[i][j]
          const b = rings[i][j2]
          const c = rings[i + 1][j2]
          const d = rings[i + 1][j]
          quad(o, [a.p, b.p, c.p, d.p], [a.n, b.n, c.n, d.n])
        }
      return finish(o)
    }
    /** Toro de radio mayor `R` y menor `r` en el plano 'xy' | 'zy' | 'xz' (eje del toro = la normal del plano). */
    const torusGeo = (R, r, plane, radial = 5, seg = 12) => {
      const e1 = plane === 'zy' ? [0, 0, 1] : [1, 0, 0]
      const e2 = plane === 'xz' ? [0, 0, 1] : [0, 1, 0]
      const e3 = cross3(e1, e2)
      const o = mesh()
      const vert = (i, j) => {
        const u = (2 * PI * i) / seg
        const v = (2 * PI * j) / radial
        const rd = [
          cos(u) * e1[0] + sin(u) * e2[0],
          cos(u) * e1[1] + sin(u) * e2[1],
          cos(u) * e1[2] + sin(u) * e2[2],
        ]
        const nr = [
          cos(v) * rd[0] + sin(v) * e3[0],
          cos(v) * rd[1] + sin(v) * e3[1],
          cos(v) * rd[2] + sin(v) * e3[2],
        ]
        return { p: [rd[0] * R + nr[0] * r, rd[1] * R + nr[1] * r, rd[2] * R + nr[2] * r], n: nr }
      }
      for (let i = 0; i < seg; i++)
        for (let j = 0; j < radial; j++) {
          const a = vert(i, j)
          const b = vert(i, j + 1)
          const c = vert(i + 1, j + 1)
          const d = vert(i + 1, j)
          quad(o, [a.p, b.p, c.p, d.p], [a.n, b.n, c.n, d.n])
        }
      return finish(o)
    }
    const hose = (b, c, pts, r, per = 4, radial = 6) => {
      const path = spline(pts, per)
      b.push(tubeGeo(path, r, radial), 0, 0, 0, c)
      return path
    }
    const ring = (b, c, x, y, z, R, r, plane, radial = 5, seg = 12) =>
      b.push(torusGeo(R, r, plane, radial, seg), x, y, z, c)
    /** Resorte helicoidal vertical (eje Y): `turns` vueltas de radio `R` con alambre `r`, entre y0 e y1. */
    const spring = (b, c, cx, cz, y0, y1, R, r, turns = 5, per = 8) => {
      const pts = []
      const n = turns * per
      for (let k = 0; k <= n; k++) {
        const t = k / n
        const a = 2 * PI * turns * t
        pts.push([cx + R * cos(a), y0 + (y1 - y0) * t, cz + R * sin(a)])
      }
      b.push(tubeGeo(pts, r, 4), 0, 0, 0, c)
    }
    /** Caja con rotaciones (rad) aplicadas en el orden X, Z, Y. */
    const boxRot = (b, c, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const geo = new K.Box(w, h, d)
      if (rx) geo.rotateX(rx)
      if (rz) geo.rotateZ(rz)
      if (ry) geo.rotateY(ry)
      return b.push(geo, x, y, z, c)
    }
    /** Bulón hexagonal (cabeza baja) sobre un plano horizontal, en el ángulo `a` y radio `R` alrededor de (cx,cz). */
    const bolts = (b, c, cx, cz, y, R, a0, a1, n) => {
      for (let k = 0; k < n; k++) {
        const a = n === 1 ? a0 : a0 + ((a1 - a0) * k) / (n - 1)
        b.cyl(c, 0.017, 0.017, 0.03, cx + R * cos(a), y + 0.015, cz + R * sin(a), 'y', 5)
      }
    }
    /** Dado (mordaza) radial en el ángulo `a`, centrado en (x,z): cuerpo de acero oscuro + 4 estrías. Cara hacia el eje del tubing. */
    const die = (b, x, z, a, y, h) => {
      b.box(STEEL_D, 0.06, h, 0.05, x, y, z, -a)
      for (let k = 0; k < 4; k++)
        b.box(
          C.STEEL,
          0.012,
          0.012,
          0.042,
          x - 0.034 * cos(a),
          y - h * 0.36 + k * h * 0.24,
          z - 0.034 * sin(a),
          -a,
        )
    }

    // ─────────────────────────── cuñas manuales (slips) + buje ───────────────────────────
    // Buje maestro (cono de asiento) y 3 segmentos articulados de cuña con dados; dos asas hacia +X (lado abierto).
    S.push(
      sectorGeo(0.09, 0.48, 0.15, 0.36, FL, FL + 0.12, 0, 2 * PI, 28, {
        bottom: false,
        caps: false,
      }),
      0,
      0,
      0,
      C.DARK,
    )
    const SEG = [
      [10, 110],
      [130, 230],
      [250, 350],
    ].map(([a, b]) => [(a * PI) / 180, (b * PI) / 180])
    for (const [a0, a1] of SEG) {
      S.push(sectorGeo(0.05, 0.1, 0.05, 0.19, FL + 0.02, FL + 0.24, a0, a1, 8), 0, 0, 0, '#8C959C') // cuerpo en cuña
      const ins = (8 * PI) / 180
      S.push(
        sectorGeo(0.046, 0.06, 0.046, 0.06, FL + 0.07, FL + 0.21, a0 + ins, a1 - ins, 4),
        0,
        0,
        0,
        STEEL_D,
      ) // dados
      for (let k = 0; k < 4; k++) {
        const am = (a0 + a1) / 2
        S.box(
          C.STEEL,
          0.012,
          0.008,
          0.05,
          0.052 * cos(am),
          FL + 0.09 + k * 0.035,
          0.052 * sin(am),
          -am,
        )
      }
    }
    for (const ah of [(120 * PI) / 180, (240 * PI) / 180]) {
      // bisagra entre segmentos: pasador vertical + orejas
      const hx = 0.155 * cos(ah)
      const hz = 0.155 * sin(ah)
      S.cyl(C.STEEL, 0.014, 0.014, 0.22, hx, FL + 0.13, hz, 'y', 8)
      S.box(STEEL_D, 0.04, 0.04, 0.05, hx, FL + 0.21, hz, -ah)
      S.box(STEEL_D, 0.04, 0.04, 0.05, hx, FL + 0.05, hz, -ah)
    }
    for (const sg of [1, -1]) {
      // asas de las dos cuñas extremas
      const root = [0.167, FL + 0.2, 0.03 * sg]
      const elbow = [0.4, FL + 0.26, 0.1 * sg]
      const tip = [0.4, FL + 0.26, 0.27 * sg]
      S.rod(C.STEEL, root, elbow, 0.014, 6)
      S.rod(C.STEEL, elbow, tip, 0.013, 6)
      S.rod(C.HOSE, [0.4, FL + 0.26, 0.15 * sg], [0.4, FL + 0.26, 0.26 * sg], 0.02, 6) // empuñadura
      S.cyl(C.STEEL, 0.02, 0.02, 0.02, 0.4, FL + 0.26, 0.275 * sg, 'z', 6)
    }

    // ─────────────────────────── sarta de tubing (una parada, estético) ───────────────────────────
    M.cyl(C.STEEL, 0.045, 0.045, 1.5, 0, 3.13, 0, 'y', 12)
    M.cyl(C.GRAY_L, 0.062, 0.062, 0.14, 0, 3.74, 0, 'y', 12) // cupla

    // ─────────────────────────── llave de contrafuerza (backup), y 2,68–2,80 ───────────────────────────
    const g0 = Math.asin(0.07 / 0.12) // semiángulo de la garganta (ancho 0,14 m en el borde interior)
    const A0 = g0
    const A1 = 2 * PI - g0
    P.push(sectorGeo(0.12, 0.34, 0.12, 0.34, 2.68, 2.8, A0, A1, 22), 0, 0, 0, PAINT.main)
    for (const sg of [1, -1]) P.box(PAINT.main, 0.31, 0.12, 0.14, 0.245, 2.74, 0.14 * sg) // labios de la garganta
    for (const a of [PI, (140 * PI) / 180, (220 * PI) / 180])
      die(M, 0.09 * cos(a), 0.09 * sin(a), a, 2.74, 0.1)
    for (const sg of [1, -1]) die(M, 0.12, 0.09 * sg, (PI / 2) * sg, 2.74, 0.1)
    bolts(M, STEEL_D, 0, 0, 2.8, 0.29, (45 * PI) / 180, (315 * PI) / 180, 9)
    // 3 columnas entre contrafuerza y llave; patas de apoyo con resorte (2 delanteras) y pata fija trasera
    for (const [px, pz] of [
      [0.118, 0.254],
      [0.118, -0.254],
      [-0.28, 0],
    ])
      M.cyl(C.STEEL, 0.022, 0.022, 0.16, px, 2.88, pz, 'y', 8)
    for (const [lx, lz, sp] of [
      [0.28, 0.485, true],
      [0.28, -0.485, true],
      [-0.56, 0, false],
    ]) {
      const ang = Math.atan2(lz, lx)
      P.rod(PAINT.main, [0.32 * cos(ang), 2.76, 0.32 * sin(ang)], [lx, 2.76, lz], 0.024, 6) // ménsula
      P.cyl(PAINT.main, 0.032, 0.032, 0.14, lx, 2.7, lz, 'y', 8) // camisa de la pata
      if (sp) {
        M.cyl(C.STEEL, 0.016, 0.016, 0.28, lx, 2.51, lz, 'y', 6) // vástago telescópico
        spring(M, SPRING, lx, lz, 2.43, 2.63, 0.036, 0.008, 5, 8)
      } else M.cyl(C.STEEL, 0.02, 0.02, 0.36, lx, 2.56, lz, 'y', 6)
      P.box(PAINT.main, 0.14, 0.022, 0.14, lx, FL + 0.011, lz) // patín
    }

    // ─────────────────────────── cabezal de la llave (garganta, dados, tapa con bulones), y 2,96–3,14 ───────────────────────────
    P.push(sectorGeo(0.12, 0.36, 0.12, 0.36, 2.96, 3.1, A0, A1, 24), 0, 0, 0, PAINT.main) // placa principal
    P.box(PAINT.main, 0.44, 0.14, 0.54, -0.44, 3.03, 0) // cola de la placa (mecanismo)
    for (const sg of [1, -1]) P.box(PAINT.main, 0.33, 0.14, 0.14, 0.255, 3.03, 0.14 * sg) // labios de la garganta
    P.push(sectorGeo(0.12, 0.3, 0.12, 0.3, 3.1, 3.14, A0, A1, 22), 0, 0, 0, PAINT.acc) // tapa
    P.box(PAINT.acc, 0.34, 0.04, 0.48, -0.41, 3.12, 0)
    for (const a of [PI, (130 * PI) / 180, (230 * PI) / 180])
      die(M, 0.09 * cos(a), 0.09 * sin(a), a, 3.03, 0.13)
    for (const sg of [1, -1]) die(M, 0.12, 0.09 * sg, (PI / 2) * sg, 3.03, 0.13) // dados de la puerta
    bolts(M, STEEL_D, 0, 0, 3.14, 0.21, (50 * PI) / 180, (310 * PI) / 180, 8)
    bolts(M, STEEL_D, 0, 0, 3.1, 0.33, (48 * PI) / 180, (312 * PI) / 180, 9)
    for (const [bx, bz] of [
      [-0.3, 0.18],
      [-0.3, -0.18],
      [-0.55, 0.18],
      [-0.55, -0.18],
    ])
      M.cyl(STEEL_D, 0.017, 0.017, 0.03, bx, 3.155, bz, 'y', 5)
    // franjas de advertencia en los labios (amarillo/negro)
    for (const sg of [1, -1]) {
      P.box(C.DARK, 0.3, 0.12, 0.004, 0.255, 3.03, (0.21 + 0.002) * sg)
      for (let k = 0; k < 5; k++)
        boxRot(
          P,
          C.YEL,
          0.045,
          0.11,
          0.003,
          0.15 + k * 0.055,
          3.03,
          (0.21 + 0.004) * sg,
          0,
          0,
          PI / 4,
        )
      P.box(C.DARK, 0.004, 0.12, 0.14, 0.42 + 0.002, 3.03, 0.14 * sg)
      for (const dz of [0.1, 0.17])
        boxRot(P, C.YEL, 0.003, 0.11, 0.035, 0.42 + 0.005, 3.03, dz * sg, PI / 4)
    }
    M.box(C.WHITE, 0.003, 0.05, 0.08, -0.664, 3.03, -0.09) // placa de datos (en blanco: modelo/fabricante PENDIENTE)

    // ─────────────────────────── accionamiento: motor, caja de engranajes, válvulas de mando ───────────────────────────
    P.box(PAINT.main, 0.24, 0.16, 0.34, -0.44, 3.22, 0) // caja de engranajes
    M.cyl(STEEL_D, 0.055, 0.055, 0.18, -0.46, 3.03, -0.36, 'z', 10) // motor hidráulico
    P.box(PAINT.main, 0.12, 0.12, 0.02, -0.46, 3.03, -0.265) // brida del motor
    M.cyl(C.STEEL, 0.045, 0.045, 0.03, -0.46, 3.03, -0.465, 'z', 8)
    for (const dx of [-0.03, 0.03]) M.cyl(BRASS, 0.011, 0.011, 0.04, -0.46 + dx, 3.09, -0.4, 'y', 6) // bocas del motor
    // bloque de válvulas: 2 palancas / 1 mando en T
    P.box(PAINT.main, 0.1, 0.16, 0.18, -0.7, 3.05, 0.12)
    for (const vz of [0.075, 0.165]) M.cyl(STEEL_D, 0.028, 0.028, 0.05, -0.7, 3.155, vz, 'y', 8)
    P.rod(PAINT.main, [-0.7, 3.19, 0.075], [-0.73, 3.42, 0.03], 0.01, 5)
    M.cyl(C.HOSE, 0.019, 0.019, 0.045, -0.73, 3.44, 0.03, 'y', 6) // perilla de la palanca
    M.rod(C.HOSE, [-0.7, 3.18, 0.165], [-0.7, 3.3, 0.165], 0.01, 5)
    M.rod(C.HOSE, [-0.7, 3.3, 0.125], [-0.7, 3.3, 0.205], 0.012, 5) // mando en T
    // empuñadura en D (lado −Z)
    P.rod(PAINT.main, [-0.26, 3.03, -0.27], [-0.26, 3.03, -0.72], 0.016, 6)
    P.rod(PAINT.main, [-0.62, 3.03, -0.27], [-0.62, 3.03, -0.72], 0.016, 6)
    P.rod(PAINT.main, [-0.26, 3.03, -0.72], [-0.62, 3.03, -0.72], 0.016, 6)
    P.rod(C.DARK, [-0.36, 3.03, -0.72], [-0.52, 3.03, -0.72], 0.022, 6) // empuñadura

    // ─────────────────────────── estructura tubular, cilindro hidráulico superior y suspensión ───────────────────────────
    for (const sg of [1, -1]) {
      P.rod(PAINT.main, [-0.34, 3.14, 0.22 * sg], [-0.34, 3.6, 0.21 * sg], 0.022, 6) // montante
      P.rod(PAINT.main, [-0.55, 3.14, 0.245 * sg], [-0.34, 3.4, 0.22 * sg], 0.016, 5) // tornapunta
      P.box(PAINT.main, 0.08, 0.02, 0.08, -0.34, 3.15, 0.22 * sg)
      P.box(PAINT.main, 0.08, 0.09, 0.08, -0.34, 3.64, 0.21 * sg) // cabezal del montante
    }
    M.cyl(C.STEEL, 0.036, 0.036, 0.26, -0.34, 3.64, 0, 'z', 10) // camisa del cilindro
    M.cyl(STEEL_D, 0.04, 0.04, 0.03, -0.34, 3.64, -0.14, 'z', 10)
    M.cyl(STEEL_D, 0.04, 0.04, 0.03, -0.34, 3.64, 0.14, 'z', 10)
    M.rod(C.STEEL, [-0.34, 3.64, 0.15], [-0.34, 3.64, 0.21], 0.016, 6) // vástago
    for (const sg of [1, -1]) M.cyl(BRASS, 0.013, 0.013, 0.04, -0.34, 3.685, 0.11 * sg, 'y', 6) // bocas del cilindro
    // manómetro de torque: pedestal + caja; aguja en cero (SIN escala ni valor)
    const gx = -0.44
    const gy = 3.46
    const gz = 0
    const gd = [cos((-20 * PI) / 180), 0, sin((-20 * PI) / 180)] // cara del manómetro (orientación aproximada)
    M.cyl(STEEL_D, 0.04, 0.04, 0.08, gx, 3.34, gz, 'y', 8)
    const gp = (k) => [gx + gd[0] * k, gy, gz + gd[2] * k]
    G.rod(C.STEEL, gp(-0.02), gp(0.02), 0.088, 16) // caja / aro
    G.rod(C.WHITE, gp(0.019), gp(0.0225), 0.074, 16) // esfera
    const right = norm3(cross3([-gd[0], 0, -gd[2]], [0, 1, 0]))
    const gdir = (th, r, k = 0.0232) => [
      gx + gd[0] * k + right[0] * sin(th) * r,
      gy + cos(th) * r,
      gz + gd[2] * k + right[2] * sin(th) * r,
    ]
    for (let k = 0; k < 11; k++) {
      const th = (-135 + k * 27) * (PI / 180)
      G.rod(C.HOSE, gdir(th, 0.054), gdir(th, 0.067), 0.003, 4)
    }
    G.rod(C.RED, gdir(0, 0, 0.0232), gdir((-135 * PI) / 180, 0.05, 0.0245), 0.004, 4) // aguja en cero
    G.rod(C.HOSE, gp(0.0225), gp(0.027), 0.011, 6) // eje de la aguja

    // línea de suspensión: cabo doble desde los cabezales del cilindro → argolla → línea al mástil (~9 m) con contrapeso
    const RINGY = 4.0
    for (const sg of [1, -1])
      M.rod(C.CABLE, [-0.34, 3.685, 0.21 * sg], [-0.34, RINGY - 0.05, 0], 0.011, 5)
    ring(M, C.STEEL, -0.34, RINGY, 0, 0.05, 0.009, 'xy', 5, 12)
    const TOP = [-0.92, 9.0, -0.62]
    const lineAt = (y) => {
      const t = (y - (RINGY + 0.05)) / (TOP[1] - (RINGY + 0.05))
      return [-0.34 + (TOP[0] + 0.34) * t, y, 0 + TOP[2] * t]
    }
    M.rod(C.CABLE, [-0.34, RINGY + 0.05, 0], TOP, 0.012, 5)
    for (const y of [4.62, 4.8, 4.98]) {
      const [lx, , lz] = lineAt(y)
      P.cyl(C.DARK, 0.08, 0.08, 0.16, lx, y, lz, 'y', 10) // contrapeso (discos)
    }
    P.cyl(C.DARK, 0.03, 0.03, 0.62, lineAt(4.8)[0], 4.8, lineAt(4.8)[2], 'y', 6)
    // remate superior: polea con carrillos y pasador
    for (const dz of [-0.05, 0.05]) P.box(C.DARK, 0.16, 0.12, 0.02, TOP[0], TOP[1], TOP[2] + dz)
    M.cyl(C.STEEL, 0.05, 0.05, 0.05, TOP[0], TOP[1] - 0.005, TOP[2], 'z', 12)
    M.cyl(C.STEEL, 0.014, 0.014, 0.14, TOP[0], TOP[1], TOP[2], 'z', 6)

    // ─────────────────────────── mangueras (2 principales, 2 del motor, 2 del cilindro) con látigos de seguridad ───────────────────────────
    const h1 = hose(
      H,
      C.HOSE,
      [
        [-0.78, 3.02, 0.075],
        [-1.02, 2.72, 0.5],
        [-1.5, 2.53, 1.0],
        [-2.6, 2.42, 1.1],
        [-3.6, 2.4, 1.3],
      ],
      0.03,
      5,
    )
    const h2 = hose(
      H,
      C.HOSE,
      [
        [-0.78, 3.08, 0.17],
        [-1.05, 2.65, 0.65],
        [-1.55, 2.52, 1.1],
        [-2.6, 2.4, 1.25],
        [-3.6, 2.38, 1.45],
      ],
      0.03,
      5,
    )
    hose(
      H,
      C.HOSE,
      [
        [-0.49, 3.1, -0.4],
        [-0.58, 3.24, -0.36],
        [-0.76, 3.2, -0.28],
        [-0.72, 3.09, -0.12],
        [-0.7, 3.07, 0.025],
      ],
      0.016,
      4,
      5,
    )
    hose(
      H,
      C.HOSE,
      [
        [-0.43, 3.1, -0.4],
        [-0.55, 3.28, -0.34],
        [-0.8, 3.24, -0.26],
        [-0.76, 3.03, -0.1],
        [-0.72, 3.02, 0.025],
      ],
      0.016,
      4,
      5,
    )
    hose(
      H,
      C.HOSE,
      [
        [-0.34, 3.7, 0.11],
        [-0.48, 3.74, 0.14],
        [-0.6, 3.55, 0.22],
        [-0.66, 3.3, 0.26],
        [-0.68, 3.13, 0.235],
      ],
      0.014,
      4,
      5,
    )
    hose(
      H,
      C.HOSE,
      [
        [-0.34, 3.7, -0.11],
        [-0.42, 3.82, -0.02],
        [-0.58, 3.72, 0.1],
        [-0.68, 3.45, 0.28],
        [-0.74, 3.2, 0.3],
        [-0.72, 3.03, 0.235],
      ],
      0.014,
      4,
      5,
    )
    // conexiones (latón) y abrazaderas de las mangueras principales
    M.cyl(BRASS, 0.036, 0.036, 0.05, -0.775, 3.02, 0.075, 'x', 8)
    M.cyl(BRASS, 0.036, 0.036, 0.05, -0.775, 3.08, 0.17, 'x', 8)
    for (const p of [h1[h1.length - 1], h2[h2.length - 1]])
      M.cyl(BRASS, 0.036, 0.036, 0.06, p[0] + 0.03, p[1], p[2], 'x', 8)
    for (const path of [h1, h2])
      for (const f of [0.28, 0.55, 0.8]) {
        const p = path[Math.floor(path.length * f)]
        M.cyl(C.STEEL, 0.037, 0.037, 0.03, p[0], p[1], p[2], 'y', 8)
      }
    // látigos de seguridad (whip checks): cable corto de la manguera al soporte del bastidor
    for (const [path, lug] of [
      [h1, [-0.62, 3.12, 0.27]],
      [h2, [-0.62, 3.12, 0.27]],
    ]) {
      const p = path[4]
      hose(
        H,
        C.CABLE,
        [p, [p[0] + 0.04, p[1] + 0.14, p[2] - 0.02], [lug[0] - 0.05, lug[1] + 0.05, lug[2]], lug],
        0.006,
        3,
        4,
      )
      M.cyl(C.STEEL, 0.037, 0.037, 0.02, p[0], p[1], p[2], 'y', 8)
    }
    P.box(PAINT.main, 0.04, 0.03, 0.04, -0.62, 3.115, 0.27) // argolla de anclaje de los látigos

    // ─────────────────────────── brazo de retenida: el poste va SUJETO AL MÁSTIL, no apoya en el piso de trabajo ───────────────────────────
    // Decisión del usuario: el brazo de retenida está siempre vinculado al mástil; un poste con base en el piso restaría espacio de trabajo.
    // El poste redondo corre paralelo al montante delantero del mástil (lado +z), sujeto con dos grampas (PRL-1 arriba, PRL-2 abajo) y sin
    // tocar el piso. Posición del montante por `api.ni` (eje inclinado del mástil); semiancho local 0,8 m y sección 0,16 m: APROXIMADOS.
    const LEG_X = 0.8
    const LEG_Z = 0.8
    const legAt = (y) => {
      const p0 = api.ni(0, LEG_X, LEG_Z)
      const p1 = api.ni(10, LEG_X, LEG_Z)
      const p = api.ni((10 * (y - p0.y)) / (p1.y - p0.y), LEG_X, LEG_Z)
      return [p.x, y, p.z]
    }
    const POST_GAP = 0.14 // medio montante (0,08) + separación + radio del poste (0,05)
    const postAt = (y) => {
      const [x, , z] = legAt(y)
      return [x + POST_GAP, y, z]
    }
    const armA = [0.25, 3.03, 0.27]
    const armB = postAt(3.03)
    const armLen = Math.hypot(armB[0] - armA[0], armB[2] - armA[2])
    const armRy = Math.atan2(-(armB[2] - armA[2]), armB[0] - armA[0])
    P.box(
      PAINT.main,
      armLen,
      0.09,
      0.06,
      (armA[0] + armB[0]) / 2,
      3.03,
      (armA[2] + armB[2]) / 2,
      armRy,
    )
    for (let k = 1; k <= 3; k++) {
      const t = k / 4
      P.box(
        PAINT.acc,
        0.02,
        0.05,
        0.1,
        armA[0] + (armB[0] - armA[0]) * t,
        3.03,
        armA[2] + (armB[2] - armA[2]) * t,
        armRy,
      ) // nervios
    }
    P.box(PAINT.main, 0.1, 0.11, 0.09, armA[0], 3.03, armA[2], armRy) // oreja de articulación
    M.cyl(C.STEEL, 0.02, 0.02, 0.17, armA[0], 3.03, armA[2], 'y', 8) // perno de articulación
    P.cyl(PAINT.main, 0.058, 0.058, 0.08, armB[0], 3.0, armB[2], 'y', 12) // abrazadera sobre el poste

    // poste redondo de retenida: solo sujeto al montante del mástil por las grampas PRL-1/PRL-2 (extremo inferior libre, sobre el piso)
    M.rod(C.GRAY_L, postAt(2.75), postAt(4.75), 0.05, 10)

    P.flush(g, m.paint, 'llave_pintura')
    M.flush(g, m.metal, 'llave_acero')
    H.flush(g, m.rubber, 'llave_mangueras', { cast: false })
    S.flush(g, m.metal, 'llave_cunas')
    G.flush(g, dialMat, 'llave_manometro', { cast: false })

    // PRL-1 / PRL-2 · grampas superior e inferior que sujetan el poste al montante del mástil ("8 bulones con tuercas autofrenantes":
    // 4 pasantes con cabeza y tuerca = 8 fijaciones). Dos placas laterales abrazan montante + poste; los bulones pasan por fuera de ambos.
    const clamp = (id, yc, note) => {
      const grp = dropsGroup(g, id, note)
      const cp = new Batch()
      const cm = new Batch()
      const [px, , pz] = legAt(yc)
      const cx = px + POST_GAP / 2
      for (const s of [-1, 1]) cp.box(C.GRAY, 0.34, 0.24, 0.04, cx, yc, pz + s * 0.1)
      for (const dx of [-0.13, 0.13])
        for (const dy of [-0.08, 0.08]) {
          cm.cyl(C.STEEL, 0.02, 0.02, 0.28, cx + dx, yc + dy, pz, 'z', 6)
          for (const s of [-1, 1])
            cm.cyl(C.DARK, 0.032, 0.032, 0.03, cx + dx, yc + dy, pz + s * 0.135, 'z', 6)
        }
      cp.flush(grp, m.paint, id + '_grampa')
      cm.flush(grp, m.metal, id + '_bulones')
    }
    clamp(
      'PRL-1',
      4.4,
      'Libro DROPS p.24: grampa superior con 8 bulones y tuercas autofrenantes ([DUDOSO] "8 por bulones"). Sujeta el poste al mástil.',
    )
    clamp(
      'PRL-2',
      2.95,
      'Libro DROPS p.25: grampa inferior, igual que PRL-1. Sujeta el poste al mástil.',
    )

    // PRL-3 · sujeción del brazo de la llave al poste: perno pasante con cadena y seguro + eslinga con grillete de 4 elementos
    const prl3 = dropsGroup(
      g,
      'PRL-3',
      'Libro DROPS p.25: perno pasante con cadena soldada y seguro; eslinga con grillete de 4 elementos.',
    )
    const pm = new Batch()
    const pc = new Batch()
    const pinX = armB[0] + 0.03
    const pinZ = armB[2] - 0.04
    const [gxp, , gzp] = postAt(3.36)
    pm.cyl(C.STEEL, 0.03, 0.03, 0.22, pinX, 3.0, pinZ, 'y', 8) // perno pasante
    pm.cyl(C.RED, 0.009, 0.009, 0.06, pinX, 3.13, pinZ, 'x', 5) // seguro
    pm.loop(C.RED, gxp, 3.36, gzp + 0.09, 0.06, 'xy', 0, 2 * PI, 0.012, 12) // grillete
    pc.tube(
      C.DARK,
      [
        [pinX, 3.11, pinZ],
        [gxp + 0.03, 3.2, gzp + 0.05],
        [gxp, 3.3, gzp + 0.09],
      ],
      0.012,
    ) // cadena
    pm.flush(prl3, m.metal, 'PRL-3_perno')
    pc.flush(prl3, m.rubber, 'PRL-3_cadena', { cast: false })
  }

  // ═════════════════════════════════════════ CABALLETES + PLANCHADA + PLANO INCLINADO ═════════════════════════════════════════
  function buildCaballetes(g, api) {
    const m = mats(api)
    const P = new Batch()
    const M = new Batch()

    // PLANCHADA 12×2,4 m (layout de locación): x 3…15, eje del equipo. Altura de cubierta 0,6 m: estético.
    const X0 = 3
    const X1 = 15
    const XC = (X0 + X1) / 2
    const DECK = 0.6
    P.box(C.SKID, 12, 0.06, 2.4, XC, DECK - 0.03, 0) // cubierta
    for (let x = X0 + 0.5; x < X1; x += 0.5) P.box(C.GRAY, 0.04, 0.012, 2.34, x, DECK + 0.004, 0) // antideslizante (listones)
    for (const dz of [-1.15, 1.15]) M.box(C.STEEL, 12, 0.16, 0.1, XC, DECK - 0.14, dz) // largueros perimetrales
    for (let x = X0 + 0.1; x <= X1; x += 1.5) P.box(C.GRAY, 0.1, 0.12, 2.3, x, DECK - 0.12, 0) // vigas transversales
    for (let x = X0 + 0.4; x <= X1; x += 3.6)
      for (const dz of [-1.1, 1.1]) {
        P.box(C.GRAY, 0.12, DECK - 0.2, 0.12, x, (DECK - 0.2) / 2, dz) // patas
        P.box(C.SKID, 0.34, 0.04, 0.34, x, 0.02, dz) // apoyos
      }

    // PLA-2 · barandas de planchada (montante soldado en tintero con perno y seguro; rodapié)
    const pla2 = dropsGroup(
      g,
      'PLA-2',
      'Libro DROPS p.20: baranda en tintero soldado, con perno y seguro. Retención secundaria: no requerida.',
    )
    const RP = new Batch()
    RP.rail(
      C.YEL,
      [
        [X0 + 2.6, -1.2],
        [X1, -1.2],
        [X1, 1.2],
        [X0 + 2.6, 1.2],
      ],
      DECK,
      1.05,
    )
    RP.flush(pla2, m.paint, 'PLA-2_barandas')

    // PLA-1 · plano inclinado (bandeja): del borde del piso de trabajo (y≈2,3) a la planchada; 22°, ancho 1 m. Estético.
    const pla1 = dropsGroup(
      g,
      'PLA-1',
      'Libro DROPS p.20: fila incompleta ("BANDEJA HCA.") [DUDOSO]. Conexión con el piso de trabajo a verificar.',
    )
    const RM = new Batch() // acero: peldaños, pasamanos, patas
    const RPt = new Batch() // pintura: chapa y largueros
    const top = [2.2, 2.3]
    const bot = [6.4, DECK + 0.02]
    const ang = Math.atan2(top[1] - bot[1], bot[0] - top[0]) // pendiente (sube hacia −X)
    const len = Math.hypot(bot[0] - top[0], top[1] - bot[1])
    const along = (u) => [
      top[0] + (u / len) * (bot[0] - top[0]),
      top[1] - (u / len) * (top[1] - bot[1]),
    ] // punto a distancia u desde arriba
    const tilted = (b, c, w, h, d, u, dy, dz = 0) => {
      // caja alineada con la pendiente, centrada a distancia u desde el extremo alto
      const gg = new K.Box(w, h, d)
      gg.rotateZ(-ang)
      const [px, py] = along(u)
      b.push(gg, px, py + dy, dz, c)
    }
    tilted(RPt, C.SKID, len, 0.05, 1.0, len / 2, 0) // chapa
    for (const dz of [-0.5, 0.5]) tilted(RPt, C.YEL, len, 0.14, 0.05, len / 2, 0.07, dz) // largueros laterales
    for (let u = 0.35; u < len; u += 0.5) tilted(RM, C.STEEL, 0.05, 0.03, 0.9, u, 0.04) // travesaños antideslizantes
    for (const dz of [-0.5, 0.5])
      RM.rod(C.YEL, [top[0], top[1] + 0.95, dz], [bot[0], bot[1] + 0.95, dz], 0.024, 6) // pasamanos
    for (const u of [0, len / 2, len])
      for (const dz of [-0.5, 0.5]) {
        const [px, py] = along(u)
        RM.rod(C.YEL, [px, py, dz], [px, py + 0.95, dz], 0.024, 6) // montantes
      }
    for (const u of [len * 0.4, len * 0.85])
      for (const dz of [-0.45, 0.45]) {
        const [px, py] = along(u)
        RM.rod(C.GRAY, [px, py - 0.03, dz], [px, DECK, dz], 0.05, 6) // patas de la bandeja
      }
    RPt.flush(pla1, m.paint, 'PLA-1_bandeja')
    RM.flush(pla1, m.metal, 'PLA-1_pasamanos')

    // CABALLETES de 2 m (acero, 4,5 t c/u): 2 hileras con tubing 2 7/8" (arriba) y varillas (abajo), paralelas a la planchada
    const stand = (b, x, zc, half) => {
      b.box(C.YEL, 0.16, 0.14, half * 2, x, 0.62, zc) // viga
      for (const s of [-1, 1]) {
        b.box(C.YEL, 0.1, 0.6, 0.1, x, 0.3, zc + s * (half - 0.15)) // patas
        b.box(C.GRAY, 0.5, 0.06, 0.14, x, 0.03, zc + s * (half - 0.15)) // patines
        b.box(C.YEL, 0.06, 1.0, 0.06, x, 1.12, zc + s * (half - 0.02)) // topes laterales
      }
      b.rod(C.YEL, [x, 0.08, zc - half + 0.15], [x, 0.62, zc + half - 0.15], 0.022, 5)
    }
    const rows = [
      {
        zc: 5.0,
        half: 1.0,
        x: [4.6, 9.0, 13.4],
        pipes: { r: 0.045, len: 9.4, x0: 4.3, layers: [17, 16, 15] },
      },
      {
        zc: 7.7,
        half: 0.9,
        x: [5.6, 12.4],
        pipes: { r: 0.013, len: 8.0, x0: 5.0, layers: [12, 11] },
      },
    ]
    for (const row of rows) {
      for (const x of row.x) stand(P, x, row.zc, row.half)
      const { r, len: L, x0, layers } = row.pipes
      const pitch = r * 2.5
      layers.forEach((count, li) => {
        for (let k = 0; k < count; k++) {
          const z = row.zc + (k - (count - 1) / 2) * pitch
          const y = 0.7 + r + li * pitch * 0.9
          M.cyl(li % 2 ? C.GRAY_L : C.STEEL, r, r, L, x0 + L / 2, y, z, 'x', 6)
          if (r > 0.03) M.cyl(C.GRAY, r * 1.3, r * 1.3, 0.16, x0 + L - 0.1, y, z, 'x', 6) // cupla
        }
      })
    }
    P.flush(g, m.paint, 'planchada_caballetes_pintura')
    M.flush(g, m.metal, 'tubulares')
  }

  // ═════════════════════════════════════════ SISTEMA DE CIRCULACIÓN ═════════════════════════════════════════
  function buildCirculacion(g, api) {
    const m = mats(api)
    const P = new Batch() // circulacion_pintura: bomba y patín
    const M = new Batch() // circulacion_acero: bomba y cañerías al pozo
    const H = new Batch() // circulacion_mangueras
    const zc = -14.7 // eje longitudinal de pileta y bomba (lateral del layout ≈ 14,4 m)
    const DX_BOMBA = -3.0 // m: bomba a 5 m de la pileta (cota rotulada en layout de locación); la pileta (x −8…4) no se mueve
    const BLACK = '#1B1D21' // patín de vigas y rodillos (foto de campo: patín negro)
    const WHITE_R = '#D3D6D0' // chapa lisa entre nervaduras (las nervaduras van en C.WHITE)
    const SUB = '#8E1F25' // rojo oscuro: bandas de soldadura y uniones

    const sub = (name) => {
      const s = new K.Group()
      s.name = name
      g.add(s)
      return s
    }

    // ── helpers de forma (locales a este componente) ──
    /** Volante horizontal: cubo, aro de 8 barras y 2 rayos. */
    const wheel = (B, c, x, y, z, R = 0.1) => {
      B.cyl(c, 0.03, 0.03, 0.04, x, y, z, 'y', 8)
      for (let k = 0; k < 8; k++) {
        const a0 = (2 * PI * k) / 8
        const a1 = (2 * PI * (k + 1)) / 8
        B.rod(
          c,
          [x + R * Math.cos(a0), y, z + R * Math.sin(a0)],
          [x + R * Math.cos(a1), y, z + R * Math.sin(a1)],
          0.011,
          3,
          true,
        )
      }
      B.rod(c, [x - R, y, z], [x + R, y, z], 0.009, 3, true)
      B.rod(c, [x, y, z - R], [x, y, z + R], 0.009, 3, true)
    }
    /** Válvula de compuerta en línea (eje 'x' | 'z' de la cañería): cuerpo, bridas, bonete, vástago y volante. */
    const gate = (B, cb, cw, x, y, z, axis = 'x') => {
      const a = axis === 'x'
      B.box(cb, a ? 0.2 : 0.16, 0.2, a ? 0.16 : 0.2, x, y, z)
      B.cyl(cb, 0.11, 0.11, 0.035, x + (a ? 0.11 : 0), y, z + (a ? 0 : 0.11), axis, 10)
      B.cyl(cb, 0.11, 0.11, 0.035, x - (a ? 0.11 : 0), y, z - (a ? 0 : 0.11), axis, 10)
      B.cyl(cb, 0.05, 0.07, 0.16, x, y + 0.17, z, 'y', 8)
      B.rod(cw, [x, y + 0.25, z], [x, y + 0.34, z], 0.012, 4)
      wheel(B, cw, x, y + 0.36, z)
    }
    /** Cañería de `pts` [[x,y,z],…] con un collarín en cada codo (eje = tramo entrante). */
    const pipe = (B, c, pts, r = 0.055) => {
      for (let i = 1; i < pts.length; i++) B.rod(c, pts[i - 1], pts[i], r, 8)
      for (let i = 1; i < pts.length - 1; i++) {
        const d = pts[i].map((v, k) => Math.abs(v - pts[i - 1][k]))
        const ax = d[0] >= d[1] && d[0] >= d[2] ? 'x' : d[1] >= d[2] ? 'y' : 'z'
        B.cyl(c, r * 1.22, r * 1.22, r * 1.8, pts[i][0], pts[i][1], pts[i][2], ax, 8)
      }
    }
    /** Brida (disco corto) con 4 espárragos, eje 'x' | 'y' | 'z'. */
    const flange = (B, cf, cs, x, y, z, axis, R = 0.13) => {
      B.cyl(cf, R, R, 0.035, x, y, z, axis, 12)
      const at = (dp, dq) =>
        axis === 'x'
          ? [x, y + dp, z + dq]
          : axis === 'y'
            ? [x + dp, y, z + dq]
            : [x + dp, y + dq, z]
      for (const [dp, dq] of [
        [R * 0.75, 0],
        [-R * 0.75, 0],
        [0, R * 0.75],
        [0, -R * 0.75],
      ]) {
        const [px, py, pz] = at(dp, dq)
        B.cyl(cs, 0.012, 0.012, 0.06, px, py, pz, axis, 4)
      }
    }
    /** Unión de martillo: collar corto a lo largo de la cañería. */
    const hUnion = (B, x, y, z, axis, r = 0.095) => B.cyl(SUB, r, r, 0.1, x, y, z, axis, 10)

    /** Patín de dos longitudinales en I (alas + alma), chapa inferior y, en los extremos indicados, barra de cabeza y rodillo. */
    const skid = (B, cx, cz, L, W, ends = [true, true]) => {
      const len = L + 0.9
      for (const s of [-1, 1]) {
        const z = cz + s * (W / 2 - 0.075)
        B.box(BLACK, len, 0.02, 0.15, cx, 0.01, z) // ala inferior
        B.box(BLACK, len, 0.02, 0.15, cx, 0.24, z) // ala superior
        B.box(BLACK, len, 0.2, 0.03, cx, 0.125, z) // alma
      }
      B.box(BLACK, L + 0.1, 0.03, W - 0.3, cx, 0.1, cz) // chapa inferior
      ends.forEach((on, i) => {
        if (!on) return
        const sg = i ? 1 : -1
        B.box(BLACK, 0.1, 0.2, W - 0.1, cx + sg * (len / 2 - 0.05), 0.125, cz) // barra de cabeza
        B.cyl(BLACK, 0.1, 0.1, W + 0.06, cx + sg * (len / 2 + 0.06), 0.12, cz, 'z', 10) // rodillo del patín
      })
    }

    /**
     * Tanque contenedor corrugado (fotos de campo): cuerpo de chapa lisa + nervaduras verticales cada 0,3 m en los costados y los
     * extremos, y cubierta de 5 cm. `top` = altura de la cubierta (2,0 m). Los costados largos quedan en cz ± W/2 (el letrero
     * de `addDecals` flota a ±1,222 m).
     */
    const tank = (B, cx, cz, L, W, top) => {
      const y0 = 0.25
      const yb = top - 0.05
      const h = yb - y0
      B.box(WHITE_R, L - 0.06, h, W - 0.06, cx, y0 + h / 2, cz)
      const n = Math.round((L - 0.3) / 0.3)
      for (let k = 0; k <= n; k++) {
        const x = cx - L / 2 + 0.15 + (k * (L - 0.3)) / n
        for (const s of [-1, 1])
          B.box(C.WHITE, 0.14, h - 0.12, 0.03, x, y0 + h / 2, cz + s * (W / 2 - 0.015))
      }
      const nz = Math.round((W - 0.3) / 0.3)
      for (let k = 0; k <= nz; k++) {
        const z = cz - W / 2 + 0.15 + (k * (W - 0.3)) / nz
        for (const s of [-1, 1])
          B.box(C.WHITE, 0.03, h - 0.12, 0.14, cx + s * (L / 2 - 0.015), y0 + h / 2, z)
      }
      B.box(C.GRAY_L, L + 0.02, 0.05, W + 0.02, cx, yb + 0.025, cz)
    }

    /** Boca de inspección circular en cubierta: brocal, tapa, 6 bulones y manija. */
    const hatch = (B, x, z, yTop) => {
      B.cyl(C.STEEL, 0.3, 0.3, 0.12, x, yTop + 0.06, z, 'y', 14)
      B.cyl(C.GRAY_L, 0.33, 0.33, 0.035, x, yTop + 0.14, z, 'y', 14)
      for (let k = 0; k < 6; k++) {
        const a = (2 * PI * k) / 6
        B.cyl(
          C.DARK,
          0.018,
          0.018,
          0.03,
          x + 0.27 * Math.cos(a),
          yTop + 0.17,
          z + 0.27 * Math.sin(a),
          'y',
          5,
        )
      }
      B.box(C.DARK, 0.3, 0.03, 0.04, x, yTop + 0.19, z)
    }
    /** Tapa de inspección rectangular abulonada en el costado (dz = ±1: lado del tanque). */
    const plate = (Bp, Bm, x, y, zWall, dz) => {
      Bp.box(C.GRAY_L, 0.5, 0.36, 0.03, x, y, zWall + dz * 0.03)
      for (const [dx, dy] of [
        [-0.2, -0.13],
        [0.2, -0.13],
        [-0.2, 0.13],
        [0.2, 0.13],
      ])
        Bm.cyl(C.DARK, 0.016, 0.016, 0.03, x + dx, y + dy, zWall + dz * 0.055, 'z', 5)
    }
    /** Escalera vertical de marinero: 2 largueros, peldaños cada 0,3 m y ménsulas. `alongX`: larguero separado en X (pared ⟂ Z). */
    const ladder = (B, cx, cz, y0, y1, alongX, wallDir) => {
      const w = 0.24
      for (const s of [-1, 1]) {
        const px = alongX ? cx + s * w : cx
        const pz = alongX ? cz : cz + s * w
        B.rod(C.GRAY_L, [px, y0, pz], [px, y1, pz], 0.022, 6)
        for (const y of [y0 + 0.4, (y0 + y1) / 2, y1 - 0.4])
          B.rod(
            C.GRAY,
            [px, y, pz],
            [px + (alongX ? 0 : wallDir * 0.14), y, pz + (alongX ? wallDir * 0.14 : 0)],
            0.015,
            4,
          )
      }
      for (let y = y0 + 0.25; y < y1 - 0.1; y += 0.3)
        B.box(C.GRAY_L, alongX ? 2 * w : 0.028, 0.028, alongX ? 0.028 : 2 * w, cx, y, cz)
    }

    // ═════════════ PILETA DE ENSAYO 12 × 2,4 m (40 m³, Folleto/layout de locación) · tipología: foto de campo con golpeador ═════════════
    // Confirmado: envolvente en planta y capacidad. Aproximado (estético): altura, corrugado, patín, escalera, tapas, equipo de cubierta.
    const ge = sub('pileta_ensayo')
    const PE = new Batch() // pileta_ensayo_pintura
    const ME = new Batch() // pileta_ensayo_acero
    const TX = -2 // centro en X (x −8…4)
    skid(PE, TX, zc, 12, 2.4, [true, false]) // el extremo +x queda libre para el cubicador
    tank(PE, TX, zc, 12, 2.4, 2.0)

    // bocas de inspección en cubierta (3), tapas laterales (3) y bridas de las conexiones de succión/llegada
    for (const x of [-3.2, -0.6, 2.0]) hatch(ME, x, zc, 2.0)
    plate(PE, ME, -3.0, 0.48, zc - 1.2, -1)
    plate(PE, ME, 2.4, 0.48, zc + 1.2, 1)
    plate(PE, ME, -6.2, 0.48, zc + 1.2, 1)
    flange(ME, C.STEEL, C.DARK, -8.02, 0.9, zc, 'x', 0.12) // succión → bomba
    flange(ME, C.STEEL, C.DARK, 3.0, 1.25, zc + 1.2 + 0.03, 'z', 0.13) // llegada de la línea D (choke → pileta)
    // venteo con cuello de ganso
    ME.rod(C.STEEL, [-4.2, 2.0, zc + 0.6], [-4.2, 2.7, zc + 0.6], 0.05)
    ME.loop(C.STEEL, -4.32, 2.7, zc + 0.6, 0.12, 'xy', 0, PI, 0.04, 8)
    ME.rod(C.STEEL, [-4.44, 2.7, zc + 0.6], [-4.44, 2.5, zc + 0.6], 0.04)

    // escalera de marinero (lado pozo) con barandas abiertas en la boca de acceso
    ladder(ME, 1.6, zc + 1.2 + 0.14, 0.3, 3.0, true, -1)

    // visor de nivel: regla graduada en el costado (foto: regla blanca con marcas junto al golpeador)
    PE.box('#EEF0EA', 0.09, 1.5, 0.012, -5.4, 1.1, zc - 1.2 - 0.006 - 0.0)
    for (let k = 0; k < 10; k++)
      PE.box(BLACK, k % 2 ? 0.05 : 0.09, 0.012, 0.014, -5.4, 0.42 + k * 0.15, zc - 1.2 - 0.008)
    ME.box(C.STEEL, 0.14, 0.05, 0.05, -5.4, 0.32, zc - 1.2 - 0.03) // soporte inferior
    ME.box(C.STEEL, 0.14, 0.05, 0.05, -5.4, 1.88, zc - 1.2 - 0.03) // soporte superior

    // rampa/escalón: chapa inclinada bajo el borde de la cubierta (lado −z). INTERPRETACIÓN de la foto: función pendiente.
    {
      const zr = zc - 1.2
      const dy = 0.88
      const dz = 0.75
      PE.box(C.WHITE, 1.6, 0.04, Math.hypot(dy, dz), 1.8, 1.5, zr - dz / 2, 0, -Math.atan2(dy, dz))
      for (const x of [1.05, 2.55]) ME.rod(C.GRAY, [x, 1.06, zr - dz], [x, 1.95, zr], 0.02, 4) // tirantes de la rampa
    }

    // equipo rojo de cubierta (FUNCIÓN PENDIENTE): módulo con capó sobre la cubierta, dentro de la baranda
    {
      const ex = -6.3
      PE.box(BLACK, 2.7, 0.1, 1.4, ex, 2.05, zc) // bastidor
      PE.box(C.RED, 2.3, 0.5, 1.15, ex, 2.35, zc) // cuerpo
      PE.box(C.RED, 1.7, 0.36, 0.9, ex + 0.1, 2.78, zc) // capó
      PE.box(SUB, 1.72, 0.05, 0.92, ex + 0.1, 2.985, zc) // tapa del capó
      for (const dz of [-0.36, 0.36])
        PE.cyl(C.RED, 0.17, 0.17, 0.5, ex + 1.4, 2.4, zc + dz, 'x', 12) // motores
      for (const dz of [-0.36, 0.36])
        PE.cyl(C.STEEL, 0.19, 0.19, 0.04, ex + 1.67, 2.4, zc + dz, 'x', 12) // bridas
      PE.box(C.YEL, 0.5, 0.3, 0.02, ex - 1.16, 2.4, zc - 0.3) // chapa/guarda amarilla
      ME.loop(C.STEEL, ex, 3.09, zc, 0.1, 'xy', 0, 2 * PI, 0.018, 8) // ojal de izaje
    }

    // cubicador 3,5 m³ (cilindro vertical), conexión con válvula a la pileta y visor de nivel graduado
    const cbx = 4.9
    PE.cyl(C.BLUE_L, 0.65, 0.65, 2.4, cbx, 1.4, zc, 'y', 20)
    PE.cyl(C.BLUE_L, 0.25, 0.65, 0.22, cbx, 2.71, zc, 'y', 20)
    PE.cyl(C.GRAY, 0.69, 0.69, 0.08, cbx, 0.24, zc, 'y', 20) // faldón de apoyo
    PE.cyl(C.GRAY, 0.665, 0.665, 0.06, cbx, 1.4, zc, 'y', 20) // anillo de refuerzo
    ME.cyl(C.STEEL, 0.18, 0.18, 0.1, cbx, 2.87, zc, 'y', 14) // boca superior
    ME.cyl(C.GRAY_L, 0.2, 0.2, 0.03, cbx, 2.94, zc, 'y', 14)
    ME.rod(C.STEEL, [4.0, 0.6, zc], [4.3, 0.6, zc], 0.06) // conexión pileta → cubicador
    gate(ME, C.STEEL, C.RED, 4.15, 0.6, zc, 'x')
    {
      const vz = zc + 0.82
      PE.box('#EEF0EA', 0.1, 2.0, 0.01, cbx, 1.5, vz - 0.05) // regla
      ME.cyl('#9FC3D6', 0.03, 0.03, 2.0, cbx, 1.5, vz, 'y', 8) // tubo de vidrio
      for (const y of [0.5, 2.5]) {
        ME.cyl(C.STEEL, 0.055, 0.055, 0.08, cbx, y, vz, 'y', 8)
        ME.rod(C.STEEL, [cbx, y, zc + 0.64], [cbx, y, vz], 0.02, 4) // ménsula
      }
      for (let k = 0; k < 11; k++)
        PE.box(BLACK, k % 2 ? 0.06 : 0.1, 0.01, 0.012, cbx, 0.55 + k * 0.19, vz - 0.05 + 0.006)
    }

    PE.flush(ge, m.paint, 'pileta_ensayo_pintura')
    ME.flush(ge, m.metal, 'pileta_ensayo_acero')

    // PIL-2 · barandas y rodapié perimetrales (tintero soldado, perno y seguro); abiertas 0,8 m en la escalera
    const pil2 = dropsGroup(
      g,
      'PIL-2',
      'Libro DROPS p.21: baranda en tintero soldado con perno y seguro; rodapié.',
    )
    const RB = new Batch()
    RB.rail(
      C.YEL,
      [
        [2.0, zc + 1.2],
        [4, zc + 1.2],
        [4, zc - 1.2],
        [-8, zc - 1.2],
        [-8, zc + 1.2],
        [1.2, zc + 1.2],
      ],
      2.0,
      1.05,
    )
    RB.flush(pil2, m.paint, 'PIL-2_barandas')

    // ═════════════ GOLPEADOR / DESGASIFICADOR (recipiente vertical rojo de la foto de la pileta de ensayo) ═════════════
    // Reemplaza al "gas buster" anterior (mismo equipo, confirmado por Jorge): no se duplica. Posición y cotas APROXIMADAS.
    const gG = sub('golpeador')
    const GB = new Batch() // golpeador_pintura (rojo + herrajes en la misma malla)
    const gx = -6.9
    const gz = zc - 1.2 - 0.78
    const zw = zc - 1.2
    GB.box(BLACK, 2.2, 0.14, 1.3, gx + 0.05, 0.18, zc - 1.2 - 0.55) // ménsula del patín
    GB.cyl(C.DARK, 0.34, 0.34, 0.14, gx, 0.32, gz, 'y', 16) // faldón
    GB.cyl(C.RED, 0.3, 0.3, 2.3, gx, 1.55, gz, 'y', 18) // recipiente (Ø 0,6 · 2,3 m)
    for (const y of [0.75, 2.4]) GB.cyl(SUB, 0.305, 0.305, 0.06, gx, y, gz, 'y', 18) // bandas de soldadura
    GB.cyl(C.RED, 0.1, 0.3, 0.35, gx, 2.875, gz, 'y', 18) // casquete cónico
    GB.cyl(C.STEEL, 0.13, 0.13, 0.035, gx, 3.07, gz, 'y', 12) // brida de venteo
    GB.box('#EAEAE4', 0.015, 1.4, 0.05, gx + 0.305, 1.4, gz) // visor de nivel del recipiente
    GB.cyl(C.WHITE, 0.06, 0.06, 0.04, gx + 0.33, 2.3, gz, 'x', 12) // manómetro
    // venteo: sube, cuello de ganso hacia −x y bajante al tanque (línea de retorno)
    GB.rod(C.RED, [gx, 3.05, gz], [gx, 3.5, gz], 0.075, 8)
    GB.loop(C.RED, gx - 0.28, 3.5, gz, 0.28, 'xy', 0, PI, 0.075, 12)
    pipe(
      GB,
      C.RED,
      [
        [gx - 0.56, 3.5, gz],
        [gx - 0.56, 0.45, gz],
        [gx - 0.56, 0.45, zw - 0.02],
      ],
      0.075,
    )
    hUnion(GB, gx - 0.56, 1.7, gz, 'y')
    for (const y of [1.0, 2.2]) GB.rod(C.RED, [gx - 0.3, y, gz], [gx - 0.56, y, gz], 0.02, 4) // grapas
    flange(GB, C.STEEL, C.DARK, gx - 0.56, 0.45, zw - 0.03, 'z', 0.13)
    // salida de líquido al tanque (y=0,75) con válvula de compuerta
    pipe(
      GB,
      C.RED,
      [
        [gx, 0.75, gz + 0.28],
        [gx, 0.75, zw - 0.02],
      ],
      0.06,
    )
    gate(GB, C.RED, C.RED, gx, 0.75, zw - 0.42, 'z')
    flange(GB, C.STEEL, C.DARK, gx, 0.75, zw - 0.03, 'z', 0.13)
    // entrada (y=1,2) y purga (y=0,55) hacia +x, con válvula y unión de martillo
    pipe(
      GB,
      C.RED,
      [
        [gx + 0.28, 1.2, gz],
        [gx + 1.1, 1.2, gz],
      ],
      0.06,
    )
    gate(GB, C.RED, C.RED, gx + 0.65, 1.2, gz, 'x')
    hUnion(GB, gx + 0.95, 1.2, gz, 'x')
    flange(GB, C.STEEL, C.DARK, gx + 1.12, 1.2, gz, 'x', 0.11)
    pipe(
      GB,
      C.RED,
      [
        [gx + 0.28, 0.55, gz],
        [gx + 0.8, 0.55, gz],
      ],
      0.05,
    )
    hUnion(GB, gx + 0.55, 0.55, gz, 'x', 0.08)
    flange(GB, C.STEEL, C.DARK, gx + 0.82, 0.55, gz, 'x', 0.09)
    GB.flush(gG, m.paint, 'golpeador_pintura')

    // ── bomba triplex 6×2,4 m (camisas 5", carrera 8", 3.000 psi, 12 bpm). Se modela en x −16…−10 y su grupo se desplaza DX_BOMBA:
    //    el layout de locación rotula 5 m entre la bomba y la pileta (cota confirmada) y el modelo dejaba 2 m (ver docs/audit-dimensional-*.md).
    const bombaG = new K.Group()
    bombaG.name = 'bomba_triplex'
    bombaG.position.x = DX_BOMBA
    g.add(bombaG)
    {
      const P = new Batch() // bomba: pintura (sombrea el P del sistema solo dentro de este bloque)
      const M = new Batch() // bomba: acero
      P.box(C.SKID, 6, 0.22, 2.4, -13, 0.11, zc) // patín
      for (const dz of [-1.1, 1.1]) P.box(C.GRAY, 6, 0.1, 0.12, -13, 0.27, zc + dz)
      // motor diésel Detroit S60 (rojo) con radiador frontal, tapa de válvulas y escape
      P.box(C.RED, 2.0, 1.25, 1.3, -14.9, 0.845, zc)
      P.box(C.DARK, 0.08, 1.0, 1.15, -15.94, 0.85, zc) // radiador
      for (let k = -2; k <= 2; k++) M.box(C.GRAY_L, 0.03, 0.9, 0.03, -15.99, 0.85, zc + k * 0.22) // aletas
      P.box(C.POWER, 1.5, 0.16, 0.9, -14.8, 1.55, zc) // tapa de válvulas
      M.rod(C.STEEL, [-15.6, 1.62, zc + 0.3], [-15.6, 2.7, zc + 0.3], 0.06, 8)
      M.cyl(C.DARK, 0.13, 0.13, 0.55, -15.6, 2.1, zc + 0.3, 'y', 10) // silenciador
      M.cyl(C.STEEL, 0.1, 0.1, 0.06, -15.6, 2.75, zc + 0.3, 'y', 10)
      P.box(C.GRAY, 1.0, 0.95, 0.95, -13.4, 0.695, zc) // caja Allison
      P.box(C.YEL, 0.7, 0.26, 0.5, -12.6, 0.45, zc) // protector de cardán
      M.cyl(C.STEEL, 0.06, 0.06, 0.6, -12.6, 0.7, zc, 'x', 8) // cardán
      // bastidor de fuerza con tapas de cruceta, tornillería y ojal de izaje
      P.box(C.POWER, 1.3, 1.1, 1.5, -11.9, 0.77, zc)
      for (const dz of [-0.42, 0, 0.42]) {
        M.cyl(C.GRAY_L, 0.2, 0.2, 0.1, -11.22, 0.77, zc + dz, 'x', 14) // tapa de cruceta
        M.cyl(C.GRAY_L, 0.05, 0.05, 0.4, -11.4, 0.7, zc + dz, 'x', 8) // émbolo
      }
      M.loop(C.STEEL, -11.9, 1.5, zc, 0.09, 'xy', 0, 2 * PI, 0.018, 10) // ojal de izaje
      // cuerpo de fluido (acero), tapas de válvula y cabezal de descarga
      M.box(C.STEEL, 0.6, 0.55, 1.3, -10.95, 0.7, zc)
      for (const dz of [-0.42, 0, 0.42])
        M.cyl(C.GRAY_L, 0.11, 0.11, 0.25, -10.95, 1.12, zc + dz, 'y', 10)
      M.rod(C.STEEL, [-10.65, 0.9, zc - 0.5], [-10.65, 0.9, zc + 0.5], 0.06)
      M.rod(C.STEEL, [-10.95, 0.35, zc - 0.55], [-10.95, 0.35, zc + 0.55], 0.06) // múltiple de succión
      P.cyl(C.RED, 0.2, 0.2, 0.65, -10.3, 0.55, zc + 0.75, 'y', 14) // amortiguador de pulsaciones
      P.cyl(C.RED, 0.08, 0.2, 0.14, -10.3, 0.94, zc + 0.75, 'y', 14)
      M.cyl(C.WHITE, 0.09, 0.09, 0.05, -10.6, 1.28, zc - 0.1, 'x', 12) // manómetro (tipo Cameron)
      M.cyl(C.RED, 0.05, 0.05, 0.16, -10.65, 1.08, zc + 0.3, 'y', 8) // válvula de seguridad 3.000 psi
      // barandas amarillas del patín (lado exterior y extremos)
      P.rail(
        C.YEL,
        [
          [-16, zc - 1.2],
          [-16, zc - 1.2 + 2.4],
          [-10.05, zc + 1.2],
        ],
        0.22,
        0.95,
        false,
      )
      P.flush(bombaG, m.paint, 'bomba_pintura')
      M.flush(bombaG, m.metal, 'bomba_acero')
    }

    // PIL-1 · luminarias (soporte abulonado, palmera rebatible con perno y seguro, artefacto con grampa cepo + eslinga de 3 mm)
    const pil1 = dropsGroup(
      g,
      'PIL-1',
      'Libro DROPS p.21: luminarias con eslingas de seguridad de 3 mm (pileta/bomba/generador/depósito/campamento).',
    )
    const LP = new Batch()
    const LM = LP // soportes y luminarias en un solo mesh (paint): compensa los draw calls de las piletas nuevas
    for (const [x, y0, z, out] of [
      [3.6, 2.0, zc + 1.0, 1],
      [-10.4, 0.22, zc + 1.1, 1],
      [-8.2, 2.0, zc - 1.0, -1],
    ]) {
      LM.rod(C.GRAY_L, [x, y0, z], [x, y0 + 3.0, z], 0.04, 8) // mástil
      LP.box(C.GRAY, 0.2, 0.05, 0.2, x, y0 + 0.03, z) // base abulonada
      LM.cyl(C.STEEL, 0.045, 0.045, 0.14, x, y0 + 0.5, z, 'x', 8) // perno de palmera rebatible
      LM.rod(C.GRAY_L, [x, y0 + 3.0, z], [x, y0 + 3.15, z + out * 0.55], 0.03, 6) // brazo
      LP.box(C.WHITE, 0.5, 0.1, 0.2, x, y0 + 3.17, z + out * 0.6) // artefacto
      LM.box(C.GLASS, 0.44, 0.02, 0.15, x, y0 + 3.11, z + out * 0.6)
      LM.rod(C.DARK, [x, y0 + 2.95, z], [x + 0.2, y0 + 3.12, z + out * 0.5], 0.008, 4) // eslinga de seguridad 3 mm
    }
    LP.flush(pil1, m.paint, 'PIL-1_luminarias')

    // ── manifold de maniobra 2" 5.000 psi (SOLO ruteo 'legacy'). Con CHOKE_ROUTING='choke' ese lugar (x≈3,4, z≈−4,3, confirmado) lo
    // ocupa el choke manifold del BOP (`buildChoke`, grupo `bop`).
    if (CHOKE_ROUTING === 'legacy') {
      P.box(C.DARK, 2.8, 0.18, 1.3, 3.4, 0.09, -4.3)
      for (const y of [0.5, 0.82]) M.rod(C.STEEL, [2.3, y, -4.3], [4.5, y, -4.3], 0.07, 8)
      for (const x of [2.6, 3.4, 4.2]) {
        M.rod(C.STEEL, [x, 0.5, -4.3], [x, 0.82, -4.3], 0.06)
        P.box(C.GRAY, 0.22, 0.24, 0.22, x, 1.0, -4.3)
        P.cyl(C.RED, 0.12, 0.12, 0.03, x, 1.27, -4.3, 'y', 12)
      }
      M.cyl(C.WHITE, 0.09, 0.09, 0.05, 3.0, 1.0, -3.9, 'z', 12)
    }

    // ── cañerías al pozo (acero r=5,5 cm) con uniones de martillo y soportes. Todo estético; nomenclatura sin validar.
    const line = (pts) => {
      for (let i = 1; i < pts.length; i++) M.rod(C.GRAY_L, pts[i - 1], pts[i], 0.055, 8)
      pts.slice(1, -1).forEach((p) => M.cyl(C.GRAY_L, 0.07, 0.07, 0.07, p[0], p[1], p[2], 'y', 8)) // codos
    }
    const union = (x, y, z, axis) => M.cyl(C.RED, 0.095, 0.095, 0.1, x, y, z, axis, 10)
    if (CHOKE_ROUTING === 'legacy') {
      // A · descarga bomba → manifold de maniobra → línea de matar del BOP
      line([
        [-10.65 + DX_BOMBA, 0.9, zc],
        [-9.2, 0.9, zc],
        [-9.2, 0.5, zc],
        [-9.2, 0.5, -12.9],
        [3.4, 0.5, -12.9],
        [3.4, 0.5, -5.0],
      ])
      line([
        [2.3, 0.55, -4.3],
        [0.2, 0.55, -4.3],
        [0.2, 0.6, -2.4],
      ])
      for (const x of [-6, -2.5, 1]) union(x, 0.5, -12.9, 'x')
      union(3.4, 0.5, -8.6, 'z')
      union(1.2, 0.55, -4.3, 'x')
      // B · retorno: línea de choke del BOP → pileta (elevada 1,25 m, cruza sobre A)
      line([
        [-0.2, 0.6, -2.4],
        [-0.2, 0.6, -3.0],
        [-0.2, 1.25, -3.0],
        [-0.2, 1.25, -13.5],
      ])
      union(-0.2, 1.25, -5.5, 'z')
      union(-0.2, 1.25, -9.5, 'z')
      for (const z of [-5.5, -8.4, -11.3]) {
        M.rod(C.GRAY, [-0.2, 0, z], [-0.2, 1.2, z], 0.05, 6)
        M.box(C.GRAY, 0.28, 0.04, 0.16, -0.2, 1.19, z)
      }
    } else {
      // Ruteo con choke manifold (PENDIENTE de validación: lados choke/kill y tendidos, según P&ID / procedimiento de control de pozo).
      // K · bomba → línea de matar (kill) del BOP, lado x=+0,2: rodea por z=−12,9 y sube por x=+0,2 (bajo la línea de choke).
      line([
        [-10.65 + DX_BOMBA, 0.9, zc],
        [-9.2, 0.9, zc],
        [-9.2, 0.5, zc],
        [-9.2, 0.5, -12.9],
        [0.2, 0.5, -12.9],
        [0.2, 0.6, -2.4],
      ])
      for (const x of [-6, -2.5]) union(x, 0.5, -12.9, 'x')
      union(0.2, 0.55, -7.6, 'z')
      union(0.2, 0.58, -3.6, 'z')
      // C · línea de choke del BOP (lado x=−0,2) → entrada del choke manifold; sube a 1,25 m para cruzar sobre la línea de matar.
      const inletX = CHOKE.cx - CHOKE.L / 2 + 0.05
      line([
        [-0.2, 0.6, -2.4],
        [-0.2, 0.6, -3.0],
        [-0.2, 1.25, -3.0],
        [1.7, 1.25, -3.0],
        [1.7, 0.76, -3.0],
        [1.7, 0.76, CHOKE.cz],
        [inletX, 0.76, CHOKE.cz],
      ])
      union(0.8, 1.25, -3.0, 'x')
      union(1.7, 0.76, -3.7, 'z')
      // D · salida del choke manifold (colector) → pileta
      const outX = CHOKE.cx + 0.95
      const outZ = CHOKE.cz - CHOKE.W / 2 + 0.05
      line([
        [outX, 0.76, outZ],
        [outX, 0.76, -12.7],
        [3.0, 0.76, -12.7],
        [3.0, 1.25, -12.7],
        [3.0, 1.25, -13.5],
      ])
      union(outX, 0.76, -6.4, 'z')
      union(outX, 0.76, -10.4, 'z')
      for (const z of [-7.6, -9.6, -11.6]) {
        M.rod(C.GRAY, [outX, 0, z], [outX, 0.7, z], 0.05, 6)
        M.box(C.GRAY, 0.28, 0.04, 0.16, outX, 0.69, z)
      }
    }
    // succión pileta → múltiple de succión de la bomba (y 0,35, z +0,6: no pisa la descarga)
    line([
      [-8, 0.9, zc],
      [-8.6, 0.9, zc],
      [-8.6, 0.9, zc + 0.6],
      [-8.6, 0.35, zc + 0.6],
      [-10.95 + DX_BOMBA, 0.35, zc + 0.6],
    ])
    // mangueras de servicio (goma)
    H.tube(
      C.HOSE,
      [
        [-10.3 + DX_BOMBA, 0.4, zc - 0.7],
        [-9.6, 0.2, zc - 1.6],
        [-8.6, 0.2, zc - 2.4],
      ],
      0.05,
    )

    P.flush(g, m.paint, 'circulacion_pintura')
    M.flush(g, m.metal, 'circulacion_acero')
    H.flush(g, m.rubber, 'circulacion_mangueras', { cast: false })
  }

  // ═════════════════════════════════════════ PRE: registro de componentes ═════════════════════════════════════════
  window.__rigExt.onPre((api) => {
    bootKit(api)
    // Se envuelve/reemplaza el registro `Ot` del visor: los componentes se construyen justo después de este hook.
    wrapAparejo(api)
    api.Ot.bop = (g) => buildBop(g, api)
    api.Ot.llave = (g) => buildLlave(g, api)
    api.Ot.caballetes = (g) => buildCaballetes(g, api)
    api.Ot.circulacion = (g) => buildCirculacion(g, api)
  })

  // ═════════════════════════════════════════ POST: entorno de locación + calcomanías ═════════════════════════════════════════
  function rng(seed) {
    // mulberry32 (determinista)
    let a = seed >>> 0
    return () => {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  /** Recupera la clase CanvasTexture desde un mesh existente (el visor no la expone). */
  function findCanvasTextureClass(scene) {
    let cls = null
    scene.traverse((o) => {
      if (!cls && o.isMesh && o.material && o.material.map && o.material.map.isCanvasTexture)
        cls = o.material.map.constructor
    })
    return cls
  }

  function textTexture(w, h, draw) {
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const ctx = cv.getContext('2d')
    draw(ctx, w, h)
    const t = new K.CanvasTexture(cv)
    t.colorSpace = K.colorSpace
    t.anisotropy = 4
    return t
  }

  /** Textura de ripio repetible (ruido procedural, sin archivos externos). */
  function gravelTexture() {
    const S = 512
    const rand = rng(7)
    return textTexture(S, S, (ctx) => {
      ctx.fillStyle = '#8b8372'
      ctx.fillRect(0, 0, S, S)
      const speck = (x, y, r, col) => {
        ctx.fillStyle = col
        for (const ox of [0, x < r * 2 ? S : x > S - r * 2 ? -S : 0])
          for (const oy of [0, y < r * 2 ? S : y > S - r * 2 ? -S : 0]) {
            ctx.beginPath()
            ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2)
            ctx.fill()
          }
      }
      const cols = ['#a29a86', '#7a7364', '#6c6558', '#b3ab98', '#5f5a50', '#9b9280']
      for (let i = 0; i < 40; i++)
        speck(
          rand() * S,
          rand() * S,
          18 + rand() * 40,
          `rgba(${(100 + rand() * 40) | 0},${(94 + rand() * 36) | 0},${(80 + rand() * 30) | 0},0.18)`,
        )
      for (let i = 0; i < 9000; i++)
        speck(rand() * S, rand() * S, 0.8 + rand() * 2.6, cols[(rand() * cols.length) | 0])
    })
  }

  function buildEnvironment(R) {
    const T = R.three
    K.Sphere = T.SphereGeometry
    K.Ring = T.RingGeometry
    K.StdMat = T.MeshStandardMaterial
    K.BasicMat = T.MeshBasicMaterial
    K.CanvasTexture = findCanvasTextureClass(R.scene)
    if (K.CanvasTexture) {
      const anyMap = (() => {
        let mp = null
        R.scene.traverse((o) => {
          if (!mp && o.isMesh && o.material && o.material.map) mp = o.material.map
        })
        return mp
      })()
      K.colorSpace = anyMap ? anyMap.colorSpace : undefined
    }

    const env = new K.Group()
    env.name = 'locacion_entorno'
    env.userData.selectable = false // fuera de los 13 componentes: no entra en R.pickables ni en el registro de materiales
    R.scene.add(env)

    const rand = rng(2024)
    const mat = new K.StdMat({ vertexColors: true, roughness: 0.78, metalness: 0.12 })
    const S = new Batch() // estructuras (proyectan sombra)
    const F = new Batch() // vallado y menudencias (sin sombra)

    // ── suelo de ripio: disco de 60 m con borde difuso (alfa por vértice) sobre el suelo y la grilla del visor
    {
      const ring = new K.Ring(0.01, 60, 72, 24)
      ring.rotateX(-PI / 2)
      ring.translate(0, 0.05, 0)
      const pos = ring.attributes.position
      const col = new Float32Array(pos.count * 4)
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getZ(i))
        const a = r < 42 ? 1 : Math.max(0, 1 - (r - 42) / 18)
        col.set([1, 1, 1, a * a * (3 - 2 * a)], i * 4)
      }
      ring.setAttribute('color', new K.Attr(col, 4))
      const uv = ring.attributes.uv
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 20, uv.getY(i) * 20) // repetición del ripio (~6 m por tesela)
      let map = null
      if (K.CanvasTexture) {
        map = gravelTexture()
        map.wrapS = map.wrapT = 1000 // RepeatWrapping
      }
      const padMat = new K.StdMat({
        map,
        color: map ? '#ffffff' : '#7d7463',
        vertexColors: true,
        transparent: true,
        roughness: 1,
        metalness: 0,
      })
      const pad = new K.Mesh(ring, padMat)
      pad.name = 'ripio_locacion'
      pad.receiveShadow = true
      env.add(pad)
    }

    // ── piedras sueltas (una sola malla, ~200 esferas achatadas)
    for (let i = 0; i < 200; i++) {
      const a = rand() * PI * 2
      const r = 4 + Math.sqrt(rand()) * 52
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (Math.abs(x) < 14 && Math.abs(z) < 3) continue // sin piedras bajo el carrier
      const s = 0.08 + rand() * 0.22
      const g = new K.Sphere(s, 5, 4)
      g.scale(1 + rand() * 0.6, 0.55 + rand() * 0.3, 1 + rand() * 0.6)
      g.rotateY(rand() * PI)
      const k = 0.35 + rand() * 0.3
      F.push(
        g,
        x,
        s * 0.35 + 0.02,
        z,
        '#' +
          [0.62, 0.58, 0.5]
            .map((v) =>
              Math.round(v * k * 255 * 1.4)
                .toString(16)
                .padStart(2, '0'),
            )
            .join(''),
      )
    }

    // ── tráilers, tanques y usinas según layout de locación 2019 (12×2,4 m; columna a 40 m del pozo hacia el carrier, cota "40"
    //    rotulada; z = lateral del plano, +z = lado opuesto a las piletas). Posiciones medidas del vector del PDF (C).
    //    alongX: tráiler con el largo según x (fila laboratorio · taller · depósito · usinas, arriba en el plano).
    const trailer = (cx, cz, opts = {}) => {
      const {
        len = 12,
        wid = 2.4,
        body = C.WHITE,
        stripe = C.BLUE,
        parts = 1,
        wheels = true,
        alongX = false,
      } = opts
      // caja local: u = transversal, w = longitudinal (z del tráiler)
      const B = (col, du, h, dw, u, y, w) =>
        alongX ? S.box(col, dw, h, du, cx + w, y, cz + u) : S.box(col, du, h, dw, cx + u, y, cz + w)
      if (alongX)
        S.box('#3a3e45', len + 0.2, 0.25, wid - 0.2, cx, 0.5, cz) // bastidor
      else S.box('#3a3e45', len + 0.2, 0.25, wid - 0.2, cx, 0.5, cz, PI / 2)
      B(body, wid, 2.6, len, 0, 1.925, 0) // caja
      B(stripe, wid + 0.02, 0.32, len + 0.02, 0, 1.15, 0)
      B('#7b8087', wid + 0.12, 0.1, len + 0.12, 0, 3.27, 0) // techo
      if (wheels)
        for (const dw of [-3.6, -2.7])
          for (const su of [-1, 1]) {
            const u = su * (wid / 2 - 0.05)
            if (alongX) S.cyl('#15171c', 0.42, 0.42, 0.3, cx + dw, 0.42, cz + u, 'z', 12)
            else S.cyl('#15171c', 0.42, 0.42, 0.3, cx + u, 0.42, cz + dw, 'x', 12) // ruedas traseras
          }
      for (let k = 0; k < parts; k++) {
        const pw = -len / 2 + ((k + 0.5) * len) / parts
        for (const su of [-1, 1]) {
          B(C.GLASS, 0.03, 0.75, 1.1, su * (wid / 2 + 0.01), 2.2, pw - 0.9)
          B('#565b63', 0.03, 1.9, 0.9, su * (wid / 2 + 0.01), 1.55, pw + 1.0) // puerta
        }
        if (parts === 1 || k === 0) B('#4a4f57', 0.8, 0.4, 0.7, 0, 3.5, pw) // equipo de A/A
      }
      if (parts > 1)
        for (let k = 1; k < parts; k++)
          B('#2b2f36', wid + 0.04, 2.6, 0.04, 0, 1.925, -len / 2 + (k * len) / parts)
    }
    const LX = -41.2 // eje de la columna (borde interior a 40 m del pozo)
    trailer(LX, -4.5, { stripe: '#9a9d94' }) // encargado de turno / personal
    trailer(LX, 8.5, { stripe: '#9a9d94' }) // jefe de equipo
    trailer(LX, 21.5, { stripe: '#9a9d94' }) // inspector
    // laboratorio · taller · depósito · usinas: por indicación del usuario (2026-10-20) va al extremo +z de la columna, fuera de la fila norte del
    // LAYOUT layout de locación 2019 (−29,6 m lateral): fuente en conflicto, posición pendiente de validación.
    trailer(-37.4, 33.2, { parts: 4, stripe: C.RED, wheels: false, alongX: true })
    // tanques de combustible (12.465 l) y agua (8.300 l) sobre patín (layout de locación 2019: tanque de combustible y agua, z −23,5…−11,5)
    S.box('#3a3e45', 12.2, 0.25, 2.2, LX, 0.5, -17.5, PI / 2)
    for (const [dz, r, L, col] of [
      [-3.3, 0.95, 5.4, '#c9cdc8'],
      [2.9, 0.88, 4.2, '#9fb7c7'],
    ]) {
      S.cyl(col, r, r, L, LX, 1.65, -17.5 + dz, 'z', 20)
      S.box(C.RED, 2 * r + 0.02, 0.28, 0.04, LX, 1.65, -17.5 + dz)
      S.cyl('#7b8087', 0.2, 0.2, 0.2, LX, 2.7, -17.5 + dz, 'y', 10)
    }
    // usina (grupo electrógeno diésel abierto, motor V12 con 2 filtros de aire, alternador, gabinete de control y radiador remoto)
    // junto al módulo "usinas" de la fila. Referencia: foto de grupo CAT 3512 de catálogo (GENÉRICA: marca, modelo, potencia y
    // consumo del equipo instalado PENDIENTES; ilustrativa, confianza C). Huella 5,6 × 2,0 m en el lugar de la usina anterior.
    {
      const UX = -36.0 // junto al tráiler de usinas, en su nueva posición (extremo +z de la columna)
      const UZ = 29.9
      const GY = '#E0A100' // amarillo de máquina (pintura)
      const GYD = '#B98300' // sombra/arista del amarillo
      const BK = '#16181C' // base, radiador y cañería (negro mate)
      const BLUE_H = '#2D6FD0' // manguera de refrigerante
      const u = (a) => UX + a // a lo largo de la usina (−2,8 gabinete … +2,8 radiador)
      const v = (b) => UZ + b // lateral (−1,0 … +1,0)
      // patín: viga de base profunda con alivianamientos y 4 orejas de izaje
      S.box(BK, 5.6, 0.38, 2.0, UX, 0.19, UZ)
      for (let k = 0; k < 7; k++)
        S.box('#2B2F36', 0.5, 0.2, 0.03, u(-2.4 + k * 0.8), 0.19, v(1.0) + 0.005) // ventanas
      for (const su of [-1, 1])
        S.rod('#8E949A', [u(su * 2.7), 0.38, v(1.0)], [u(su * 2.7), 0.52, v(1.0)], 0.04, 6)
      // gabinete de control (amarillo): puerta con tablero oscuro, luces, botonera y parada de emergencia
      S.box(GY, 1.25, 1.65, 1.8, u(-2.17), 1.2, UZ) // cuerpo
      S.box(GYD, 1.31, 0.05, 1.86, u(-2.17), 2.05, UZ) // techo con alero
      S.box('#23272D', 0.55, 0.42, 0.03, u(-2.4), 1.7, v(0.91) + 0.0) // módulo de control
      for (let k = 0; k < 4; k++)
        S.box(k < 2 ? '#3CB45C' : '#E34A3A', 0.06, 0.04, 0.02, u(-2.55 + k * 0.1), 1.58, v(0.93))
      S.cyl('#C62B1E', 0.045, 0.045, 0.03, u(-2.0), 1.2, v(0.92), 'z', 10) // parada de emergencia
      S.box(GYD, 0.02, 1.3, 0.02, u(-2.17), 1.15, v(0.91)) // junta de puertas
      // aletas de ventilación bajo el gabinete
      for (let k = 0; k < 5; k++)
        S.box('#2B2F36', 0.5, 0.03, 0.03, u(-2.17), 0.5 + k * 0.07, v(0.915))
      // alternador (carcasa cilíndrica con ventana de ventilación y caja de bornes de goma)
      S.cyl(GY, 0.52, 0.52, 1.1, u(-1.0), 1.02, UZ, 'x', 20)
      S.cyl(GYD, 0.55, 0.55, 0.06, u(-1.52), 1.02, UZ, 'x', 20) // brida de unión
      S.cyl('#23272D', 0.4, 0.4, 0.04, u(-0.42), 1.02, UZ, 'x', 16) // rejilla del ventilador
      S.box('#15161A', 0.5, 0.42, 0.04, u(-1.55), 1.25, v(0.98)) // tapa de bornes (goma negra)
      S.box(GYD, 0.28, 0.2, 0.03, u(-0.9), 1.0, v(0.53)) // placa de datos
      // motor V12: bloque, cárter, dos bancadas de 6 tapas de balancines, colectores y múltiple de aire
      S.box(GY, 2.0, 0.65, 1.0, u(0.5), 1.05, UZ) // bloque
      S.box(GY, 1.9, 0.28, 0.8, u(0.55), 0.55, UZ) // cárter
      for (const sz of [-1, 1])
        for (let k = 0; k < 6; k++) {
          S.box(GY, 0.22, 0.26, 0.34, u(-0.25 + k * 0.3), 1.52, v(sz * 0.3)) // tapa de balancines
          S.rod(
            BK,
            [u(-0.25 + k * 0.3), 1.58, v(sz * 0.52)],
            [u(-0.25 + k * 0.3), 1.2, v(sz * 0.5)],
            0.016,
            4,
          ) // línea de inyección
        }
      S.cyl(GY, 0.13, 0.13, 2.0, u(0.55), 1.98, UZ, 'x', 14) // múltiple de aire/postenfriador
      for (const sz of [-1, 1]) S.cyl(GY, 0.1, 0.1, 1.8, u(0.5), 1.74, v(sz * 0.55), 'x', 10) // colector lateral
      // bomba de agua/aceite y tubos al frente (lado radiador)
      S.cyl(GYD, 0.17, 0.17, 0.3, u(1.55), 1.0, v(0.55), 'x', 12)
      S.rod(GY, [u(1.1), 0.62, v(0.42)], [u(1.1), 0.26, v(0.42)], 0.05, 6) // varilla de nivel / drenaje
      // 2 filtros de aire cilíndricos con tapa abulonada y codos de entrada
      for (const sz of [-1, 1]) {
        S.cyl(GY, 0.36, 0.36, 0.55, u(-0.55), 2.2, v(sz * 0.52), 'x', 18)
        S.cyl(GYD, 0.38, 0.38, 0.05, u(-0.85), 2.2, v(sz * 0.52), 'x', 18) // tapa
        S.rod(GY, [u(-0.35), 1.95, v(sz * 0.5)], [u(-0.05), 1.62, v(sz * 0.4)], 0.13, 8) // codo hacia el turbo
        for (let k = 0; k < 6; k++) {
          const a = (2 * PI * k) / 6
          S.cyl(
            '#8E949A',
            0.02,
            0.02,
            0.03,
            u(-0.88),
            2.2 + 0.3 * Math.cos(a),
            v(sz * 0.52 + 0.3 * Math.sin(a)),
            'x',
            5,
          )
        }
      }
      // radiador remoto: bastidor negro de perfiles perforados, panel y ventilador con guarda, cañerías y mangueras azules
      S.box(BK, 0.95, 2.55, 1.9, u(2.3), 1.65, UZ) // núcleo
      for (const sz of [-1, 1]) S.box('#0E0F12', 0.1, 2.75, 0.1, u(2.78), 1.75, v(sz * 0.98)) // montantes
      for (let k = 0; k < 5; k++) S.box('#2B2F36', 0.02, 0.5, 0.16, u(2.84), 0.8 + k * 0.5, v(0.98)) // perforaciones del montante
      for (let k = 0; k < 6; k++)
        S.box('#1E2126', 0.03, 2.2, 0.03, u(1.82), 1.65, v(-0.8 + k * 0.32)) // malla de la guarda
      S.cyl('#23272D', 0.6, 0.6, 0.05, u(1.8), 1.9, UZ, 'x', 18) // aro del ventilador
      S.rod(BK, [u(2.5), 0.38, v(-0.95)], [u(1.0), 2.9, v(-0.95)], 0.04, 6) // riostra diagonal
      // cañerías de refrigerante: motor → radiador (2 codos grandes negros) y manguera azul con abrazaderas rojas
      S.tube(
        BK,
        [
          [u(1.4), 2.0, v(0.35)],
          [u(1.5), 2.6, v(0.3)],
          [u(1.9), 2.95, v(0.2)],
          [u(2.2), 2.95, v(0.1)],
        ],
        0.11,
      )
      S.tube(
        BK,
        [
          [u(1.45), 1.4, v(-0.45)],
          [u(1.62), 0.9, v(-0.55)],
          [u(1.9), 0.55, v(-0.4)],
        ],
        0.1,
      )
      S.tube(
        BLUE_H,
        [
          [u(1.6), 1.3, v(0.6)],
          [u(1.78), 1.7, v(0.8)],
          [u(2.1), 1.5, v(0.9)],
          [u(2.5), 1.0, v(0.95)],
        ],
        0.04,
      )
      for (const [x, y, z] of [
        [1.55, 1.3, 0.62],
        [2.4, 1.2, 0.95],
      ])
        S.cyl('#B3262B', 0.055, 0.055, 0.04, u(x), y, v(z), 'z', 8)
      // jabalina de puesta a tierra
      S.rod('#C9CDD0', [u(-2.6), 0.0, v(-1.15)], [u(-2.6), 0.4, v(-1.0)], 0.012, 4)
    }

    // ── anclaje de pirosalva a 45 m del pozo en el eje del equipo, lado planchada (layout de locación 2019, cota "45").
    //    Fuente en conflicto: layout de locación (2025) lo pone a 30 m. Coincide con el anclaje del modelo SK-575 (sk575_vientos).
    S.box(C.CONC, 1.2, 0.3, 1.2, 45, 0.17, 0)
    S.loop('#4d5057', 45, 0.5, 0, 0.22, 'zy', 0, PI * 2, 0.03, 14)

    // ── torres de iluminación móviles (ilustrativas): 4, apuntando al equipo
    const towers = [
      [-24, 9],
      [-24, -9],
      [17, 13],
      [13, -12],
    ]
    const LEN = new Batch() // lentes encendidas
    const LOFF = new Batch() // lentes apagadas
    const halo = []
    for (const [tx, tz] of towers) {
      const face = Math.atan2(-tx, -tz) // yaw hacia el pozo
      // torre de iluminación móvil (referencia: foto de torre de catálogo, GENÉRICA; marca, modelo y potencia PENDIENTES, ilustrativa):
      // tráiler monoeje con carcasa de motor crema, 4 gatos estabilizadores, mástil telescópico galvanizado y 4 proyectores en 2×2.
      // Local: dx a lo largo del tráiler (el mástil en dx = 0, lanza hacia −dx), dz lateral; yaw `face`.
      const cf = Math.cos(face)
      const sf = Math.sin(face)
      const P = (dx, dz) => [tx + dx * cf + dz * sf, tz - dx * sf + dz * cf]
      const Q = (col, w, h, d, dx, y, dz) => {
        const [px, pz] = P(dx, dz)
        S.box(col, w, h, d, px, y, pz, face)
      }
      const R = (col, a1, a2, r, seg = 8) => {
        const [x1, z1] = P(a1[0], a1[2])
        const [x2, z2] = P(a2[0], a2[2])
        S.rod(col, [x1, a1[1], z1], [x2, a2[1], z2], r, seg)
      }
      const CREAM = '#D8CDB0'
      const GALV = '#B9BEC2'
      Q('#3a3e45', 2.6, 0.12, 0.9, -0.85, 0.58, 0) // bastidor
      Q(CREAM, 1.5, 0.95, 1.0, -0.7, 1.2, 0) // carcasa del motor
      Q('#C5B997', 1.54, 0.05, 1.04, -0.7, 1.7, 0) // tapa
      for (const su of [-1, 1]) {
        for (let k = 0; k < 5; k++) Q('#2b2f36', 0.5, 0.04, 0.02, -0.7, 1.0 + k * 0.1, su * 0.51) // celosías de ventilación
        Q('#5a5f66', 0.4, 0.5, 0.02, -0.3, 1.25, su * 0.512) // puerta de servicio
        R('#15171c', [-0.7, 0.4, su * 0.64], [-0.7, 0.4, su * 0.82], 0.36, 14) // rueda
        R('#8e949a', [-0.7, 0.4, su * 0.64], [-0.7, 0.4, su * 0.84], 0.13, 8) // maza
        Q(CREAM, 1.0, 0.05, 0.3, -0.7, 0.86, su * 0.72) // guardabarros
      }
      Q('#B3262B', 0.2, 0.06, 0.02, -0.95, 1.5, 0.515) // franja de marca (sin rótulo)
      // lanza con acople, rueda/gato de maniobra y cadena de seguridad
      R('#3a3e45', [-1.45, 0.58, 0.32], [-2.3, 0.62, 0], 0.035)
      R('#3a3e45', [-1.45, 0.58, -0.32], [-2.3, 0.62, 0], 0.035)
      Q('#2b2f36', 0.14, 0.1, 0.14, -2.34, 0.62, 0) // acople
      R(GALV, [-1.8, 0.62, 0], [-1.8, 0.1, 0], 0.03, 6) // gato de lanza
      Q(GALV, 0.22, 0.02, 0.18, -1.8, 0.09, 0)
      // estabilizadores: brazo transversal + pata roscada + plato (4)
      for (const [dx, dz] of [
        [-1.5, 0.5],
        [-1.5, -0.5],
        [0.2, 0.5],
        [0.2, -0.5],
      ]) {
        R(GALV, [dx, 0.62, dz * 0.5], [dx, 0.62, dz * 1.25], 0.025, 6)
        R(GALV, [dx, 0.62, dz * 1.25], [dx, 0.1, dz * 1.25], 0.03, 6)
        Q(GALV, 0.22, 0.02, 0.22, dx, 0.09, dz * 1.25)
      }
      // mástil telescópico: 3 tramos con collares y malacate; farolas 2×2 en travesaño
      R(GALV, [0, 1.7, 0], [0, 4.4, 0], 0.085, 10)
      R(GALV, [0, 4.4, 0], [0, 7.1, 0], 0.065, 10)
      R(GALV, [0, 7.1, 0], [0, 9.55, 0], 0.048, 8)
      for (const yy of [4.4, 7.1])
        R('#8e949a', [0, yy - 0.05, 0], [0, yy + 0.05, 0], yy < 5 ? 0.1 : 0.078, 10)
      Q('#2b2f36', 0.2, 0.22, 0.16, 0.12, 2.1, 0) // malacate
      R('#2b2f36', [0.12, 2.0, 0], [0.12, 2.0, 0.2], 0.04, 6)
      R(GALV, [0, 9.45, -0.5], [0, 9.45, 0.5], 0.03, 6) // travesaño de farolas
      R(GALV, [0, 9.55, 0], [0, 9.95, 0], 0.03, 6)
      for (let k = 0; k < 4; k++) {
        const ox = (k % 2 ? 1 : -1) * 0.34
        const oy = (k < 2 ? 1 : -1) * 0.22
        const house = new K.Box(0.48, 0.34, 0.22)
        house.rotateX(0.5)
        house.translate(ox, oy, 0)
        house.rotateY(face)
        S.push(house, tx, 9.75, tz, '#3a3e45')
        const rim = new K.Box(0.5, 0.36, 0.05)
        rim.translate(0, 0, 0.1)
        rim.rotateX(0.5)
        rim.translate(ox, oy, 0)
        rim.rotateY(face)
        S.push(rim, tx, 9.75, tz, '#1b1d21') // marco del proyector
        for (const B of [LEN, LOFF]) {
          const lens = new K.Box(0.42, 0.28, 0.02)
          lens.translate(0, 0, 0.14)
          lens.rotateX(0.5)
          lens.translate(ox, oy, 0)
          lens.rotateY(face)
          B.push(lens, tx, 9.75, tz, B === LEN ? '#fff3c4' : '#8a9096')
        }
      }
      // pozo de luz en el piso + haz cónico (solo de noche): geometrías con alfa por vértice, mezcla aditiva
      const hd = Math.hypot(tx, tz)
      const hx = tx - (tx / hd) * 11
      const hz = tz - (tz / hd) * 11
      const ringG = new K.Ring(0.01, 13, 28, 6)
      ringG.rotateX(-PI / 2)
      const hp = ringG.attributes.position
      const rgba = new Float32Array(hp.count * 4)
      for (let i = 0; i < hp.count; i++) {
        const r = Math.hypot(hp.getX(i), hp.getZ(i)) / 13
        rgba.set([1, 0.86, 0.5, 0.5 * Math.pow(1 - r, 1.6)], i * 4)
      }
      halo.push({ geo: ringG, x: hx, y: 0.08, z: hz, rgba })
      const dx = tx - hx
      const dy = 9.8
      const dz = tz - hz
      const dl = Math.hypot(dx, dy, dz)
      const beamG = new K.Cyl(0.25, 5.5, dl, 20, 1, true)
      const bp = beamG.attributes.position
      const brgba = new Float32Array(bp.count * 4)
      for (let i = 0; i < bp.count; i++) {
        const t = (bp.getY(i) + dl / 2) / dl // 0 = piso, 1 = lámpara
        brgba.set([1, 0.88, 0.55, 0.2 * t * t], i * 4)
      }
      beamG.rotateZ(-Math.acos(dy / dl))
      beamG.rotateY(-Math.atan2(dz, dx))
      halo.push({ geo: beamG, x: hx + dx / 2, y: 0.08 + dy / 2, z: hz + dz / 2, rgba: brgba })
    }
    const lensOnMat = new K.BasicMat({ vertexColors: true })
    const lensOffMat = new K.StdMat({ vertexColors: true, roughness: 0.3, metalness: 0.2 })
    const lensOn = LEN.flush(env, lensOnMat, 'torres_lentes_on', { cast: false, receive: false })
    const lensOff = LOFF.flush(env, lensOffMat, 'torres_lentes_off', {
      cast: false,
      receive: false,
    })
    const HB = new Batch()
    for (const h of halo) HB.push(h.geo, h.x, h.y, h.z, undefined, h.rgba)
    const haloMat = new K.BasicMat({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: 2,
      side: 2,
    })
    const haloMesh = HB.flush(env, haloMat, 'torres_pozo_de_luz', { cast: false, receive: false })
    if (haloMesh) haloMesh.renderOrder = 3 // después del ripio (ambos transparentes y con la misma posición: sin esto el ripio tapa el resplandor)

    // ── vallado perimetral (estético, con acceso al sur) — postes cada 4 m y dos cabos; NO representa zona de exclusión
    const FX0 = -46
    const FX1 = 34
    const FZ = 31
    const FZN = 36.5 // vallado norte (+z) más afuera: encierra el tráiler de usinas y la usina del extremo +z de la columna
    const fence = (x1, z1, x2, z2, gap) => {
      const len = Math.hypot(x2 - x1, z2 - z1)
      const n = Math.round(len / 4)
      for (let k = 0; k <= n; k++) {
        const t = k / n
        const x = x1 + (x2 - x1) * t
        const z = z1 + (z2 - z1) * t
        if (gap && x > gap[0] && x < gap[1]) continue
        F.box(k % 2 ? '#d9d6c9' : C.ORANGE, 0.07, 1.25, 0.07, x, 0.62, z)
      }
      for (const y of [0.55, 1.05]) {
        if (!gap) F.rod('#c9c2a8', [x1, y, z1], [x2, y, z2], 0.012, 4)
        else {
          F.rod('#c9c2a8', [x1, y, z1], [gap[0], y, z2], 0.012, 4)
          F.rod('#c9c2a8', [gap[1], y, z1], [x2, y, z2], 0.012, 4)
        }
      }
    }
    fence(FX0, -FZ, FX1, -FZ, [-12, -4]) // sur, con portón entre x −12 y −4
    fence(FX1, -FZ, FX1, FZN)
    fence(FX1, FZN, FX0, FZN)
    fence(FX0, FZN, FX0, -FZ)
    for (const x of [-12, -4]) S.box('#f2b632', 0.16, 2.0, 0.16, x, 1.0, -FZ) // pilares del portón

    // ── conos de tránsito: portón, extremo de planchada y esquinas de equipos (decorativo, sin significado de zona)
    const cone = (x, z) => {
      S.box('#26292f', 0.42, 0.03, 0.42, x, 0.045, z)
      S.cyl(C.ORANGE, 0.03, 0.17, 0.7, x, 0.4, z, 'y', 10)
      S.cyl('#f1f1ee', 0.082, 0.106, 0.12, x, 0.44, z, 'y', 10)
    }
    for (const [x, z] of [
      [-13, -29.5],
      [-3, -29.5],
      [-13, -26.5],
      [-3, -26.5],
      [-8, -22],
      [16.5, 2.1],
      [16.5, -2.1],
      [-9.3, -12.1],
      [-9.3, -17.3],
      [6.6, -3.2],
      [6.6, 3.2],
      [-19, 6.4],
      [-9, 6.4],
    ])
      cone(x, z)

    // ── vehículos (ilustrativos; referencia: plano CAD de pickup doble cabina y foto de manipulador telescópico de catálogo, GENÉRICOS:
    //    marca, modelo y capacidades PENDIENTES). Marco local: lx hacia adelante, lz lateral; `ry` = giro de mundo (adelante = (cos, −sin)).
    const vehicle = (cx, cz, ry) => {
      const c = Math.cos(ry)
      const sn = Math.sin(ry)
      const W = (lx, ly, lz) => [cx + lx * c + lz * sn, ly, cz - lx * sn + lz * c]
      return {
        W,
        box: (col, w, h, d, lx, ly, lz, rz = 0) => {
          const [x, y, z] = W(lx, ly, lz)
          if (!rz) return S.box(col, w, h, d, x, y, z, ry)
          const gb = new K.Box(w, h, d)
          gb.rotateZ(rz)
          gb.rotateY(ry)
          return S.push(gb, x, y, z, col)
        },
        rod: (col, a, b2, r, seg = 6) => S.rod(col, W(...a), W(...b2), r, seg),
        wheel: (lx, ly, lz, r, wid, rim) => {
          S.rod('#15171c', W(lx, ly, lz - wid / 2), W(lx, ly, lz + wid / 2), r, 14) // neumático
          const o = Math.sign(lz) * (wid / 2 + 0.004)
          S.rod(rim, W(lx, ly, lz + o - 0.02), W(lx, ly, lz + o + 0.02), r * 0.62, 10) // llanta
          S.rod('#3a3e45', W(lx, ly, lz + o), W(lx, ly, lz + o + Math.sign(lz) * 0.015), r * 0.2, 6) // maza
        },
      }
    }
    /** Calza de rueda: cuña de goma negra contra el neumático (lx = tangente trasera de la rueda). */
    const chock = (V, lx, lz) => V.box('#15171c', 0.2, 0.1, 0.24, lx, 0.05, lz, 0.5)

    /** Camioneta pick-up doble cabina (5,3 × 1,86 × 1,8 m): carrocería, vidrios, caja con barral, defensa, baliza y antena con banderín. */
    const pickup = (cx, cz, ry, col) => {
      const V = vehicle(cx, cz, ry)
      for (const lx of [1.6, -1.6])
        for (const lz of [-0.8, 0.8]) V.wheel(lx, 0.39, lz, 0.39, 0.27, '#b4babe')
      V.box(col, 5.0, 0.42, 1.86, 0, 0.78, 0) // carrocería inferior
      V.box('#2b2f36', 3.4, 0.14, 1.9, 0.2, 0.52, 0) // estribos y zócalo
      for (const lx of [1.6, -1.6])
        for (const sg of [-1, 1]) V.box('#2b2f36', 0.95, 0.1, 0.1, lx, 0.99, sg * 0.93) // pasarruedas
      V.box(col, 1.35, 0.14, 1.78, 1.9, 1.08, 0) // capot
      V.box(col, 0.1, 0.5, 1.86, 2.55, 0.85, 0) // frente
      V.box('#1d1f22', 0.05, 0.22, 1.0, 2.6, 0.9, 0) // parrilla
      for (const sg of [-1, 1]) {
        V.box('#d8dcdf', 0.05, 0.12, 0.32, 2.58, 0.98, sg * 0.7) // faros
        V.box('#C62B1E', 0.04, 0.2, 0.16, -2.52, 1.0, sg * 0.82) // luces traseras
        V.box('#1d1f22', 0.12, 0.12, 0.2, 1.2, 1.38, sg * 1.0) // espejos
        V.box('#8e949a', 0.08, 0.03, 0.14, 0.45, 1.25, sg * 0.88) // manijas
        V.box(C.RED, 4.6, 0.08, 0.02, 0, 0.86, sg * 0.935) // franja roja lateral
      }
      V.box('#2b2f36', 0.18, 0.2, 1.95, 2.66, 0.55, 0) // paragolpes delantero
      V.box('#2b2f36', 0.18, 0.2, 1.95, -2.66, 0.55, 0) // paragolpes trasero
      V.box('#f0f0f0', 0.02, 0.12, 0.34, -2.76, 0.7, 0) // patente
      // defensa tubular delantera (bull-bar)
      for (const sg of [-1, 1])
        V.rod('#1d1f22', [2.78, 0.5, sg * 0.55], [2.78, 1.1, sg * 0.55], 0.027, 6)
      V.rod('#1d1f22', [2.78, 1.1, -0.55], [2.78, 1.1, 0.55], 0.027, 6)
      V.rod('#1d1f22', [2.78, 0.75, -0.55], [2.78, 0.75, 0.55], 0.022, 6)
      // cabina: carrocería, vidrios laterales con parante, parabrisas inclinado, luneta y techo
      V.box(col, 2.05, 0.82, 1.72, 0.4, 1.38, 0)
      V.box(col, 1.5, 0.06, 1.66, 0.35, 1.81, 0) // techo
      for (const sg of [-1, 1]) {
        V.box(C.GLASS, 1.55, 0.5, 0.02, 0.4, 1.42, sg * 0.865)
        V.box(col, 0.09, 0.52, 0.025, 0.42, 1.42, sg * 0.868) // parante B
      }
      V.box(C.GLASS, 0.03, 0.78, 1.55, 1.34, 1.4, 0, 0.42) // parabrisas
      V.box(C.GLASS, 0.03, 0.45, 1.4, -0.63, 1.43, 0) // luneta
      V.box('#1d1f22', 0.16, 0.1, 0.2, 0.15, 1.88, 0) // base de baliza
      V.rod('#E8A200', [0.15, 1.93, 0], [0.15, 2.03, 0], 0.085, 10) // baliza ámbar
      V.rod('#2b2f36', [-0.4, 1.84, 0.72], [-0.4, 3.1, 0.72], 0.008, 4) // antena
      V.box('#E4702A', 0.01, 0.22, 0.34, -0.4, 2.95, 0.88) // banderín
      // caja de carga: piso, bordas, portón, pasarruedas internos y barral (portaequipos) tras la cabina
      V.box('#2b2f36', 1.9, 0.04, 1.6, -1.6, 0.96, 0)
      for (const sg of [-1, 1]) V.box(col, 1.95, 0.5, 0.05, -1.6, 1.22, sg * 0.84)
      V.box(col, 0.05, 0.5, 1.7, -2.58, 1.22, 0)
      for (const sg of [-1, 1]) V.box('#2b2f36', 0.8, 0.14, 0.2, -1.6, 1.05, sg * 0.7)
      for (const sg of [-1, 1])
        V.rod('#1d1f22', [-0.78, 0.98, sg * 0.75], [-0.78, 1.95, sg * 0.75], 0.025, 6)
      V.rod('#1d1f22', [-0.78, 1.95, -0.75], [-0.78, 1.95, 0.75], 0.025, 6)
      return V
    }

    // ── estacionamiento: 3 camionetas ESTACIONADAS EN REVERSA (cola contra el fondo de la bahía, del lado del vallado sur, y frente
    //    hacia el interior para salir de frente), en bahías pintadas, alineadas y con calzas en las ruedas traseras. Fuera de la
    //    línea de los vientos y de la zona de los equipos; sin valor de control operacional.
    for (const x of [-25.5, -22.5, -19.5, -16.5]) F.box('#e9e9e4', 0.12, 0.01, 6.2, x, 0.075, -27.3) // líneas de bahía
    F.box('#e9e9e4', 9.12, 0.01, 0.12, -21, 0.075, -30.4) // línea de fondo (lado del vallado)
    for (const x of [-24, -21, -18]) {
      const V = pickup(x, -27.3, -PI / 2, '#f1f1ee') // frente hacia +z
      for (const sg of [-1, 1]) chock(V, -2.08, sg * 0.8)
    }

    /** Manipulador telescópico (4,8 × 2,0 × 2,25 m) estacionado junto a los caballetes con un paquete de tubing 2-7/8" (9,4 m) en las uñas. */
    {
      const V = vehicle(12.4, 11.3, PI / 2)
      const RED = '#C8281E'
      const WHT = '#E8E9E6'
      const BLK = '#1C1D20'
      for (const lx of [1.3, -1.3])
        for (const lz of [-0.82, 0.82]) V.wheel(lx, 0.55, lz, 0.55, 0.42, '#9aa1a8')
      V.box(BLK, 3.8, 0.5, 1.5, 0, 0.78, 0) // chasis
      for (const lx of [1.3, -1.3])
        for (const sg of [-1, 1]) V.box(RED, 1.3, 0.07, 0.5, lx, 1.16, sg * 0.82) // guardabarros
      V.box(RED, 1.0, 0.7, 1.7, -1.6, 1.3, 0) // capot / motor
      V.box(BLK, 0.3, 0.6, 1.7, -2.15, 1.0, 0) // contrapeso
      V.rod('#2b2f36', [-1.9, 1.6, -0.6], [-1.9, 2.3, -0.6], 0.04, 6) // escape
      // cabina a la derecha (+lz): panel inferior, vidrios, 4 parantes, techo y baliza
      V.box(WHT, 1.2, 0.42, 0.88, 0.1, 1.2, 0.58)
      V.box(C.GLASS, 1.12, 0.95, 0.8, 0.1, 1.88, 0.58)
      for (const lx of [-0.5, 0.7])
        for (const lz of [0.17, 0.99]) V.rod(WHT, [lx, 1.0, lz], [lx, 2.38, lz], 0.03, 6)
      V.box(WHT, 1.35, 0.06, 0.98, 0.1, 2.4, 0.58)
      V.rod('#E8A200', [0.1, 2.43, 0.58], [0.1, 2.53, 0.58], 0.08, 10)
      V.box(BLK, 0.14, 0.14, 0.1, 0.62, 1.72, 1.08) // espejo
      // pluma telescópica a la izquierda (−lz): tramo base rojo, tramo extensible negro, cilindro de elevación
      V.box(RED, 3.57, 0.38, 0.38, 0.2, 1.2, -0.45, -0.197)
      V.box(BLK, 1.2, 0.3, 0.32, 1.55, 0.89, -0.45, -0.16)
      V.rod('#8e949a', [-1.0, 0.98, -0.45], [0.1, 1.08, -0.45], 0.05, 6)
      // portaimplementos y uñas
      V.box(BLK, 0.12, 0.95, 1.25, 2.12, 0.62, 0)
      for (const sg of [-1, 1]) V.box('#2b2f36', 1.2, 0.08, 0.14, 2.75, 0.28, sg * 0.45)
      // paquete de tubing en pirámide 5-4-3 (tubos de 9,4 m transversales) con cuplas y dos zunchos
      const LY = 0.32 + 0.0365
      ;[5, 4, 3].forEach((n, layer) => {
        for (let k = 0; k < n; k++) {
          const lx = 2.75 + (k - (n - 1) / 2) * 0.076
          const ly = LY + layer * 0.066
          V.rod('#3a3e44', [lx, ly, -4.7], [lx, ly, 4.7], 0.0365, 6)
          V.rod('#8e949a', [lx, ly, 4.54], [lx, ly, 4.7], 0.0445, 6) // cupla
        }
      })
      for (const lz of [-1.3, 1.3]) V.box('#E4702A', 0.5, 0.3, 0.03, 2.75, 0.5, lz) // zunchos
      for (const sg of [-1, 1]) chock(V, -1.3 - 0.62, sg * 0.82)
    }

    // ── camino de acceso de ripio oscuro desde el portón (estético)
    F.box('#736d60', 6.0, 0.03, 30, -8, 0.065, -46)
    F.box('#736d60', 12, 0.03, 4, -8, 0.065, -29)

    // ── manga de viento (mástil de 7 m con cuatro tramos alternados) y balizas
    S.cyl('#c9cdd0', 0.06, 0.08, 7, 26, 3.5, -24, 'y', 8)
    for (let k = 0; k < 4; k++)
      S.cyl(
        k % 2 ? '#f1f1ee' : C.ORANGE,
        0.32 - k * 0.055,
        0.37 - k * 0.055,
        0.55,
        26.4 + k * 0.55,
        7.1 - k * 0.03,
        -24,
        'x',
        10,
        true,
      )
    S.loop('#c9cdd0', 26.06, 7.1, -24, 0.38, 'zy', 0, PI * 2, 0.02, 12)

    S.flush(env, mat, 'locacion_estructuras', { cast: true, receive: true })
    F.flush(env, mat, 'locacion_vallado_y_piedras', { cast: false, receive: true })

    // ── señalización (carteles con texto; estético, sin valor de control operacional)
    const signs = []
    if (K.CanvasTexture) {
      const mkSign = (x, z, ry, w, h, txt, bg, fg, sub) => {
        const tex = textTexture(512, Math.round((512 * h) / w), (ctx, cw, ch) => {
          ctx.fillStyle = bg
          ctx.fillRect(0, 0, cw, ch)
          ctx.strokeStyle = fg
          ctx.lineWidth = 8
          ctx.strokeRect(12, 12, cw - 24, ch - 24)
          ctx.fillStyle = fg
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.font = 'bold 56px Arial'
          ctx.fillText(txt, cw / 2, ch * (sub ? 0.4 : 0.5), cw - 50)
          if (sub) {
            ctx.font = '34px Arial'
            ctx.fillText(sub, cw / 2, ch * 0.72, cw - 50)
          }
        })
        const board = new K.Mesh(
          new K.Box(w, h, 0.05),
          new K.StdMat({ map: tex, roughness: 0.6, metalness: 0 }),
        )
        board.position.set(x, 2.2, z)
        board.rotation.y = ry
        board.name = 'cartel_' + txt.toLowerCase().replace(/\W+/g, '_')
        board.castShadow = true
        env.add(board)
        signs.push(board)
        for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) {
          S.box('#565b63', 0.06, 2.2, 0.06, x + dx * Math.cos(ry), 1.1, z - dx * Math.sin(ry))
        }
      }
      mkSign(-8, -30.6, 0, 1.6, 0.9, 'ACCESO A LOCACIÓN', '#1d4f6b', '#ffffff', 'Equipo 10')
      mkSign(-27, 14.5, PI / 2, 1.3, 0.8, 'PUNTO DE REUNIÓN', '#1f6f43', '#ffffff')
      mkSign(-14.6, -27.3, PI / 2, 1.3, 0.8, 'ESTACIONAMIENTO', '#1d4f6b', '#ffffff', 'VEHÍCULOS')
      mkSign(33.4, 7, -PI / 2, 1.3, 0.8, 'EQUIPO EN OPERACIÓN', '#f2b632', '#1b1b1b')
      S.flush(env, mat, 'carteles_postes', { cast: true, receive: true })
    }

    return { env, lensOn, lensOff, haloMesh }
  }

  /** Letreros sobre componentes ya construidos (necesitan CanvasTexture, que sólo existe tras el arranque). */
  function addDecals(R) {
    if (!K.CanvasTexture) return
    const decal = (compId, parent, w, h, x, y, z, ry, tex) => {
      const mat = new K.StdMat({ map: tex, transparent: true, roughness: 0.55, metalness: 0.1 })
      const mesh = new K.Mesh(new K.Box(w, h, 0.006), mat)
      mesh.position.set(x, y, z)
      mesh.rotation.y = ry
      mesh.name = compId + '_letrero'
      mesh.userData.id = compId
      parent.add(mesh)
      R.pickables.push(mesh) // conserva la selección del componente al hacer clic sobre el letrero
      if (R.materials[compId]) R.materials[compId].push(mat) // hover/selección (emissive)
      return mesh
    }
    // pileta: "EQUIPO" rojo sobre el costado blanco (Libro p.21)
    const tack = textTexture(1024, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = C.RED
      ctx.font = 'italic 900 190px Arial Black, Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('EQUIPO', w / 2, h * 0.5)
    })
    const circ = R.groups.circulacion
    if (circ) {
      decal('circulacion', circ, 4.6, 1.15, -2, 1.25, -14.7 + 1.222, 0, tack)
      decal('circulacion', circ, 4.6, 1.15, -2, 1.25, -14.7 - 1.222, PI, tack)
    }
    // bloque IDECO: chapa de datos en la mejilla (110 t · 6 líneas según folleto)
    const blk = R.groups.aparejo && R.groups.aparejo.getObjectByName('bloque_viajero')
    if (blk) {
      const plate = textTexture(512, 160, (ctx, w, h) => {
        ctx.fillStyle = '#d9d9d2'
        ctx.fillRect(0, 0, w, h)
        ctx.strokeStyle = '#2b2f36'
        ctx.lineWidth = 6
        ctx.strokeRect(6, 6, w - 12, h - 12)
        ctx.fillStyle = '#1b1b1b'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = 'bold 66px Arial'
        ctx.fillText('IDECO 110 t', w / 2, h * 0.38)
        ctx.font = 'bold 44px Arial'
        ctx.fillText('6 LÍNEAS', w / 2, h * 0.75)
      })
      decal('aparejo', blk, 0.5, 0.16, 0, -0.14, 0.383, 0, plate)
      decal('aparejo', blk, 0.5, 0.16, 0, -0.14, -0.383, PI, plate)
    }
  }

  window.__rigExt.onPost((R) => {
    if (!K.ready) return
    const { env, lensOn, lensOff, haloMesh } = buildEnvironment(R)
    addDecals(R)

    // Vista nocturna: enciende las torres. Aislar: oculta el entorno. Se sincroniza tras cada clic (el handler del botón corre antes).
    const sync = () => {
      const night = !!(R.view && R.view.night)
      if (lensOn) lensOn.visible = night
      if (lensOff) lensOff.visible = !night
      if (haloMesh) haloMesh.visible = night
      env.visible = !(R.view && R.view.isolated)
    }
    document.addEventListener('click', sync)
    sync()
  })

  /**
   * Ficha de confiabilidad (`__RIG_META`, tabla del módulo de producto que se crea DESPUÉS del bundle) del componente 07:
   * BOP + acumulador + choke manifold. Grado C (geometría SK-575) / Fuente en conflicto (C2). Se aplica cuando el módulo de producto arranca (`rig:boot`).
   */
  const META_BOP = {
    // CONF. = confianza de la GEOMETRÍA que se ve; la de cada dato va en el texto (src/data/rigs/rig10.ts, sk575_bop / sk575_manifold).
    grade: 'B',
    status: 'Fuente en conflicto',
    basis:
      'Stack: plano 8127-1110-004 rev 4 (src-plano-bop-8127; alturas A, anchos y líneas medidos C) · Datos: folleto (src-folleto) · ' +
      'manifold: esquema M1–M12 (src-esquema-ahogo) con escala B20-9908 (src-choke-b20)',
    note:
      'Stack estándar WS 7-1/16": ram simple, cruz, doble ram + shear (10.000 psi) y anular (5.000 psi), 3,731 m. ' +
      'Presión: Fuente en conflicto con el folleto (7-1/16" 5.000 psi). Base a nivel de terreno con cabezal en sótano y volantes de los rams hacia los laterales de la subestructura: ' +
      'interpretación pendiente de relevar. Acumulador de 5 botellas (folleto, A). Manifold de ahogo: disposición de un esquema sin identificar ' +
      'y escala de otro equipo (equipo 08): no es el manifold del equipo 10. Geometría aproximada, no as-built. ' +
      'Pendientes: placa del BOP instalado, cota real del cabezal / sótano, identidad del manifold y color del BOP/acumulador.',
  }
  const applyMeta = () => {
    const meta = window.__RIG_META
    if (meta && meta.bop) Object.assign(meta.bop, META_BOP)
  }
  if (window.__rigBooted) applyMeta()
  else document.addEventListener('rig:boot', applyMeta, { once: true })
})()
