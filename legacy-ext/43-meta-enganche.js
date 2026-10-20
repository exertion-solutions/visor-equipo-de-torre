/*
 * Equipo 10 · 43-meta-enganche.js — ficha de confiabilidad del componente 12 (escalera y plataforma del enganchador).
 *
 * `window.__RIG_META` (tabla del módulo de producto) se crea DESPUÉS del bundle: se aplica cuando el visor
 * arranca (`window.__rigBooted` o evento `rig:boot`), igual que la ficha del componente 07 en 40-wellsite.js.
 * Grado C = geometría del modelo SK-575 (el piso de enganche va dentro del mástil SK). Cota del piso: plano 8123 (B en rig10.ts solo por el conflicto);
 * el 18,5 m del V2 procedural queda como fuente en conflicto (src-legacy-v2, estimación).
 */
;(() => {
  'use strict'
  const META_ENGANCHE = {
    grade: 'C',
    status: 'Aproximado',
    basis:
      'Geometría: modelo de referencia SK-575 (C, src-modelo-sk575) · Cota: plano 8123-1002-2611 (src-plano-8123)',
    note:
      'Piso de enganche a 20,629 m (68 ft, cota del plano 8123-1002-2611). Fuente en conflicto: el V2 procedural previo usaba 18,5 m ' +
      '(boardHeight del visor, estimación src-legacy-v2, retirado). Geometría del piso y de la escalera del modelo SK-575: aproximada, no as-built. ' +
      'Pendientes: cotas reales del piso y del peine (paso y ancho de dedos), espesor y tipo de chapa, capacidad de carga y validación de peligros de referencia.',
  }
  const applyMeta = () => {
    const meta = window.__RIG_META
    if (meta && meta.enganche) Object.assign(meta.enganche, META_ENGANCHE)
  }
  if (window.__rigBooted) applyMeta()
  else document.addEventListener('rig:boot', applyMeta, { once: true })
})()
