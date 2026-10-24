/*
 * 60-ui-controls.js — ajustes de interfaz del visor V2.
 *  1. Elimina el cartel de modo inferior (#v2-hud: "EXPLORAR · Inspección libre…").
 *  2. Botón "Ocultar opciones" / "Mostrar opciones" en la cabecera: oculta la barra de menús (65-toolbar-menus.js)
 *     y la barra de modos para dejar la escena libre.
 *  3. La card "Referencia del conjunto" (#cad-inspector) se oculta deslizándose hacia la derecha con su propia
 *     pestaña (chevron), sin depender de "Ocultar opciones".
 *  4. Modo embebido (?embedded, iframe de la app): se oculta el bloque de título propio (la app ya tiene cabecera)
 *     y la cabecera se compacta. Standalone conserva el título.
 *  5. Ventana chica (< 1100 px de ancho): el árbol de componentes y la card de referencia arrancan colapsados
 *     (solo el valor inicial: el usuario puede reabrirlos).
 *  6. El aviso de controles (#hint) se atenúa mientras algún panel lo tape (detalle, selección, referencia, leyenda…).
 *     La ficha #v2-selection (confiabilidad A/B/C) se integra DENTRO del panel de detalle (#detail), entre la descripción
 *     y las acciones Enfocar/Volver: así las dos cards de la derecha nunca se superponen, a ningún tamaño.
 *  7. Despiece: la perilla y la etiqueta coinciden mientras está apagado (0 / "0 %"); al activarlo despieza al valor
 *     recordado (60 % por defecto), como antes.
 *  8. (sin uso: la base ya no trae foto de referencia)
 *  9. Accesibilidad y legibilidad: un único anillo de foco dorado (--focus) para todo el visor, piso de 12 px en la barra de
 *     estado y de 11 px en metadatos, y `prefers-reduced-motion` anula transiciones y animaciones CSS.
 * 10. Métricas de desarrollo (triángulos, llamadas de dibujo) solo con `?debug`: sin él, la barra de estado dice "13 conjuntos".
 * 11. Tablet y móvil (≤ 1050 px): cabecera de dos filas (título + "Ocultar opciones"; menús en una fila con scroll
 *     horizontal). En móvil (≤ 700 px) "Ocultar opciones" queda solo con ícono y se oculta el subtítulo.
 * No toca el estado del visor: solo CSS + botones. Sin persistencia (el iframe corre en origen opaco).
 */
