/*
 * 65-toolbar-menus.js — barra de opciones agrupada en 4 menús desplegables (Vista · Capas · Animar · Montaje · Medición · Exportar).
 *
 * Reemplaza la mezcla plana de la cabecera + la barra #cadbar de 3 filas por UNA sola fila:
 *   [Vista ▾] [Capas ▾] [Medición ▾] [Exportar ▾] [Reset]   …   [Ocultar opciones]
 * Los controles existentes se MUEVEN (no se clonan) a cada panel: el bundle enlazó sus manejadores por id al
 * arrancar y siguen funcionando. Ver `MENUS` para el reparto.
 *
 * Accesibilidad: cada menú es un botón con aria-haspopup / aria-expanded / aria-controls; Escape cierra y devuelve el
 * foco, clic fuera cierra, ↓/↑ abren y recorren, ←/→ cambian de menú, Tab sale del panel y lo cierra.
 * Relevancia por modo (solo UX): un punto en el botón marca los menús más útiles del modo actual
 * (body.v2-mode-*); nada se deshabilita. En EXPLORAR (modo libre) no hay puntos: solo aparecen cuando distinguen algo.
 * Menú Vista: los presets de cámara son selección única (aria-pressed sincronizado con .on, relleno dorado); los
 * interruptores (Ortográfica, Vista nocturna, Vista CAD) se muestran con un switch a la derecha, no con relleno.
 *
 * API mínima para otros módulos: window.__rigToolbar = { add(menuId, node), closeAll() }.
 */
