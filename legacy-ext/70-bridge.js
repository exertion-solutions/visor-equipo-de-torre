/*
 * 70-bridge.js — puente postMessage entre la app DIGITAL RIG (padre) y el visor V2 (iframe).
 *
 * El iframe corre con sandbox="allow-scripts allow-downloads" (sin allow-same-origin): su origen es
 * opaco, por eso se publica al padre con targetOrigin '*' y solo se aceptan mensajes cuyo
 * `event.source === window.parent`. Todo mensaje es un objeto con `type` que empieza por `rig:`.
 * Lo mal formado se ignora en silencio; los ids se validan contra listas blancas. Nunca lanza.
 *
 *   app → visor
 *     rig:setMode   { mode: 'explore'|'operation'|'qhse'|'training' }   (reaplica el preset del modo)
 *     rig:setView   { view: 'iso'|'front'|'side'|'top'|'well' }
 *     rig:setLayers { layers: string[] }   conjunto exacto (ver 10-layers.js); se aplica DESPUÉS del preset
 *     rig:ping      {}                     → el visor responde rig:ready + rig:state (+ rig:select)
 *   visor → app
 *     rig:ready  { version: 1 }            visor arrancado (window.__rig + capa de producto listos)
 *     rig:state  { mode, view, layers }    tras ready y cada vez que cambia modo, vista o capas
 *     rig:select { id: string|null, name?, grade?: 'A'|'B'|'C', status? }   al cambiar el componente seleccionado
 *
 * `grade` y `status` salen de la tabla META de la capa de producto (expuesta como window.__RIG_META
 * por un parche de build-legacy.mjs); sin entrada se usa lo mismo que el visor: 'C' / 'Aproximado'.
 * No agrega datos: solo reenvía lo que el visor ya sabe.
 */
;(() => {
  const VERSION = 1
  const MODES = ['explore', 'operation', 'qhse', 'training']
  const VIEWS = ['iso', 'front', 'side', 'top', 'well']
  const GRADES = ['A', 'B', 'C']
  const LAYER_BUTTONS = ['t-zones', 'c-dims', 't-labels', 'c-wire', 't-explode', 'c-drops']

  let R = null
  let booted = !!window.__rigBooted
  let started = false
  let lastState = ''
  let lastSelected
  const inFrame = window.parent && window.parent !== window

  function post(msg) {
    if (!inFrame) return
    try {
      window.parent.postMessage(msg, '*')
    } catch (e) {
      console.error('[70-bridge] postMessage', e)
    }
  }

  const layerApi = () => window.__rigLayers
  const modeApi = () => window.__rigMode

  function currentMode() {
    const m = modeApi()
    if (m && typeof m.get === 'function' && MODES.includes(m.get())) return m.get()
    const hit = /\bv2-mode-(\w+)/.exec(document.body.className)
    return hit && MODES.includes(hit[1]) ? hit[1] : 'explore'
  }

  function currentView() {
    const on = document.querySelector('#views button.on[data-view]')
    const v = on && on.dataset.view
    return VIEWS.includes(v) ? v : null
  }

  function readState() {
    const L = layerApi()
    return { mode: currentMode(), view: currentView(), layers: L ? L.get() : [] }
  }

  function sendState(force) {
    const s = readState()
    const key = JSON.stringify(s)
    if (!force && key === lastState) return
    lastState = key
    post({ type: 'rig:state', mode: s.mode, view: s.view, layers: s.layers })
  }

  function sendSelect(force) {
    const id = (R && R.state && R.state.selected) || null
    if (!force && id === lastSelected) return
    lastSelected = id
    if (!id) return post({ type: 'rig:select', id: null })
    const msg = { type: 'rig:select', id: String(id) }
    const comp = R.COMPONENTS && R.COMPONENTS[id]
    if (comp && typeof comp.name === 'string') msg.name = comp.name
    const meta = (window.__RIG_META && window.__RIG_META[id]) || null
    const grade = meta && GRADES.includes(meta.grade) ? meta.grade : 'C'
    const status = meta && typeof meta.status === 'string' ? meta.status : 'Aproximado'
    msg.grade = grade
    msg.status = status
    post(msg)
  }

  function sendReady() {
    post({ type: 'rig:ready', version: VERSION })
    sendState(true)
    sendSelect(true)
  }

  function onMessage(e) {
    try {
      if (e.source !== window.parent) return
      const d = e.data
      if (!d || typeof d !== 'object' || typeof d.type !== 'string') return
      if (!started) return // aún no arrancó: la app debe esperar a rig:ready
      switch (d.type) {
        case 'rig:setMode': {
          if (typeof d.mode !== 'string' || !MODES.includes(d.mode)) return
          const m = modeApi()
          if (m) m.set(d.mode)
          break
        }
        case 'rig:setView': {
          if (typeof d.view !== 'string' || !VIEWS.includes(d.view)) return
          for (const b of document.querySelectorAll('#views button[data-view]'))
            if (b.dataset.view === d.view) b.click()
          break
        }
        case 'rig:setLayers': {
          if (!Array.isArray(d.layers)) return
          const L = layerApi()
          if (L) L.apply(d.layers.filter((x) => typeof x === 'string'))
          break
        }
        case 'rig:ping':
          sendReady()
          return
        default:
          return
      }
      sendState(false)
      sendSelect(false)
    } catch (err) {
      console.error('[70-bridge]', err)
    }
  }

  const relevant = (t) =>
    t === document.body ||
    (t.id && LAYER_BUTTONS.includes(t.id)) ||
    (t.closest && !!t.closest('#views, #tree-body'))

  function observe() {
    new MutationObserver((records) => {
      try {
        if (!records.some((r) => relevant(r.target))) return
        // El callback corre tras el código síncrono que originó el cambio: el estado ya es el final.
        sendState(false)
        sendSelect(false)
      } catch (err) {
        console.error('[70-bridge]', err)
      }
    }).observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-pressed'],
    })
  }

  function maybeStart() {
    if (started || !R || !booted) return
    started = true
    try {
      observe()
      sendReady()
    } catch (err) {
      console.error('[70-bridge]', err)
    }
  }

  window.addEventListener('message', onMessage)
  document.addEventListener('rig:boot', () => {
    booted = true
    maybeStart()
  })
  window.__rigExt.onPost((rig) => {
    R = rig
    maybeStart()
  })
})()