window.__rigExt.onPost(() => {
  const $ = (id) => document.getElementById(id)
  const embedded = new URLSearchParams(location.search).has('embedded')
  const smallWindow = window.innerWidth < 1100
  const debug = new URLSearchParams(location.search).has('debug')
  if (embedded) document.documentElement.classList.add('v2-embedded')
  if (debug) document.documentElement.classList.add('debug')

  const style = document.createElement('style')
  style.id = 'ui-controls-style'
  style.textContent = `
    #v2-hud{display:none!important}
    body.opts-hidden header .group,
    body.opts-hidden #cadbar,
    body.opts-hidden #v2-toolbar,
    body.opts-hidden #v2-modebar{display:none!important}
    /* La barra de 3 filas (#cadbar) y los grupos sueltos de la cabecera pasaron a los menús de 65-toolbar-menus.js. */
    #cadbar,header > .group{display:none!important}
    /* La cabecera queda por encima del escenario para que los menús desplegables no queden tapados. */
    header{position:relative;z-index:30}
    header.glass{-webkit-backdrop-filter:none;backdrop-filter:none}
    html.v2-embedded header .title{display:none!important}
    html.v2-embedded header{padding:6px 12px!important;gap:6px 12px!important}
    /* La ficha de selección (#v2-selection) vive dentro del panel de detalle (#detail), en el flujo normal:
       no flota sobre la escena ni sobre otras cards. El !important gana a la regla original que la oculta en ≤700 px. */
    #detail #v2-selection{position:static;right:auto;bottom:auto;width:auto;margin:0 18px 12px;padding:10px 12px;
      box-shadow:none;background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.1);flex:none;max-height:38%;overflow:auto}
    #detail #v2-selection.show{display:block!important}
    #hint{transition:opacity .15s}
    #hint.hint-covered{opacity:0;visibility:hidden}
    #cad-inspector{display:none!important;transition:transform .3s cubic-bezier(.16,1,.3,1)} /* tarjeta "Referencia del conjunto" retirada a pedido del usuario (2026-10-11) */
    #cad-inspector.collapsed{transform:translateX(calc(100% + 14px))}
    #cad-inspector.collapsed > :not(#inspector-toggle){visibility:hidden;transition:visibility 0s .3s}
    #inspector-toggle{position:absolute;left:-38px;top:0;width:30px;height:30px;display:grid;place-items:center;
      padding:0;border-radius:8px;background:rgba(20,27,38,.95);border:1px solid #303B4B;color:#DDBB65;cursor:pointer}
    #inspector-toggle:hover{background:rgba(40,52,70,.98)}
    #inspector-toggle svg{width:15px;height:15px;transition:transform .3s}
    #cad-inspector.collapsed #inspector-toggle svg{transform:rotate(180deg)}
    #opts-toggle{margin-left:auto;display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 11px;
      border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);
      color:inherit;font:inherit;font-size:13px;cursor:pointer;flex:none}
    #opts-toggle:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18)}
    #opts-toggle svg{width:15px;height:15px;flex:none;transition:transform .2s}
    body.opts-hidden #opts-toggle svg{transform:rotate(180deg)}
    /* Un solo anillo de foco, dorado (paleta del visor), para todos los controles: reemplaza al violeta del bundle. */
    :root{--focus:#DFB64B}
    :where(button,input,select,a,summary,[tabindex]):focus-visible{outline:2px solid var(--focus)!important;outline-offset:2px!important;box-shadow:none!important}
    /* Piso tipográfico: barra de estado 12 px (lleva el aviso "dimensiones aproximadas"), metadatos 11 px. */
    #cad-status,#cad-status *{font-size:12px!important}
    .title span{font-size:11px!important}
    #v2-modebar button{font:600 12px/1 Arial,Helvetica,sans-serif!important;letter-spacing:0!important;text-transform:none!important}
    #hint{font:12px/1.45 Arial,Helvetica,sans-serif!important;color:#C9D2DE!important;background:rgba(16,23,33,.9);padding:5px 9px;border-radius:6px}
    /* Métricas de desarrollo solo con ?debug. */
    html:not(.debug) #tris,html:not(.debug) #hint br{display:none!important}
    /* Tablet y móvil: título + "Ocultar opciones" en la 1.ª fila; los menús en UNA fila desplazable (sin 3.ª fila). */
    @media (max-width:1050px){
      header{flex-wrap:wrap!important;row-gap:6px!important}
      header .title{width:auto!important;flex:1 1 auto;min-width:0}
      #opts-toggle{order:1}
      #v2-toolbar{order:2;flex:1 1 100%;flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none}
      #v2-toolbar::-webkit-scrollbar{display:none}
      #v2-toolbar > *{flex:none}
    }
    /* Móvil: sin subtítulo, "Ocultar opciones" solo ícono (el texto queda para lectores), controles de 30 px; la barra de
       estado deja el aviso y el conteo (la proyección ya se ve en el menú Vista) para no crecer a 3 líneas con el piso de 12 px. */
    @media (max-width:700px){
      header .title span{display:none!important}
      #opts-toggle{height:30px;padding:0 9px}
      #opts-toggle span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
      #cad-status > span:first-child{display:none}
      #cad-status{line-height:1.25}
    }
    @media (prefers-reduced-motion:reduce){
      *,*::before,*::after{transition-duration:0s!important;animation-duration:0s!important;animation-iteration-count:1!important;scroll-behavior:auto!important}
    }
  `
  document.head.appendChild(style)

  // ───────── árbol de componentes: colapsado por defecto en ventanas chicas ─────────
  // Se usa el propio botón del visor (así también actualiza la posición de #legend).
  const tree = $('tree')
  const treeToggle = $('tree-toggle')
  if (smallWindow && tree && treeToggle && !tree.classList.contains('collapsed')) treeToggle.click()

  // ───────── card de referencia: pestaña propia, colapsada por defecto en ventanas chicas ─────────
  const card = $('cad-inspector')
  if (card) {
    const tab = document.createElement('button')
    tab.id = 'inspector-toggle'
    tab.type = 'button'
    tab.setAttribute('aria-controls', 'cad-inspector')
    tab.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'
    const setCollapsed = (collapsed) => {
      card.classList.toggle('collapsed', collapsed)
      tab.setAttribute('aria-expanded', String(!collapsed))
      const name = collapsed ? 'Mostrar referencia del conjunto' : 'Ocultar referencia del conjunto'
      tab.setAttribute('aria-label', name)
      tab.title = name
    }
    tab.addEventListener('click', () => setCollapsed(!card.classList.contains('collapsed')))
    card.appendChild(tab)
    setCollapsed(smallWindow)
  }

  // ───────── despiece: perilla y etiqueta coherentes mientras está apagado ─────────
  const tExplode = $('t-explode')
  const explode = $('explode')
  if (tExplode && explode) {
    const DEFAULT_EXPLODE = 60
    let remembered = Number(explode.value) > 0 ? Number(explode.value) : DEFAULT_EXPLODE
    const setKnob = (v) => {
      explode.value = String(v)
      explode.style.setProperty('--p', explode.value + '%')
    }
    setKnob(0) // apagado: perilla en 0, igual que la etiqueta "0 %"
    explode.addEventListener('input', () => {
      if (Number(explode.value) > 0) remembered = Number(explode.value)
    })
    // Fase de captura: corre ANTES del manejador del visor, que al activar lee `explode.value / 100`.
    tExplode.addEventListener(
      'click',
      () => setKnob(tExplode.classList.contains('on') ? 0 : remembered),
      true,
    )
    // Reset también apaga el despiece (sin tocar la perilla): se vuelve a 0.
    $('b-reset')?.addEventListener('click', () => setKnob(0), true)
  }

  // ───────── aviso de controles (#hint): nunca tapado por los paneles ─────────
  const hint = $('hint')
  const stage = $('stage')
  if (hint && stage) {
    const COVERS = [
      'tree',
      'detail',
      'cad-inspector',
      'v2-qhse',
      'legend',
      'cad-status',
      'vp-panel',
    ]
    const overlaps = (a, b) =>
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
    const updateHint = () => {
      const h = hint.getBoundingClientRect()
      if (!h.width) return
      const covered = COVERS.some((id) => {
        const el = $(id)
        if (!el) return false
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || Number(cs.opacity) < 0.05) return false
        return overlaps(h, el.getBoundingClientRect())
      })
      hint.classList.toggle('hint-covered', covered)
    }
    const schedule = () => {
      setTimeout(updateHint, 0)
      setTimeout(updateHint, 380) // tras la animación de los paneles (.3 s)
    }
    const mo = new MutationObserver(schedule)
    const watched = new Set()
    const attach = () => {
      for (const id of COVERS) {
        const el = $(id)
        if (el && !watched.has(el)) {
          watched.add(el)
          mo.observe(el, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] })
        }
      }
    }
    // La ficha #v2-selection la crea el módulo de producto un instante después: se muda al panel de detalle.
    const adoptSelection = () => {
      const sel = $('v2-selection')
      const detail = $('detail')
      const actions = detail?.querySelector('.d-actions')
      if (sel && actions && sel.parentElement !== detail) detail.insertBefore(sel, actions)
    }
    adoptSelection()
    attach()
    // #v2-selection y #v2-qhse los crea el módulo de producto un instante después: se enganchan al aparecer.
    new MutationObserver(() => {
      adoptSelection()
      attach()
      schedule()
    }).observe(stage, { childList: true })
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    stage.addEventListener('transitionend', updateHint)
    window.addEventListener('resize', schedule)
    schedule()
  }

  // ───────── barra de estado: sin "N llamadas" (draw calls) salvo con ?debug ─────────
  // El bundle reescribe #cad-health cada 10 cuadros con "13 conjuntos · N llamadas": se recorta la métrica.
  const health = $('cad-health')
  if (health && !debug) {
    const trim = () => {
      const t = health.textContent.replace(/\s*·\s*[\d.]+\s*llamadas/, '')
      if (t !== health.textContent) health.textContent = t
    }
    new MutationObserver(trim).observe(health, {
      childList: true,
      characterData: true,
      subtree: true,
    })
    trim()
  }

  // ───────── botón "Ocultar opciones" ─────────
  const header = document.querySelector('header')
  if (!header) return

  const btn = document.createElement('button')
  btn.id = 'opts-toggle'
  btn.type = 'button'
  btn.setAttribute('aria-controls', 'v2-toolbar')
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg><span></span>'
  const label = btn.querySelector('span')

  const apply = (hidden) => {
    document.body.classList.toggle('opts-hidden', hidden)
    btn.setAttribute('aria-expanded', String(!hidden))
    label.textContent = hidden ? 'Mostrar opciones' : 'Ocultar opciones'
    // El escenario cambia de alto: el visor recalcula el tamaño del canvas con 'resize'.
    window.dispatchEvent(new Event('resize'))
  }
  btn.addEventListener('click', () => apply(!document.body.classList.contains('opts-hidden')))
  header.appendChild(btn)
  apply(false)
})
