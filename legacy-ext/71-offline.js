/*
 * 71-offline.js · registra el modo sin conexión (../sw.js) cuando el visor se abre directo por su link.
 * Embebido en la app no hace falta (la app ya lo registra) y además no puede: el iframe sandbox tiene origen opaco.
 * Solo en https (no en file:// ni en desarrollo local).
 */
;(() => {
  if (window.parent !== window || location.protocol !== 'https:' || !('serviceWorker' in navigator))
    return
  addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(() => {})
  })
})()
