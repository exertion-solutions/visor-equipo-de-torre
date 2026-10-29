import type { Vec3 } from '@/lib/geometry'
import { ORTHO_SPAN, type Projection } from './projection'

/**
 * Vistas estándar, heredadas del visor legacy (Digital_Rig_V2.html).
 * Convención de escena: origen = boca de pozo a nivel de terreno, +X hacia el mástil,
 * el carrier se extiende hacia -X, Z lateral, Y arriba. Unidades: metros.
 */
export type CameraPresetId = 'iso' | 'front' | 'side' | 'top' | 'well'

export interface CameraPreset {
  position: Vec3
  target: Vec3
}

export const CAMERA_PRESETS: Record<CameraPresetId, CameraPreset> = {
  iso: { position: [40, 40, 42], target: [-2, 13, 0] },
  front: { position: [50, 15, 0], target: [-3, 15, 0] },
  side: { position: [-3, 15, 54], target: [-3, 15, 0] },
  // Z=0.02 evita la singularidad de la órbita mirando exactamente hacia abajo.
  top: { position: [-2.5, 72, 0.02], target: [-2.5, 0, 0] },
  well: { position: [6.5, 3.4, 5.5], target: [0, 2.4, 0] },
}

export const DEFAULT_CAMERA_PRESET: CameraPresetId = 'iso'

export const CAMERA_PRESET_IDS = [
  'iso',
  'front',
  'side',
  'top',
  'well',
] as const satisfies readonly CameraPresetId[]

export const CAMERA_PRESET_LABELS: Record<CameraPresetId, string> = {
  iso: 'Isométrica',
  front: 'Frontal',
  side: 'Lateral',
  top: 'Superior',
  well: 'Boca de pozo',
}

/**
 * Como el legacy (`Uh`): cada vista fija la proyección. Todas son ortográficas salvo "Boca de pozo", que es una vista
 * de recorrido y va en perspectiva.
 */
export const presetProjection = (id: CameraPresetId): Projection =>
  id === 'well' ? 'perspective' : 'orthographic'

/** Alto del frustum ortográfico (m) de cada vista: la superior abarca más (62 m) que las demás (44 m). */
export const presetSpan = (id: CameraPresetId): number => (id === 'top' ? 62 : ORTHO_SPAN)
