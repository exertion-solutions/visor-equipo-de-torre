/*
 * 91-enlaces.js · enlaces que abren el visor en un componente o en un sector.
 *
 *   ?comp=<id>  selecciona y enfoca el componente (ids de window.__rig.COMPONENTS: bop, mastil, llave…)
 *   ?vp=<id>    vuela a la vista "Ir a equipo" (ids de window.__RIG_VIEWPOINTS: piso-enganche, bomba…)
 * Con los dos, manda `vp`. Ids desconocidos se ignoran. La app pasa estos parámetros al iframe.
 *
 * Botón "Copiar enlace a esta vista" (menú Exportar): arma el enlace con el componente seleccionado y/o el sector actual.
 *   - Embebido: envía `rig:link { comp, vp }` a la app, que actualiza su URL y la copia.
 *   - Directo: copia la URL de esta página con los parámetros.
 * API para pruebas: window.__rigLink = { aplicar(params), actual() }.
 */
window.__rigExt.onPost((R) => {
  const ID = /^[a-z0-9-]{1,40}$/
  const inFrame = window.parent && window.parent !== window
  const vpApi = () => window.__rigVp
  const esComp = (id) => !!(id && ID.test(id) && R.COMPONENTS && R.COMPONENTS[id])
  const esVp = (id) =>
    !!(
      id &&
      ID.test(id) &&
      vpApi() &&
      vpApi()
        .list()
        .some((v) => v.id === id)
    )

  function aplicar(params) {
    const comp = params.get('comp')
    const vp = params.get('vp')
    if (esVp(vp)) return vpApi().go(vp) ? 'vp' : null
    if (esComp(comp)) {
      R.selectComponent(comp)
      if (typeof R.focusOn === 'function') R.focusOn(comp)
      return 'comp'
    }
    return null
  }

  function actual() {
    const comp = R.state && R.state.selected
    const vp = vpApi() && vpApi().current()
    return { comp: esComp(comp) ? comp : null, vp: esVp(vp) ? vp : null }
  }

  const params = new URLSearchParams(location.search)
  const arrancar = () =>
    // después de los presets de modo (75) y de que la app aplique modo/vista/capas
    setTimeout(() => {
      try {
        aplicar(params)
      } catch (e) {
        console.error('[91-enlaces]', e)
      }
    }, 600)
  if (params.has('comp') || params.has('vp')) {
    if (window.__rigBooted) arrancar()
    else document.addEventListener('rig:boot', arrancar, { once: true })
  }

  const btn = document.createElement('button')
  btn.className = 'btn'
  btn.id = 'c-link'
  btn.type = 'button'
  btn.textContent = 'Copiar enlace a esta vista'
  btn.title =
    'Enlace que abre el visor en el componente seleccionado o en el sector actual de "Ir a equipo"'
  const avisar = (t) => {
    btn.textContent = t
    setTimeout(() => (btn.textContent = 'Copiar enlace a esta vista'), 2200)
  }
  btn.addEventListener('click', async () => {
    const a = actual()
    if (inFrame) {
      window.parent.postMessage({ type: 'rig:link', comp: a.comp, vp: a.vp }, '*')
      return avisar('Enlace copiado')
    }
    const u = new URL(location.href)
    for (const k of ['comp', 'vp', 'embedded']) u.searchParams.delete(k)
    if (a.vp) u.searchParams.set('vp', a.vp)
    else if (a.comp) u.searchParams.set('comp', a.comp)
    try {
      await navigator.clipboard.writeText(u.toString())
      avisar('Enlace copiado')
    } catch {
      window.prompt('Copiá el enlace:', u.toString())
    }
  })
  if (window.__rigToolbar && typeof window.__rigToolbar.add === 'function')
    window.__rigToolbar.add('exportar', btn)
  else document.querySelector('header')?.appendChild(btn)

  window.__rigLink = { aplicar: (p) => aplicar(new URLSearchParams(p)), actual }
})
