/*
 * Equipo 10 · runtime de extensiones del visor V2 (legacy).
 * Se inyecta ANTES del bundle del visor. Cada módulo `legacy-ext/NN-*.js` se registra con:
 *   window.__rigExt.onPre(api => { ... })   // justo antes de construir los componentes
 *   window.__rigExt.onPost(R => { ... })    // al terminar de arrancar el visor
 * Un error en un módulo se captura y se informa en consola: nunca rompe el visor.
 *
 * `api` (pre): helpers de geometría del visor con nombres legibles. Ver scripts/build-legacy.mjs.
 * `R`  (post): window.__rig ampliado (scene, three, camera(), renderer, groups, COMPONENTS, ...).
 */
window.__rigExt = (() => {
  const pre = []
  const post = []
  const run = (list, arg, phase) => {
    for (const fn of list) {
      try {
        fn(arg)
      } catch (e) {
        console.error('[rigExt ' + phase + ']', fn.moduleName || '', e)
      }
    }
  }
  return {
    onPre: (fn) => void pre.push(fn),
    onPost: (fn) => void post.push(fn),
    runPre: (api) => run(pre, api, 'pre'),
    runPost: (R) => run(post, R, 'post'),
  }
})()
