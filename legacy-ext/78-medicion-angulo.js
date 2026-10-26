/*
 * 78-medicion-angulo.js · "Medir ángulo (3 puntos)" y desnivel (menú Medición).
 *
 * Clic en tres superficies del modelo: A, B (vértice) y C. Muestra el ángulo ABC y, como dato extra, el desnivel
 * vertical y la distancia horizontal entre A y C. Valores del MODELO aproximado (no as-built), con coma decimal.
 * Mientras está activo, los clics no seleccionan componentes. Se desactiva solo si se enciende "Medir 2 puntos".
 * API para pruebas: window.__rigAngulo = { activo(), medir(a, b, c) }.
 */
window.__rigExt.onPost((R) => {
  const T = R.three
  const ren = R.renderer
  if (!T || !ren || !R.raycaster) return
  const sc = R.scene
  const el = ren.domElement
  const coma = (v, d) => v.toFixed(d).replace('.', ',')
  let on = false
  let pts = []
  let down = null

  const grupo = new T.Group()
  grupo.name = 'medicion_angulo'
  sc.add(grupo)
  const matL = new T.LineBasicMaterial({ color: '#7fd3ff', depthTest: false, transparent: true })
  const matP = new T.MeshBasicMaterial({ color: '#7fd3ff', depthTest: false })
  const esfera = new T.SphereGeometry(0.1, 10, 8)
  const label = document.createElement('div')
  label.className = 'cad-dim'
  label.id = 'cad-angle-label'
  label.style.cssText =
    'position:absolute;display:none;z-index:4;background:#13304a;border-color:#3f7fae;color:#cfeaff;pointer-events:none'
  ;(document.getElementById('cad-dimlabels') || document.body).appendChild(label)

  function limpiar() {
    pts = []
    grupo.clear()
    label.style.display = 'none'
    if (R.invalidate) R.invalidate()
  }
  function medir(a, b, c) {
    const u = a.clone().sub(b)
    const v = c.clone().sub(b)
    const ang = (u.angleTo(v) * 180) / Math.PI
    const dy = c.y - a.y
    const dh = Math.hypot(c.x - a.x, c.z - a.z)
    return { ang, dy, dh }
  }
  function dibujar() {
    grupo.clear()
    for (const p of pts) {
      const m = new T.Mesh(esfera, matP)
      m.position.copy(p)
      m.renderOrder = 80
      grupo.add(m)
    }
    if (pts.length >= 2) {
      const arr = []
      for (let i = 1; i < pts.length; i++) arr.push(...pts[i - 1].toArray(), ...pts[i].toArray())
      const g = new T.BufferGeometry()
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(arr), 3))
      const l = new T.LineSegments(g, matL)
      l.renderOrder = 80
      grupo.add(l)
    }
    grupo.traverse((o) => (o.raycast = () => {}))
    if (pts.length === 3) {
      const r = medir(...pts)
      label.textContent = `≈ ${coma(r.ang, 1)}° · desnivel A→C ${coma(r.dy, 2)} m · horiz. ${coma(r.dh, 2)} m · modelo`
      label.style.display = 'block'
      posicionar()
    }
    if (R.invalidate) R.invalidate()
  }
  function posicionar() {
    if (pts.length !== 3 || label.style.display === 'none') return
    const p = pts[1].clone().project(R.camera())
    const rect = el.getBoundingClientRect()
    const host = label.offsetParent
      ? label.offsetParent.getBoundingClientRect()
      : { left: 0, top: 0 }
    label.style.left = `${rect.left - host.left + ((p.x + 1) / 2) * rect.width + 12}px`
    label.style.top = `${rect.top - host.top + ((1 - p.y) / 2) * rect.height - 28}px`
  }
  const loop = () => {
    if (on || label.style.display !== 'none') posicionar()
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)

  function pick(cx, cy) {
    const rect = el.getBoundingClientRect()
    const ndc = new T.Vector2(
      ((cx - rect.left) / rect.width) * 2 - 1,
      -((cy - rect.top) / rect.height) * 2 + 1,
    )
    const cam = R.camera()
    R.raycaster.setFromCamera(ndc, cam)
    const capas = R.raycaster.layers.mask
    R.raycaster.layers.mask = cam.layers.mask // el modelo SK-575 vive en otras capas además de la 0
    const vis = (o) => {
      let q = o
      while (q) {
        if (!q.visible) return false
        q = q.parent
      }
      return o.layers.test(cam.layers)
    }
    const h = R.raycaster
      .intersectObjects(sc.children, true)
      .find(
        (x) =>
          x.object.isMesh &&
          vis(x.object) &&
          !/cielo|clima|halos|sombra_contacto|medicion/.test(x.object.parent?.name + x.object.name),
      )
    R.raycaster.layers.mask = capas
    return h ? h.point.clone() : null
  }

  el.addEventListener(
    'pointerdown',
    (e) => {
      if (on && e.button === 0) down = { x: e.clientX, y: e.clientY }
    },
    { capture: true },
  )
  el.addEventListener(
    'pointerup',
    (e) => {
      if (!on || e.button !== 0 || !down) return
      const d = Math.hypot(e.clientX - down.x, e.clientY - down.y)
      down = null
      if (d > 6) return // fue un arrastre de cámara
      e.stopImmediatePropagation()
      const p = pick(e.clientX, e.clientY)
      if (!p) return
      if (pts.length === 3) pts = []
      pts.push(p)
      dibujar()
    },
    { capture: true },
  )

  const btn = document.createElement('button')
  btn.className = 'btn'
  btn.id = 'c-angle'
  btn.type = 'button'
  btn.textContent = 'Medir ángulo (3 puntos)'
  btn.setAttribute('aria-pressed', 'false')
  btn.addEventListener('click', () => {
    on = !on
    btn.setAttribute('aria-pressed', String(on))
    if (on && R.view && R.view.measure) document.getElementById('c-measure')?.click()
    if (!on) limpiar()
  })
  document.getElementById('c-measure')?.addEventListener('click', () => {
    if (on && R.view && R.view.measure) {
      on = false
      btn.setAttribute('aria-pressed', 'false')
      limpiar()
    }
  })
  document.getElementById('c-clear')?.addEventListener('click', limpiar)
  if (window.__rigToolbar && typeof window.__rigToolbar.add === 'function')
    window.__rigToolbar.add('medicion', btn)

  window.__rigAngulo = { activo: () => on, medir, puntos: () => pts.length }
})
