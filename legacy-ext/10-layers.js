/*
 * 10-layers.js — API programática de las capas del visor V2: `window.__rigLayers`.
 *
 *   ids            → ['zonas','cotas','etiquetas','malla','despiece','drops']
 *   get()          → ids de las capas encendidas (en el orden de `ids`)
 *   set(id, on)    → enciende/apaga UNA capa (el resto queda como está)
 *   apply(ids)     → conjunto EXACTO: las de `ids` encendidas y todas las demás apagadas
 *
 * Cada capa es un botón existente del visor (llevan la lógica real: cotas, malla, zonas, etc.):
 * se acciona con `.click()` y el estado se lee de la clase `on` / `aria-pressed`. Este módulo no
 * duplica lógica ni inventa datos: solo ordena los clics para que el resultado sea determinista.
 *
 *   zonas → #t-zones · cotas → #c-dims · etiquetas → #t-labels · malla → #c-wire
 *   despiece → #t-explode · drops → #c-drops (lo crea 50-drops-layer.js; se busca al usar).
 *
 * Particularidades del bundle que este orden respeta:
 *  - "Cotas" (y "Medir") se niegan a actuar mientras haya despiece (`state.explode > 0`), tanto para
 *    encender como para apagar; el despiece se anima, así que tras apagarlo hay unos frames con
 *    explode > 0. Al cambiar cotas se fuerza `setExplode(0)` (sin animación) para que el clic no
 *    sea rechazado.
 *  - Las zonas solo se ven con explode === 0 (el visor lo resuelve solo en cada frame), pero el
 *    botón conserva su estado `on`: por eso `despiece` se enciende siempre AL FINAL de `apply`.
 *  - Cambiar cotas con despiece activo exige "desarmar" y volver a armar: apply lo hace solo.
 */
;(() => {
  const IDS = ['zonas', 'cotas', 'etiquetas', 'malla', 'despiece', 'drops']
  const BUTTON = {
    zonas: 't-zones',
    cotas: 'c-dims',
    etiquetas: 't-labels',
    malla: 'c-wire',
    despiece: 't-explode',
    drops: 'c-drops',
  }
  const btn = (id) => document.getElementById(BUTTON[id])
  const isOn = (id) => {
    const b = btn(id)
    return !!b && (b.classList.contains('on') || b.getAttribute('aria-pressed') === 'true')
  }
  const click = (id) => {
    const b = btn(id)
    if (b) b.click()
  }
  const rig = () => window.__rig || null

  /** Sanea la entrada: solo ids conocidos, sin repetidos. Ignora todo lo demás. */
  const clean = (list) => (Array.isArray(list) ? IDS.filter((id) => list.includes(id)) : [])

  function get() {
    return IDS.filter(isOn)
  }

  function apply(list) {
    const want = new Set(clean(list))
    const R = rig()
    const explodeNow = () => (R && R.state ? Number(R.state.explode) || 0 : 0)

    // 1) Despiece fuera primero si molesta: se apaga, o hay que cambiar cotas (el botón de cotas se niega
    //    a actuar —para encender Y para apagar— mientras haya despiece).
    const cotasChange = want.has('cotas') !== isOn('cotas')
    if (isOn('despiece') && (!want.has('despiece') || cotasChange)) click('despiece')
    if (cotasChange && explodeNow() > 0 && R && typeof R.setExplode === 'function') {
      if (R.state) R.state.explodeTarget = 0
      R.setExplode(0)
    }

    // 2) Resto de capas, en orden fijo.
    for (const id of IDS) {
      if (id === 'despiece') continue
      if (isOn(id) !== want.has(id)) click(id)
    }

    // 3) Despiece al final (las zonas / cotas ya quedaron fijadas con el conjunto armado).
    if (want.has('despiece') && !isOn('despiece')) click('despiece')

    return get()
  }

  function set(id, on) {
    if (!IDS.includes(id)) return get()
    const next = new Set(get())
    if (on) next.add(id)
    else next.delete(id)
    return apply([...next])
  }

  window.__rigLayers = { ids: IDS.slice(), get, set, apply }
})()
