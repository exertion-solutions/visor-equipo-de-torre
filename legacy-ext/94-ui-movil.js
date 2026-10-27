/*
 * 94-ui-movil.js · ajustes de legibilidad en pantallas chicas.
 *
 *  1. La etiqueta de "Medir 2 puntos" (#cad-measure-label) queda por encima de las cotas (antes podía quedar tapada).
 *  2. Barra de menús desplazable (≤ 1050 px, ver 60-ui-controls.js): la barra de scroll está oculta, así que se marca con un
 *     degradado y una flecha el borde que tiene más menús fuera de pantalla. Son indicadores aparte (position:fixed,
 *     sin eventos): una máscara sobre la barra recortaría también los menús desplegables, que viven dentro de ella.
 *  3. Celular (≤ 700 px): la barra pasa a 2 filas en vez de desplazarse. Antes Medición, Exportar y Paneles quedaban fuera
 *     de pantalla y solo los delataba una flecha chica. Con 2 filas todos los menús quedan a la vista (los indicadores de 2.
 *     no aparecen porque ya no hay desplazamiento).
 *  4. Pantallas táctiles (pointer:coarse): botones de la barra de 40 px y controles de los menús de 44 px, para usar con
 *     guantes o al sol.
 */
window.__rigExt.onPost(() => {
  const style = document.createElement('style')
  style.textContent = `
    #cad-measure-label{z-index:3;box-shadow:0 0 0 2px rgba(0,0,0,.35)}
    .tm-mas{position:fixed;z-index:39;width:34px;pointer-events:none;display:none;align-items:center;color:#DDBB65;font:700 16px/1 sans-serif}
    .tm-mas.der{justify-content:flex-end;padding-right:2px;background:linear-gradient(to right,transparent,#0f141c 70%)}
    .tm-mas.izq{justify-content:flex-start;padding-left:2px;background:linear-gradient(to left,transparent,#0f141c 70%)}
    @media (max-width:700px){
      #v2-toolbar{flex-wrap:wrap!important;overflow-x:visible!important;row-gap:6px}
      #v2-toolbar > .tm-sep{display:none}
    }
    @media (pointer:coarse){
      #v2-toolbar .tm-btn,#v2-toolbar > .btn,#v2-modebar button{min-height:40px}
      .tm-pop .btn,.tm-pop select,.tm-pop input[type=range]{min-height:44px}
    }
  `
  document.head.appendChild(style)

  const bar = document.getElementById('v2-toolbar')
  if (!bar) return
  const ind = (lado, txt) => {
    const el = document.createElement('div')
    el.className = 'tm-mas ' + lado
    el.setAttribute('aria-hidden', 'true')
    el.textContent = txt
    document.body.appendChild(el)
    return el
  }
  const der = ind('der', '›')
  const izq = ind('izq', '‹')
  const marcar = () => {
    const r = bar.getBoundingClientRect()
    const resto = bar.scrollWidth - bar.clientWidth - bar.scrollLeft
    const visible = r.width > 0 && r.height > 0
    for (const [el, on, x] of [
      [der, visible && resto > 4, r.right - 34],
      [izq, visible && bar.scrollLeft > 4, r.left],
    ]) {
      el.style.display = on ? 'flex' : 'none'
      if (on)
        Object.assign(el.style, { left: x + 'px', top: r.top + 'px', height: r.height + 'px' })
    }
  }
  bar.addEventListener('scroll', marcar, { passive: true })
  window.addEventListener('resize', marcar)
  new ResizeObserver(marcar).observe(bar)
  marcar()
})
