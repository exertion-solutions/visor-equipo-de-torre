import type { Vec3 } from '@/lib/geometry'

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
