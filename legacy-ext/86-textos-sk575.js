/*
 * 86-textos-sk575.js · textos del V2 alineados con el SK-575 (único equipo visible desde 84-modelo-sk575.js).
 *
 * El original (reference/legacy/, inmutable) describe la geometría procedural, hoy oculta. Este módulo reescribe EN RUNTIME:
 *  1. Fichas `__RIG_META` de mastil, subestructura, motor, cabina, camion, malacate, caballetes y vientos: `grade` = confianza de la
 *     GEOMETRÍA visible (modelo SK-575 = C); la confianza de cada dato va en el texto con su fuente (src/data/rigs/rig10.ts).
 *     Aparejo, BOP, enganche y circulación tienen su ficha en 41/40/43/44.
 *  2. Controles de `aparejo` y `vientos` (`R.COMPONENTS[id].epp`): recomendación, pendiente de validación (sin procedimiento).
 *  3. Párrafos del modal "Referencia, criterios y alcance". La nota del izamiento la escribe 81.
 * Conflictos de fuentes (C1 líneas, C3 piso, C4 anclajes, C5 ejes, capacidad 330.000 vs placa) se rotulan, no se eligen.
 * Solo valores ya registrados en el repo; nada de esto es as-built ni cálculo.
 */
;(() => {
  'use strict'

  const GEO = 'Geometría: modelo de referencia SK-575 (C, src-modelo-sk575)'
  const NO_AS_BUILT = 'Geometría aproximada, no as-built ni apta para fabricación.'
  const PV = ' (pendiente de validación)'

  const META_SK = {
    mastil: {
      grade: 'C',
      status: 'Fuente en conflicto',
      basis: `${GEO} · Datos: placa API (src-placa-api), plano del mástil (src-plano-mastil), plano HYCO (src-plano-hyco), folleto (src-folleto)`,
      note:
        'SK DKA104-330-08, (placa, A). Altura 104 ft = 31,71 m (plano del mástil, A); piso de enganche 68 ft = 20,629 m (plano del mástil; en conflicto con 18,5 m del V2 procedural previo); inclinación de trabajo 3,5° (placa, A). ' +
        'Capacidad: Fuente en conflicto: placa 325.725 lb, carga estática máx. con vientos a 3,5° (A) · folleto 330.000 lb (designación del modelo, 330k). ' +
        'Cilindros de izaje HYCO ×2 (plano, A). Perfiles, paneles, uniones y corona estimados; no verifica la carga de placa. ' +
        NO_AS_BUILT,
    },
    subestructura: {
      grade: 'C',
      status: 'Fuente en conflicto',
      basis: `${GEO} · Datos: plano del mástil (src-plano-mastil), planos del piso (src-planos-piso), plano escalera (src-plano-escalera), folleto (src-folleto)`,
      note:
        'Altura del piso: Fuente en conflicto: plano del mástil 3,606 m (12 ft, B, es lo dibujado) · folleto regulable 1–4 m (modelo 3 m) · V2 procedural previo 2,30 m (estimación src-legacy-v2, retirado). ' +
        'Piso 2.600 × 3.304 mm, abertura de pozo 730 × 700 mm, 1.400 kg (planos del piso, A); escalera a 45° (plano, A). Subestructura y uniones estimadas. ' +
        NO_AS_BUILT,
    },
    motor: {
      grade: 'C',
      status: 'Aproximado',
      basis: `${GEO} · Datos: spec sheet SK-575 (src-sk575-spec)`,
      note:
        'Detroit Series 60 475 HP y transmisión Allison 4500 OFS (spec SK-575, A). Pieza propia del SK-575: motor bajo capot, radiador, escape, transmisión y cardán (sub-nodo del carrier, C). ' +
        NO_AS_BUILT,
    },
    cabina: {
      grade: 'C',
      status: 'Aproximado',
      basis: `${GEO} · Datos: Parts Manual (src-parts-sk575, medido, sin contrastar)`,
      note:
        'La pieza SK-575 es la media cabina de manejo del carrier (one-man cab). La consola del maquinista figura en el Parts Manual sin geometría ubicable: no está modelada' +
        PV +
        '. ' +
        NO_AS_BUILT,
    },
    camion: {
      grade: 'C',
      status: 'Fuente en conflicto',
      basis: `${GEO} · Datos: spec sheet SK-575 (src-sk575-spec), Parts Manual (src-parts-sk575, medido, sin contrastar), layout de locación 2019 (src-layout-2019)`,
      note:
        'Service King SK-575, 5 ejes; en ruta 14 ft 1" × 9 ft 6" × 68 ft, 97.000 lb (spec, A). Distancia entre ejes: Fuente en conflicto: spec 43 ft · Parts Manual ≈ 30 ft entre primer y último eje. ' +
        'Bastidor, cabina, motor, tanques y gatos medidos sobre la vista CAD del Parts Manual (C). ' +
        NO_AS_BUILT,
    },
    malacate: {
      grade: 'C',
      status: 'Aproximado',
      basis: `${GEO} · Datos: spec sheet SK-575 (src-sk575-spec), Parts Manual (src-parts-sk575)`,
      note:
        'Tambor principal 42 × 12", tambor de pistoneo 42 × 8", disco asistente doble 48,5", embragues 24" (spec SK-575, A). ' +
        'Posición de los tambores medida del Parts Manual (C); consola y líneas a la corona ilustrativas. ' +
        NO_AS_BUILT,
    },
    caballetes: {
      grade: 'C',
      status: 'Fuente en conflicto',
      basis: `${GEO} · Datos: layout de locación 2019 (src-layout-2019), layout de locación (src-layout)`,
      note:
        'Planchada: Fuente en conflicto: layout de locación 2019 12 × 2 m · layout de locación 12 × 2,4 m. Rampa, caballetes, línea HP y tiros de tubing ilustrativos (cantidad y disposición no documentadas). ' +
        NO_AS_BUILT,
    },
    vientos: {
      grade: 'C',
      status: 'Fuente en conflicto',
      basis: `${GEO} · Datos: placa API (src-placa-api), layout de locación 2019 (src-layout-2019), layout de locación (src-layout), folleto (src-folleto), manual derrick (src-manual-derrick)`,
      note:
        'Anclajes: Fuente en conflicto: folleto 20 m · layout de locación 25 ± 3 m · layout de locación 2019 27,4 ± 3 m (lado carrier) / 24,4 ± 3 m (lado V), ± 26,8 m laterales · ' +
        'placa 94 ft (28,7 m) / 82 ft (25 m), 68 ft laterales · manual derrick E/F/G 90/80/88 ft (no acotadas). El modelo dibuja el layout de locación 2019, sin confirmar su vigencia. ' +
        'Diámetros de los vientos según placa (A); pirosalva a 45 m (layout de locación 2019, A). No es diseño de anclaje ni distancia de exclusión. ' +
        NO_AS_BUILT,
    },
  }

  // Controles legacy sin fuente, redactados como obligación → recomendación pendingValidation (sin sourceId).
  const EPP = {
    aparejo: [
      'Verificar que el dispositivo anti-choque de corona (crown-o-matic) esté probado según el procedimiento aplicable' +
        PV,
      'Verificar la traba de seguridad del gancho' + PV,
      'Se recomienda no permanecer debajo de la carga suspendida' + PV,
      'Se recomienda comunicación clara maquinista–enganchador' + PV,
    ],
    vientos: [
      'Verificar anclajes al terreno, puntos de amarre al carrier y tensión según el procedimiento aplicable' +
        PV,
      'Se recomienda señalizar los vientos (p. ej. con banderines)' + PV,
      'Se recomienda suspender la operación con viento fuerte según el procedimiento aplicable' +
        PV,
      'Se recomienda inspeccionar grampas y guardacabos' + PV,
    ],
  }
  const FUNCION_VIENTOS =
    'Representación ilustrativa de cables de estabilización y anclajes. Anclajes ubicados según el layout de locación 2019 (27,4 ± 3 m lado carrier / 24,4 ± 3 m lado V, ± 26,8 m laterales). ' +
    'Fuente en conflicto con el layout de locación (25 ± 3 m), el folleto (20 m), la placa del mástil (94/82 ft, 68 ft laterales) y el manual derrick (90/80/88 ft). ' +
    'Alturas de toma, tensiones y capacidades no verificadas.'

  // Modal "Referencia, criterios y alcance": [fragmento del original, reemplazo]. Un fragmento ausente se ignora.
  const MODAL = [
    [
      'Se reproducen de forma aproximada la estructura reticulada, coronamiento rojo, barandas amarillas, plataforma lateral identificada y distribución general.',
      'La geometría visible es el modelo de referencia SK-575 (build123d), con cotas documentadas donde se indica y el resto estimado (confianza de la geometría C): no es as-built ni apta para fabricación.',
    ],
    [
      'Seis ramales según folleto.',
      'Líneas del aparejo: Fuente en conflicto: placa 8 (dibujadas en el modelo SK-575) · folleto 6 (enhebrado operativo posible); contar en el equipo.',
    ],
    [
      'Geometría procedural de mallas, sin motor CAD B-Rep ni archivos 3D externos.',
      'Equipo: modelo de referencia SK-575 modelado en build123d (B-Rep) y embebido como GLB; la geometría procedural previa queda oculta.',
    ],
  ]

  function aplicar() {
    const meta = window.__RIG_META
    if (meta)
      // cabina no tiene ficha en el original (el visor mostraba un genérico): se crea completa
      for (const [id, m] of Object.entries(META_SK)) meta[id] = Object.assign(meta[id] || {}, m)
    const C = window.__rig && window.__rig.COMPONENTS
    if (C) {
      for (const [id, epp] of Object.entries(EPP)) if (C[id]) C[id].epp = epp
      if (C.vientos) C.vientos.funcion = FUNCION_VIENTOS
    }
    const dlg = document.getElementById('ref-dialog')
    if (dlg)
      for (const el of dlg.querySelectorAll('p, li'))
        for (const [viejo, nuevo] of MODAL)
          if (el.innerHTML.includes(viejo)) el.innerHTML = el.innerHTML.replace(viejo, nuevo)
  }

  if (window.__rigBooted) aplicar()
  else document.addEventListener('rig:boot', aplicar, { once: true })
})()
