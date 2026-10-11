/*
 * 45-panel-qhse.js — PANEL QHSE ÚNICO: las 3 tarjetas flotantes (Barreras visuales, Zonas DROPS, Zonas ilustrativas) pasan a un
 * solo panel lateral (#qhse-panel) con secciones plegables y una sola familia tipográfica (la del visor).
 *
 *   - Sección plegable "Barreras visuales QHSE": el #v2-qhse del bundle (solo en modo QHSE, como antes; oculto ≤700 px, como antes).
 *   - Sección plegable "Zonas DROPS": la leyenda de 50-drops-layer.js (#drops-legend) se inserta en #qp-drops.
 *   - Fijo, NO plegable y fuera del scroll (siempre visible mientras su capa esté encendida):
 *       · el aviso del A2 "El A2 no define radios ni distancias…" (50-drops-layer.js lo inserta en #qp-avisos);
 *       · la leyenda "ZONAS ILUSTRATIVAS · SIN VALIDAR" (#legend del bundle, que sigue manejando su display).
 *   - El panel se ve en modo QHSE o cuando alguna de esas capas está encendida.
 *
 * No cambia textos ni estatus QHSE: solo mueve los nodos existentes. Corre antes que 50-drops-layer.js (orden de nombre).
 */
window.__rigExt.onPost(() => {
  const $ = (id) => document.getElementById(id)
  const stage = $('stage')
  if (!stage) return

  const panel = document.createElement('aside')
  panel.id = 'qhse-panel'
  panel.className = 'glass'
  panel.setAttribute('aria-label', 'Panel QHSE')
  panel.innerHTML =
    '<div class="qp-scroll">' +
    '<details class="qp-sec" id="qp-barreras"><summary class="qp-sum"></summary></details>' +
    '<div id="qp-drops"></div>' +
    '</div>' +
    '<div class="qp-fixed" id="qp-avisos"></div>'
  stage.appendChild(panel)
  const barreras = $('qp-barreras')
  barreras.open = stage.clientWidth >= 1200

  const legend = $('legend')
  if (legend) panel.querySelector('.qp-fixed').appendChild(legend) // después del aviso del A2

  // #v2-qhse lo crea el bundle un instante después de arrancar: se adopta al aparecer.
  const adopt = () => {
    const q = $('v2-qhse')
    if (!q) return false
    const h3 = q.querySelector('h3')
    if (h3) barreras.querySelector('summary').appendChild(h3) // el título pasa a ser el encabezado plegable
    barreras.appendChild(q)
    return true
  }
  if (!adopt()) {
    const mo = new MutationObserver(() => adopt() && mo.disconnect())
    mo.observe(stage, { childList: true })
  }

  const style = document.createElement('style')
  style.id = 'qhse-panel-style'
  style.textContent = `
#qhse-panel{position:absolute;left:270px;top:14px;z-index:6;width:300px;max-height:calc(100% - 83px);display:none;flex-direction:column;border-radius:8px;font:12px/1.4 Arial,Helvetica,sans-serif;color:#d8e0e8;box-shadow:0 12px 34px rgba(0,0,0,.3);transition:left .3s cubic-bezier(.16,1,.3,1)}
body.v2-mode-qhse #qhse-panel,#qhse-panel:has(#drops-legend),#qhse-panel:has(#legend[style*="flex"]){display:flex}
#tree.collapsed ~ #qhse-panel,body.focus-scene:not(.paneles-show) #qhse-panel{left:60px}
#qhse-panel .qp-scroll{flex:1 1 auto;min-height:0;overflow:auto;padding:4px 12px}
#qhse-panel .qp-fixed{flex:none;padding:0 12px}
#qhse-panel .qp-fixed > *{margin:0;padding:8px 0;border-top:1px solid rgba(255,255,255,.1)}
#qhse-panel .qp-sec{padding:6px 0;border-top:1px solid rgba(255,255,255,.07)}
#qhse-panel .qp-scroll > :first-child{border-top:0}
#qhse-panel summary{cursor:pointer;color:#e8c978;font-weight:700;font-size:12px}
#qhse-panel summary:focus-visible{outline:2px solid #DFB64B;outline-offset:2px;border-radius:2px}
#qhse-panel summary h3{display:inline;margin:0;font:inherit;color:inherit;text-transform:none;letter-spacing:0}
body:not(.v2-mode-qhse) #qp-barreras{display:none}
#qhse-panel #v2-qhse{position:static;display:block;width:auto;margin:0;padding:2px 0 0;border:0;border-radius:0;background:none;box-shadow:none}
#qhse-panel #v2-qhse .v2-barrier{font-size:11.5px}
#qhse-panel #legend{position:static!important;left:auto!important;bottom:auto!important;max-width:none!important;border-width:1px 0 0;border-radius:0;background:none;box-shadow:none;font-size:12px;transition:none}
#qhse-panel #legend b{color:#e8c978}
@media(max-width:1050px){#qhse-panel{width:260px;max-height:calc(100% - 125px)}}
@media(max-width:700px){#qhse-panel,#tree.collapsed ~ #qhse-panel{left:8px;right:8px;top:8px;width:auto;max-height:45%}#qp-barreras{display:none!important}}
@media(prefers-reduced-motion:reduce){#qhse-panel{transition:none}}
`
  document.head.appendChild(style)
})
