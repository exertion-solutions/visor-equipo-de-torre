/*
 * 99-maniobra.js · maniobra ilustrativa "sacar un tiro" + línea de fuego (menú Animar).
 *
 * Fases (cinemática visual, NO cálculo ni simulación):
 *   1. El elevador baja al piso de trabajo y toma el tiro (el tiro sale de la boca de pozo, por debajo del piso).
 *   2. El aparejo sube con el tiro colgado (mueve el deslizador real del aparejo: el modelo SK-575 lo acompaña).
 *   3. El tiro se estiba: el extremo superior va al peine del piso de enganche y el inferior al piso, donde está el
 *      conjunto de tiros del modelo (sk575_tiros).
 *   4. El aparejo vuelve vacío a la altura de reposo.
 * Largo del tiro = (piso de enganche − piso de trabajo) del modelo + 0,6 m; diámetro 2-7/8" (73 mm) como referencia
 * visual. Todo lo geométrico sale del modelo (cajas de sk575_aparejo y sk575_tiros); nada de esto es un dato operativo.
 *
 * Línea de fuego: mientras está activa, una línea vertical discontinua y un anillo marcan la PROYECCIÓN VERTICAL del
 * elevador / carga suspendida sobre el piso. No es una distancia ni una zona de exclusión aprobada.
 * API para pruebas: window.__rigManiobra = { play(), stop(), set(p), estado(), lineaFuego(on) }.
 */
