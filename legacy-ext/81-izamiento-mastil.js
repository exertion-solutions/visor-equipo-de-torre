/*
 * 81-izamiento-mastil.js — izamiento del mástil, ILUSTRATIVO (paso 6 de la secuencia de montaje, 76-secuencia-montaje.js).
 *
 * SECUENCIA (aportada por el usuario, experto del equipo; estatus `pendingValidation`, no es el procedimiento de la empresa):
 *   0. Se bajan los gatos de nivelación del carrier (82-gatos-carrier.js).
 *   1. Pistón de izaje del 1.er tramo: el mástil gira de 0° (acostado sobre el carrier) a 90° (vertical).
 *   2. Izaje del 2.º tramo: un segundo pistón extiende el tramo que va EMBUTIDO dentro del 1.º.
 *   3. Se tensan los vientos.
 *
 * QUÉ MUEVE: rota `mastil_pivote` alrededor del pivote de la base (la pose final es la del V2, con su leve inclinación), desliza el
 * tramo superior (reticulado, corona y luminarias del 2.º tramo) a lo largo del eje, anima los cilindros de izaje del SK-575
 * (camisa, 2 etapas y vástago; regla de `sk575_izaje.meta.json`), tiende los vientos entre los extremos de `sk575_vientos.meta.json`
 * y oculta lo que todavía no está montado (aparejo, vientos). El piso de enganche (sub-nodo `sk575_enganche`, origen en su bisagra)
 * viaja rebatido contra el mástil y, cuando el 2.º tramo lo saca por encima del 1.º, baja a horizontal con un pequeño sobrepaso
 * amortiguado (`plegado()`, lo aplica 84 sobre la bisagra; ilustrativo, no es cálculo). En 100 % el visor queda exactamente como antes
 * y la pose dinámica empalma con la final (sin saltos). NO es una simulación: no hay cargas, presiones, velocidades ni tiempos
 * reales. Largos del cilindro HYCO: plano (A, src-plano-hyco); pivotes de montaje: C (no documentados); pistón interno del 2.º
 * tramo y ángulo de transporte: ilustrativos (V2 procedural previo).
 *
 * Limitación conocida: el cable del malacate hacia la corona está fusionado con el acero del malacate: se oculta (con el resto del acero
 * del malacate) mientras dura el izamiento y reaparece al montar la corona.
 *
 * API: `window.__rigErect = { set(p), play(), pause(), progress(), fases, largos(), plegado() }` con p en [0, 1];
 * `plegado()` = giro del piso de enganche sobre su bisagra respecto de la pose de trabajo (rad, + = rebatido hacia arriba). La UI aparece en el paso 6.
 */
