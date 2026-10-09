/*
 * 77-capa-cad.js — CAPA CAD (referencia dimensional) sobre el visor V2.
 *
 * Dibuja encima del modelo procedural la geometría CAD verificada (cad/ → src/data/cad/capa-cad.json → window.__TACKER_CAD):
 * huella del carrier, piso de trabajo, huellas del layout TKR-10 y las barras de la celosía del mástil. Sirve para ver dónde el
 * V2 coincide con las cotas documentadas y dónde no (p. ej. el piso: 3 m en el folleto, 2,30 m en el V2).
 *
 * NO reemplaza nada ni es as-built: confianza C, malla semitransparente y aristas. El mástil es ILUSTRATIVO (ancho, paneles y
 * diámetros sin plano del fabricante) y se ubica sobre el eje del mástil del V2 (`R.mast`), no sobre una posición documentada.
 *
 * Además, los ítems `grupo: 'sk575'` (cad/sk575/capa.py) son el modelo SK-575 de referencia, uno por componente, anclados en el
 * mundo con la base documentada (origen boca de pozo, carrier −X, Y arriba): permiten comparar el V2 procedural con las cotas
 * del relevamiento. Simplificado (piezas esbeltas como ejes, medianas como cajas) y tampoco es as-built.
 *
 * Botón "Capa CAD" en el menú Capas. API para pruebas: `window.__tackerCad = { on, off, toggle, isOn, items }`.
 */