window.__rigExt.onPost(() => {
  const $ = (id) => document.getElementById(id)
  const header = document.querySelector('header')
  if (!header) return

  const svg = (paths) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
  const CHEVRON = svg('<path d="m6 9 6 6 6-6"/>').replace('<svg ', '<svg class="tm-chev" ')

  // Reparto de controles. Cada entrada es un id (nodo existente) o un grupo { row: [ids] } que comparte fila.
  const MENUS = [
    {
      id: 'vista',
      label: 'Vista',
      icon: svg(
        '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
      ),
      items: ['views', 'c-ortho', 'c-night'],
    },
    {
      id: 'capas',
      label: 'Capas',
      icon: svg(
        '<path d="m12 2 10 5-10 5L2 7l10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
      ),
      items: [
        't-labels',
        't-zones',
        'c-drops',
        { row: ['t-explode', 'explode', 'explode-val'] },
        'c-wire',
      ],
    },
    {
      id: 'animar',
      label: 'Animar',
      icon: svg('<path d="M6 4v16l13-8Z"/>'),
      items: [{ row: ['c-play', 'hoist', 'hoist-out'] }],
    },
    {
      id: 'montaje',
      label: 'Montaje',
      icon: svg('<path d="M4 20h16"/><path d="M6 20V8l6-4 6 4v12"/><path d="M10 20v-6h4v6"/>'),
      items: [], // los módulos 76 (secuencia) y 81 (izamiento) agregan su contenido con __rigToolbar.add
    },
    {
      id: 'medicion',
      label: 'Medición',
      icon: svg(
        '<path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0L2.7 16.7a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z"/><path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2"/>',
      ),
      items: ['c-dims', 'c-measure', 'c-clear', { row: ['c-cut', 'cut-pos'] }, 'c-isolate'],
    },
    {
      id: 'exportar',
      label: 'Exportar',
      icon: svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
      items: ['c-png', 'c-glb', 'c-info'],
    },
  ]
  // Acciones puntuales: al activarlas el panel se cierra (los interruptores lo dejan abierto para combinar varios).
  const CLOSE_ON = new Set(['c-png', 'c-glb', 'c-info', 'c-clear', 'c-measure'])
  const isViewButton = (el) => !!el.closest('#views') && el.matches('button')

  // Relevancia por modo (UX solamente).
  const MODE_NAME = {
    explore: 'Explorar',
    operation: 'Operación',
    qhse: 'QHSE',
    training: 'Entrenamiento',
  }
  const RELEVANT = {
    explore: [],
    operation: ['vista', 'animar', 'montaje', 'medicion'],
    qhse: ['capas', 'vista'],
    training: ['capas', 'vista'],
  }

  const style = document.createElement('style')
  style.id = 'toolbar-menus-style'
  style.textContent = `
    #v2-toolbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
    .tm-wrap{position:relative;display:flex}
    .tm-btn{gap:7px;padding:0 8px 0 10px}
    .tm-btn > svg{width:15px;height:15px;flex:none}
    .tm-btn .tm-chev{width:13px;height:13px;opacity:.65;transition:transform .15s}
    .tm-btn[aria-expanded="true"]{background:rgba(255,255,255,.09);border-color:#DAAE45;color:#fff}
    .tm-btn[aria-expanded="true"] .tm-chev{transform:rotate(180deg)}
    .tm-dot{width:6px;height:6px;border-radius:50%;background:#E8B746;box-shadow:0 0 6px rgba(232,183,70,.65);flex:none;margin-left:-2px}
    .tm-dot[hidden]{display:none}
    .tm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
    .tm-sep{width:1px;height:20px;background:rgba(255,255,255,.12);margin:0 2px;flex:none}
    .tm-pop{position:fixed;z-index:40;min-width:250px;max-width:calc(100vw - 16px);overflow:auto;padding:8px;
      display:flex;flex-direction:column;gap:4px;border:1px solid #303B4B;border-radius:8px;
      background:rgba(16,22,32,.985);box-shadow:0 14px 40px rgba(0,0,0,.55)}
    .tm-pop[hidden]{display:none!important}
    .tm-pop:focus{outline:none}
    .tm-pop .btn{width:100%;justify-content:flex-start;height:32px;font-size:12px}
    #v2-toolbar .tm-pop #views{flex-direction:column;align-items:stretch;gap:4px;padding:0;background:none;border:0}
    #v2-toolbar .tm-pop #views .btn{padding:0 11px;background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.10)}
    #v2-toolbar .tm-pop #views .btn:hover{background:rgba(255,255,255,.08);border-color:#DAAE45}
    #v2-toolbar .tm-pop #views .btn.on{background:#665021;border-color:#B8943E;color:#FFF3CB}
    .tm-hr{height:1px;background:#2C3747;margin:4px 0;flex:none}
    .tm-row{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center}
    .tm-row > .btn{grid-column:1/-1}
    .tm-row > input[type=range]{width:100%;margin:8px 0 10px}
    .tm-row > input[type=range]:last-child{grid-column:1/-1}
    .tm-row > .mono{min-width:42px}
    /* Interruptores del menú Vista: switch a la derecha (el relleno dorado queda para el preset de cámara elegido). */
    #v2-toolbar #tm-pop-vista > .btn[aria-pressed]{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.10);color:inherit;gap:10px}
    #v2-toolbar #tm-pop-vista > .btn[aria-pressed]:hover{background:rgba(255,255,255,.08)}
    #v2-toolbar #tm-pop-vista > .btn[aria-pressed]::after{content:'';margin-left:auto;flex:none;width:28px;height:16px;border-radius:8px;
      background:radial-gradient(circle at 8px 50%,#AEB9C7 5px,transparent 5.5px),#273141;box-shadow:inset 0 0 0 1px #46536A}
    #v2-toolbar #tm-pop-vista > .btn[aria-pressed="true"]::after{background:radial-gradient(circle at 20px 50%,#1A1405 5px,transparent 5.5px),#DFB64B;box-shadow:none}
    #v2-toolbar .btn{font-size:12px}
    @media (max-width:700px){#v2-toolbar .tm-btn{padding:0 6px 0 8px;gap:5px;height:30px}#v2-toolbar .tm-btn > svg:first-child{display:none}}
  `
  document.head.appendChild(style)

  const toolbar = document.createElement('div')
  toolbar.id = 'v2-toolbar'
  toolbar.setAttribute('role', 'toolbar')
  toolbar.setAttribute('aria-label', 'Opciones del visor')

  const menus = {}
  const focusables = (pop) =>
    [...pop.querySelectorAll('button, input, select, [tabindex]')].filter(
      (el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length,
    )

  for (const def of MENUS) {
    const wrap = document.createElement('div')
    wrap.className = 'tm-wrap'
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn tm-btn'
    btn.id = `tm-btn-${def.id}`
    btn.setAttribute('aria-haspopup', 'dialog')
    btn.setAttribute('aria-expanded', 'false')
    btn.setAttribute('aria-controls', `tm-pop-${def.id}`)
    btn.setAttribute('aria-describedby', `tm-desc-${def.id}`)
    btn.innerHTML = `${def.icon}<span>${def.label}</span><i class="tm-dot" hidden aria-hidden="true"></i>${CHEVRON}`
    const pop = document.createElement('div')
    pop.className = 'tm-pop'
    pop.id = `tm-pop-${def.id}`
    pop.hidden = true
    pop.tabIndex = -1
    pop.setAttribute('role', 'dialog')
    pop.setAttribute('aria-label', def.label)
    const desc = document.createElement('span')
    desc.className = 'tm-sr'
    desc.id = `tm-desc-${def.id}`
    wrap.append(btn, pop, desc)
    toolbar.appendChild(wrap)
    menus[def.id] = { def, wrap, btn, pop, dot: btn.querySelector('.tm-dot'), desc }
  }

  // ───────── mover los controles existentes (sin clonar) ─────────
  const moved = new Set()
  const take = (id) => {
    const el = $(id)
    if (!el || moved.has(el)) return null
    moved.add(el)
    return el
  }
  for (const def of MENUS) {
    const { pop } = menus[def.id]
    for (const item of def.items) {
      if (typeof item === 'string') {
        const el = take(item)
        if (el) pop.appendChild(el)
        if (item === 'c-ortho' && el)
          pop.insertBefore(Object.assign(document.createElement('div'), { className: 'tm-hr' }), el)
      } else {
        const els = item.row.map(take).filter(Boolean)
        if (!els.length) continue
        const row = document.createElement('div')
        row.className = 'tm-row'
        row.append(...els)
        pop.appendChild(row)
      }
    }
  }
  // Separador entre los interruptores de Capas y el despiece.
  const capasPop = menus.capas.pop
  const explodeRow = capasPop.querySelector('.tm-row')
  if (explodeRow)
    capasPop.insertBefore(
      Object.assign(document.createElement('div'), { className: 'tm-hr' }),
      explodeRow,
    )
  const medPop = menus.medicion.pop
  const cutRow = medPop.querySelector('.tm-row')
  if (cutRow)
    medPop.insertBefore(
      Object.assign(document.createElement('div'), { className: 'tm-hr' }),
      cutRow,
    )

  // Reset queda en la barra (limpia también selección, etiquetas, zonas y despiece: no es solo de vista).
  const reset = $('b-reset')
  if (reset) {
    const sep = Object.assign(document.createElement('span'), { className: 'tm-sep' })
    sep.setAttribute('aria-hidden', 'true')
    toolbar.appendChild(sep)
    toolbar.appendChild(reset)
  }

  header.insertBefore(toolbar, $('opts-toggle') || null)

  // Controles sueltos que otro módulo haya dejado en las barras viejas: a "Capas" (no se pierde ninguno).
  const sweep = () => {
    const boxes = [
      ...header.querySelectorAll(':scope > .group'),
      ...($('cadbar') ? [$('cadbar')] : []),
    ]
    for (const box of boxes)
      for (const el of box.querySelectorAll('button, input, select, output')) {
        if (moved.has(el) || el.closest('#v2-toolbar') || el.id === 'opts-toggle') continue
        moved.add(el)
        menus.capas.pop.appendChild(el)
      }
  }
  sweep()

  // ───────── abrir / cerrar / posicionar ─────────
  let openId = null
  const place = (m) => {
    const r = m.btn.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight
    m.pop.style.maxHeight = `${Math.max(120, vh - r.bottom - 14)}px`
    m.pop.style.top = `${Math.round(r.bottom + 6)}px`
    const w = m.pop.offsetWidth
    m.pop.style.left = `${Math.round(Math.max(8, Math.min(r.left, vw - w - 8)))}px`
  }
  const close = (id, { focus = false } = {}) => {
    const m = menus[id]
    if (!m || m.pop.hidden) return
    m.pop.hidden = true
    m.btn.setAttribute('aria-expanded', 'false')
    if (openId === id) openId = null
    if (focus) m.btn.focus()
  }
  const closeAll = (opts) => Object.keys(menus).forEach((id) => close(id, opts))
  const open = (id, focusWhich) => {
    const m = menus[id]
    if (!m) return
    for (const other of Object.keys(menus)) if (other !== id) close(other)
    sweep()
    m.pop.hidden = false
    m.btn.setAttribute('aria-expanded', 'true')
    openId = id
    place(m)
    if (focusWhich) {
      const list = focusables(m.pop)
      const target = focusWhich === 'last' ? list[list.length - 1] : list[0]
      ;(target || m.pop).focus()
    }
  }
  const toggle = (id) => (menus[id].pop.hidden ? open(id) : close(id))

  // Los interruptores dejan abierto el panel; las acciones puntuales lo cierran y devuelven el foco al botón
  // ANTES de que el visor actúe (captura), para que el diálogo de Referencia lo restaure al cerrarse.
  for (const m of Object.values(menus)) {
    m.pop.addEventListener(
      'click',
      (e) => {
        const b = e.target.closest('button')
        if (b && (CLOSE_ON.has(b.id) || isViewButton(b))) close(m.def.id, { focus: true })
      },
      true,
    )
    m.btn.addEventListener('click', () => toggle(m.def.id))
  }

  // ───────── teclado ─────────
  const barItems = () => [...toolbar.querySelectorAll('.tm-btn, #b-reset')]
  toolbar.addEventListener('keydown', (e) => {
    const t = e.target
    const trigger = t.closest?.('.tm-btn')
    if (!trigger || e.altKey || e.ctrlKey || e.metaKey) return
    const id = trigger.id.replace('tm-btn-', '')
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      open(id, e.key === 'ArrowDown' ? 'first' : 'last')
    } else if (
      e.key === 'ArrowRight' ||
      e.key === 'ArrowLeft' ||
      e.key === 'Home' ||
      e.key === 'End'
    ) {
      const list = barItems()
      const i = list.indexOf(trigger)
      let n = i
      if (e.key === 'ArrowRight') n = (i + 1) % list.length
      else if (e.key === 'ArrowLeft') n = (i - 1 + list.length) % list.length
      else n = e.key === 'Home' ? 0 : list.length - 1
      e.preventDefault()
      const wasOpen = openId !== null
      list[n].focus()
      if (wasOpen) {
        closeAll()
        if (list[n].classList.contains('tm-btn')) open(list[n].id.replace('tm-btn-', ''))
      }
    }
  })
  for (const m of Object.values(menus)) {
    m.pop.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target
      const list = focusables(m.pop)
      const i = list.indexOf(t)
      const onRange = t.matches?.('input[type=range]')
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !onRange) {
        e.preventDefault()
        const step = e.key === 'ArrowDown' ? 1 : -1
        list[(i + step + list.length) % list.length]?.focus()
      } else if ((e.key === 'Home' || e.key === 'End') && !onRange) {
        e.preventDefault()
        list[e.key === 'Home' ? 0 : list.length - 1]?.focus()
      } else if (e.key === 'Tab') {
        // Tab saliendo del panel (último ↹ o ⇧↹ desde el primero): se cierra.
        setTimeout(() => {
          if (openId === m.def.id && !m.wrap.contains(document.activeElement)) close(m.def.id)
        }, 0)
      }
    })
  }
  // Escape: cierra el menú y devuelve el foco (sin deseleccionar el componente, que es lo que haría el visor).
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape' || openId === null) return
      e.preventDefault()
      e.stopPropagation()
      close(openId, { focus: true })
    },
    true,
  )
  // Clic fuera y foco fuera.
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (openId !== null && !menus[openId].wrap.contains(e.target)) close(openId)
    },
    true,
  )
  document.addEventListener('focusin', (e) => {
    if (openId !== null && !menus[openId].wrap.contains(e.target)) close(openId)
  })
  window.addEventListener('resize', () => openId !== null && place(menus[openId]))
  window.addEventListener('blur', () => closeAll())

  // ───────── relevancia por modo + "Ocultar opciones" ─────────
  const updateRelevance = () => {
    const m = /\bv2-mode-(\w+)/.exec(document.body.className)
    const mode = m && RELEVANT[m[1]] ? m[1] : 'explore'
    for (const menu of Object.values(menus)) {
      const rec = RELEVANT[mode].includes(menu.def.id)
      menu.dot.hidden = !rec
      const text = rec ? `Recomendado en modo ${MODE_NAME[mode]}` : ''
      menu.desc.textContent = text
      menu.btn.title = rec ? `${menu.def.label} · ${text}` : menu.def.label
      menu.btn.toggleAttribute('data-recommended', rec)
    }
  }
  new MutationObserver(() => {
    updateRelevance()
    if (document.body.classList.contains('opts-hidden')) closeAll()
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] })
  updateRelevance()

  // Presets de cámara (selección única): aria-pressed sigue a la clase .on que pone el visor.
  const syncViews = () =>
    document
      .querySelectorAll('#views button')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.classList.contains('on'))))
  const views = $('views')
  if (views) {
    new MutationObserver(syncViews).observe(views, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    })
    syncViews()
  }

  window.__rigToolbar = {
    add(menuId, node) {
      const m = menus[menuId]
      if (m && node) {
        moved.add(node)
        m.pop.appendChild(node)
      }
    },
    closeAll,
  }
})
