/*
 * 87-recorridos.js — recorridos visuales en primera persona (operario parado en la locación).
 *
 * Datos: window.__RIG_VIEWPOINTS (src/data/viewpoints/rig10-viewpoints.json, inyectado por build-legacy). Sumar un
 * viewpoint = sumar un registro; esta lógica no se toca. Altura de ojos = cota del piso + 1,70 m (un test lo verifica).
 *
 *  - Panel "Ir a equipo" (arriba a la derecha del escenario) y DOBLE clic sobre un equipo (el clic simple ya selecciona en
 *    el V2): vuelo de cámara de ~1,8 s con easing, en arco para no atravesar equipos; al llegar, velo dorado sobre las
 *    piezas del equipo (mesh extra que comparte la geometría: el hover del V2 apaga el emissive, el velo no) y su ficha.
 *  - "Volver a vista general": vuelve a la vista previa (también ortográfica y límites de OrbitControls).
 *  - Modo caminata: Pointer Lock nativo + WASD/flechas, ojos a 1,70 m del terreno, 1,4 m/s. Colisión con raycast corto
 *    contra la geometría SK-575 (las cajas por material del GLB abarcan media locación); no sale del vallado. ESC sale.
 *  - Recorrido guiado (solo en modo Entrenamiento): paradas y segundos por parada configurables en el JSON.
 *
 * Es una herramienta VISUAL: las posiciones de cámara no son puestos de trabajo ni distancias de seguridad, y no hay zonas
 * de exclusión documentadas que respetar. API para pruebas: window.__rigVp.
 */
