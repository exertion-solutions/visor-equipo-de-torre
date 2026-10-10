/*
 * 85-vista-cad.js — preset "Vista CAD": deja el V2 como el visor CAD de referencia (~/cad/tacker10/tacker10.html, skill
 * `equipo-3d`): solo el modelo SK-575, sin entorno de locación ni grilla, cámara en perspectiva y vista nocturna, desde la
 * vista "General" de ese HTML. Es un preset de PRESENTACIÓN: no cambia datos ni geometría.
 *
 * Reusa los botones existentes (#c-ortho, #c-night, capas de 10-layers.js) y el modelo de 84-modelo-sk575.js. Apagarlo
 * restaura lo que había antes (entorno, grilla, proyección, noche). Botón en el menú Vista. API: `window.__tackerVistaCad`.
 */
window.__rigExt.onPost((R) => {
  if (!R.scene || typeof R.camera !== 'function') return
  const $ = (id) => document.getElementById(id)
  const isOn = (b) =>
    !!b && (b.classList.contains('on') || b.getAttribute('aria-pressed') === 'true')
  const invalidate = () => typeof R.invalidate === 'function' && R.invalidate()
  // Vista "General" de tacker10.html, pasada al marco del V2 (origen en la boca de pozo: x − 1,80 m).
  const CAM = [28.2, 14, 45]
  const TARGET = [-5.8, 10, 6]

  const ocultables = () =>
    R.scene.children.filter((o) => o.name === 'locacion_entorno' || o.type === 'GridHelper')
  let previo = null

  function set(on) {
    on = !!on
    if (on === !!previo) return
    if (on) {
      previo = {
        ortho: isOn($('c-ortho')),
        night: isOn($('c-night')),
        sk575: !!window.__tackerSk575?.isOn(),
        layers: window.__tackerLayers?.get() ?? [],
        vis: ocultables().map((o) => [o, o.visible]),
      }
      window.__tackerSk575?.on()
      window.__tackerLayers?.apply([])
      if (previo.ortho) $('c-ortho')?.click()
      if (!previo.night) $('c-night')?.click()
      for (const o of ocultables()) o.visible = false
      const cam = R.camera()
      cam.position.set(...CAM)
      const ctl = typeof R.controls === 'function' ? R.controls() : null
      if (ctl) {
        ctl.target.set(...TARGET)
        ctl.update()
      } else cam.lookAt(...TARGET)
    } else {
      const p = previo
      for (const [o, v] of p.vis) o.visible = v
      if (isOn($('c-ortho')) !== p.ortho) $('c-ortho')?.click()
      if (isOn($('c-night')) !== p.night) $('c-night')?.click()
      if (!p.sk575) window.__tackerSk575?.off()
      window.__tackerLayers?.apply(p.layers)
    }
    previo = on ? previo : null
    btn.setAttribute('aria-pressed', String(on))
    btn.classList.toggle('on', on)
    invalidate()
  }

  const btn = document.createElement('button')
  btn.className = 'btn'
  btn.id = 'c-vista-cad'
  btn.type = 'button'
  btn.textContent = 'Vista CAD'
  btn.title =
    'Como el visor CAD de referencia: solo el modelo SK-575, sin entorno ni grilla, perspectiva y vista nocturna'
  btn.setAttribute('aria-pressed', 'false')
  btn.addEventListener('click', () => set(!previo))
  if (window.__rigToolbar && typeof window.__rigToolbar.add === 'function')
    window.__rigToolbar.add('vista', btn)
  else document.querySelector('header')?.appendChild(btn)

  window.__tackerVistaCad = { on: () => set(true), off: () => set(false), isOn: () => !!previo }
})
