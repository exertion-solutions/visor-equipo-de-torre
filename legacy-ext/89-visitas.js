/*
 * 89-visitas.js — contador de visitas del visor V2, mostrado en la barra de estado ("Visitas: N").
 *
 * Servicio: Abacus (https://abacus.jasoncameron.dev, API gratuita y de código abierto, responde con CORS abierto).
 *   GET /hit/<namespace>/<key>  → suma 1 y devuelve { value }      GET /get/<namespace>/<key> → solo lee { value }
 * PRIVACIDAD: cada pedido llega a un servicio de terceros, que ve la IP y el User-Agent del visitante; el visor no envía ningún otro dato.
 * El contador es público: cualquiera que conozca el namespace puede leerlo o sumarle, así que es un indicador orientativo, no una métrica
 * auditable. No hay claves ni secretos en el repo.
 *
 * Reglas:
 *   · Cuenta UNA visita por sesión del navegador (sessionStorage). En el iframe de la app el origen es opaco y el almacenamiento puede lanzar
 *     SecurityError: en ese caso cuenta una por carga de la página.
 *   · No cuenta (solo oculta el contador) en localhost, file:// ni fuera de http(s): el desarrollo no ensucia el total.
 *   · Con Do Not Track activado solo LEE el total; no suma.
 *   · Si el servicio falla o tarda más de 6 s, el contador queda oculto: nunca rompe el visor.
 * API para pruebas: `window.__rigVisitas = { NS, KEY, estado() }`.
 */
window.__rigExt.onPost(() => {
  const NS = 'rig10-digital-rig-exertion'
  const KEY = 'visitas'
  const BASE = 'https://abacus.jasoncameron.dev'
  const FLAG = 'rig10-visita-contada'

  const bar = document.getElementById('cad-status')
  if (!bar) return
  const el = document.createElement('span')
  el.id = 'v2-visitas'
  el.hidden = true
  el.title =
    'Contador de visitas (servicio externo Abacus). Cuenta una visita por sesión del navegador; es orientativo, no una métrica auditable.'
  bar.appendChild(el)

  const host = location.hostname
  const enLinea = location.protocol === 'http:' || location.protocol === 'https:'
  const local =
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host.endsWith('.local')
  let estado = 'oculto'
  window.__rigVisitas = { NS, KEY, estado: () => estado }
  if (!enLinea || local) return // desarrollo o archivo local: no se cuenta ni se muestra

  const storage = () => {
    try {
      return window.sessionStorage
    } catch {
      return null // iframe sandbox sin allow-same-origin
    }
  }
  const yaContada = () => {
    const s = storage()
    try {
      return !!s && s.getItem(FLAG) === '1'
    } catch {
      return false
    }
  }
  const marcar = () => {
    try {
      const s = storage()
      if (s) s.setItem(FLAG, '1')
    } catch {
      /* sin almacenamiento: cuenta por carga */
    }
  }

  const dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1'
  const sumar = !dnt && !yaContada()
  const ctl = typeof AbortController === 'function' ? new AbortController() : null
  const timer = setTimeout(() => ctl && ctl.abort(), 6000)

  const urlContador = `${BASE}/${sumar ? 'hit' : 'get'}/${NS}/${KEY}`
  const pedido = { signal: ctl ? ctl.signal : undefined, cache: 'no-store' }
  fetch(urlContador, pedido)
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r.json()
    })
    .then((j) => {
      const n = Number(j && j.value)
      if (!Number.isFinite(n) || n < 0) throw new Error('respuesta inválida')
      if (sumar) marcar()
      el.textContent = 'Visitas: ' + n.toLocaleString('es-AR')
      el.hidden = false
      estado = sumar ? 'contada' : 'leída'
    })
    .catch(() => {
      estado = 'error' // silencioso: el contador queda oculto
    })
    .finally(() => clearTimeout(timer))
})
