/*
 * 72-teclado.js · manejo del modelo 3D con teclado.
 *
 * El lienzo 3D recibe foco con Tab (antes tenía tabIndex -1 y solo se manejaba con mouse o dedo). Con el foco en el lienzo:
 *   ← → giran alrededor del objetivo · ↑ ↓ inclinan · Mayús + flechas desplazan · + / − acercan y alejan ·
 *   ? (o H) muestra u oculta la ayuda de atajos · Escape la cierra.
 * Mueve la misma cámara y el mismo objetivo que el mouse (los controles de órbita del visor), así que el resto de las
 * herramientas no notan la diferencia. Con la caminata activa (87-recorridos) los controles están apagados y este módulo no
 * hace nada: las flechas son de la caminata.
 * API para pruebas: window.__rigTeclado = { girar(grados), inclinar(grados), zoom(factor), ayuda(on) }.
 */
window.__rigExt.onPost((R) => {
  const T = R.three
  const ren = R.renderer
  if (!T || !ren || !R.controls) return
  const cv = ren.domElement
  cv.tabIndex = 0
  cv.setAttribute('role', 'application')
  cv.setAttribute(
    'aria-label',
    'Modelo 3D del equipo. Flechas: girar e inclinar · Mayús + flechas: desplazar · + y −: zoom · ?: atajos',
  )

  const style = document.createElement('style')
  style.textContent = `
    canvas:focus-visible{outline:2px solid #DDBB65;outline-offset:-2px}
    #rig-atajos{position:fixed;z-index:60;left:50%;top:50%;transform:translate(-50%,-50%);width:min(340px,calc(100vw - 32px));
      background:rgba(16,22,32,.97);border:1px solid #303B4B;border-radius:10px;padding:14px 16px;color:#DDE3EC;font:13px/1.5 Arial,sans-serif;
      box-shadow:0 14px 40px rgba(0,0,0,.55)}
    #rig-atajos[hidden]{display:none}
    #rig-atajos h2{margin:0 0 8px;font-size:13px;color:#DDBB65;text-transform:uppercase;letter-spacing:.08em}
    #rig-atajos dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0}
    #rig-atajos dt{font-family:Consolas,monospace;color:#E9C971}
    #rig-atajos dd{margin:0}
  `
  document.head.appendChild(style)
  const ayudaBox = document.createElement('div')
  ayudaBox.id = 'rig-atajos'
  ayudaBox.hidden = true
  ayudaBox.setAttribute('role', 'dialog')
  ayudaBox.setAttribute('aria-label', 'Atajos de teclado')
  ayudaBox.innerHTML =
    '<h2>Atajos de teclado</h2><dl>' +
    '<dt>← →</dt><dd>Girar alrededor del equipo</dd>' +
    '<dt>↑ ↓</dt><dd>Inclinar la vista</dd>' +
    '<dt>Mayús + flechas</dt><dd>Desplazar</dd>' +
    '<dt>+ / −</dt><dd>Acercar / alejar</dd>' +
    '<dt>? o H</dt><dd>Mostrar u ocultar esta ayuda</dd>' +
    '<dt>Esc</dt><dd>Cerrar</dd></dl>' +
    '<p style="margin:8px 0 0;font-size:11.5px;opacity:.75">Hacé clic en el modelo o llegá con Tab para usar los atajos.</p>'
  document.body.appendChild(ayudaBox)
  function ayuda(on) {
    ayudaBox.hidden = !on
    if (!on) cv.focus({ preventScroll: true })
  }

  const ctl = () => R.controls()
  const listo = () => {
    const C = ctl()
    if (C) C.update()
    if (R.invalidate) R.invalidate()
  }
  const Y = new T.Vector3(0, 1, 0)
  function girar(grados) {
    const C = ctl()
    if (!C || C.enabled === false) return
    const cam = R.camera()
    const off = cam.position.clone().sub(C.target)
    off.applyAxisAngle(Y, (grados * Math.PI) / 180)
    cam.position.copy(C.target).add(off)
    listo()
  }
  function inclinar(grados) {
    const C = ctl()
    if (!C || C.enabled === false) return
    const cam = R.camera()
    const off = cam.position.clone().sub(C.target)
    const derecha = new T.Vector3().crossVectors(Y, off).normalize()
    const nuevo = off.clone().applyAxisAngle(derecha, (-grados * Math.PI) / 180)
    // sin pasar por la vertical ni bajar del horizonte (mismo criterio que la órbita con mouse)
    const ang = Math.acos(Math.max(-1, Math.min(1, nuevo.clone().normalize().dot(Y))))
    if (ang < 0.05 || ang > Math.PI / 2 - 0.01) return
    cam.position.copy(C.target).add(nuevo)
    listo()
  }
  function desplazar(dx, dy) {
    const C = ctl()
    if (!C || C.enabled === false) return
    const cam = R.camera()
    const dist = cam.position.distanceTo(C.target)
    const paso = (cam.isOrthographicCamera ? 40 / (cam.zoom || 1) : dist) * 0.05
    const derecha = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 0)
    const arriba = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 1)
    const d = derecha.multiplyScalar(dx * paso).add(arriba.multiplyScalar(dy * paso))
    cam.position.add(d)
    C.target.add(d)
    listo()
  }
  function zoom(factor) {
    const C = ctl()
    if (!C || C.enabled === false) return
    const cam = R.camera()
    if (cam.isOrthographicCamera) {
      cam.zoom = Math.max(0.2, Math.min(40, cam.zoom * factor))
      cam.updateProjectionMatrix()
    } else {
      const off = cam.position.clone().sub(C.target)
      const len = Math.max(2, Math.min(400, off.length() / factor))
      cam.position.copy(C.target).add(off.setLength(len))
    }
    listo()
  }

  cv.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const C = ctl()
    if (C && C.enabled === false) return // caminata u otra herramienta tiene la cámara
    let hecho = true
    if (e.key === '?' || e.key === 'h' || e.key === 'H') ayuda(ayudaBox.hidden)
    else if (e.key === 'Escape') {
      if (ayudaBox.hidden) hecho = false
      else ayuda(false)
    } else if (e.key === '+' || e.key === '=') zoom(1.15)
    else if (e.key === '-' || e.key === '_') zoom(1 / 1.15)
    else if (e.key === 'ArrowLeft') e.shiftKey ? desplazar(-1, 0) : girar(-7.5)
    else if (e.key === 'ArrowRight') e.shiftKey ? desplazar(1, 0) : girar(7.5)
    else if (e.key === 'ArrowUp') e.shiftKey ? desplazar(0, 1) : inclinar(5)
    else if (e.key === 'ArrowDown') e.shiftKey ? desplazar(0, -1) : inclinar(-5)
    else hecho = false
    if (hecho) {
      e.preventDefault()
      e.stopPropagation()
    }
  })
  ayudaBox.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') ayuda(false)
  })
  // el clic en el lienzo le da foco (así los atajos funcionan después de orbitar con el mouse)
  cv.addEventListener('pointerdown', () => cv.focus({ preventScroll: true }))

  window.__rigTeclado = { girar, inclinar, zoom, ayuda: (on) => ayuda(!!on) }
})