window.__rigExt.onPost((R) => {
  const D = window.__TACKER_CAD
  if (!D || !Array.isArray(D.items) || !R.scene || !R.three) return
  const T = R.three
  const FloatAttr = new T.BoxGeometry(1, 1, 1).attributes.position.constructor
  const invalidate = () => {
    if (typeof R.invalidate === 'function') R.invalidate()
  }

  const toF32 = (arr) => new Float32Array(arr)

  /** Aristas: bordes de un solo triángulo o con ángulo entre caras > ~25°. Devuelve posiciones de segmentos. */
  function aristas(pos, idx) {
    const key = (i, j) => (i < j ? i + '_' + j : j + '_' + i)
    const normal = (a, b, c) => {
      const ux = pos[b * 3] - pos[a * 3],
        uy = pos[b * 3 + 1] - pos[a * 3 + 1],
        uz = pos[b * 3 + 2] - pos[a * 3 + 2]
      const vx = pos[c * 3] - pos[a * 3],
        vy = pos[c * 3 + 1] - pos[a * 3 + 1],
        vz = pos[c * 3 + 2] - pos[a * 3 + 2]
      const nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz,
        nz = ux * vy - uy * vx
      const l = Math.hypot(nx, ny, nz) || 1
      return [nx / l, ny / l, nz / l]
    }
    const edges = new Map()
    for (let t = 0; t < idx.length; t += 3) {
      const n = normal(idx[t], idx[t + 1], idx[t + 2])
      for (let e = 0; e < 3; e++) {
        const i = idx[t + e],
          j = idx[t + ((e + 1) % 3)]
        const k = key(i, j)
        const cur = edges.get(k)
        if (cur) cur.n2 = n
        else edges.set(k, { i, j, n1: n, n2: null })
      }
    }
    const out = []
    for (const { i, j, n1, n2 } of edges.values()) {
      const filo = !n2 || n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2] < 0.9
      if (!filo) continue
      out.push(
        pos[i * 3],
        pos[i * 3 + 1],
        pos[i * 3 + 2],
        pos[j * 3],
        pos[j * 3 + 1],
        pos[j * 3 + 2],
      )
    }
    return out
  }

  function segmentos(posiciones, color, opacity) {
    const g = new T.BufferGeometry()
    g.setAttribute('position', new FloatAttr(toF32(posiciones), 3))
    const mat = new T.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
    const l = new T.Line(g, mat)
    l.isLineSegments = true // three elige gl.LINES por esta marca: así una sola Line dibuja N segmentos sueltos
    l.renderOrder = 10
    l.frustumCulled = false
    return l
  }

  function malla(t, colorBase) {
    const g = new T.BufferGeometry()
    g.setAttribute('position', new FloatAttr(toF32(t.p), 3))
    g.setIndex(t.i)
    const mat = new T.MeshBasicMaterial({
      color: t.color || colorBase,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: T.DoubleSide,
    })
    const m = new T.Mesh(g, mat)
    m.renderOrder = 9
    m.frustumCulled = false
    const grupo = new T.Group()
    grupo.add(m)
    grupo.add(segmentos(aristas(t.p, t.i), t.color || colorBase, 0.95))
    return grupo
  }

  const root = new T.Group()
  root.name = 'capa_cad'
  root.visible = false
  root.userData = { role: 'HELPER' } // fuera de los 13 componentes: ni seleccionable ni en R.pickables
  const usados = []
  for (const it of D.items) {
    const g = new T.Group()
    g.name = 'cad_' + it.id
    for (const t of it.tris || []) g.add(malla(t, it.color))
    for (const l of it.lineas || []) g.add(segmentos(l.p, l.color || it.color, 0.9))
    if (it.ancla === 'mastil') {
      const m = R.mast
      if (!m) continue // sin eje del mástil del V2 no hay dónde ubicarlo: no se inventa
      g.position.set(m.bx, m.by, 0)
      g.rotation.z = -m.a
    }
    root.add(g)
    usados.push(it)
  }
  R.scene.add(root)

  // ───────── UI: botón en el menú Capas + tarjeta de leyenda ─────────
  const style = document.createElement('style')
  style.id = 'cad-layer-style'
  style.textContent = `
    #cad-card{position:fixed;left:16px;bottom:44px;z-index:19;width:min(330px,calc(100vw - 32px));padding:10px 12px;border-radius:12px;
      background:rgba(20,27,38,.95);border:1px solid #303B4B;color:#DDE3EC;font-size:12px;line-height:1.4;box-shadow:0 10px 30px rgba(0,0,0,.45)}
    #cad-card summary{cursor:pointer;color:#DDBB65;list-style:none}
    #cad-card summary::-webkit-details-marker{display:none}
    #cad-card .row{display:flex;gap:8px;align-items:flex-start;margin:4px 0}
    #cad-card .sw{flex:none;width:11px;height:11px;border-radius:3px;margin-top:2px;border:1px solid rgba(255,255,255,.35)}
    #cad-card .tag{font-size:10.5px;opacity:.75}
    #cad-card .grp{margin:8px 0 2px;color:#DDBB65;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
    #cad-card .lst{max-height:min(46vh,360px);overflow:auto}
    #cad-card .warn{margin-top:6px;color:#E0B870;font-size:11px}
    body.opts-hidden #cad-card{display:none}
  `
  document.head.appendChild(style)

  const card = document.createElement('aside')
  card.id = 'cad-card'
  card.hidden = true
  card.setAttribute('aria-label', 'Leyenda de la capa CAD')
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    )
  const fila = (it, conFuente) =>
    `<div class="row"><span class="sw" style="background:${esc(it.color)}"></span><div>${esc(it.nombre)}<div class="tag">${esc(it.estado)}${conFuente ? ' · ' + esc(it.fuente) : ''}</div></div></div>`
  const sk = usados.filter((it) => it.grupo === 'sk575')
  const base = usados.filter((it) => it.grupo !== 'sk575')
  card.innerHTML =
    '<details><summary><b>Capa CAD · referencia dimensional</b> <span class="tag">confianza ' +
    esc(D.confianza) +
    ' · no as-built</span></summary><div class="lst">' +
    '<div class="grp">Cotas verificadas</div>' +
    base.map((it) => fila(it, true)).join('') +
    (sk.length
      ? '<div class="grp">Modelo SK-575 de referencia (por componente)</div>' +
        sk.map((it) => fila(it, false)).join('') +
        `<div class="tag">${esc(sk[0].fuente)}</div>`
      : '') +
    `</div><div class="warn">${esc(D.aviso)} El mástil ilustrativo se apoya en el eje del V2; el modelo SK-575 se ancla en el mundo con su base documentada (boca de pozo en el origen, carrier hacia −X).</div></details>`
  document.body.appendChild(card)

  const btn = document.createElement('button')
  btn.className = 'btn'
  btn.id = 'c-cad'
  btn.type = 'button'
  btn.textContent = 'Capa CAD'
  btn.title =
    'Superpone la geometría CAD verificada (carrier, piso, layout, mástil ilustrativo) y el modelo SK-575 de referencia sobre el modelo'
  btn.setAttribute('aria-pressed', 'false')
  if (window.__rigToolbar && typeof window.__rigToolbar.add === 'function')
    window.__rigToolbar.add('capas', btn)
  else document.querySelector('header')?.appendChild(btn)

  function set(on) {
    root.visible = !!on
    card.hidden = !on
    btn.setAttribute('aria-pressed', String(!!on))
    btn.classList.toggle('on', !!on)
    invalidate()
  }
  btn.addEventListener('click', () => set(!root.visible))

  window.__tackerCad = {
    on: () => set(true),
    off: () => set(false),
    toggle: () => set(!root.visible),
    isOn: () => root.visible,
    items: usados.map((i) => i.id),
  }
})