window.__rigExt.onPost((R) => {
  const T = R.three
  const sc = R.scene
  const hoist = document.getElementById('hoist')
  if (!T || !hoist) return
  const FX = window.__rigFx
  const PISO = 3.61
  const ENGANCHE = 20.63
  const LARGO = ENGANCHE - PISO + 0.6
  const DUR = 26000 // ms de la maniobra completa
  const H0 = Number(hoist.value) || 14

  const box = new T.Box3()
  const parteAparejo = () =>
    sc.getObjectByName('sk575_aparejo_rojo') || sc.getObjectByName('sk575_aparejo_acero')
  function elevador() {
    const o = parteAparejo()
    if (!o) return null
    o.updateWorldMatrix(true, false)
    box.setFromObject(o)
    const c = new T.Vector3()
    box.getCenter(c)
    return { x: c.x, z: c.z, fondo: box.min.y }
  }
  let offset = null // fondo del elevador − altura del deslizador (se mide una vez)
  function alto(h) {
    hoist.value = String(h)
    hoist.dispatchEvent(new Event('input'))
  }
  function medirOffset() {
    alto(H0)
    sc.updateMatrixWorld(true)
    const e = elevador()
    offset = e ? e.fondo - H0 : -3.4
  }
  // destino de estiba: centro y piso de los tiros del modelo; si no están, al costado del piso de trabajo
  function estiba() {
    const o =
      sc.getObjectByName('sk575_tiros') ||
      (() => {
        let f = null
        sc.traverse((q) => {
          if (!f && /^sk575_tiros/.test(q.name)) f = q
        })
        return f
      })()
    if (o) {
      box.setFromObject(o)
      const c = new T.Vector3()
      box.getCenter(c)
      return { x: c.x, z: c.z, piso: Math.max(box.min.y, PISO) }
    }
    return { x: 1.6, z: 1.6, piso: PISO }
  }

  // ───────── tiro ─────────
  const tuboMat = new T.MeshStandardMaterial({ color: '#4a4f57', roughness: 0.45, metalness: 0.6 })
  const cuplaMat = new T.MeshStandardMaterial({ color: '#8d939a', roughness: 0.4, metalness: 0.7 })
  const tiro = new T.Group()
  tiro.name = 'maniobra_tiro'
  const cuerpo = new T.Mesh(new T.CylinderGeometry(0.0365, 0.0365, LARGO, 12), tuboMat)
  cuerpo.position.y = -LARGO / 2
  tiro.add(cuerpo)
  for (const y of [-0.12, -LARGO / 2, -LARGO + 0.1]) {
    const c = new T.Mesh(new T.CylinderGeometry(0.047, 0.047, 0.2, 12), cuplaMat)
    c.position.y = y
    tiro.add(c)
  }
  tiro.traverse((o) => {
    o.castShadow = true
    o.raycast = () => {}
  })
  tiro.visible = false
  sc.add(tiro)

  // ───────── línea de fuego ─────────
  const lf = new T.Group()
  lf.name = 'linea_de_fuego'
  lf.visible = false
  const dashes = []
  for (let y = 0; y < 30; y += 0.6) dashes.push(0, -y, 0, 0, -y - 0.35, 0)
  const lgeo = new T.BufferGeometry()
  lgeo.setAttribute('position', new T.BufferAttribute(new Float32Array(dashes), 3))
  const linea = new T.LineSegments(
    lgeo,
    new T.LineBasicMaterial({ color: '#ff4d4d', depthTest: false, transparent: true }),
  )
  linea.renderOrder = 70
  const anillo = new T.Mesh(
    new T.RingGeometry(0.42, 0.5, 40),
    new T.MeshBasicMaterial({
      color: '#ff4d4d',
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      side: T.DoubleSide,
    }),
  )
  anillo.rotation.x = -Math.PI / 2
  anillo.renderOrder = 70
  lf.add(linea, anillo)
  lf.traverse((o) => (o.raycast = () => {}))
  sc.add(lf)
  let lfOn = false

  function actualizarLinea() {
    if (!lfOn) return (lf.visible = false)
    const e = elevador()
    if (!e) return (lf.visible = false)
    const piso = e.fondo > PISO ? PISO : 0
    lf.visible = true
    lf.position.set(e.x, e.fondo, e.z)
    linea.scale.y = 1
    lgeo.setDrawRange(0, Math.max(2, Math.ceil((e.fondo - piso) / 0.6) * 2))
    anillo.position.set(0, piso - e.fondo + 0.03, 0)
  }

  // ───────── fases ─────────
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)
  const lerp = (a, b, k) => a + (b - a) * k
  let p = 0
  let playing = false
  let tPrev = 0
  let est = null
  const hAbajo = () => PISO + 0.9 - offset // elevador justo sobre el piso
  const hArriba = () => Math.min(25, PISO + 0.05 + LARGO - offset) // pie del tiro apenas sobre el piso

  function set(v) {
    if (offset === null) medirOffset()
    if (!est) est = estiba()
    p = Math.max(0, Math.min(1, v))
    const hA = hAbajo()
    const hB = hArriba()
    let h
    let estado
    tiro.visible = true
    const e0 = elevador() || { x: 0, z: 0 }
    if (p < 0.15) {
      const k = ease(p / 0.15)
      h = lerp(H0, hA, k)
      estado = 'El elevador baja al piso de trabajo'
      tiro.position.set(e0.x, hA + offset, e0.z) // el tiro asoma de la boca de pozo, esperando
      tiro.rotation.set(0, 0, 0)
    } else if (p < 0.55) {
      const k = ease((p - 0.15) / 0.4)
      h = lerp(hA, hB, k)
      estado = 'Sacando el tiro: carga suspendida'
    } else if (p < 0.8) {
      const k = ease((p - 0.55) / 0.25)
      h = hB
      estado = 'Estibando el tiro en el peine'
      const top = new T.Vector3(lerp(e0.x, est.x, k), hB + offset, lerp(e0.z, est.z, k))
      const pie = new T.Vector3(
        lerp(e0.x, est.x, k * k),
        lerp(hB + offset - LARGO, est.piso, k),
        lerp(e0.z, est.z, k * k),
      )
      colocarEntre(top, pie)
    } else {
      const k = ease((p - 0.8) / 0.2)
      h = lerp(hB, H0, k)
      estado = 'El aparejo vuelve vacío'
    }
    alto(h)
    if (p >= 0.15 && p < 0.55) {
      sc.updateMatrixWorld(true)
      const e = elevador()
      tiro.position.set(e.x, e.fondo, e.z)
      tiro.rotation.set(0, 0, 0)
    }
    actualizarLinea()
    rotulo.textContent = `${estado} · ${Math.round(p * 100)} %`
    rango.value = String(Math.round(p * 1000))
    if (R.renderer) R.renderer.shadowMap.needsUpdate = true
    if (R.invalidate) R.invalidate()
  }
  const up = new T.Vector3(0, 1, 0)
  const q = new T.Quaternion()
  function colocarEntre(top, pie) {
    const dir = top.clone().sub(pie)
    const L = dir.length()
    q.setFromUnitVectors(up, dir.normalize())
    tiro.quaternion.copy(q)
    tiro.position.copy(top)
    tiro.scale.y = L / LARGO
  }

  function frame(t) {
    if (!playing) return
    const dt = tPrev ? t - tPrev : 16
    tPrev = t
    set(p + dt / DUR)
    if (p >= 1) return stop(true)
    requestAnimationFrame(frame)
  }
  function play() {
    if (p >= 1) p = 0
    playing = true
    tPrev = 0
    btnPlay.textContent = 'Pausar maniobra'
    btnPlay.setAttribute('aria-pressed', 'true')
    if (FX) FX.anim('maniobra', true)
    requestAnimationFrame(frame)
  }
  function stop(fin) {
    playing = false
    btnPlay.textContent = 'Maniobra: sacar un tiro'
    btnPlay.setAttribute('aria-pressed', 'false')
    if (FX) FX.anim('maniobra', false)
    if (fin === true) {
      tiro.scale.y = 1
      rotulo.textContent = 'Tiro estibado · maniobra terminada (ilustrativa)'
    }
  }
  function reset() {
    stop()
    p = 0
    tiro.visible = false
    tiro.scale.y = 1
    alto(H0)
    rotulo.textContent = 'Maniobra ilustrativa: no es procedimiento ni cálculo'
    actualizarLinea()
    if (R.invalidate) R.invalidate()
  }
  function lineaFuego(on) {
    lfOn = !!on
    btnLf.setAttribute('aria-pressed', String(lfOn))
    actualizarLinea()
    if (R.invalidate) R.invalidate()
  }
  // la línea acompaña también al deslizador manual del aparejo
  hoist.addEventListener('input', () => {
    if (!playing) {
      sc.updateMatrixWorld(true)
      actualizarLinea()
    }
  })

  // ───────── UI (menú Animar) ─────────
  const ui = document.createElement('div')
  ui.id = 'maniobra-ctl'
  ui.style.cssText =
    'display:flex;flex-direction:column;gap:4px;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.1)'
  const btnPlay = document.createElement('button')
  btnPlay.className = 'btn'
  btnPlay.id = 'c-maniobra'
  btnPlay.type = 'button'
  btnPlay.textContent = 'Maniobra: sacar un tiro'
  btnPlay.setAttribute('aria-pressed', 'false')
  btnPlay.addEventListener('click', () => (playing ? stop() : play()))
  const rango = document.createElement('input')
  rango.type = 'range'
  rango.min = '0'
  rango.max = '1000'
  rango.value = '0'
  rango.setAttribute('aria-label', 'Avance de la maniobra')
  rango.addEventListener('input', () => {
    stop()
    set(Number(rango.value) / 1000)
  })
  const fila = document.createElement('div')
  fila.style.cssText = 'display:flex;gap:4px'
  const btnReset = document.createElement('button')
  btnReset.className = 'btn'
  btnReset.type = 'button'
  btnReset.textContent = 'Reiniciar'
  btnReset.addEventListener('click', reset)
  const btnLf = document.createElement('button')
  btnLf.className = 'btn'
  btnLf.id = 'c-linea-fuego'
  btnLf.type = 'button'
  btnLf.textContent = 'Línea de fuego'
  btnLf.title = 'Proyección vertical de la carga suspendida (ilustrativa, no es zona de exclusión)'
  btnLf.setAttribute('aria-pressed', 'false')
  btnLf.addEventListener('click', () => lineaFuego(!lfOn))
  fila.append(btnReset, btnLf)
  const rotulo = document.createElement('div')
  rotulo.style.cssText = 'font-size:11px;opacity:.8'
  rotulo.textContent = 'Maniobra ilustrativa: no es procedimiento ni cálculo'
  ui.append(btnPlay, rango, fila, rotulo)
  if (window.__rigToolbar && typeof window.__rigToolbar.add === 'function')
    window.__rigToolbar.add('animar', ui)

  document.addEventListener('rig:mode', (e) => {
    if (e.detail === 'qhse' || e.detail === 'operation') lineaFuego(true)
    else if (e.detail === 'explore') lineaFuego(false)
  })

  window.__rigManiobra = {
    play,
    stop,
    set,
    reset,
    lineaFuego,
    estado: () => ({ p, playing, offset, linea: lf.visible, tiro: tiro.visible, largo: LARGO }),
  }
})
