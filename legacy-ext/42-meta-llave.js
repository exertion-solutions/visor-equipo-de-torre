/*
 * 42-meta-llave.js · Equipo 10 · ficha de confiabilidad del componente 08 (`llave`: llave hidráulica, contrafuerza y cuñas).
 *
 * `__RIG_META` es la tabla del módulo de producto, que se crea DESPUÉS del bundle: se completa cuando el módulo arranca
 * (`rig:boot`) o de inmediato si ya arrancó. Misma técnica que la ficha del componente 07 (final de 40-wellsite.js).
 * Grado C / Aproximado: la forma es una tipología genérica de referencia, no el equipo 10.
 */
;(() => {
  'use strict'
  const META_LLAVE = {
    grade: 'C',
    status: 'Aproximado',
    basis:
      'Referencia fotográfica genérica (2 fotos de llaves de catálogo) + Libro DROPS (grampas y perno del poste)',
    note:
      'Llave de tubing con contrafuerza, cuñas manuales, línea de suspensión y poste de retenida. Confirmado: posición sobre el ' +
      'piso de trabajo y los puntos DROPS PRL-1/2/3 (grampas, perno del brazo y eslinga). Aproximado: forma, cotas, ruteo de ' +
      'mangueras y disposición de válvulas; la aguja del manómetro queda en cero (no indica torque). Pendientes: fabricante y ' +
      'modelo, torque y capacidad, rango de diámetros, presión hidráulica y color real (rojo de la referencia).',
  }
  const applyMeta = () => {
    const meta = window.__RIG_META
    if (meta && meta.llave) Object.assign(meta.llave, META_LLAVE)
  }
  if (window.__rigBooted) applyMeta()
  else document.addEventListener('rig:boot', applyMeta, { once: true })
})()
