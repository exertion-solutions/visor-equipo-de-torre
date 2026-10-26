/*
 * 92-checklist-drops.js · checklist DROPS de campo sobre los 66 puntos de window.__RIG_DROPS.
 *
 * - Cada tarjeta de punto del panel DROPS (50-drops-layer.js, `li[data-point-id]`) suma tres botones OK / NOK / N/A y,
 *   con NOK, un campo de observación. El estado se guarda en el almacén de 90-almacen.js (`campo:drops-checklist`):
 *   persiste entre sesiones en el mismo navegador y funciona sin conexión.
 * - Botón "Checklist DROPS (campo)" en el menú Capas: resumen por sección, lista de NOK, inspector y lugar,
 *   exportación CSV (Excel), envío opcional al disparador HTTP configurado y "Nueva inspección".
 * - El resultado es un REGISTRO DE CAMPO del usuario: el visor no evalúa ni aprueba nada.
 * API para pruebas: window.__rigChecklist = { marcar(id, estado, obs?), estado(), resumen(), abrir() }.
 */
window.__rigExt.onPost(() => {
  const DATA = window.__RIG_DROPS
  const KV = window.__rigKv
  const UI = window.__rigUi
  if (!DATA || !Array.isArray(DATA.points) || !KV || !UI) return
  const KEY = 'campo:drops-checklist'
  const ESTADOS = { ok: 'OK', nok: 'NOK', na: 'N/A' }
  const puntos = [...DATA.points]
  const porId = new Map(puntos.map((p) => [p.id, p]))
  const secciones = new Map((DATA.sections || []).map((s) => [s.id, s]))

  const nuevo = () => ({ inicio: new Date().toISOString(), inspector: '', lugar: '', puntos: {} })
  let st = nuevo()
  const guardar = () => KV.set(KEY, st)

  const style = document.createElement('style')
  style.textContent = `
    .ck-row{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:7px}
    .ck-row button{font:inherit;font-size:11px;font-weight:700;color:#cfd8e3;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);border-radius:6px;padding:3px 9px;cursor:pointer}
    .ck-row button[aria-pressed="true"][data-e="ok"]{background:#22C55E;border-color:#22C55E;color:#06210f}
    .ck-row button[aria-pressed="true"][data-e="nok"]{background:#EF4444;border-color:#EF4444;color:#fff}
    .ck-row button[aria-pressed="true"][data-e="na"]{background:#64748B;border-color:#64748B;color:#fff}
    .ck-row input{flex:1 1 100%;font:inherit;font-size:11.5px;color:#dfe6ee;background:#0E1420;border:1px solid #354254;border-radius:6px;padding:4px 7px}
    .ck-row .ck-lbl{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#78899d;margin-right:2px}
    .cp-dlg table{border-collapse:collapse;width:100%;font-size:12px;margin:6px 0}
    .cp-dlg th,.cp-dlg td{border-bottom:1px solid rgba(255,255,255,.08);padding:4px 6px;text-align:left;vertical-align:top}
    .cp-dlg .ck-bar{height:8px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden}
    .cp-dlg .ck-bar > i{display:block;height:100%;background:#DDBB65}
  `
  document.head.appendChild(style)

  function marcar(id, estado, obs) {
    if (!porId.has(id)) return false
    if (estado === null || estado === undefined) delete st.puntos[id]
    else if (ESTADOS[estado]) {
      const prev = st.puntos[id] || {}
      st.puntos[id] = {
        estado,
        obs: estado === 'nok' ? (obs ?? prev.obs ?? '') : '',
        t: new Date().toISOString(),
      }
    } else return false
    guardar()
    refrescar()
    return true
  }

  function decorar(li) {
    const id = li.dataset.pointId
    if (!id || li.querySelector('.ck-row')) return
    const row = document.createElement('div')
    row.className = 'ck-row'
    row.innerHTML =
      '<span class="ck-lbl">Campo</span>' +
      Object.entries(ESTADOS)
        .map(([e, l]) => `<button type="button" data-e="${e}" aria-pressed="false">${l}</button>`)
        .join('') +
      '<input type="text" placeholder="Observación del NOK" aria-label="Observación" hidden>'
    const input = row.querySelector('input')
    row.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-e]')
      if (!b) return
      const actual = st.puntos[id] && st.puntos[id].estado
      marcar(id, actual === b.dataset.e ? null : b.dataset.e)
    })
    input.addEventListener('change', () => {
      if (st.puntos[id] && st.puntos[id].estado === 'nok') {
        st.puntos[id].obs = input.value.trim()
        guardar()
      }
    })
    li.appendChild(row)
    pintar(li)
  }

  function pintar(li) {
    const row = li.querySelector('.ck-row')
    if (!row) return
    const r = st.puntos[li.dataset.pointId]
    for (const b of row.querySelectorAll('button[data-e]'))
      b.setAttribute('aria-pressed', String(!!r && r.estado === b.dataset.e))
    const input = row.querySelector('input')
    input.hidden = !(r && r.estado === 'nok')
    if (r && r.estado === 'nok' && document.activeElement !== input) input.value = r.obs || ''
  }

  const refrescar = () => {
    for (const li of document.querySelectorAll('li.dp-pt[data-point-id]')) pintar(li)
    if (dlg && dlg.el.open) render()
  }

  new MutationObserver(() => {
    for (const li of document.querySelectorAll('li.dp-pt[data-point-id]:not(:has(.ck-row))'))
      decorar(li)
  }).observe(document.body, { childList: true, subtree: true })

  function resumen() {
    const vals = Object.values(st.puntos)
    const n = (e) => vals.filter((v) => v.estado === e).length
    return {
      total: puntos.length,
      ok: n('ok'),
      nok: n('nok'),
      na: n('na'),
      pendientes: puntos.length - vals.length,
    }
  }

  function filasCsv() {
    const f = [
      ['Inspector', st.inspector],
      ['Lugar / equipo', st.lugar],
      ['Inicio', st.inicio],
      ['Exportado', new Date().toISOString()],
      [],
    ]
    f.push(['Punto', 'Sección', 'Nombre', 'Zona', 'Estado', 'Observación', 'Fecha marca'])
    for (const p of puntos) {
      const r = st.puntos[p.id]
      f.push([
        p.id,
        (secciones.get(p.sectionId) || {}).label || p.sectionId,
        p.name,
        p.zone || (secciones.get(p.sectionId) || {}).zone || 'sin clasificar',
        r ? ESTADOS[r.estado] : 'Pendiente',
        r ? r.obs : '',
        r ? r.t : '',
      ])
    }
    return f
  }

  let dlg = null
  const msg = (t) => {
    const m = dlg && dlg.body.querySelector('.cp-msg')
    if (m) m.textContent = t
  }
  function render() {
    const s = resumen()
    const hechos = s.total - s.pendientes
    const b = dlg.body
    b.innerHTML = ''
    const intro = document.createElement('p')
    intro.className = 'cp-note'
    intro.textContent =
      'Registro de campo sobre los 66 puntos DROPS. Marcá cada punto desde el panel DROPS (modo QHSE → clic en una sección). Se guarda en este navegador; el visor no evalúa ni aprueba.'
    b.appendChild(intro)
    const datos = document.createElement('div')
    datos.className = 'cp-row'
    datos.innerHTML =
      '<input type="text" data-k="inspector" placeholder="Inspector" aria-label="Inspector"><input type="text" data-k="lugar" placeholder="Lugar / equipo / pozo" aria-label="Lugar">'
    for (const i of datos.querySelectorAll('input')) {
      i.value = st[i.dataset.k] || ''
      i.addEventListener('change', () => {
        st[i.dataset.k] = i.value.trim()
        guardar()
      })
    }
    b.appendChild(datos)
    const prog = document.createElement('div')
    prog.innerHTML = `<p><b>${hechos}/${s.total}</b> puntos revisados · <b style="color:#22C55E">${s.ok} OK</b> · <b style="color:#EF4444">${s.nok} NOK</b> · ${s.na} N/A · ${s.pendientes} pendientes</p><div class="ck-bar"><i style="width:${Math.round((hechos / s.total) * 100)}%"></i></div>`
    b.appendChild(prog)

    const t = document.createElement('table')
    t.innerHTML =
      '<thead><tr><th>Sección</th><th>Puntos</th><th>OK</th><th>NOK</th><th>N/A</th><th>Pend.</th></tr></thead>'
    const tb = document.createElement('tbody')
    for (const sec of secciones.values()) {
      const ps = puntos.filter((p) => p.sectionId === sec.id)
      const c = (e) => ps.filter((p) => st.puntos[p.id] && st.puntos[p.id].estado === e).length
      const tr = document.createElement('tr')
      const pend = ps.length - c('ok') - c('nok') - c('na')
      for (const v of [sec.label, ps.length, c('ok'), c('nok'), c('na'), pend]) {
        const td = document.createElement('td')
        td.textContent = String(v)
        tr.appendChild(td)
      }
      tr.style.cursor = 'pointer'
      tr.title = 'Abrir la sección en el panel DROPS'
      tr.addEventListener('click', () => abrirSeccion(sec.id))
      tb.appendChild(tr)
    }
    t.appendChild(tb)
    b.appendChild(t)

    const noks = puntos.filter((p) => st.puntos[p.id] && st.puntos[p.id].estado === 'nok')
    if (noks.length) {
      const h = document.createElement('h3')
      h.textContent = 'Puntos NOK'
      h.style.cssText = 'font-size:13px;color:#EF4444;margin:12px 0 4px'
      b.appendChild(h)
      const ul = document.createElement('ul')
      for (const p of noks) {
        const li = document.createElement('li')
        li.textContent = `${p.id} · ${p.name}${st.puntos[p.id].obs ? ' — ' + st.puntos[p.id].obs : ''}`
        ul.appendChild(li)
      }
      b.appendChild(ul)
    }

    const acc = document.createElement('div')
    acc.className = 'cp-row'
    acc.innerHTML =
      '<button type="button" class="cp-pri" data-a="csv">Exportar CSV (Excel)</button><button type="button" data-a="enviar">Enviar</button><button type="button" data-a="nueva">Nueva inspección</button>'
    acc.addEventListener('click', async (ev) => {
      const a = ev.target.closest('button[data-a]')
      if (!a) return
      if (a.dataset.a === 'csv') {
        UI.descargar(`checklist-drops-${UI.fechaArchivo()}.csv`, UI.csv(filasCsv()))
        msg('CSV descargado.')
      } else if (a.dataset.a === 'enviar') {
        const r = await UI.enviar('checklist-drops', { ...st, resumen: resumen() })
        msg(r.motivo)
      } else if (a.dataset.a === 'nueva') {
        if (
          hechos &&
          !window.confirm(
            '¿Borrar las marcas actuales y empezar una inspección nueva? Exportá antes si las necesitás.',
          )
        )
          return
        st = nuevo()
        guardar()
        refrescar()
        msg('Inspección nueva iniciada.')
      }
    })
    b.appendChild(acc)
    const m = document.createElement('div')
    m.className = 'cp-msg'
    b.appendChild(m)
    b.appendChild(UI.filaWebhook(msg))
  }

  function abrirSeccion(id) {
    if (window.__rigMode && window.__rigMode.get() !== 'qhse') window.__rigMode.set('qhse')
    const d = window.__rig && window.__rig.drops
    if (d) {
      if (!d.isActive()) d.setActive(true)
      d.openSection(id)
    }
    dlg.el.close()
  }

  function abrir() {
    if (!dlg) dlg = UI.dialog('Checklist DROPS (campo)')
    render()
    if (!dlg.el.open) dlg.el.showModal()
  }

  const btn = document.createElement('button')
  btn.className = 'btn'
  btn.id = 'c-checklist'
  btn.type = 'button'
  btn.textContent = 'Checklist DROPS (campo)'
  btn.addEventListener('click', () => {
    window.__rigToolbar && window.__rigToolbar.closeAll()
    abrir()
  })
  if (window.__rigToolbar && typeof window.__rigToolbar.add === 'function')
    window.__rigToolbar.add('capas', btn)
  else document.querySelector('header')?.appendChild(btn)

  KV.ready.then(() => {
    const g = KV.get(KEY, null)
    if (g && typeof g === 'object' && g.puntos && typeof g.puntos === 'object') {
      st = { ...nuevo(), ...g }
      for (const id of Object.keys(st.puntos)) if (!porId.has(id)) delete st.puntos[id]
    }
    refrescar()
  })

  window.__rigChecklist = { marcar, estado: () => st, resumen, abrir }
})
