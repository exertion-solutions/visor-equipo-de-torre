/*
 * 74-vr.js · "Entrar en VR" (WebXR, visores tipo Quest con navegador). Menú Vista.
 *
 * El botón aparece solo si el navegador ofrece sesiones 'immersive-vr'. Al entrar:
 *  - pasa a cámara en perspectiva (la VR no admite ortográfica);
 *  - ubica al usuario en el sector actual de "Ir a equipo" (o en el acceso a la locación) con un espacio de referencia
 *    desplazado ('local-floor'): la altura de ojos la pone el visor real, el piso es la cota del sector;
 *  - renderiza en bucle mientras dura la sesión (el visor normal renderiza a demanda).
 * Sin controles de desplazamiento: el usuario mira y camina en su espacio físico. Probado solo con el emulador del
 * navegador; requiere verificación en un visor real.
 */
window.__rigExt.onPost((R) => {
  const ren = R.renderer
  if (!ren || !ren.xr || !navigator.xr || !window.XRRigidTransform) return
  let sesion = null

  const btn = document.createElement('button')
  btn.className = 'btn'
  btn.id = 'c-vr'
  btn.type = 'button'
  btn.textContent = 'Entrar en VR'
  btn.hidden = true

  async function entrar() {
    if (sesion) return sesion.end()
    try {
      if (R.view && R.view.ortho) document.getElementById('c-ortho')?.click()
      const s = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor'],
      })
      ren.xr.enabled = true
      ren.xr.setReferenceSpaceType('local-floor')
      await ren.xr.setSession(s)
      // ubicación: sector actual de "Ir a equipo" o acceso; cota del piso del sector
      const D = window.__RIG_VIEWPOINTS
      const vp = window.__rigVp
      const id = (vp && vp.current()) || 'acceso'
      const v = D && D.viewpoints.find((x) => x.id === id)
      const cota = v && D.pisos[v.piso] ? D.pisos[v.piso].cota : 0
      const [x, , z] = v ? v.camPos : [-26, 0, -24]
      const base = ren.xr.getReferenceSpace()
      if (base)
        ren.xr.setReferenceSpace(
          base.getOffsetReferenceSpace(new XRRigidTransform({ x: -x, y: -cota, z: -z })),
        )
      ren.setAnimationLoop(() => ren.render(R.scene, R.camera()))
      sesion = s
      btn.textContent = 'Salir de VR'
      s.addEventListener('end', () => {
        sesion = null
        ren.setAnimationLoop(null)
        ren.xr.enabled = false
        btn.textContent = 'Entrar en VR'
        if (R.invalidate) R.invalidate()
      })
    } catch (e) {
      console.warn('[74-vr] no se pudo iniciar la sesión VR:', e && e.message)
      btn.textContent = 'VR no disponible'
      setTimeout(() => (btn.textContent = 'Entrar en VR'), 2500)
    }
  }
  btn.addEventListener('click', entrar)
  if (window.__rigToolbar && typeof window.__rigToolbar.add === 'function')
    window.__rigToolbar.add('vista', btn)

  navigator.xr
    .isSessionSupported('immersive-vr')
    .then((ok) => (btn.hidden = !ok))
    .catch(() => {})
  window.__rigVr = { disponible: () => !btn.hidden, activa: () => !!sesion }
})
