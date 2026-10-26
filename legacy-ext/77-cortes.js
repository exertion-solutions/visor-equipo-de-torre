/*
 * 77-cortes.js · cortes Y (altura) y Z (lateral), además del Corte X del visor (menú Medición).
 *
 * Planos de recorte del renderer: Corte Y deja lo que está por debajo de la altura elegida (sirve para ver el piso de
 * trabajo, el BOP o la boca de pozo desde arriba); Corte Z deja el lado −Z del plano. Se combinan con el Corte X.
 * Corte visual, superficies abiertas, sin tapas ni sólidos CAD (igual que el Corte X original).
 * API para pruebas: window.__rigCortes = { y(on, h), z(on, z), planos() }.
 */
window.__rigExt.onPost((R) => {
  const T = R.three
  const ren = R.renderer
  if (!T || !T.Plane || !ren) return
  const planoY = new T.Plane(new T.Vector3(0, -1, 0), 12)
  const planoZ = new T.Plane(new T.Vector3(0, 0, -1), 0)
  const mios = [planoY, planoZ]
  const act = { y: false, z: false }

  function aplicar() {
    const otros = (ren.clippingPlanes || []).filter((p) => !mios.includes(p))
    const extra = []
    if (act.y) extra.push(planoY)
    if (act.z) extra.push(planoZ)
    ren.clippingPlanes = [...otros, ...extra]
    btnY.setAttribute('aria-pressed', String(act.y))
    btnZ.setAttribute('aria-pressed', String(act.z))
    rY.disabled = !act.y
    rZ.disabled = !act.z
    if (R.invalidate) R.invalidate()
  }
  function y(on, h) {
    act.y = !!on
    if (typeof h === 'number') planoY.constant = h
    rY.value = String(planoY.constant)
    aplicar()
  }
  function z(on, v) {
    act.z = !!on
    if (typeof v === 'number') planoZ.constant = v
    rZ.value = String(planoZ.constant)
    aplicar()
  }

  const fila = (btn, rango) => {
    const d = document.createElement('div')
    d.style.cssText = 'display:flex;flex-direction:column;gap:3px;margin-top:4px'
    d.append(btn, rango)
    return d
  }
  const mkBtn = (id, txt) => {
    const b = document.createElement('button')
    b.className = 'btn'
    b.id = id
    b.type = 'button'
    b.textContent = txt
    b.setAttribute('aria-pressed', 'false')
    return b
  }
  const mkRango = (min, max, val, label) => {
    const r = document.createElement('input')
    r.type = 'range'
    r.min = String(min)
    r.max = String(max)
    r.step = '0.1'
    r.value = String(val)
    r.disabled = true
    r.setAttribute('aria-label', label)
    return r
  }
  const btnY = mkBtn('c-cut-y', 'Corte Y (altura)')
  const btnZ = mkBtn('c-cut-z', 'Corte Z (lateral)')
  const rY = mkRango(0.5, 34, 12, 'Altura del corte Y')
  const rZ = mkRango(-15, 15, 0, 'Posición del corte Z')
  btnY.addEventListener('click', () => y(!act.y))
  btnZ.addEventListener('click', () => z(!act.z))
  rY.addEventListener('input', () => {
    planoY.constant = Number(rY.value)
    if (R.invalidate) R.invalidate()
  })
  rZ.addEventListener('input', () => {
    planoZ.constant = Number(rZ.value)
    if (R.invalidate) R.invalidate()
  })
  if (window.__rigToolbar && typeof window.__rigToolbar.add === 'function') {
    window.__rigToolbar.add('medicion', fila(btnY, rY))
    window.__rigToolbar.add('medicion', fila(btnZ, rZ))
  }
  // el Corte X original reemplaza la lista de planos: se vuelven a agregar los propios
  document.getElementById('c-cut')?.addEventListener('click', () => setTimeout(aplicar, 0))
  document.getElementById('b-reset')?.addEventListener('click', () => {
    act.y = act.z = false
    setTimeout(aplicar, 0)
  })

  window.__rigCortes = { y, z, planos: () => (ren.clippingPlanes || []).length }
})