window.__rigExt.onPost((R) => {
  const D = window.__RIG_VIEWPOINTS
  if (!D || !D.viewpoints || !R.camera || !R.controls || !R.raycaster || !R.three) return
  const T = R.three
  const $ = (id) => document.getElementById(id)
  const VP = D.viewpoints
  const byId = new Map(VP.map((v) => [v.id, v]))
  const MS = (D.transicion && D.transicion.ms) || 1800
  const OJOS = D.alturaOjos || 1.7
  const PASO = (D.caminata && D.caminata.velocidad) || 1.4
  const RADIO = (D.caminata && D.caminata.radio) || 0.35
  const LIM = D.locacion || { min: [-45, -30.5], max: [33.5, 30.5] }
  const OCULTO = 2 ** 31
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    )
  const vec = (a) => new T.Vector3(a[0], a[1], a[2])

  // ───────── UI ─────────
  const style = document.createElement('style')
  style.textContent = `
    #vp-panel{position:absolute;right:12px;top:12px;z-index:18;width:min(290px,calc(100vw - 32px));font-size:12.5px;
      color:#DDE3EC;background:rgba(20,27,38,.95);border:1px solid #303B4B;border-radius:12px;padding:6px}
    #vp-panel.collapsed{width:auto}
    #vp-panel.collapsed #vp-body{display:none}
    #vp-panel button{font:inherit;color:inherit;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);
      border-radius:8px;padding:5px 9px;cursor:pointer}
    #vp-panel button:hover:not(:disabled){background:rgba(255,255,255,.09)}
    #vp-panel button:disabled{opacity:.45;cursor:default}
    #vp-panel button[aria-pressed="true"],#vp-panel button[aria-current="true"]{background:rgba(221,187,101,.22);
      border-color:#DDBB65;color:#F3E2B4}
    #vp-toggle{width:100%;text-align:left;color:#DDBB65!important;font-weight:600}
    #vp-list{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0;max-height:34vh;overflow:auto}
    #vp-list button{padding:4px 7px;font-size:12px}
    #vp-ficha{margin:6px 0;padding:8px;border-radius:8px;background:rgba(255,255,255,.03)}
    #vp-ficha h3{margin:0 0 4px;font-size:13px;color:#F3E2B4}
    #vp-ficha dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:2px 8px}
    #vp-ficha dt{opacity:.65}
    #vp-ficha dd{margin:0}
    .vp-row{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
    #vp-tour{display:none;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.08)}
    body.v2-mode-training #vp-tour{display:block}
    #vp-tour-pos{display:block;margin-top:4px;opacity:.8}
    .vp-warn{margin:6px 0 0;font-size:11px;line-height:1.35;color:#E0B870}
    #vp-walk-hint{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:18;display:none;
      padding:6px 12px;border-radius:9px;background:rgba(20,27,38,.92);border:1px solid #303B4B;font-size:12px;color:#DDE3EC}
    body.vp-walking #vp-walk-hint{display:block}
    @media(max-width:700px){#vp-panel{top:64px}}
  `
  document.head.appendChild(style)

  const panel = document.createElement('section')
  panel.id = 'vp-panel'
  panel.className = 'collapsed'
  panel.setAttribute('aria-label', 'Recorrido en primera persona')
  panel.innerHTML = `
    <button type="button" id="vp-toggle" aria-expanded="false" aria-controls="vp-body">Ir a equipo</button>
    <div id="vp-body">
      <div id="vp-list" role="group" aria-label="Equipos"></div>
      <div id="vp-ficha" hidden aria-live="polite"><h3 id="vp-nombre"></h3><dl id="vp-datos"></dl></div>
      <div class="vp-row">
        <button type="button" id="vp-back" disabled>Volver a vista general</button>
        <button type="button" id="vp-walk" aria-pressed="false">Modo caminata</button>
      </div>
      <div id="vp-tour" aria-label="Recorrido guiado">
        <div class="vp-row">
          <button type="button" id="vp-prev" aria-label="Parada anterior">Anterior</button>
          <button type="button" id="vp-play" aria-pressed="false">Reproducir</button>
          <button type="button" id="vp-next" aria-label="Parada siguiente">Siguiente</button>
        </div>
        <span id="vp-tour-pos"></span>
      </div>
      <p class="vp-warn">Recorrido visual: las vistas no son puestos de trabajo ni distancias de seguridad. Doble clic en un equipo para ir a su vista.</p>
    </div>`
  const stage = $('stage') || document.body
  stage.appendChild(panel)
  const hint = document.createElement('div')
  hint.id = 'vp-walk-hint'
  hint.textContent = 'Caminata: W A S D o flechas · mouse para mirar · ESC para salir'
  stage.appendChild(hint)

  const lista = $('vp-list')
  for (const v of VP) {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = v.nombre
    b.dataset.vp = v.id
    b.addEventListener('click', () => {
      pausa()
      go(v.id)
    })
    lista.appendChild(b)
  }
  $('vp-toggle').addEventListener('click', () => {
    const abierto = panel.classList.toggle('collapsed') === false
    $('vp-toggle').setAttribute('aria-expanded', String(abierto))
  })

  const CAMPOS = { funcion: 'Función', riesgos: 'Riesgos', EPP: 'EPP', controles: 'Controles' }
  function ficha(v) {
    const f = $('vp-ficha')
    f.hidden = !v
    for (const b of lista.children)
      b.setAttribute('aria-current', String(!!v && b.dataset.vp === v.id))
    if (!v) return
    $('vp-nombre').textContent = v.nombre
    $('vp-datos').innerHTML = Object.entries(CAMPOS)
      .map(([k, l]) => `<dt>${l}</dt><dd>${esc((v.ficha && v.ficha[k]) || '—')}</dd>`)
      .join('')
  }

  // ───────── cámara ─────────
  let anim = 0
  let actual = null
  let previa = null // vista antes del primer viewpoint
  let limites = null // OrbitControls: la primera persona necesita mirar hacia arriba y acercarse < minDistance
  const p0 = new T.Vector3()
  const t0 = new T.Vector3()

  function perspectiva() {
    if (R.view.ortho) $('c-ortho').click()
  }
  function relajar() {
    const ctl = R.controls()
    if (!limites) limites = { min: ctl.minDistance, polar: ctl.maxPolarAngle }
    ctl.minDistance = 0.1
    ctl.maxPolarAngle = Math.PI - 0.05
  }
  function restaurarLimites() {
    if (!limites) return
    const ctl = R.controls()
    ctl.minDistance = limites.min
    ctl.maxPolarAngle = limites.polar
    limites = null
  }
  function guardar() {
    if (previa) return
    const ortho = !!R.view.ortho
    previa = {
      pos: R.camera().position.clone(),
      tgt: R.controls().target.clone(),
      ortho,
      fov: null,
    }
  }
  function armado() {
    const b = $('t-explode')
    if (b && b.classList.contains('on')) b.click()
    if (R.state) R.state.explodeTarget = 0
    R.setExplode(0)
  }

  /** Vuela posición + objetivo (+ fov) con easing cúbico; en arco si el tramo es largo (no cruza los equipos bajos). */
  function volar(pos, tgt, fov, ms, fin) {
    cancelAnimationFrame(anim)
    if (R.stopCam) R.stopCam() // la animación de cámara del V2 (vistas, foco) pisaría este vuelo
    const cam = R.camera()
    const ctl = R.controls()
    p0.copy(cam.position)
    t0.copy(ctl.target)
    const f0 = cam.fov || fov
    const arco = ms ? Math.min(8, p0.distanceTo(pos) * 0.12) : 0
    const inicio = performance.now()
    const paso = (ahora) => {
      const k = ms ? Math.min(1, (ahora - inicio) / ms) : 1
      const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2
      cam.position.lerpVectors(p0, pos, e)
      cam.position.y += Math.sin(Math.PI * e) * arco
      ctl.target.lerpVectors(t0, tgt, e)
      if (cam.isPerspectiveCamera && fov) {
        cam.fov = f0 + (fov - f0) * e
        cam.updateProjectionMatrix()
      }
      ctl.update()
      R.invalidate()
      if (k < 1) anim = requestAnimationFrame(paso)
      else {
        anim = 0
        if (fin) fin()
      }
    }
    if (ms) anim = requestAnimationFrame(paso)
    else paso(inicio)
  }

  // ───────── resaltado ─────────
  const veloMat = new T.MeshBasicMaterial({
    color: '#F2BE4F',
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    polygonOffset: true, // con -1/-1 el velo queda bajo la malla (precisión de profundidad); verificado en captura
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -40,
  })
  let velos = []
  const coincide = (nombre, prefijos) =>
    !!nombre && prefijos.some((p) => nombre === p || nombre.startsWith(p + '_'))
  function apagar() {
    for (const m of velos) m.parent && m.parent.remove(m)
    velos = []
    R.invalidate()
  }
  function resaltar(v) {
    apagar()
    const pref = v.objeto3D || []
    if (!pref.length) return
    const mallas = []
    R.scene.traverse((o) => {
      if (!o.isMesh || o.layers.mask === OCULTO || o.userData.vpVelo) return
      for (let n = o; n; n = n.parent) if (coincide(n.name, pref)) return void mallas.push(o)
    })
    for (const o of mallas) {
      const m = new T.Mesh(o.geometry, veloMat)
      m.userData.vpVelo = true
      m.raycast = () => {}
      m.renderOrder = 5
      // 80-perf congela las matrices de lo estático: el velo copia la de su malla en cada render (sigue también lo animado)
      m.matrixAutoUpdate = false
      m.matrixWorldAutoUpdate = false
      m.onBeforeRender = () => m.matrixWorld.copy(o.matrixWorld)
      m.frustumCulled = false
      o.add(m)
      velos.push(m)
    }
    R.invalidate()
  }
  /** Viewpoint del equipo al que pertenece `obj` (el prefijo más largo gana). */
  function deObjeto(obj) {
    let mejor = null
    let largo = 0
    for (let n = obj; n; n = n.parent)
      for (const v of VP)
        for (const p of v.objeto3D || [])
          if (coincide(n.name, [p]) && p.length > largo) {
            mejor = v
            largo = p.length
          }
    return mejor
  }
  const visible = (o) => {
    const G = R.groups[o.userData.id]
    return !!G && G.visible && o.layers.mask !== OCULTO
  }
  function pick(x, y) {
    const r = R.renderer.domElement.getBoundingClientRect()
    const rc = R.raycaster
    rc.setFromCamera(
      { x: ((x - r.left) / r.width) * 2 - 1, y: -((y - r.top) / r.height) * 2 + 1 },
      R.camera(),
    )
    const h = rc.intersectObjects(R.pickables, false).find((h) => visible(h.object))
    return h ? deObjeto(h.object) : null
  }

  // ───────── navegación ─────────
  function go(id, o = {}) {
    const v = byId.get(id)
    if (!v) return false
    if (walk) caminar(false)
    guardar()
    armado()
    perspectiva()
    if (previa && previa.fov === null) previa.fov = R.camera().fov
    relajar()
    actual = v
    resaltar(v)
    ficha(v)
    $('vp-back').disabled = false
    volar(vec(v.camPos), vec(v.target), v.fov, o.instant ? 0 : MS)
    document.dispatchEvent(new CustomEvent('rig:viewpoint', { detail: id }))
    return true
  }
  function limpiar() {
    cancelAnimationFrame(anim)
    anim = 0
    pausa()
    if (walk) caminar(false)
    apagar()
    ficha(null)
    actual = null
    previa = null
    restaurarLimites()
    $('vp-back').disabled = true
  }
  function back(o = {}) {
    const p = previa
    limpiar()
    if (!p) return
    const fin = () => {
      if (p.ortho && !R.view.ortho) $('c-ortho').click()
    }
    relajar() // el vuelo de vuelta arranca desde abajo del objetivo: los límites vuelven al terminar
    volar(p.pos, p.tgt, p.fov, o.instant ? 0 : MS, () => {
      restaurarLimites()
      R.controls().update()
      fin()
    })
  }
  $('vp-back').addEventListener('click', () => back())
  R.renderer.domElement.addEventListener('dblclick', (e) => {
    if (walk) return
    const v = pick(e.clientX, e.clientY)
    if (v) go(v.id)
  })
  // otra vista del V2 (presets, Reset) toma la cámara: el recorrido suelta su estado
  for (const sel of ['#views', '#b-reset'])
    document
      .querySelector(sel)
      ?.addEventListener('click', () => (actual || walk || previa) && limpiar())

  // ───────── modo caminata ─────────
  let walk = null
  const teclas = new Set()
  const dir = new T.Vector3()
  const org = new T.Vector3()
  const canvas = R.renderer.domElement
  function libre(x, z, dx, dz) {
    const largo = Math.hypot(dx, dz)
    if (!largo) return true
    const rc = R.raycaster
    const near0 = rc.near
    const far0 = rc.far
    dir.set(dx / largo, 0, dz / largo)
    rc.near = 0
    rc.far = largo + RADIO
    let ok = true
    // rayo central y uno a cada lado a ±RADIO (ancho del caminante): con solo el central, rozando el canto de un equipo
    // el rayo pasaba por una rendija y se lo atravesaba (CI a 60 FPS, paso chico)
    const px = -dir.z * RADIO
    const pz = dir.x * RADIO
    rayos: for (const h of [0.4, 1.2])
      for (const k of [-1, 0, 1]) {
        org.set(x + k * px, h, z + k * pz)
        rc.set(org, dir)
        if (rc.intersectObjects(R.pickables, false).some((i) => visible(i.object))) {
          ok = false
          break rayos
        }
      }
    rc.near = near0
    rc.far = far0
    return ok
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
  function mirar() {
    const cam = R.camera()
    const ctl = R.controls()
    const c = Math.cos(walk.pitch)
    ctl.target.set(
      cam.position.x + Math.sin(walk.yaw) * c,
      cam.position.y + Math.sin(walk.pitch),
      cam.position.z + Math.cos(walk.yaw) * c,
    )
    cam.lookAt(ctl.target)
    R.invalidate()
  }
  function bucle(ahora) {
    if (!walk) return
    const dt = Math.min(0.25, Math.max(0, ahora - walk.t) / 1000) // 1,4 m/s reales aun con pocos FPS
    walk.t = ahora
    const f =
      (teclas.has('KeyW') || teclas.has('ArrowUp') ? 1 : 0) -
      (teclas.has('KeyS') || teclas.has('ArrowDown') ? 1 : 0)
    const s = (teclas.has('KeyD') ? 1 : 0) - (teclas.has('KeyA') ? 1 : 0)
    const giro = (teclas.has('ArrowLeft') ? 1 : 0) - (teclas.has('ArrowRight') ? 1 : 0)
    if (giro) walk.yaw += giro * 1.5 * dt
    if (f || s) {
      const sy = Math.sin(walk.yaw)
      const cy = Math.cos(walk.yaw)
      const n = Math.hypot(f, s)
      let dx = ((f * sy - s * cy) / n) * PASO * dt
      let dz = ((f * cy + s * sy) / n) * PASO * dt
      const cam = R.camera()
      const { x, z } = cam.position
      if (!libre(x, z, dx, dz)) {
        if (libre(x, z, dx, 0)) dz = 0
        else if (libre(x, z, 0, dz)) dx = 0
        else dx = dz = 0
      }
      cam.position.x = clamp(x + dx, LIM.min[0], LIM.max[0])
      cam.position.z = clamp(z + dz, LIM.min[1], LIM.max[1])
    }
    mirar()
    walk.raf = requestAnimationFrame(bucle)
  }
  function caminar(on) {
    if (on === !!walk) return
    const ctl = R.controls()
    if (on) {
      cancelAnimationFrame(anim)
      anim = 0
      if (R.stopCam) R.stopCam() // una animación de cámara del V2 en curso pisaría la posición de caminata
      pausa()
      guardar()
      armado()
      perspectiva()
      if (previa && previa.fov === null) previa.fov = R.camera().fov
      relajar()
      const cam = R.camera()
      const d = ctl.target.clone().sub(cam.position)
      cam.position.set(
        clamp(cam.position.x, LIM.min[0], LIM.max[0]),
        OJOS,
        clamp(cam.position.z, LIM.min[1], LIM.max[1]),
      )
      walk = { yaw: Math.atan2(d.x, d.z), pitch: 0, t: performance.now(), raf: 0, lock: false }
      ctl.enabled = false
      document.body.classList.add('vp-walking')
      $('vp-walk').setAttribute('aria-pressed', 'true')
      $('vp-back').disabled = false
      try {
        const r = canvas.requestPointerLock()
        if (r && r.catch) r.catch(() => {})
      } catch {
        /* sin Pointer Lock (iframe/headless): se camina con teclado */
      }
      walk.raf = requestAnimationFrame(bucle)
    } else {
      cancelAnimationFrame(walk.raf)
      const cam = R.camera()
      const c = Math.cos(walk.pitch)
      ctl.target.set(
        cam.position.x + Math.sin(walk.yaw) * c * 4,
        cam.position.y + Math.sin(walk.pitch) * 4,
        cam.position.z + Math.cos(walk.yaw) * c * 4,
      )
      walk = null
      teclas.clear()
      ctl.enabled = true
      ctl.update()
      document.body.classList.remove('vp-walking')
      $('vp-walk').setAttribute('aria-pressed', 'false')
      if (document.pointerLockElement === canvas) document.exitPointerLock()
      R.invalidate()
    }
  }
  $('vp-walk').addEventListener('click', () => caminar(!walk))
  document.addEventListener('pointerlockchange', () => {
    if (!walk) return
    if (document.pointerLockElement === canvas) walk.lock = true
    else if (walk.lock) caminar(false) // ESC suelta el puntero: sale del modo
  })
  document.addEventListener('mousemove', (e) => {
    if (!walk || document.pointerLockElement !== canvas) return
    walk.yaw -= e.movementX * 0.0025
    walk.pitch = clamp(walk.pitch - e.movementY * 0.0025, -1.3, 1.3)
  })
  const TECLAS = new Set([
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
  ])
  addEventListener('keydown', (e) => {
    if (!walk) return
    if (e.key === 'Escape') return void caminar(false)
    if (!TECLAS.has(e.code) || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
    teclas.add(e.code)
    e.preventDefault()
  })
  addEventListener('keyup', (e) => teclas.delete(e.code))
  addEventListener('blur', () => teclas.clear())

  // ───────── recorrido guiado (modo Entrenamiento) ─────────
  const PARADAS = ((D.recorrido && D.recorrido.paradas) || []).filter((id) => byId.has(id))
  const SEG = (D.recorrido && D.recorrido.segundosPorParada) || 8
  const tour = { i: -1, auto: false, timer: 0 }
  function pintarTour() {
    const v = tour.i >= 0 ? byId.get(PARADAS[tour.i]) : null
    $('vp-tour-pos').textContent = v
      ? `Parada ${tour.i + 1}/${PARADAS.length} · ${v.nombre}`
      : `Recorrido guiado · ${PARADAS.length} paradas`
    $('vp-play').setAttribute('aria-pressed', String(tour.auto))
    $('vp-play').textContent = tour.auto ? 'Pausa' : 'Reproducir'
  }
  function programar() {
    clearTimeout(tour.timer)
    if (!tour.auto) return
    if (tour.i >= PARADAS.length - 1) {
      tour.auto = false
      return pintarTour()
    }
    tour.timer = setTimeout(() => parada(tour.i + 1, true), MS + SEG * 1000)
  }
  function parada(i, seguir) {
    if (!PARADAS.length) return
    tour.i = clamp(i, 0, PARADAS.length - 1)
    const auto = seguir && tour.auto
    go(PARADAS[tour.i])
    tour.auto = auto // go() → limpiar() no corre aquí, pero un clic manual pausa
    pintarTour()
    programar()
  }
  function pausa() {
    clearTimeout(tour.timer)
    if (tour.auto) {
      tour.auto = false
      pintarTour()
    }
  }
  function play() {
    if (tour.auto) return pausa()
    tour.auto = true
    if (tour.i < 0 || tour.i >= PARADAS.length - 1) parada(0, true)
    else {
      pintarTour()
      programar()
    }
  }
  $('vp-prev').addEventListener('click', () => {
    pausa()
    parada(tour.i - 1)
  })
  $('vp-next').addEventListener('click', () => {
    pausa()
    parada(tour.i + 1)
  })
  $('vp-play').addEventListener('click', play)
  document.addEventListener('rig:mode', (e) => {
    if (e && e.detail === 'training') return
    pausa()
  })
  pintarTour()

  window.__rigVp = {
    list: () => VP,
    go,
    back,
    pick,
    walk: caminar,
    current: () => (actual ? actual.id : null),
    walking: () => !!walk,
    keys: teclas, // pruebas: simular teclas sin Pointer Lock
    libre, // pruebas: colisión de un paso (x, z, dx, dz), sin depender de los FPS
    tour: {
      play,
      pause: pausa,
      next: () => parada(tour.i + 1),
      prev: () => parada(tour.i - 1),
      state: () => ({ ...tour }),
    },
  }
})
