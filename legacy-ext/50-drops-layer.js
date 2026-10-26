/*
 * Equipo 10 · capa DROPS del visor V2 (legacy) — módulo legacy-ext/50-drops-layer.js
 *
 * Qué hace (todo derivado de `window.__RIG_DROPS`; no inventa radios, alturas ni medidas):
 *   1. Botón "Zonas DROPS" (#c-drops) en la barra INSPECCIÓN. En modo QHSE se activa sola y se
 *      desactiva al salir (si fue automática); el botón conmuta a mano.
 *   2. Tiñe ~35 % la base (`color`) de los materiales de cada componente con el color de la zona
 *      más alta de sus puntos (A2, cualitativa). No toca `emissive` (el visor lo usa al resaltar).
 *   3. Un marcador HTML por sección (nº de puntos + zona ALTO/MEDIO/BAJO/SIN CLASIFICAR),
 *      proyectado cada 2 frames con la cámara activa. Anclaje: geometría etiquetada con
 *      `userData.dropsId`; si no hay, posición cualitativa APROXIMADA del modelo (borde punteado).
 *   4. Panel lateral con los puntos de la sección / del componente seleccionado.
 *   5. Leyenda propia (plegable) en el panel QHSE único de 45-panel-qhse.js (#qp-drops). El aviso "El A2 no define radios ni distancias…" va fuera de lo plegable (#qp-avisos): siempre visible.
 *   6. Al desactivar se restauran colores y se elimina todo el DOM, listeners y el rAF.
 *
 * Contrato de datos: src/data/qhse/rig10-drops.json (schemaVersion 1).
 * Expone `R.drops = { isActive, setActive, openSection, openComponent, anclajes }` (útil para pruebas).
 */
