/*
 * 44-meta-circulacion.js · TACKER 10 · ficha de confiabilidad del componente 10 (`circulacion`).
 *
 * `__TACKER_META` es la tabla del módulo de producto del visor (se crea DESPUÉS del bundle, ver el parche en scripts/build-legacy.mjs),
 * por eso la ficha se aplica cuando arranca (`tacker:boot`) o, si ya arrancó, de inmediato. Grado C = geometría visible (piletas,
 * bomba y manifold del modelo SK-575). Volúmenes: folleto (40 m³ / cubicador 3,5 m³) vs plano de piletas (15,5 + 15,5 + 7 = 38 m³)
 * rotulados como fuente en conflicto, sin elegir.
 */
;(() => {
  'use strict'

  const META_CIRCULACION = {
    grade: 'C',
    status: 'Fuente en conflicto',
    basis:
      'Geometría: modelo de referencia SK-575 (C, src-modelo-sk575) · Datos: plano "Pileta TACKER 1-2-3" (src-plano-piletas), layout WS10 (src-layout-ws10), folleto (src-folleto)',
    note:
      'Piletas (plano, A): patín 12.000 × 2.400 mm, cuba 11.000 × 2.300 mm, alto 1.742 mm, compartimentos 4.500/4.500/2.000 mm (15,5/15,5/7 m³ = 38 m³); ' +
      'en el modelo el golpeador lleva un tanque de 3 m³. Fuente en conflicto: el folleto da pileta de ensayo de 40 m³ y cubicador de 3,5 m³ (equivalencia no confirmada). ' +
      'Bomba triplex: huella 6 × 2,4 m (layout WS10, A); power end, fluid end de 3 cilindros, múltiples, amortiguador y válvula de seguridad por referencia fotográfica genérica (C; marca, camisas, carrera y presión PENDIENTES), motor ilustrativo. Fosa de quema (88-fosa-quema.js): posición, dimensiones, diámetro y ruteo de las dos líneas (choke manifold y golpeador) tomados de un esquema sin cotas, ilustrativos y pendientes de validación; NO son distancias de seguridad; llamas y humo = efecto visual, no simulación. Camionetas y manipulador telescópico: modelos genéricos ilustrativos (marca, modelo y capacidades pendientes). Trip tank: huella ≈ 2,1 × 2,3 m (C) con escalera, nervaduras, rebose y bomba centrífuga de referencia genérica; capacidad PENDIENTE. Manifold de ahogo: esquema sin identificar con escala de otro equipo (TKR-08), ' +
      'no es el del TKR-10. Geometría aproximada, no as-built. Pendientes: presión de trabajo, conexiones y ruteo del golpeador.',
  }

  const applyMeta = () => {
    const meta = window.__TACKER_META
    if (meta && meta.circulacion) Object.assign(meta.circulacion, META_CIRCULACION)
  }
  if (window.__tackerBooted) applyMeta()
  else document.addEventListener('tacker:boot', applyMeta, { once: true })
})()
