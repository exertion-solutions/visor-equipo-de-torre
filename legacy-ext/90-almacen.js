/*
 * 90-almacen.js · servicios comunes de los módulos de campo (checklist DROPS, inducción):
 *
 *  1. Almacén clave/valor `window.__rigKv` { ready, get, set }. Abierto directo (no embebido) usa localStorage.
 *     Embebido en la app (iframe sandbox, origen opaco: localStorage no existe), delega en la app por postMessage:
 *       visor → app  rig:kvSet  { key, value }        (value = string JSON; null borra)
 *       app → visor  rig:kvInit { items: {key: value} }  (respuesta a rig:kvGet al arrancar)
 *     Solo claves con prefijo `campo:`. Si nada persiste (modo privado), el estado vive en memoria y se exporta.
 *  2. Webhook (p. ej. disparador HTTP de Power Automate): URL guardada en el almacén (`campo:webhook`).
 *     Se envía con fetch `no-cors` y cuerpo JSON como text/plain (desde un origen opaco no hay CORS posible): la
 *     respuesta no es legible, así que el envío se informa como "enviado, sin confirmación". En el flujo, usar
 *     json(triggerBody()) para leer el cuerpo.
 *  3. CSV (separador `;`, BOM UTF-8: abre bien en Excel es-AR) y descarga por blob.
 *  4. Diálogo modal reutilizable con el estilo del visor (`window.__rigUi.dialog`).
 */
;(() => {
  'use strict'
  const PREFIX = 'campo:'
  const inFrame = window.parent && window.parent !== window
  const mem = new Map()
  let ls = null
  try {
    ls = window.localStorage
    ls.setItem('campo:__t', '1')
    ls.removeItem('campo:__t')
  } catch {
    ls = null
  }

  let resolveReady
  const ready = new Promise((r) => (resolveReady = r))
  if (ls || !inFrame) resolveReady()
  else {
    window.addEventListener('message', (e) => {
      if (e.source !== window.parent) return
      const d = e.data
      if (!d || d.type !== 'rig:kvInit' || typeof d.items !== 'object' || !d.items) return
      for (const [k, v] of Object.entries(d.items))
        if (typeof k === 'string' && k.startsWith(PREFIX) && typeof v === 'string') mem.set(k, v)
      resolveReady()
    })
    try {
      window.parent.postMessage({ type: 'rig:kvGet' }, '*')
    } catch {
      /* sin padre accesible */
    }
    setTimeout(resolveReady, 3000) // app vieja sin soporte: se sigue en memoria
  }

  const ok = (k) => typeof k === 'string' && k.startsWith(PREFIX)
  function get(key, fallback = null) {
    if (!ok(key)) return fallback
    let raw = null
    try {
      raw = ls ? ls.getItem(key) : (mem.get(key) ?? null)
    } catch {
      raw = mem.get(key) ?? null
    }
    if (raw == null) return fallback
    try {
      return JSON.parse(raw)
    } catch {
      return fallback
    }
  }
  function set(key, value) {
    if (!ok(key)) return
    const raw = value == null ? null : JSON.stringify(value)
    if (raw == null) mem.delete(key)
    else mem.set(key, raw)
    try {
      if (ls) raw == null ? ls.removeItem(key) : ls.setItem(key, raw)
      else if (inFrame) window.parent.postMessage({ type: 'rig:kvSet', key, value: raw }, '*')
    } catch {
      /* queda en memoria */
    }
  }
  window.__rigKv = { ready, get, set }

  // ───────── webhook ─────────
  const WEBHOOK_KEY = 'campo:webhook'
  const webhookUrl = () => {
    const u = get(WEBHOOK_KEY, '')
    return typeof u === 'string' && /^https:\/\/\S+$/.test(u) ? u : ''
  }
  async function enviar(tipo, datos) {
    const url = webhookUrl()
    if (!url) return { ok: false, motivo: 'Sin URL de envío configurada.' }
    const body = JSON.stringify({
      tipo,
      enviado: new Date().toISOString(),
      equipo: 'Equipo 10',
      datos,
    })
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body,
      })
      return { ok: true, motivo: 'Enviado (sin confirmación del destino).' }
    } catch (e) {
      return {
        ok: false,
        motivo: 'No se pudo enviar: ' + (e && e.message ? e.message : 'error de red'),
      }
    }
  }

  // ───────── CSV ─────────
  const celda = (v) => {
    const s = v == null ? '' : String(v)
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = (filas) => '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n')
  function descargar(nombre, texto, tipo = 'text/csv;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([texto], { type: tipo }))
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  const fechaArchivo = () => new Date().toISOString().slice(0, 10)

  // ───────── diálogo ─────────
  const style = document.createElement('style')
  style.textContent = `
    .cp-dlg{max-width:min(760px,94vw);width:100%;padding:0;border:1px solid #303B4B;border-radius:12px;background:#141B26;color:#DDE3EC}
    .cp-dlg::backdrop{background:rgba(5,8,12,.6)}
    .cp-dlg .cp-head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08)}
    .cp-dlg .cp-head h2{margin:0;font-size:15px;color:#F3E2B4;flex:1}
    .cp-dlg .cp-body{padding:14px 16px;max-height:72vh;overflow:auto;font-size:13px;line-height:1.5}
    .cp-dlg .cp-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0}
    .cp-dlg input[type=text],.cp-dlg input[type=url]{flex:1;min-width:180px;font:inherit;color:inherit;background:#0E1420;border:1px solid #354254;border-radius:6px;padding:6px 8px}
    .cp-dlg button{font:inherit;color:inherit;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:7px;padding:5px 10px;cursor:pointer}
    .cp-dlg button:hover{background:rgba(255,255,255,.1)}
    .cp-dlg button.cp-pri{background:#DDBB65;color:#1A1305;border-color:#DDBB65;font-weight:700}
    .cp-dlg .cp-note{opacity:.7;font-size:11.5px}
    .cp-dlg .cp-msg{min-height:18px;color:#E8C978;font-size:12px}
  `
  document.head.appendChild(style)

  function dialog(titulo) {
    const d = document.createElement('dialog')
    d.className = 'cp-dlg'
    d.innerHTML = `<div class="cp-head"><h2></h2><button type="button" data-cerrar>Cerrar</button></div><div class="cp-body"></div>`
    d.querySelector('h2').textContent = titulo
    d.querySelector('[data-cerrar]').addEventListener('click', () => d.close())
    document.body.appendChild(d)
    return { el: d, body: d.querySelector('.cp-body') }
  }

  /** Fila para configurar la URL de envío (compartida por checklist e inducción). */
  function filaWebhook(onMsg) {
    const row = document.createElement('div')
    row.className = 'cp-row'
    row.innerHTML =
      '<input type="url" placeholder="URL del disparador HTTP (Power Automate), opcional" aria-label="URL de envío"><button type="button">Guardar URL</button>'
    const input = row.querySelector('input')
    input.value = webhookUrl()
    row.querySelector('button').addEventListener('click', () => {
      const v = input.value.trim()
      if (v && !/^https:\/\/\S+$/.test(v)) return onMsg('La URL debe empezar con https://')
      set(WEBHOOK_KEY, v || null)
      onMsg(v ? 'URL guardada.' : 'URL borrada.')
    })
    return row
  }

  window.__rigUi = { dialog, filaWebhook, csv, descargar, fechaArchivo, enviar, webhookUrl }
})()
