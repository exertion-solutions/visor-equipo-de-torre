/*
 * 41-meta-aparejo.js · ficha de confiabilidad (`__TACKER_META`) del componente 04 `aparejo`.
 * La tabla META la crea el módulo de producto DESPUÉS del bundle: se aplica cuando el visor arranca (`tacker:boot`) o de inmediato si ya arrancó.
 * Grado C = confianza de la GEOMETRÍA visible (modelo SK-575, src-modelo-sk575). La de cada dato va en el texto (tacker10.ts, sk575_aparejo).
 * Líneas: conflicto C1 (placa 8 dibujadas · folleto 6) rotulado, no elegido.
 */
;(() => {
  'use strict'

  const META_APAREJO = {
    grade: 'C',
    status: 'Fuente en conflicto',
    basis:
      'Geometría: modelo de referencia SK-575 (C, src-modelo-sk575) · Datos: placa API (src-placa-api), folleto (src-folleto), planillas SOP 1110 (src-insp-sop1110)',
    note:
      'Líneas: Fuente en conflicto: placa 8 (capacidad de diseño, es lo dibujado) · folleto 6 (enhebrado operativo posible). Contar en el equipo. ' +
      'Aparejo 110 t y elevador 100 t (folleto, A); amelas 150 t, Ø 3", largo útil 73" (SOP 1110, A). Reeving esquemático; forma aproximada, no as-built. ' +
      'Pendientes: enhebrado real, color, modelo del elevador y de las amelas, existencia del elevador de varillas.',
  }

  const applyMeta = () => {
    const meta = window.__TACKER_META
    if (meta && meta.aparejo) Object.assign(meta.aparejo, META_APAREJO)
  }
  if (window.__tackerBooted) applyMeta()
  else document.addEventListener('tacker:boot', applyMeta, { once: true })
})()
