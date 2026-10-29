import type { DimensionLine } from '@/lib/dimensions'
import type { Vec3 } from '@/lib/geometry'

/**
 * Cotas del equipo 10 que dibuja el botón "Cotas" (equivale a `#c-dims` del V2). Cada una apunta a una especificación del
 * componente (ver `DimensionLine`); lo que se escribe acá es dónde va la línea (orientativo, marco de escena: origen = boca de
 * pozo, +X hacia el mástil).
 */
const MX = -1 // centro del mástil en X (cad/sk575/modelo.py)
const BASE_Y = 1.2192 // base del mástil sobre el suelo: 4 ft
const LEAN = (3.5 * Math.PI) / 180 // inclinación de trabajo
const SIDE = -2.8 // las líneas se dibujan del lado −Z, lejos de la casilla y de la escalera

const along = (from: Vec3, length: number, direction: Vec3): Vec3 => [
  from[0] + direction[0] * length,
  from[1] + direction[1] * length,
  from[2] + direction[2] * length,
]

const MAST_BASE: Vec3 = [MX, BASE_Y, SIDE]

export const RIG10_DIMENSIONS: readonly DimensionLine[] = [
  {
    id: 'altura-mastil',
    componentId: 'sk575_mastil',
    specKey: 'heightM',
    meters: 31.71,
    from: MAST_BASE,
    // Medida sobre el eje del mástil, inclinado 3,5° hacia el pozo.
    to: along(MAST_BASE, 31.71, [Math.sin(LEAN), Math.cos(LEAN), 0]),
  },
  {
    id: 'altura-piso',
    componentId: 'sk575_piso',
    specKey: 'floorHeightM',
    meters: 3.606,
    from: [2.6, 0, SIDE],
    to: [2.6, 3.606, SIDE],
  },
  {
    id: 'largo-bastidor',
    componentId: 'sk575_carrier',
    specKey: 'frameLengthM',
    meters: 12.192,
    from: [-2 - 12.192, 0.3, SIDE],
    to: [-2, 0.3, SIDE],
  },
  {
    id: 'anclaje-lado-carrier',
    componentId: 'sk575_vientos',
    specKey: 'anchorDistance',
    meters: 27.4,
    valueText: '27,4 ± 3 m',
    from: [0, 0.15, SIDE - 1],
    to: [-27.4, 0.15, SIDE - 1],
  },
  {
    id: 'anclaje-lado-v',
    componentId: 'sk575_vientos',
    specKey: 'anchorDistance',
    meters: 24.4,
    valueText: '24,4 ± 3 m',
    from: [0, 0.15, SIDE - 1],
    to: [24.4, 0.15, SIDE - 1],
  },
]
