/*
 * 93-induccion.js · evaluación corta de inducción con registro (modo Entrenamiento).
 *
 * - Botón "Evaluación de inducción" en el recorrido guiado (#vp-tour, visible en TRAINING).
 * - 8 preguntas de opción múltiple armadas con las fichas de "Ir a equipo" (window.__RIG_VIEWPOINTS):
 *   "¿A qué sector corresponde esta función?". Aprueba con 6/8 o más (75 %).
 * - Registro: nombre, empresa, fecha, puntaje y resultado. Se guarda en el almacén (90-almacen.js,
 *   `campo:induccion-registros`), se exporta a CSV y se puede enviar al disparador HTTP configurado.
 * - Es una verificación de conocimientos del recorrido, no una habilitación ni una certificación.
 * API para pruebas: window.__rigInduccion = { abrir(), preguntas(n), corregir(preguntas, respuestas), registros() }.
 */
window.__rigExt.onPost(() => {
  const D = window.__RIG_VIEWPOINTS
  const KV = window.__rigKv
  const UI = window.__rigUi
  if (!D || !Array.isArray(D.viewpoints) || !KV || !UI) return
  const KEY = 'campo:induccion-registros'
  const N = 8
  const APRUEBA = 0.75
  const base = D.viewpoints.filter(
    (v) => v.ficha && v.ficha.funcion && !/ilustrativo/i.test(v.nombre),
  )
  if (base.length < 4) return

  const mezclar = (a) => {
    const r = [...a]
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[r[i], r[j]] = [r[j], r[i]]
    }
    return r
  }

  function preguntas(n = N) {
    return mezclar(base)
      .slice(0, Math.min(n, base.length))
      .map((v) => {
        const otros = mezclar(base.filter((o) => o.id !== v.id)).slice(0, 3)
        return {
          id: v.id,
          texto: v.ficha.funcion,
          opciones: mezclar([v, ...otros]).map((o) => ({ id: o.id, nombre: o.nombre })),
        }
      })
  }
  function corregir(qs, resp) {
    const bien = qs.filter((q, i) => resp[i] === q.id).length
    return { bien, total: qs.length, aprobado: bien / qs.length >= APRUEBA }
  }
  const registros = () => {
    const r = KV.get(KEY, [])
    return Array.isArray(r) ? r : []
  }

  let dlg = null
  let qs = []
  const msg = (t) => {
    const m = dlg && dlg.body.querySelector('.cp-msg')
    if (m) m.textContent = t
  }

  function pantallaInicio() {
    const b = dlg.body
    b.innerHTML = ''
    const p = document.createElement('p')
    p.className = 'cp-note'
    p.textContent = `${N} preguntas sobre la función de cada sector del recorrido "Ir a equipo". Se aprueba con ${Math.ceil(N * APRUEBA)} respuestas correctas. Es una verificación del recorrido, no una habilitación.`
    b.appendChild(p)
    const datos = document.createElement('div')
    datos.className = 'cp-row'
    datos.innerHTML =
      '<input type="text" data-k="nombre" placeholder="Nombre y apellido" aria-label="Nombre y apellido"><input type="text" data-k="empresa" placeholder="Empresa / puesto" aria-label="Empresa o puesto">'
    b.appendChild(datos)
    const acc = document.createElement('div')
    acc.className = 'cp-row'
    acc.innerHTML =
      '<button type="button" class="cp-pri" data-a="empezar">Empezar</button><button type="button" data-a="registros">Ver registros</button>'
    b.appendChild(acc)
    const m = document.createElement('div')
    m.className = 'cp-msg'
    b.appendChild(m)
    acc.addEventListener('click', (ev) => {
      const a = ev.target.closest('button[data-a]')
      if (!a) return
      if (a.dataset.a === 'registros') return pantallaRegistros()
      const nombre = datos.querySelector('[data-k=nombre]').value.trim()
      const empresa = datos.querySelector('[data-k=empresa]').value.trim()
      if (nombre.length < 3) return msg('Completá nombre y apellido.')
      pantallaPreguntas({ nombre, empresa })
    })
  }

  function pantallaPreguntas(persona) {
    qs = preguntas()
    const b = dlg.body
    b.innerHTML = ''
    const form = document.createElement('form')
    qs.forEach((q, i) => {
      const fs = document.createElement('fieldset')
      fs.style.cssText =
        'border:1px solid rgba(255,255,255,.1);border-radius:8px;margin:0 0 10px;padding:8px 10px'
      const lg = document.createElement('legend')
      lg.textContent = `${i + 1}. ¿A qué sector corresponde?`
      lg.style.cssText = 'font-weight:700;color:#F3E2B4;padding:0 4px'
      const t = document.createElement('p')
      t.textContent = q.texto
      t.style.margin = '2px 0 6px'
      fs.append(lg, t)
      for (const o of q.opciones) {
        const l = document.createElement('label')
        l.style.cssText = 'display:block;margin:3px 0;cursor:pointer'
        const r = document.createElement('input')
        r.type = 'radio'
        r.name = 'q' + i
        r.value = o.id
        l.append(r, ' ' + o.nombre)
        fs.appendChild(l)
      }
      form.appendChild(fs)
    })
    const acc = document.createElement('div')
    acc.className = 'cp-row'
    acc.innerHTML = '<button type="submit" class="cp-pri">Corregir</button>'
    form.appendChild(acc)
    const m = document.createElement('div')
    m.className = 'cp-msg'
    form.appendChild(m)
    form.addEventListener('submit', (ev) => {
      ev.preventDefault()
      const resp = qs.map(
        (_, i) => (form.querySelector(`input[name=q${i}]:checked`) || {}).value || null,
      )
      if (resp.some((r) => !r)) return msg('Respondé todas las preguntas.')
      const c = corregir(qs, resp)
      const reg = {
        fecha: new Date().toISOString(),
        ...persona,
        correctas: c.bien,
        total: c.total,
        resultado: c.aprobado ? 'Aprobado' : 'No aprobado',
      }
      KV.set(KEY, [...registros(), reg].slice(-500))
      pantallaResultado(reg, resp)
    })
    b.appendChild(form)
    b.scrollTop = 0
  }

  function pantallaResultado(reg, resp) {
    const b = dlg.body
    b.innerHTML = ''
    const h = document.createElement('p')
    h.innerHTML = `<b style="font-size:16px;color:${reg.resultado === 'Aprobado' ? '#22C55E' : '#EF4444'}">${reg.resultado}</b> · ${reg.correctas}/${reg.total} correctas`
    b.appendChild(h)
    const ul = document.createElement('ul')
    qs.forEach((q, i) => {
      if (resp[i] === q.id) return
      const correcta = q.opciones.find((o) => o.id === q.id)
      const li = document.createElement('li')
      li.textContent = `${q.texto} → ${correcta ? correcta.nombre : q.id}`
      ul.appendChild(li)
    })
    if (ul.children.length) {
      const t = document.createElement('p')
      t.textContent = 'Respuestas a repasar:'
      b.append(t, ul)
    }
    const acc = document.createElement('div')
    acc.className = 'cp-row'
    acc.innerHTML =
      '<button type="button" class="cp-pri" data-a="enviar">Enviar registro</button><button type="button" data-a="otra">Nueva evaluación</button><button type="button" data-a="registros">Ver registros</button>'
    const m = document.createElement('div')
    m.className = 'cp-msg'
    acc.addEventListener('click', async (ev) => {
      const a = ev.target.closest('button[data-a]')
      if (!a) return
      if (a.dataset.a === 'enviar') msg((await UI.enviar('induccion', reg)).motivo)
      else if (a.dataset.a === 'otra') pantallaInicio()
      else pantallaRegistros()
    })
    b.append(acc, m, UI.filaWebhook(msg))
  }

  function pantallaRegistros() {
    const b = dlg.body
    b.innerHTML = ''
    const rs = registros()
    const t = document.createElement('table')
    t.innerHTML =
      '<thead><tr><th>Fecha</th><th>Nombre</th><th>Empresa / puesto</th><th>Puntaje</th><th>Resultado</th></tr></thead>'
    const tb = document.createElement('tbody')
    for (const r of [...rs].reverse()) {
      const tr = document.createElement('tr')
      for (const v of [
        new Date(r.fecha).toLocaleString('es-AR'),
        r.nombre,
        r.empresa,
        `${r.correctas}/${r.total}`,
        r.resultado,
      ]) {
        const td = document.createElement('td')
        td.textContent = v == null ? '' : String(v)
        tr.appendChild(td)
      }
      tb.appendChild(tr)
    }
    t.appendChild(tb)
    const p = document.createElement('p')
    p.className = 'cp-note'
    p.textContent = rs.length
      ? `${rs.length} registro(s) guardados en este navegador.`
      : 'Sin registros todavía.'
    const acc = document.createElement('div')
    acc.className = 'cp-row'
    acc.innerHTML =
      '<button type="button" class="cp-pri" data-a="csv">Exportar CSV (Excel)</button><button type="button" data-a="volver">Volver</button><button type="button" data-a="borrar">Borrar registros</button>'
    const m = document.createElement('div')
    m.className = 'cp-msg'
    acc.addEventListener('click', (ev) => {
      const a = ev.target.closest('button[data-a]')
      if (!a) return
      if (a.dataset.a === 'csv') {
        const f = [['Fecha', 'Nombre', 'Empresa / puesto', 'Correctas', 'Total', 'Resultado']]
        for (const r of rs)
          f.push([r.fecha, r.nombre, r.empresa, r.correctas, r.total, r.resultado])
        UI.descargar(`registro-induccion-${UI.fechaArchivo()}.csv`, UI.csv(f))
        msg('CSV descargado.')
      } else if (a.dataset.a === 'borrar') {
        if (
          rs.length &&
          window.confirm(
            '¿Borrar todos los registros de este navegador? Exportá antes si los necesitás.',
          )
        ) {
          KV.set(KEY, null)
          pantallaRegistros()
        }
      } else pantallaInicio()
    })
    b.append(p, t, acc, m)
  }

  function abrir() {
    if (!dlg) dlg = UI.dialog('Evaluación de inducción')
    KV.ready.then(() => {
      pantallaInicio()
      if (!dlg.el.open) dlg.el.showModal()
    })
  }

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.id = 'vp-eval'
  btn.textContent = 'Evaluación de inducción'
  btn.addEventListener('click', abrir)
  const tour = document.getElementById('vp-tour')
  if (tour) {
    const row = document.createElement('div')
    row.className = 'vp-row'
    row.appendChild(btn)
    tour.appendChild(row)
  }

  window.__rigInduccion = { abrir, preguntas, corregir, registros }
})