window.__rigExt.onPost((R) => {
  const T = R.three
  const G = R.groups || {}
  const mastG = G.mastil
  const P = mastG && mastG.children.find((c) => c.name === 'mastil_pivote')
  if (!T || !P || !R.mast) return

  const { bx, by, a: aFinal, scale: S } = R.mast
  // Datos de cad/izamiento.py (medidos del V2): ángulo mínimo de transporte, largo de camisa y soporte de traslado.
  const D = window.__RIG_IZAMIENTO || {}
  const EPS0 = Number.isFinite(D.elevacion_transporte) ? D.elevacion_transporte : 22 // ° sobre la horizontal en transporte
  const THETA0 = -(Math.PI / 2) + (EPS0 * Math.PI) / 180 // eje respecto de la vertical (− = hacia la cabina)
  const CAMISA =
    D.pistones && Number.isFinite(D.pistones.largo_camisa) ? D.pistones.largo_camisa : 3.0
  const E = 14.0 // m locales: cuánto queda embutido el tramo superior en el transporte (ilustrativo)
  const PHASE = { jacksEnd: 0.1, raiseEnd: 0.5, extendEnd: 0.8 }
  const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x))
  const deg = (r) => (r * 180) / Math.PI

  // ───────── reparentar el 2.º tramo a un grupo propio (mismo marco local del pivote: sin cambiar la pose) ─────────
  const sup = new T.Group()
  sup.name = 'mastil_tramo_superior'
  P.add(sup)
  for (const name of [
    'tramo_superior',
    'corona',
    'drops_DCO-1',
    'drops_DCO-2',
    'drops_DCO-3',
    'drops_DCO-9',
    'drops_DPE-5',
  ]) {
    const o = P.children.find((c) => c.name === name)
    if (o) sup.add(o)
  }
  const conducto = P.children.find((c) => c.name === 'conducto_negro_acero')
  // el cable del malacate a la corona está fusionado con el acero del malacate: se oculta mientras la corona no está en su lugar
  const cableMalacate = G.malacate && G.malacate.children.find((c) => c.name === 'malacate_steel')

  // ───────── pistones ─────────
  const matRojo = new T.MeshStandardMaterial({ color: '#A72A32', roughness: 0.5, metalness: 0.3 })
  const matAcero = new T.MeshStandardMaterial({ color: '#A9B1B7', roughness: 0.35, metalness: 0.7 })
  const matOscuro = new T.MeshStandardMaterial({ color: '#2B2F35', roughness: 0.6, metalness: 0.4 })
  const cyl = (r, mat) => {
    const m = new T.Mesh(new T.CylinderGeometry(r, r, 1, 12), mat)
    m.castShadow = true
    m.frustumCulled = false
    return m
  }
  /** Coloca un cilindro unitario entre dos puntos del plano XY (z fijo). */
  function between(m, ax, ay, bx2, by2, z) {
    const dx = bx2 - ax
    const dy = by2 - ay
    const len = Math.hypot(dx, dy)
    m.visible = len > 1e-4
    m.scale.set(1, Math.max(len, 1e-4), 1)
    m.position.set((ax + bx2) / 2, (ay + by2) / 2, z)
    m.rotation.set(0, 0, Math.atan2(dy, dx) - Math.PI / 2)
    return len
  }
  const izaje = []
  const gDyn = new T.Group()
  gDyn.name = 'pistones_izaje_dinamicos'
  gDyn.visible = false
  for (const z of [-0.62, 0.62]) {
    const barrel = cyl(0.11, matRojo)
    const rod = cyl(0.063, matAcero)
    gDyn.add(barrel, rod)
    izaje.push({ z, barrel, rod })
  }
  mastG.add(gDyn)
  // soporte de traslado sobre la cabina (visible solo con el mástil apoyado en transporte)
  const gSop = new T.Group()
  gSop.name = 'soporte_traslado'
  gSop.visible = false
  if (D.soporte_traslado) {
    const s = D.soporte_traslado
    const caja = (sx, sy, sz, x, y, z) => {
      const m = new T.Mesh(new T.BoxGeometry(sx, sy, sz), matOscuro)
      m.position.set(x, y, z)
      m.castShadow = true
      gSop.add(m)
    }
    for (const z of [-0.55, 0.55]) caja(0.18, s.alto, 0.18, s.x, s.y0 + s.alto / 2, z)
    caja(1.0, 0.14, 1.6, s.x, s.y1 - 0.07, 0)
    mastG.add(gSop)
  }
  const pistonesEstaticos = mastG.children.find((c) => c.name === 'pistones_izaje')

  // pistón interno del 2.º tramo (en el marco del mástil; se ve a través del reticulado)
  const gExt = new T.Group()
  gExt.name = 'piston_extension_2do_tramo'
  const extBarrel = cyl(0.12, matOscuro)
  const extRod = cyl(0.07, matAcero)
  gExt.add(extBarrel, extRod)
  gExt.visible = false
  P.add(gExt)
  const EXT_Y0 = 0.4
  const EXT_BARREL = 7.0

  const B0 = (z) => [-5, 1.45, z] // fijación del cuerpo del pistón al chasis (la misma del V2)
  /** Punto del mástil donde empujan los pistones: t = 5 sobre el eje, −0,5 hacia la boca de pozo (igual que el V2). */
  const attach = (theta) => [
    bx + 5 * S * Math.sin(theta) - 0.5 * Math.cos(theta),
    by + 5 * S * Math.cos(theta) + 0.5 * Math.sin(theta),
  ]

  // ───────── cilindros de izaje del SK-575 (84 los integra en el grupo `mastil` con la pose armada) ─────────
  // Regla de sk575_izaje.meta.json: la camisa gira sobre su pivote del carrier hasta apuntar al empuje (oreja del mástil, gira con
  // el pivote); la extensión e = L − cerrado se reparte etapa1 → etapa2 → vástago. Ilustrativo: no es cálculo ni simulación.
  const META = window.__RIG_SK575_META || {}
  const V3 = (a) => new T.Vector3().fromArray(a)
  const Q = P.quaternion.constructor
  const M4 = P.matrix.constructor
  /** Matriz local del pivote con el mástil armado (la de set(1)): pasa puntos del modelo armado al marco del pivote. */
  const armadoInv = () =>
    new M4()
      .compose(P.position, new Q().setFromAxisAngle(new T.Vector3(0, 0, 1), -aFinal), P.scale)
      .invert()
  let cilSK = null
  function bindCilindros() {
    if (cilSK || !META.izaje || !META.izaje.length) return cilSK
    const nodos = META.izaje.map((c) => [
      mastG.getObjectByName(c.nodos.camisa),
      ...c.nodos.etapas.map((n) => mastG.getObjectByName(n)),
    ])
    if (nodos.some((ns) => ns.some((n) => !n))) return null // 84 todavía no los integró
    const inv = armadoInv()
    cilSK = META.izaje.map((c, i) => {
      const piv = V3(c.pivote_carrier)
      const emp = V3(c.empuje_mastil)
      return {
        piv,
        empP: emp.clone().applyMatrix4(inv), // en el marco del pivote: sigue al mástil
        u0: emp.clone().sub(piv).normalize(),
        lext: c.largo_extendido_m,
        lcerr: c.largo_cerrado_m,
        carreras: c.carrera_etapas_m,
        piezas: nodos[i].map((n) => ({ n, q0: n.quaternion.clone() })),
      }
    })
    return cilSK
  }
  const _e = new T.Vector3()
  const _u = new T.Vector3()
  const _q = new Q()
  /** Largos |empuje − pivote| del último set (para la nota y las pruebas). */
  const largos = []
  function updateCilindros() {
    if (!bindCilindros()) return
    P.updateMatrix()
    cilSK.forEach((c, i) => {
      _e.copy(c.empP).applyMatrix4(P.matrix)
      const L = _u.copy(_e).sub(c.piv).length()
      largos[i] = L
      _u.divideScalar(L)
      _q.setFromUnitVectors(c.u0, _u)
      // Lo que falta para el largo modelado se retrae del vástago hacia la etapa 1 (= extender etapa1 → etapa2 → vástago).
      // Medido desde el largo extendido, la pose armada sale exacta (las carreras del plano suman 0,26 mm de más).
      let falta = Math.max(0, c.lext - L)
      const ret = c.carreras.map(() => 0)
      for (let k = ret.length - 1; k >= 0; k--) falta -= ret[k] = Math.min(falta, c.carreras[k])
      let retraido = 0
      c.piezas.forEach(({ n, q0 }, k) => {
        n.quaternion.copy(_q).multiply(q0)
        if (k === 0) return // camisa: solo gira en su pivote
        retraido += ret[k - 1] // la etapa k arrastra a las interiores
        n.position.copy(c.piv).addScaledVector(_u, c.lext - retraido)
      })
    })
  }

  // ───────── ocultar lo que aún no está montado ─────────
  // ───────── vientos dinámicos (fase 3): del tendido flojo (con catenaria) al cable tenso ─────────
  // Extremos de sk575_vientos.meta.json: en tensión 1 el cable coincide con el viento SK (anclajes layout de locación 2019, C4 Fuente en conflicto).
  const FloatAttr = new T.BoxGeometry(1, 1, 1).attributes.position.constructor
  const NSEG = 18
  const cables = []
  if (META.vientos && META.vientos.length) {
    // extremos del modelo SK-575 (armado): el del mástil pasa al marco del pivote, el de tierra/carrier queda fijo
    const inv = armadoInv()
    for (const c of META.vientos)
      cables.push({
        mP: V3(c.extremo_mastil).applyMatrix4(inv),
        a: c.extremo_tierra || c.extremo_carrier,
      })
  } else {
    // sin la meta (build parcial): los puntos del V2 procedural
    for (const a of [
      [-25, 0.12, 25],
      [-25, 0.12, -25],
      [25, 0.12, 25],
      [25, 0.12, -25],
    ])
      for (const t of [26, 18.5])
        cables.push({ a, t, x: a[0] < 0 ? -0.6 : 0.6, z: a[2] < 0 ? -0.5 : 0.5 })
    for (const s of [-1.3, 1.3])
      cables.push({ a: [-9.6, 1.4, s], t: 14, x: -0.8, z: s > 0 ? 0.8 : -0.8 })
  }
  const gVientos = new T.Group()
  gVientos.name = 'vientos_dinamicos'
  gVientos.visible = false
  const matCable = new T.LineBasicMaterial({ color: '#B9C0C7' })
  for (const c of cables) {
    const g = new T.BufferGeometry()
    g.setAttribute('position', new FloatAttr(new Float32Array(NSEG * 3), 3))
    c.line = new T.Line(g, matCable)
    c.line.frustumCulled = false
    gVientos.add(c.line)
  }
  mastG.add(gVientos)
  const niW = (t, x, z, th) => [
    bx + t * S * Math.sin(th) + x * Math.cos(th),
    by + t * S * Math.cos(th) - x * Math.sin(th),
    z,
  ]
  /** tension 0 = flojo (flecha máxima), 1 = tenso y recto (igual que los cables fijos del V2). */
  const _m = new T.Vector3()
  function updateVientos(th, tension) {
    P.updateMatrix()
    for (const c of cables) {
      const m = c.mP ? _m.copy(c.mP).applyMatrix4(P.matrix).toArray() : niW(c.t, c.x, c.z, th)
      const L = Math.hypot(m[0] - c.a[0], m[1] - c.a[1], m[2] - c.a[2])
      const flecha = L * 0.08 * Math.pow(1 - tension, 1.5)
      const arr = c.line.geometry.attributes.position.array
      for (let k = 0; k < NSEG; k++) {
        const u = k / (NSEG - 1)
        arr[k * 3] = c.a[0] + (m[0] - c.a[0]) * u
        arr[k * 3 + 1] = c.a[1] + (m[1] - c.a[1]) * u - flecha * 4 * u * (1 - u)
        arr[k * 3 + 2] = c.a[2] + (m[2] - c.a[2]) * u
      }
      c.line.geometry.attributes.position.needsUpdate = true
    }
  }
  const tardios = [G.aparejo].filter(Boolean)

  // ───────── piso de enganche: rebatido contra el mástil hasta que el 2.º tramo lo saca por encima del 1.º ─────────
  // Plegado = paralelo al eje del mástil (90° − 3,5°: el piso SK está nivelado con el mástil inclinado). Se libera cuando su bisagra
  // (68' = 20,629 m) pasa el tope del 1.er tramo (16,4 m, cad/sk575/modelo.py) con el tramo embutido E; baja "por inercia" (caída
  // acelerada) y en la fase 3 oscila amortiguado hasta quedar horizontal. Ilustrativo: sin dinámica, masas ni tiempos reales.
  const PLEGADO = Math.PI / 2 - (3.5 * Math.PI) / 180
  const EXT_LIBRE = 1 - (20.629 - 16.4) / E
  const SOBREPASO = (8 * Math.PI) / 180
  let plegado = 0
  function plegadoEn(pp, ext) {
    if (pp >= 1) return 0
    if (pp < PHASE.extendEnd) {
      if (ext <= EXT_LIBRE) return PLEGADO
      const u = (ext - EXT_LIBRE) / (1 - EXT_LIBRE)
      return PLEGADO * (1 - u * u)
    }
    const w = (pp - PHASE.extendEnd) / (1 - PHASE.extendEnd)
    return -SOBREPASO * Math.exp(-4 * w) * Math.sin(3 * Math.PI * w)
  }

  let p = 1
  let raf = 0
  let t0 = 0
  const DURACION = 14000 // ms de la reproducción ilustrativa

  function fase(pp) {
    if (pp >= 1) return 'Montado. Pose final del modelo.'
    if (pp < PHASE.jacksEnd)
      return `Fase 0 · se bajan los gatos de nivelación del carrier (${(ease(pp / PHASE.jacksEnd) * 100).toFixed(0)} %)`
    if (pp < PHASE.raiseEnd) {
      const elev =
        EPS0 + ease((pp - PHASE.jacksEnd) / (PHASE.raiseEnd - PHASE.jacksEnd)) * (90 - EPS0)
      return `Fase 1 · pistón de izaje del 1.er tramo: ${elev.toFixed(0)}° de 90°`
    }
    if (pp < PHASE.extendEnd) {
      const e = ease((pp - PHASE.raiseEnd) / (PHASE.extendEnd - PHASE.raiseEnd))
      return `Fase 2 · pistón del 2.º tramo: extiende el tramo embutido en el 1.º (${(e * 100).toFixed(0)} %)`
    }
    return 'Fase 3 · se tensan los vientos y el mástil toma su plomo final'
  }

  function set(value) {
    p = Math.max(0, Math.min(1, Number(value)))
    const completo = p >= 1
    const raise = ease((p - PHASE.jacksEnd) / (PHASE.raiseEnd - PHASE.jacksEnd))
    const ext = ease((p - PHASE.raiseEnd) / (PHASE.extendEnd - PHASE.raiseEnd))
    if (window.__rigGatos) window.__rigGatos.set(completo ? 1 : ease(p / PHASE.jacksEnd))
    // θ: ángulo del eje respecto de la vertical (+ hacia la boca de pozo). Acostado hacia atrás: −90°. Final: el del V2.
    const tens = ease((p - PHASE.extendEnd) / (1 - PHASE.extendEnd))
    // Fase 1: de la posición de transporte a 90° (vertical). Fase 2: vertical. Fase 3: los vientos tensos llevan el mástil a su plomo final.
    const theta = completo ? aFinal : p < PHASE.extendEnd ? THETA0 * (1 - raise) : aFinal * tens
    P.rotation.z = -theta
    sup.position.y = completo ? 0 : -E * (1 - ext)
    if (conducto) conducto.visible = completo || p >= PHASE.extendEnd
    plegado = plegadoEn(p, ext)
    for (const g of tardios) g.visible = completo || p >= PHASE.extendEnd
    const vientosTendidos = p >= PHASE.extendEnd
    gVientos.visible = vientosTendidos && !completo
    if (G.vientos) G.vientos.visible = completo
    if (vientosTendidos && !completo) updateVientos(theta, tens)
    if (cableMalacate) cableMalacate.visible = completo || p >= PHASE.extendEnd

    updateCilindros()
    gDyn.visible = !completo && !cilSK // pistones procedurales solo si no hay cilindros SK
    gSop.visible = p < PHASE.jacksEnd + 0.03
    if (pistonesEstaticos) pistonesEstaticos.visible = completo
    gExt.visible = !completo
    if (!completo && !cilSK) {
      const [mx, my] = attach(theta)
      for (const { z, barrel, rod } of izaje) {
        const [x0, y0] = B0(z)
        const l = Math.hypot(mx - x0, my - y0)
        const lb = Math.min(l, CAMISA)
        const ux = (mx - x0) / l
        const uy = (my - y0) / l
        between(barrel, x0, y0, x0 + ux * lb, y0 + uy * lb, z)
        between(rod, x0 + ux * lb, y0 + uy * lb, mx, my, z)
      }
    }
    if (!completo) {
      const supBottom = 14.8 - E * (1 - ext)
      const barrelTop = EXT_Y0 + EXT_BARREL
      between(extBarrel, 0, EXT_Y0, 0, barrelTop, 0)
      between(extRod, 0, Math.min(barrelTop, supBottom), 0, Math.max(supBottom, barrelTop), 0)
    }
    if (R.perf && R.perf.invalidateShadows) R.perf.invalidateShadows()
    if (R.invalidate) R.invalidate()
    ui.update()
  }

  function play() {
    cancelAnimationFrame(raf)
    if (p >= 1) p = 0
    t0 = performance.now() - p * DURACION
    const step = (now) => {
      const next = (now - t0) / DURACION
      set(Math.min(1, next))
      if (next < 1) raf = requestAnimationFrame(step)
      else {
        raf = 0 // terminó: el botón vuelve a "Reproducir" y reaparecen los carteles
        ui.update()
      }
    }
    raf = requestAnimationFrame(step)
    ui.update()
  }
  function pause() {
    cancelAnimationFrame(raf)
    raf = 0
    ui.update()
  }

  // ───────── UI (solo en el paso 6 de la secuencia de montaje) ─────────
  const style = document.createElement('style')
  style.id = 'erect-style'
  style.textContent = `
    #rig-erect{width:min(340px,calc(100vw - 32px));color:#DDE3EC;font-size:12.5px;margin-top:6px;padding-top:8px;border-top:1px solid #2C3747}
    #rig-erect[hidden]{display:none}
    #rig-erect .er-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    #rig-erect b{color:#DDBB65}
    #rig-erect input[type=range]{flex:1 1 120px;min-width:0}
    #rig-erect button{font:inherit;color:inherit;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:3px 10px;cursor:pointer}
    #rig-erect button:hover{background:rgba(255,255,255,.1)}
    #rig-erect .er-note{margin-top:4px;font-size:11px;opacity:.75;line-height:1.35}
    /* Durante la reproducción se oculta la nota: solo Pausar, avance y fase */
    body.erect-playing #rig-erect .er-info{display:none}
    #rig-erect .er-info summary{cursor:pointer;font-size:11px;opacity:.75;margin-top:4px}
    body.erect-playing #rig-erect .er-note{display:none}
  `
  document.head.appendChild(style)
  const box = document.createElement('section')
  box.id = 'rig-erect'
  box.hidden = true
  box.setAttribute('aria-label', 'Izamiento del mástil (ilustrativo)')
  box.innerHTML = `
    <div class="er-row"><b>Izamiento del mástil</b>
      <button type="button" id="er-play">Reproducir</button>
      <input type="range" id="er-range" min="0" max="100" step="1" value="100" aria-label="Avance del izamiento (100 = montado)">
    </div>
    <div id="er-fase" aria-live="polite"></div>
    <details class="er-info"><summary>Nota</summary>    <div class="er-note">Secuencia típica de referencia (pendingValidation): pistón de izaje del 1.er tramo de 0 a 90°, luego el 2.º pistón extiende el tramo embutido, y se tensan los vientos. Cilindros SK-575 HYCO de 3 etapas: largo cerrado 1,524 m y extendido 4,864 m (plano HYCO, A); pivotes y orejas de montaje estimados (C). El ángulo de transporte y el soporte de traslado salen del V2 procedural previo (cad/izamiento.py, no recalculado sobre el SK-575; sus largos de pistón 2,64–6,00 m quedan en conflicto con el HYCO). Piso de enganche: viaja rebatido contra el mástil y baja a horizontal cuando el 2.º tramo lo saca por encima del 1.º (bisagra y movimiento ilustrativos, no documentados). Ilustrativo: la animación no es cálculo ni simulación dinámica; sin cargas, presiones ni tiempos; pistón interno del 2.º tramo aproximado.</div></details>`
  // Vive dentro del menú "Montaje" de la barra, debajo de la secuencia (sin paneles flotantes).
  if (window.__rigToolbar) window.__rigToolbar.add('montaje', box)
  else document.body.appendChild(box)
  const ui = {
    update() {
      const r = document.getElementById('er-range')
      if (r) r.value = String(Math.round(p * 100))
      const f = document.getElementById('er-fase')
      if (f) f.textContent = fase(p)
      document.body.classList.toggle('erect-playing', !!raf)
      const b = document.getElementById('er-play')
      if (b) b.textContent = raf ? 'Pausar' : p >= 1 ? 'Reproducir' : 'Continuar'
    },
  }
  document.getElementById('er-play').addEventListener('click', () => {
    if (raf) return pause()
    window.__rigToolbar?.closeAll() // el menú Montaje no tapa la escena mientras se reproduce
    play()
  })
  document.getElementById('er-range').addEventListener('input', (e) => {
    pause()
    set(Number(e.target.value) / 100)
  })
  document.addEventListener('rig:seq-step', (e) => {
    const en6 = e.detail === 6
    box.hidden = !en6
    if (!en6) {
      pause()
      if (p < 1) set(1)
    }
    ui.update()
  })
  document.addEventListener('rig:mode', () => {
    pause()
    if (p < 1) set(1)
    box.hidden = true
  })
  ui.update()

  window.__rigErect = {
    set,
    play,
    pause,
    progress: () => p,
    fases: PHASE,
    largos: () => [...largos],
    plegado: () => plegado,
  }
})
