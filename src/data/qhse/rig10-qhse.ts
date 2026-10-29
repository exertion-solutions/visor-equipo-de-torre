import type { QhseDataset } from '@/types'
import { PENDING_TEXT } from './hazards'

/**
 * Riesgos, controles orientativos y zonas ilustrativas del equipo 10 que muestra el modo QHSE del motor nativo
 * (vienen del visor V2: "Barreras visuales QHSE" y `#t-zones`).
 *
 * TODO es `pendingValidation`, sin fuente: el V2 los traía sin documento que los respalde. Los controles se redactan como
 * recomendación ("se recomienda…"), nunca como obligación, y el evento y la consecuencia de cada riesgo quedan en
 * `PENDING_TEXT`: no se inventan. Las zonas son envolventes gráficas (`illustrative`): NO son exclusiones aprobadas ni
 * controles operacionales, y su medida no se muestra como valor ni como requisito.
 *
 * Marco de las zonas: plano XZ del marco de escena (origen = boca de pozo, +X hacia el mástil), en metros.
 */

/** Alto del mástil (104 ft, `sk575_mastil` · `heightM`): base del radio de la envolvente gráfica del mástil. */
export const MAST_HEIGHT_M = 31.71
/** Factor de la envolvente gráfica del mástil del V2 (1,1 × el largo del mástil); es una convención gráfica, no una distancia. */
export const MAST_ENVELOPE_FACTOR = 1.1

const PENDING = { status: 'pendingValidation' as const }

export const RIG10_QHSE: QhseDataset = {
  rigId: 'RIG-10',
  risks: [
    {
      id: 'riesgo-izaje',
      rigId: 'RIG-10',
      hazard: 'suspendedLoad',
      title: 'Izaje y carga suspendida',
      event: PENDING_TEXT,
      consequence: PENDING_TEXT,
      componentIds: ['sk575_aparejo', 'sk575_izaje', 'sk575_cuadro'],
      basis: PENDING,
    },
    {
      id: 'riesgo-control-pozo',
      rigId: 'RIG-10',
      hazard: 'wellControl',
      title: 'Control de pozo',
      event: PENDING_TEXT,
      consequence: PENDING_TEXT,
      componentIds: ['sk575_bop', 'sk575_acumulador', 'sk575_manifold'],
      basis: PENDING,
    },
    {
      id: 'riesgo-vientos',
      rigId: 'RIG-10',
      hazard: 'lineOfFire',
      title: 'Vientos, anclajes y líneas tensadas',
      event: PENDING_TEXT,
      consequence: PENDING_TEXT,
      componentIds: ['sk575_vientos', 'sk575_mastil'],
      basis: PENDING,
    },
    {
      id: 'riesgo-partes-moviles',
      rigId: 'RIG-10',
      hazard: 'pinchPoints',
      title: 'Partes móviles',
      event: PENDING_TEXT,
      consequence: PENDING_TEXT,
      componentIds: ['sk575_cuadro', 'sk575_llave', 'sk575_aparejo'],
      basis: PENDING,
    },
  ],
  barriers: [
    {
      id: 'control-izaje',
      riskId: 'riesgo-izaje',
      title: 'Izaje',
      description:
        'Se recomienda evitar la permanencia bajo cargas y dentro de trayectorias potenciales.',
      type: 'preventive',
      basis: PENDING,
    },
    {
      id: 'control-pozo',
      riskId: 'riesgo-control-pozo',
      title: 'Control de pozo',
      description:
        'Se recomienda validar el BOP, la presión y las líneas contra el programa o procedimiento aplicable.',
      type: 'preventive',
      basis: PENDING,
    },
    {
      id: 'control-vientos',
      riskId: 'riesgo-vientos',
      title: 'Vientos y anclajes',
      description:
        'Se recomienda considerar la zona de interferencia y las líneas tensadas; las distancias del modelo no sustituyen exclusiones aprobadas.',
      type: 'preventive',
      basis: PENDING,
    },
    {
      id: 'control-partes-moviles',
      riskId: 'riesgo-partes-moviles',
      title: 'Partes móviles',
      description:
        'Se recomienda tener presentes el malacate, el cable, la llave y los tubulares como fuentes de atrapamiento y línea de fuego.',
      type: 'preventive',
      basis: PENDING,
    },
  ],
  zones: [
    {
      id: 'zona-envolvente-mastil',
      riskId: 'riesgo-vientos',
      title: 'Envolvente gráfica del mástil',
      hazard: 'lineOfFire',
      // Centrada en el pie del mástil (x = −1 m, `MX` de cad/sk575/modelo.py).
      shape: { type: 'circle', center: [-1, 0], radiusM: MAST_ENVELOPE_FACTOR * MAST_HEIGHT_M },
      illustrative: true,
      basis: PENDING,
    },
    {
      id: 'zona-cable-tension',
      riskId: 'riesgo-vientos',
      title: 'Línea de cable en tensión',
      hazard: 'lineOfFire',
      // Huella en planta de la línea rápida: del tambor (x ≈ −5,76 m) a la corona (x ≈ +0,93 m, sobre el pozo).
      shape: { type: 'rect', center: [-2.415, 0], sizeM: [6.69, 2.6] },
      illustrative: true,
      basis: PENDING,
    },
    {
      id: 'zona-carga-suspendida',
      riskId: 'riesgo-izaje',
      title: 'Área bajo carga suspendida',
      hazard: 'suspendedLoad',
      shape: { type: 'circle', center: [0, 0], radiusM: 2.4 },
      illustrative: true,
      basis: PENDING,
    },
  ],
}

/** Leyenda y aviso que acompañan siempre a las zonas ilustrativas. */
export const ZONES_LEGEND_TITLE = 'ZONAS ILUSTRATIVAS — SIN VALIDAR'
export const ZONES_NOTICE =
  'Envolventes gráficas del modelo: las distancias del modelo no sustituyen exclusiones aprobadas ni son controles operacionales.'
export const CONTROLS_TITLE = 'Controles orientativos · verificar aplicabilidad'
