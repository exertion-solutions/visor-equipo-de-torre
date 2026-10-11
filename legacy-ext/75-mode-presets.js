/*
 * 75-mode-presets.js — los 4 modos del visor V2 cambian de forma visible el estado de las capas.
 *
 * PRESETS VISUALES: reutilizan capas y componentes que YA existen en el visor. Son una ayuda de lectura,
 * NO afirmaciones de ingeniería: no agregan datos, medidas, distancias ni requisitos. Cada preset define
 * el conjunto COMPLETO de capas (estado determinista) y limpia lo que dejó el modo anterior
 * (medición, selección, aislamiento por componentes).
 *
 *   EXPLORAR     capas: ninguna · todos los componentes visibles · vista isométrica.
 *   OPERACIÓN    capas: cotas · solo aparejo + malacate visibles (el resto oculto, con el árbol de
 *                componentes sincronizado) · la vista no se toca.
 *   QHSE         capas: zonas + drops · todos los componentes visibles. El panel de barreras
 *                (#v2-qhse) lo muestra el CSS del visor con `body.v2-mode-qhse`; la leyenda de zonas
 *                ilustrativas sin validar (#legend) sigue visible mientras "zonas" esté encendida.
 *   ENTRENAMIENTO capas: etiquetas + despiece · todos los componentes visibles.
 *
 * Cuándo se aplican: el parche de build-legacy.mjs envuelve `setMode` del visor y, DESPUÉS de que este
 * termine (incluidos sus propios clics en #t-zones y el modo QHSE de 50-drops-layer), emite el evento
 * `tacker:mode` en `document`. Sirve tanto al `tacker:setMode` (70-bridge.js) como a la barra interna
 * de modos (oculta al embeber, visible en modo autónomo). Al ir después, el preset gana siempre.
 *
 * Barra de modos (#v2-modebar, la crea el bundle): grupo con nombre accesible ("Modo de trabajo") y `aria-pressed` sincronizado
 * con el modo activo en cada `tacker:mode` (la tipografía, 12 px sin mayúsculas espaciadas, está en 60-ui-controls.js).
 *
 * Extras para pruebas: `window.__tackerPresets = { presets, apply(mode) }`.
 */
;(() => {
  const PRESETS = {
    explore: { layers: [], isolate: null, view: 'iso' },
    operation: { layers: ['cotas'], isolate: ['aparejo', 'malacate'], view: null },
    qhse: { layers: ['zonas', 'drops'], isolate: null, view: null },
    training: { layers: ['etiquetas', 'despiece'], isolate: null, view: null },
  }
  const $ = (id) => document.getElementById(id)
  const isOn = (id) => {
    const b = $(id)
    return !!b && b.classList.contains('on')
  }

  function clearLeftovers(R) {
    // Medición: apagar el modo y borrar lo medido.
    if (isOn('c-measure')) $('c-measure').click()
    const clear = $('c-clear')
    if (clear) {
      // "Borrar medición" también escribe un aviso en la barra de estado: se restituye el texto previo.
      const msg = $('cad-message')
      const before = msg ? msg.textContent : null
      clear.click()
      if (msg && before !== null) msg.textContent = before
    }
    // Selección.
    if (R.state && R.state.selected && typeof R.selectComponent === 'function')
      R.selectComponent(null)
    // "Aislar selección" activo: restaura la visibilidad previa (usa la lógica del propio botón).
    if (R.view && R.view.isolated && $('c-isolate')) $('c-isolate').click()
  }

  /** Deja visibles solo `only` (o todos si es null) usando las casillas del árbol de componentes. */
  function setVisibleComponents(R, only) {
    for (const id of Object.keys(R.groups || {})) {
      const want = only ? only.includes(id) : true
      const box = document.querySelector('.item[data-id="' + id + '"] input')
      if (box && box.checked !== want) box.click()
    }
  }

  function apply(mode) {
    const preset = Object.prototype.hasOwnProperty.call(PRESETS, mode) ? PRESETS[mode] : null
    const R = window.__rig
    const L = window.__tackerLayers
    if (!preset || !R || !L) return false
    try {
      clearLeftovers(R)
      setVisibleComponents(R, preset.isolate)
      if (preset.view) {
        const v = document.querySelector('#views button[data-view="' + preset.view + '"]')
        if (v) v.click()
      }
      L.apply(preset.layers)
    } catch (e) {
      console.error('[75-mode-presets]', e)
      return false
    }
    return true
  }

  function syncModebar() {
    const mb = $('v2-modebar')
    if (!mb) return
    mb.setAttribute('role', 'group')
    mb.setAttribute('aria-label', 'Modo de trabajo')
    mb.querySelectorAll('button[data-m]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.classList.contains('on'))),
    )
  }

  document.addEventListener('tacker:mode', (e) => {
    apply(e && e.detail)
    syncModebar()
  })
  document.addEventListener('tacker:boot', syncModebar)
  if (window.__tackerBooted) syncModebar()

  window.__tackerPresets = { presets: PRESETS, apply }
})()
