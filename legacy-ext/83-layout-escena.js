/*
 * 83-layout-escena.js — la escena del equipo primero: menos cartas, más pantalla.
 *
 *  1. Las cartas laterales (árbol de componentes y "Referencia del conjunto") arrancan COLAPSADAS en cualquier tamaño de ventana
 *     (se reabren con su pestaña o con el botón "Paneles").
 *  2. Los comandos sueltos de la carta de referencia pasaron a la barra: "Vista nocturna" en Vista y "Animar aparejo" + posición del
 *     aparejo en el menú Animar (65-toolbar-menus.js). La secuencia de montaje y el izamiento viven en el menú "Montaje" (65-toolbar-menus.js): ningún panel flotante.
 *  3. MODO ENFOQUE: mientras algo esté activo (un paso del montaje, el izamiento reproduciéndose, la capa CAD, medición, corte, cotas,
 *     malla, despiece, etiquetas o aislamiento) se ocultan TODAS las cartas (árbol, referencia, detalle, aviso de controles, leyenda
 *     de la capa CAD). Quedan la barra de menús y los controles de lo que se está usando. "Paneles" las muestra de nuevo a pedido.
 *     La leyenda de zonas ilustrativas (`#legend`, "SIN VALIDAR") NO se oculta: es obligatoria mientras las zonas estén encendidas.
 *  4. En modo embebido se oculta la barra de estado propia del V2 (la app ya muestra la suya con "no as-built").
 *
 * API para pruebas: `window.__tackerLayout = { focus(), paneles(mostrar) }`.
 */
window.__rigExt.onPost(() => {
  const $ = (id) => document.getElementById(id)
  const body = document.body

  // ───────── 1. cartas colapsadas por defecto ─────────
  const tree = $('tree')
  const treeToggle = $('tree-toggle')
  const card = $('cad-inspector')
  const cardToggle = $('inspector-toggle')
  const colapsar = () => {
    if (tree && treeToggle && !tree.classList.contains('collapsed')) treeToggle.click()
    if (card && cardToggle && !card.classList.contains('collapsed')) cardToggle.click()
  }
  const expandir = () => {
    if (tree && treeToggle && tree.classList.contains('collapsed')) treeToggle.click()
    if (card && cardToggle && card.classList.contains('collapsed')) cardToggle.click()
  }
  const colapsadas = () =>
    (!tree || tree.classList.contains('collapsed')) &&
    (!card || card.classList.contains('collapsed'))
  colapsar()
  // el título "Posición del aparejo" quedó huérfano: su control (Animar + posición) ahora está en el menú Animar
  for (const h of card ? card.querySelectorAll('h2') : [])
    if (/posici/i.test(h.textContent)) h.hidden = true

  // ───────── estilos ─────────
  const style = document.createElement('style')
  style.id = 'layout-escena-style'
  style.textContent = `
    html.v2-embedded #cad-status{display:none!important}
    /* cartas colapsadas: solo queda la pestaña, sin el fondo de la carta */
    #tree.collapsed{height:auto!important;background:transparent!important;border-color:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
    #tree.collapsed #tree-body{display:none!important}
    /* modo enfoque: sin cartas (excepto la leyenda obligatoria de zonas) */
    body.focus-scene:not(.paneles-show) #tree,
    body.focus-scene:not(.paneles-show) #cad-inspector,
    body.focus-scene:not(.paneles-show) #detail,
    body.focus-scene:not(.paneles-show) #hint,
    body.focus-scene:not(.paneles-show) #inspector-toggle{display:none!important}
    #v2-toolbar .tm-tool[aria-pressed="true"]{background:rgba(255,255,255,.09);border-color:#DAAE45;color:#fff}
  `
  document.head.appendChild(style)

  // ───────── 2. botón "Paneles" en la barra ─────────
  const toolbar = $('v2-toolbar')
  const svg = (paths) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:15px;height:15px;flex:none">${paths}</svg>`
  const tool = (id, label, icon, title) => {
    const b = document.createElement('button')
    b.className = 'btn tm-btn tm-tool'
    b.id = id
    b.type = 'button'
    b.setAttribute('aria-pressed', 'false')
    b.title = title
    b.innerHTML = icon + `<span>${label}</span>`
    if (toolbar) toolbar.appendChild(b)
    return b
  }
  const bPaneles = tool(
    'c-paneles',
    'Paneles',
    svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'),
    'Mostrar u ocultar las cartas laterales (componentes y referencia)',
  )

  // ───────── 3. modo enfoque ─────────
  const ACTIVABLES = [
    'c-measure',
    'c-cut',
    'c-dims',
    'c-wire',
    't-explode',
    't-labels',
    'c-isolate',
  ]
  let seqActivo = false
  const activo = () => {
    if (seqActivo) return true
    if (body.classList.contains('erect-playing')) return true
    return ACTIVABLES.some((id) => {
      const b = $(id)
      return !!b && (b.classList.contains('on') || b.getAttribute('aria-pressed') === 'true')
    })
  }
  const actualizar = () => {
    const on = activo()
    if (body.classList.contains('focus-scene') !== on) body.classList.toggle('focus-scene', on)
    if (!on && body.classList.contains('paneles-show')) body.classList.remove('paneles-show') // solo si hay algo que quitar: remove() siempre escribe el atributo y el observador se dispararía en bucle
    bPaneles.setAttribute(
      'aria-pressed',
      String(on ? body.classList.contains('paneles-show') : !colapsadas()),
    )
  }
  document.addEventListener('tacker:seq-step', (e) => {
    seqActivo = e.detail > 0
    actualizar()
  })
  const obs = new MutationObserver(actualizar)
  for (const id of ACTIVABLES) {
    const b = $(id)
    if (b) obs.observe(b, { attributes: true, attributeFilter: ['class', 'aria-pressed'] })
  }
  obs.observe(body, { attributes: true, attributeFilter: ['class'] }) // erect-playing
  queueMicrotask(actualizar)

  // ───────── botón Paneles ─────────
  bPaneles.addEventListener('click', () => {
    if (body.classList.contains('focus-scene')) {
      body.classList.toggle('paneles-show')
    } else if (colapsadas()) {
      expandir()
    } else {
      colapsar()
    }
    actualizar()
  })
  for (const t of [treeToggle, cardToggle])
    t?.addEventListener('click', () => setTimeout(actualizar, 350))

  window.__tackerLayout = {
    focus: () => body.classList.contains('focus-scene'),
    paneles: (mostrar) => {
      if (body.classList.contains('focus-scene')) body.classList.toggle('paneles-show', !!mostrar)
      else if (mostrar) expandir()
      else colapsar()
      actualizar()
    },
  }
  actualizar()
})
