/*
 * sw.js · modo sin conexión del sitio (PWA).
 *
 * Al instalarse guarda el visor V2 y los 16 modelos SK-575: después de la primera visita, el visor abre aunque no haya
 * señal en la locación. Estrategia:
 *   · Páginas HTML (la app y el visor): primero la red, con la copia guardada como respaldo → siempre la última versión
 *     si hay conexión.
 *   · Todo lo demás del propio sitio (JS, CSS, modelos, fuentes): la copia guardada al instante y se actualiza en segundo
 *     plano para la próxima visita.
 * Solo GET del mismo origen; nada de terceros. Al cambiar VERSION se descartan las copias anteriores.
 */
const VERSION = 'rig-v1'
const MODELOS = [
  'acumulador', 'aparejo', 'bomba', 'bop', 'carrier', 'cuadro', 'izaje', 'llave',
  'manifold', 'mastil', 'piletas', 'piso', 'planchada', 'pozo_vecino', 'tiros', 'vientos',
]
const base = new URL('./', self.location).href
const PRECACHE = [
  base,
  base + 'legacy/Digital_Rig_V2.html',
  base + 'manifest.webmanifest',
  base + 'favicon.svg',
  ...MODELOS.map((m) => `${base}models/rig10/sk575_${m}.glb`),
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const esHtml = (req, url) =>
  req.mode === 'navigate' || req.destination === 'document' || url.pathname.endsWith('.html')

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || !url.href.startsWith(base)) return
  // la consulta (?embedded, ?v=) no cambia el archivo: se guarda y busca sin ella
  const clave = url.origin + url.pathname

  if (esHtml(req, url)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone()
            caches.open(VERSION).then((c) => c.put(clave, copia))
          }
          return res
        })
        .catch(() =>
          caches.match(clave).then((r) => r || caches.match(base)).then((r) => r || Response.error()),
        ),
    )
    return
  }

  e.respondWith(
    caches.match(clave).then((guardada) => {
      const red = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone()
            caches.open(VERSION).then((c) => c.put(clave, copia))
          }
          return res
        })
        .catch(() => guardada || Response.error())
      if (guardada) {
        e.waitUntil(red.catch(() => {}))
        return guardada
      }
      return red
    }),
  )
})