;(() => {
  'use strict'
  if (!window.__rigExt) return

  window.__rigExt.onPost((R) => {
    const DATA = window.__RIG_DROPS
    if (!DATA || !Array.isArray(DATA.points) || !Array.isArray(DATA.sections)) return

    // ───────────────────────── constantes ─────────────────────────
    const ZONE_DEFAULT_COLOR = { alto: '#EF4444', medio: '#F59E0B', bajo: '#22C55E' }
    const ZONE_RANK = { alto: 3, medio: 2, bajo: 1 }
    const NO_ZONE_COLOR = '#9CA3AF'
    const TINT_MIX = 0.35
    const STATUS_LABEL = {
      confirmed: 'Confirmado',
      procedure: 'Procedimiento',
      goodPractice: 'Buena práctica (no obligatoria)',
      pendingValidation: 'Pendiente de validación',
    }
    const REQUIREMENT_STATUS = new Set(['confirmed', 'procedure'])
    const NOTE_APPROX = 'Posición del marcador aproximada (modelo), no as-built.'

    // ───────────────────────── índices de datos ─────────────────────────
    const zonesById = new Map((DATA.zones || []).map((z) => [z.id, z]))
    const sourcesById = new Map((DATA.sources || []).map((s) => [s.id, s]))
    const sections = [...DATA.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const sectionById = new Map(sections.map((s) => [s.id, s]))
    const points = DATA.points
    const pointById = new Map(points.map((p) => [p.id, p]))
    const pointsBySection = new Map()
    const pointsByComponent = new Map()
    for (const p of [...points].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
      if (!pointsBySection.has(p.sectionId)) pointsBySection.set(p.sectionId, [])
      pointsBySection.get(p.sectionId).push(p)
      if (p.componentId) {
        if (!pointsByComponent.has(p.componentId)) pointsByComponent.set(p.componentId, [])
        pointsByComponent.get(p.componentId).push(p)
      }
    }

    /** Zona de un punto: la suya si la declara; si no, la de su sección. */
    const pointZone = (p) => ('zone' in p ? p.zone : sectionById.get(p.sectionId)?.zone) || null
    const zoneColor = (id) => {
      const c = zonesById.get(id)?.color
      return /^#[0-9a-f]{6}$/i.test(c || '') ? c : ZONE_DEFAULT_COLOR[id] || NO_ZONE_COLOR
    }
    const zoneWord = (id) => (id ? String(id).toUpperCase() : 'SIN CLASIFICAR')

    /** Zona más alta por componente (solo componentes con algún punto clasificado). */
    const componentZone = new Map()
    for (const [cid, list] of pointsByComponent) {
      let best = null
      for (const p of list) {
        const z = pointZone(p)
        if (z && ZONE_RANK[z] && (!best || ZONE_RANK[z] > ZONE_RANK[best])) best = z
      }
      if (best) componentZone.set(cid, best)
    }

    // ───────────────────────── utilidades ─────────────────────────
    const $ = (id) => document.getElementById(id)
    const stage = $('stage')
    const cadGroupAnchor = $('cut-pos') || $('c-cut')
    if (!stage || !cadGroupAnchor) return // el visor no tiene la estructura esperada: no hacemos nada

    /** Crea un elemento con texto seguro (textContent): ningún dato del JSON entra como HTML. */
    const h = (tag, cls, text) => {
      const el = document.createElement(tag)
      if (cls) el.className = cls
      if (text != null && text !== '') el.textContent = text
      return el
    }
    const fmtDate = (iso, full) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''))
      return m ? `${m[3]}/${m[2]}/${full ? m[1] : m[1].slice(2)}` : String(iso || '')
    }
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
    const componentName = (id) => R.COMPONENTS?.[id]?.name || id
    /** Pide un frame al visor (render bajo demanda): él escucha `pointermove` sobre #stage. */
    const invalidate = () => stage.dispatchEvent(new Event('pointermove'))

    // ───────────────────────── estado de la capa ─────────────────────────
    let active = false
    let autoActivated = false
    let raf = 0
    let frame = 0
    let inQhse = false
    // DOM (se crea al activar y se elimina al desactivar)
    let styleEl = null
    let markerLayer = null
    let panel = null
    let legend = null
    let legendWarn = null // aviso del A2: fuera de la leyenda plegable, siempre visible
    let markers = [] // { sec, el, w, h, anchor, approx, comps }
    let panelState = null // { kind: 'section'|'component', id, trigger }
    let lastSelected = null
    let anchorsDirty = true
    let wasExploded = false
    let lastHoist = ''
    let sig = null
    let hiddenByExplode = false
    let listeners = []
    const tinted = new Map() // material → color original

    // ───────────────────────── botón #c-drops ─────────────────────────
    const btn = document.createElement('button')
    btn.className = 'btn'
    btn.id = 'c-drops'
    btn.type = 'button'
    btn.textContent = 'Zonas DROPS'
    btn.title = 'Clasificación cualitativa por zona (layout A2) y puntos DROPS'
    btn.setAttribute('aria-pressed', 'false')
    cadGroupAnchor.insertAdjacentElement('afterend', btn)
    btn.addEventListener('click', () => {
      autoActivated = false // decisión manual: manda sobre el modo QHSE
      setActive(!active)
    })

    // ───────────────────────── teñido por zona ─────────────────────────
    function applyTint() {
      const { Color } = R.three
      for (const [cid, zone] of componentZone) {
        const target = new Color(zoneColor(zone))
        for (const mat of R.materials?.[cid] || []) {
          if (!mat || !mat.color) continue
          if (!tinted.has(mat)) tinted.set(mat, mat.color.clone())
          mat.color.copy(tinted.get(mat)).lerp(target, TINT_MIX)
        }
      }
      invalidate()
    }
    function removeTint() {
      for (const [mat, original] of tinted) mat.color.copy(original)
      tinted.clear()
      invalidate()
    }

    // ───────────────────────── anclajes 3D de las secciones ─────────────────────────
    /** Posiciones cualitativas del MODELO (aproximadas) cuando no hay geometría etiquetada. */
    function fallbackAnchor(secId) {
      const { Vector3 } = R.three
      const m = R.mast
      // Punto sobre el eje inclinado del mástil (misma fórmula que `ni` del visor, sin desvío lateral).
      const onMast = (t) =>
        m
          ? new Vector3(m.bx + t * m.scale * Math.sin(m.a), m.by + t * m.scale * Math.cos(m.a), 0)
          : null
      switch (secId) {
        case 'corona':
          return onMast(30.4)
        case 'debajo-corona':
          return onMast(24.5)
        case 'piso-enganche':
          // 20,629 m: piso de enganche a 68 ft (plano del mástil, A, src-plano-mastil). El 18,5 m previo era el boardHeight
          // del V2 procedural (src-legacy-v2): fuente en conflicto registrada en src/data/rigs/rig10.ts.
          return onMast(20.629)
        case 'debajo-piso-enganche':
          return onMast(9)
        case 'boca-pozo':
          return new Vector3(0, 2.4, 0)
        case 'subestructura-carrier':
          return new Vector3(-4, 1.5, 0)
        case 'casilla-maquinista':
          return new Vector3(-5.4, 3.5, 0)
        case 'plano-inclinado':
          return new Vector3(4, 1, -1.35)
        case 'piletas':
          return new Vector3(8, 2, -7.6)
        case 'piso-trabajo':
          return new Vector3(0, 2.6, 1) // junto a boca de pozo, desplazado para no superponerse
        case 'poste-llave':
          return new Vector3(0.8, 3.6, 0)
        default:
          return null
      }
    }

    /** Centroide de los objetos etiquetados con `userData.dropsId` (o null si no hay ninguno). */
    function taggedAnchors() {
      const { Box3, Vector3 } = R.three
      const acc = new Map() // sectionId → { sum, n }
      const box = new Box3()
      const c = new Vector3()
      R.scene.updateMatrixWorld(true)
      R.scene.traverse((o) => {
        const raw = o.userData && o.userData.dropsId
        if (!raw) return
        const ids = Array.isArray(raw) ? raw : String(raw).split(',')
        const secs = new Set()
        for (const id of ids) {
          const key = String(id).trim()
          const sid = pointById.get(key)?.sectionId || (sectionById.has(key) ? key : null)
          if (sid) secs.add(sid)
        }
        if (!secs.size) return
        // La geometría procedural etiquetada quedó oculta (capa 31, 84-modelo-sk575.js) y Box3 ignora capas: un objeto
        // que la cámara no dibuja no ancla marcadores (cae al anclaje cualitativo del modelo). La etiqueta va en el GRUPO
        // `drops_<ID>` (capa 0) y la capa 31 en sus mallas: cuenta solo si alguna malla se dibuja.
        if (!o.layers.isEnabled(0)) return
        let dibuja = false
        o.traverse((x) => (dibuja ||= x.isMesh && x.layers.isEnabled(0)))
        if (!dibuja) return
        box.setFromObject(o)
        if (box.isEmpty()) return
        box.getCenter(c)
        for (const sid of secs) {
          const a = acc.get(sid) || { sum: new Vector3(), n: 0 }
          a.sum.add(c)
          a.n++
          acc.set(sid, a)
        }
      })
      const out = new Map()
      for (const [sid, a] of acc) out.set(sid, a.sum.multiplyScalar(1 / a.n))
      return out
    }

    function computeAnchors() {
      anchorsDirty = false
      const tagged = taggedAnchors()
      for (const m of markers) {
        const t = tagged.get(m.sec.id)
        m.anchor = t || fallbackAnchor(m.sec.id)
        // Siempre aproximado: el dropsId del SK-575 (piso de enganche, 84) ancla la SECCIÓN a la pieza, no cada punto, y
        // ninguna posición del modelo es as-built.
        m.approx = true
        m.el.classList.toggle('approx', m.approx)
        m.el.title = m.approx ? `${m.sec.label} · ${NOTE_APPROX}` : m.sec.label
      }
      sig = null // fuerza reproyección
    }

    // ───────────────────────── marcadores ─────────────────────────
    function buildMarkers() {
      markerLayer = h('div')
      markerLayer.id = 'drops-markers'
      markerLayer.setAttribute('role', 'group')
      markerLayer.setAttribute('aria-label', 'Marcadores DROPS por sección')
      markers = []
      for (const sec of sections) {
        const list = pointsBySection.get(sec.id) || []
        if (!list.length) continue
        const zone = sec.zone && ZONE_RANK[sec.zone] ? sec.zone : null
        const color = zone ? zoneColor(zone) : NO_ZONE_COLOR
        const el = h('button', 'dl-mk')
        el.type = 'button'
        el.style.setProperty('--dl-c', color)
        el.dataset.sec = sec.id
        el.setAttribute(
          'aria-label',
          `${sec.label}: ${plural(list.length, 'punto', 'puntos')} DROPS, ${zone ? 'riesgo ' + zone : 'sin clasificar'}`,
        )
        el.setAttribute('aria-expanded', 'false')
        el.setAttribute('aria-controls', 'drops-panel')
        el.append(h('span', 'dl-mk-n', String(list.length)), h('span', 'dl-mk-z', zoneWord(zone)))
        el.addEventListener('click', () => {
          if (panelState && panelState.kind === 'section' && panelState.id === sec.id)
            closePanel(true)
          else openSection(sec.id, el)
        })
        markerLayer.appendChild(el)
        markers.push({
          sec,
          el,
          w: 0,
          h: 0,
          anchor: null,
          approx: true,
          comps: [...new Set(list.map((p) => p.componentId).filter(Boolean))],
        })
      }
      stage.appendChild(markerLayer)
      for (const m of markers) {
        const r = m.el.getBoundingClientRect() // se mide una vez (antes de ocultar)
        m.w = r.width || 90
        m.h = r.height || 22
      }
    }

    function hideAllMarkers() {
      for (const m of markers) m.el.style.display = 'none'
    }

    /** Proyecta los marcadores como `qd()` del visor; ignora frames en que nada cambió. */
    function projectMarkers() {
      const cam = R.camera()
      if (!cam) return

      // Con despiece los anclajes dejan de valer: se ocultan y se recalculan al volver a 0.
      if (R.state.explode !== 0) {
        wasExploded = true
        if (!hiddenByExplode) {
          hideAllMarkers()
          hiddenByExplode = true
        }
        return
      }
      if (wasExploded || hiddenByExplode) {
        wasExploded = false
        hiddenByExplode = false
        anchorsDirty = true
      }
      // El aparejo se mueve con el deslizador: los anclajes etiquetados se recalculan.
      const hoist = $('hoist')?.value || ''
      if (hoist !== lastHoist) {
        lastHoist = hoist
        anchorsDirty = true
      }
      if (anchorsDirty) computeAnchors()

      const W = stage.clientWidth
      const H = stage.clientHeight
      // Firma numérica de todo lo que afecta a la proyección; si no cambió, no se toca el DOM.
      const n = 16 + 16 + 2 + markers.length
      const next = new Float64Array(n)
      next.set(cam.matrixWorldInverse.elements, 0)
      next.set(cam.projectionMatrix.elements, 16)
      next[32] = W
      next[33] = H
      const hiddenComp = markers.map(
        (m) => m.comps.length > 0 && m.comps.every((c) => R.groups[c]?.visible === false),
      )
      hiddenComp.forEach((v, i) => (next[34 + i] = v ? 1 : 0))
      if (sig && sig.length === n && sig.every((v, i) => v === next[i])) return
      sig = next

      const placed = []
      const order = markers.map((m, i) => ({ m, i, y: 0, x: 0, ok: false }))
      const v = markers.length && R.three.Vector3 ? new R.three.Vector3() : null
      for (const o of order) {
        const { m, i } = o
        if (!m.anchor || hiddenComp[i]) continue
        v.copy(m.anchor).project(cam)
        if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue
        o.x = (v.x * 0.5 + 0.5) * W
        o.y = (-v.y * 0.5 + 0.5) * H
        o.ok = true
      }
      // Anti-solape en pantalla: se apila hacia abajo lo que colisiona (solo presentación).
      const visible = order.filter((o) => o.ok).sort((a, b) => a.y - b.y || a.i - b.i)
      for (const o of visible) {
        for (let k = 0; k < 10; k++) {
          const hit = placed.find(
            (p) =>
              Math.abs(o.x - p.x) < (o.m.w + p.m.w) / 2 &&
              Math.abs(o.y - p.y) < (o.m.h + p.m.h) / 2 + 1,
          )
          if (!hit) break
          o.y = hit.y + (o.m.h + hit.m.h) / 2 + 2
        }
        placed.push(o)
      }
      for (const o of order) {
        if (!o.ok) {
          o.m.el.style.display = 'none'
          continue
        }
        o.m.el.style.display = 'flex'
        o.m.el.style.transform = `translate(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px) translate(-50%, -50%)`
      }
    }

    // ───────────────────────── panel DROPS ─────────────────────────
    function buildPanel() {
      panel = h('aside', 'glass')
      panel.id = 'drops-panel'
      panel.hidden = true
      panel.setAttribute('aria-label', 'Puntos DROPS')
      const head = h('div', 'panel-head')
      const title = h('h2', '', 'Puntos DROPS')
      title.id = 'drops-panel-title'
      title.tabIndex = -1
      const close = h('button', 'icon-btn')
      close.type = 'button'
      close.setAttribute('aria-label', 'Cerrar panel DROPS')
      close.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
      close.addEventListener('click', () => closePanel(true))
      head.append(title, close)
      const scroll = h('div', 'dp-scroll')
      scroll.id = 'drops-panel-body'
      scroll.tabIndex = 0
      scroll.setAttribute('role', 'region')
      scroll.setAttribute('aria-labelledby', 'drops-panel-title')
      const foot = h('div', 'dp-foot', DATA.meta?.disclaimer || '')
      foot.setAttribute('role', 'note')
      panel.append(head, scroll, foot)
      stage.appendChild(panel)
    }

    const badge = (text, cls, color) => {
      const b = h('span', 'dp-b' + (cls ? ' ' + cls : ''), text)
      if (color) b.style.setProperty('--dl-c', color)
      return b
    }
    const zoneBadge = (zoneId) =>
      badge(
        zoneWord(zoneId && ZONE_RANK[zoneId] ? zoneId : null),
        'dp-b-zone',
        zoneId ? zoneColor(zoneId) : NO_ZONE_COLOR,
      )

    /** Fuente del punto: título + página (la revisión va aparte, en una línea más chica). */
    function sourceNode(p) {
      const b = p.basis || {}
      const src = sourcesById.get(b.sourceId)
      const parts = [src ? src.title : b.sourceId ? String(b.sourceId) : '']
      if (b.page != null && b.page !== '') parts.push(`pág. ${b.page}`)
      let t = parts.filter(Boolean).join(', ') || 'Sin fuente'
      if (src && src.verified === false) t += ' (fuente sin verificar)'
      const box = h('span', '', t)
      if (src && src.revision) box.append(h('small', 'dp-rev', src.revision))
      return box
    }

    function pointCard(p) {
      const li = h('li', 'dp-pt')
      li.dataset.pointId = p.id // 92-checklist-drops.js agrega los controles de campo
      const top = h('div', 'dp-pt-top')
      top.append(h('span', 'dp-id', p.id), h('strong', 'dp-pt-name', p.name || 'Sin nombre'))
      li.appendChild(top)

      const badges = h('div', 'dp-badges')
      const st = p.basis?.status
      badges.appendChild(
        badge(
          STATUS_LABEL[st] || String(st || 'Sin estatus'),
          REQUIREMENT_STATUS.has(st) ? 'dp-b-req' : 'dp-b-soft',
        ),
      )
      badges.appendChild(zoneBadge(pointZone(p)))
      const flags = Array.isArray(p.flags) ? p.flags : []
      for (const f of flags) badges.appendChild(badge(String(f).replace(/-/g, ' '), 'dp-b-flag'))
      li.appendChild(badges)

      const kv = h('dl', 'dp-kv')
      const row = (k, val) => {
        const dd = h('dd')
        dd.append(val) // string (texto) o nodo
        kv.append(h('dt', '', k), dd)
      }
      row('Sujeción primaria', String(p.primary ?? '').trim() || 'Sin dato')
      const sec = String(p.secondary ?? '').trim()
      row(
        'Retención secundaria',
        sec || (p.secondaryRequired === false ? 'No requerida' : 'Sin dato'),
      )
      row('Cantidad', String(p.quantity ?? '').trim() || 'Sin dato')
      if (String(p.observation ?? '').trim()) row('Observación', p.observation)
      row('Fuente', sourceNode(p))
      if (p.basis?.note) row('Nota de la fuente', p.basis.note)
      li.appendChild(kv)

      for (const ref of DATA.references || []) {
        if (Array.isArray(ref.relatedPointIds) && ref.relatedPointIds.includes(p.id)) {
          const d = ref.date ? ` (${fmtDate(ref.date, true)})` : ''
          li.appendChild(
            h(
              'p',
              'dp-ref',
              `Referencia relacionada: ${ref.title}${d}${ref.summary ? ' — ' + ref.summary : ''}`,
            ),
          )
        }
      }
      return li
    }

    function sectionSummary(sec, list, approx) {
      const box = h('div', 'dp-sum')
      const line = h('div', 'dp-badges')
      line.append(zoneBadge(sec.zone), badge(plural(list.length, 'punto', 'puntos'), 'dp-b-soft'))
      box.appendChild(line)
      if (sec.zoneBasis) box.appendChild(h('p', '', `Base de la zona: ${sec.zoneBasis}`))
      if (sec.pageRange) box.appendChild(h('p', '', `Páginas del Libro: ${sec.pageRange}`))
      if (approx != null)
        box.appendChild(
          h(
            'p',
            'dp-note',
            approx ? NOTE_APPROX : 'Marcador ubicado según la geometría etiquetada del modelo.',
          ),
        )
      return box
    }

    function renderPanel() {
      if (!panel || !panelState) return
      const body = panel.querySelector('#drops-panel-body')
      const title = panel.querySelector('#drops-panel-title')
      body.replaceChildren()
      body.scrollTop = 0
      if (panelState.kind === 'section') {
        const sec = sectionById.get(panelState.id)
        const list = pointsBySection.get(sec.id) || []
        const m = markers.find((k) => k.sec.id === sec.id)
        title.textContent = sec.label
        body.appendChild(sectionSummary(sec, list, m ? m.approx : null))
        const ul = h('ul', 'dp-list')
        list.forEach((p) => ul.appendChild(pointCard(p)))
        body.appendChild(ul)
      } else {
        const cid = panelState.id
        const list = pointsByComponent.get(cid) || []
        title.textContent = componentName(cid)
        const secIds = [...new Set(list.map((p) => p.sectionId))]
        const sum = h('div', 'dp-sum')
        const line = h('div', 'dp-badges')
        line.append(
          zoneBadge(componentZone.get(cid) || null),
          badge(plural(list.length, 'punto', 'puntos'), 'dp-b-soft'),
        )
        if (list.length) sum.appendChild(line)
        sum.appendChild(
          h(
            'p',
            '',
            list.length
              ? `Zona más alta entre sus puntos; asignación de componente propia del modelo (${plural(secIds.length, 'sección', 'secciones')}).`
              : 'Este componente no tiene puntos DROPS asignados.',
          ),
        )
        body.appendChild(sum)
        for (const sid of secIds) {
          const sec = sectionById.get(sid)
          const head = h('h3', 'dp-sec')
          head.append(h('span', '', sec ? sec.label : sid), zoneBadge(sec ? sec.zone : null))
          body.appendChild(head)
          const ul = h('ul', 'dp-list')
          list.filter((p) => p.sectionId === sid).forEach((p) => ul.appendChild(pointCard(p)))
          body.appendChild(ul)
        }
      }
      if (Array.isArray(DATA.meta?.assumptions) && DATA.meta.assumptions.length) {
        const det = h('details', 'dp-assump')
        det.appendChild(h('summary', '', 'Supuestos y alcance'))
        const ul = h('ul')
        DATA.meta.assumptions.forEach((a) => ul.appendChild(h('li', '', a)))
        det.appendChild(ul)
        body.appendChild(det)
      }
    }

    function markActiveMarker() {
      for (const m of markers) {
        const on =
          !!panelState &&
          panelState.kind === 'section' &&
          panelState.id === m.sec.id &&
          !panel.hidden
        m.el.classList.toggle('on', on)
        m.el.setAttribute('aria-expanded', String(on))
      }
    }

    function openSection(id, trigger) {
      if (!active || !sectionById.has(id)) return
      panelState = { kind: 'section', id, trigger: trigger || null }
      renderPanel()
      panel.hidden = false
      markActiveMarker()
      if (trigger) panel.querySelector('#drops-panel-title').focus({ preventScroll: true })
    }
    function openComponent(id) {
      if (!active) return
      panelState = { kind: 'component', id, trigger: null }
      renderPanel()
      panel.hidden = false
      markActiveMarker()
    }
    function closePanel(restoreFocus) {
      if (!panel || panel.hidden) return
      const trigger = panelState && panelState.trigger
      panel.hidden = true
      panelState = null
      markActiveMarker()
      if (restoreFocus) {
        const target =
          trigger && trigger.isConnected && trigger.style.display !== 'none' ? trigger : btn
        target.focus({ preventScroll: true })
      }
    }

    /** El visor deja la selección en `R.state.selected`: se sondea en cada tick. */
    function syncSelection() {
      const sel = R.state.selected || null
      if (sel === lastSelected) return
      lastSelected = sel
      if (sel) openComponent(sel)
      else if (panelState && panelState.kind === 'component') closePanel(false)
    }

    // ───────────────────────── leyenda ─────────────────────────
    function buildLegend() {
      legend = h('details', 'glass')
      legend.id = 'drops-legend'
      legend.open = stage.clientWidth >= 1200
      const sum = h('summary', '', 'ZONAS DROPS · layout A2 · clasificación cualitativa')
      legend.appendChild(sum)
      for (const id of ['alto', 'medio', 'bajo']) {
        const z = zonesById.get(id)
        if (!z) continue
        const row = h('div', 'dl-row')
        const sw = h('span', 'dl-sw')
        sw.style.setProperty('--dl-c', zoneColor(id))
        const txt = h('span', 'dl-row-t')
        txt.append(
          h('b', '', zoneWord(id)),
          document.createTextNode(
            Array.isArray(z.areas) && z.areas.length ? ' · ' + z.areas.join(', ') : '',
          ),
        )
        row.append(sw, txt)
        legend.appendChild(row)
      }
      if (sections.some((s) => !s.zone && (pointsBySection.get(s.id) || []).length)) {
        const row = h('div', 'dl-row')
        const sw = h('span', 'dl-sw')
        sw.style.setProperty('--dl-c', NO_ZONE_COLOR)
        row.append(sw, h('span', 'dl-row-t', 'SIN CLASIFICAR · sección sin zona en el A2'))
        legend.appendChild(row)
      }
      legendWarn = h(
        'p',
        'dl-warn',
        'El A2 no define radios ni distancias: la clasificación no sustituye exclusiones aprobadas',
      )
      legend.appendChild(
        h(
          'p',
          'dl-note',
          'Marcador punteado: posición aproximada del modelo. Teñido del modelo: zona más alta de cada componente.',
        ),
      )
      // Panel QHSE único (45-panel-qhse.js); sin él (build con --only) queda suelto en el escenario.
      ;($('qp-drops') || stage).appendChild(legend)
      const avisos = $('qp-avisos')
      if (avisos) avisos.prepend(legendWarn)
      else legend.appendChild(legendWarn)
    }

    // ───────────────────────── CSS ─────────────────────────
    const CSS = `
#drops-markers{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden}
.dl-mk{position:absolute;left:0;top:0;display:none;align-items:center;gap:6px;height:22px;padding:0 8px 0 3px;border-radius:999px;border:1px solid var(--dl-c);background:rgba(13,18,26,.92);color:#e6edf7;font:700 10px Consolas,monospace;letter-spacing:.06em;white-space:nowrap;cursor:pointer;pointer-events:auto;will-change:transform;box-shadow:0 2px 8px rgba(0,0,0,.35)}
.dl-mk.approx{border-style:dashed}
.dl-mk:hover,.dl-mk.on{background:#1c2533}
.dl-mk.on{box-shadow:0 0 0 2px var(--dl-c),0 2px 8px rgba(0,0,0,.35)}
.dl-mk:focus-visible{outline:2px solid #fff;outline-offset:2px}
.dl-mk-n{display:grid;place-items:center;min-width:16px;height:16px;padding:0 3px;border-radius:999px;background:var(--dl-c);color:#0c1017;font-size:10px}
.dl-mk-z{color:var(--dl-c)}
#drops-panel{position:absolute;top:64px;right:324px;bottom:55px;width:340px;z-index:7;display:flex;flex-direction:column;border-radius:8px;font:12px/1.4 Arial,Helvetica,sans-serif;color:#d8e0e8;box-shadow:0 12px 34px rgba(0,0,0,.3)}
#drops-panel[hidden]{display:none}
#drops-panel .panel-head h2{font-size:13px;outline:none}
#drops-panel .panel-head h2:focus-visible{box-shadow:0 0 0 2px #fff;border-radius:3px}
.dp-scroll{flex:1;overflow:auto;padding:10px 12px 14px}
.dp-scroll:focus-visible{outline:2px solid #DFB64B;outline-offset:-2px}
.dp-scroll::-webkit-scrollbar{width:8px}.dp-scroll::-webkit-scrollbar-thumb{background:#354254;border-radius:8px}
.dp-rev{display:block;margin-top:2px;font-size:9.5px;color:#8b9bae}
.dp-foot{max-height:110px;overflow:auto;padding:9px 12px 10px;border-top:1px solid rgba(255,255,255,.1);font-size:10px;line-height:1.4;color:#e8c978;background:rgba(8,11,16,.5);border-radius:0 0 8px 8px}
.dp-sum{padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.08)}
.dp-sum p{margin:6px 0 0;font-size:11px;color:#a9b6c6}
.dp-sum p.dp-note{color:#c7b58b}
.dp-sec{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:14px 0 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#e8c978}
.dp-list{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.dp-sec+.dp-list{margin-top:0}
.dp-pt{padding:9px 10px;border-radius:7px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08)}
.dp-pt-top{display:flex;gap:8px;align-items:baseline}
.dp-id{font:700 10px Consolas,monospace;color:#e8c978;flex:none}
.dp-pt-name{font-size:12px;font-weight:700;color:#eef2f7}
.dp-badges{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0 2px}
.dp-b{display:inline-block;padding:2px 7px;border-radius:999px;border:1px solid #4c596a;font:700 9px Consolas,monospace;letter-spacing:.04em;color:#d5dde6;white-space:normal}
.dp-b-req{border-color:#5f7c9c;color:#cfe3f7;background:#16283a}
.dp-b-soft{border-style:dashed;color:#b8c4d2}
.dp-b-zone{border-color:var(--dl-c);color:var(--dl-c);background:rgba(13,18,26,.7)}
.dp-b-flag{border-color:#c0a25a;color:#f0dca4;background:#3a2f12}
.dp-kv{display:grid;grid-template-columns:96px 1fr;gap:4px 8px;margin:6px 0 0;font-size:11px}
.dp-kv dt{color:#78899d;text-transform:uppercase;letter-spacing:.04em;font-size:9.5px;padding-top:1px}
.dp-kv dd{margin:0;color:#dfe6ee;overflow-wrap:anywhere}
.dp-ref{margin:7px 0 0;font-size:10.5px;color:#a9b6c6}
.dp-ref{color:#c7b58b}
.dp-assump{margin-top:14px;font-size:10.5px;color:#a9b6c6}
.dp-assump summary{cursor:pointer;color:#e8c978}
.dp-assump summary:focus-visible{outline:2px solid #fff;outline-offset:2px}
.dp-assump ul{margin:6px 0 0;padding-left:16px}
#drops-legend{position:absolute;left:276px;bottom:54px;z-index:3;width:300px;max-width:calc(100% - 300px);padding:9px 11px;border-radius:8px;font:11.5px/1.4 Arial,Helvetica,sans-serif;color:#d8e0e8}
#qp-drops #drops-legend{position:static;width:auto;max-width:none;padding:6px 0;border:0;border-top:1px solid rgba(255,255,255,.07);border-radius:0;background:none;font:inherit;font-size:11.5px}
#drops-legend summary{cursor:pointer;font-weight:700;font-size:12px;color:#e8c978}
#drops-legend summary:focus-visible{outline:2px solid #DFB64B;outline-offset:2px}
.dl-row{display:flex;gap:8px;align-items:flex-start;margin-top:6px}
.dl-sw{flex:none;width:12px;height:12px;margin-top:1px;border-radius:3px;background:color-mix(in srgb,var(--dl-c) 55%,transparent);border:1px solid var(--dl-c)}
.dl-row-t b{color:#fff}
.dl-warn{margin:8px 0 0;color:#e8c978;font-size:12px}
.dl-note{margin:6px 0 0;color:#9fb0c3;font-size:10px}
@media(max-width:1200px){#drops-panel{right:8px}}
@media(max-width:1050px){#drops-panel{bottom:105px}}
@media(max-width:700px){.dp-foot{max-height:64px}#drops-panel{left:8px;right:8px;width:auto;top:auto;bottom:105px;max-height:62%}}
`

    // ───────────────────────── activar / desactivar ─────────────────────────
    function on(target, type, fn, opts) {
      target.addEventListener(type, fn, opts)
      listeners.push(() => target.removeEventListener(type, fn, opts))
    }

    function tick() {
      raf = requestAnimationFrame(tick)
      if (frame++ & 1 || document.hidden) return // cada 2 frames, como el visor
      syncSelection()
      projectMarkers()
    }

    function setActive(next) {
      next = !!next
      if (next === active) return
      active = next
      btn.classList.toggle('on', active)
      btn.setAttribute('aria-pressed', String(active))
      if (active) activate()
      else deactivate()
    }

    function activate() {
      styleEl = h('style')
      styleEl.id = 'drops-style'
      styleEl.textContent = CSS
      document.head.appendChild(styleEl)
      buildMarkers()
      buildPanel()
      buildLegend()
      applyTint()
      // Escape cierra el panel (el visor además deselecciona el componente, como siempre).
      on(document, 'keydown', (e) => {
        if (e.key === 'Escape' && panel && !panel.hidden) closePanel(true)
      })
      // "Exportar GLB" clona los materiales en el mismo tick del clic: sin teñido en el archivo.
      const glb = $('c-glb')
      if (glb) {
        on(
          glb,
          'click',
          () => {
            removeTint()
            setTimeout(() => active && applyTint(), 0)
          },
          true,
        )
      }
      anchorsDirty = true
      hiddenByExplode = false
      wasExploded = false
      lastSelected = null
      sig = null
      frame = 0
      raf = requestAnimationFrame(tick)
    }

    function deactivate() {
      cancelAnimationFrame(raf)
      raf = 0
      listeners.forEach((off) => off())
      listeners = []
      removeTint()
      for (const el of [markerLayer, panel, legend, legendWarn, styleEl]) el && el.remove()
      markerLayer = panel = legend = legendWarn = styleEl = null
      markers = []
      panelState = null
      sig = null
    }

    // ───────────────────────── modo QHSE ─────────────────────────
    function syncQhse() {
      const now = document.body.classList.contains('v2-mode-qhse')
      if (now === inQhse) return
      inQhse = now
      if (now) {
        if (!active) {
          setActive(true)
          autoActivated = true
        }
      } else if (autoActivated) {
        autoActivated = false
        setActive(false)
      }
    }
    new MutationObserver(syncQhse).observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    })
    syncQhse()

    R.drops = {
      isActive: () => active,
      setActive,
      openSection,
      openComponent,
      // para pruebas: anclaje 3D de cada sección (null si no se proyecta) y si se rotula aproximado
      anclajes: () =>
        markers.map((m) => ({
          sec: m.sec.id,
          anchor: m.anchor && m.anchor.toArray(),
          approx: m.approx,
        })),
    }
  })
})()
