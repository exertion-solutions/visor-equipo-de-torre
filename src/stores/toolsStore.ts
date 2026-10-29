import { create } from 'zustand'
import type { Vec3 } from '@/lib/geometry'

/**
 * Herramientas de inspección del motor nativo (equivalen a `#c-dims` y `#c-measure` del V2): cotas del equipo y medición
 * entre dos puntos de la superficie del modelo.
 */
interface ToolsState {
  /** Cotas del equipo dibujadas con su nivel A/B/C. */
  dims: boolean
  /** Modo medir: los clics sobre el modelo ponen puntos en lugar de seleccionar. */
  measure: boolean
  /** Puntos medidos (0, 1 o 2), en el marco de la escena. */
  points: readonly Vec3[]
  toggleDims: () => void
  /** Activa o desactiva el modo medir. Desactivarlo no borra la medición hecha (como el V2): se borra con `clearMeasure`. */
  toggleMeasure: () => void
  /** Agrega un punto; con dos ya puestos, el siguiente clic empieza una medición nueva. */
  addPoint: (point: Vec3) => void
  clearMeasure: () => void
}

export const useToolsStore = create<ToolsState>()((set) => ({
  dims: false,
  measure: false,
  points: [],
  toggleDims: () => set((s) => ({ dims: !s.dims })),
  toggleMeasure: () => set((s) => ({ measure: !s.measure })),
  addPoint: (point) =>
    set((s) => ({ points: s.points.length >= 2 ? [point] : [...s.points, point] })),
  clearMeasure: () => set({ points: [] }),
}))

/** Texto de ayuda del modo medir (el del V2); vacío fuera de ese modo. */
export function measureHint(measure: boolean, pointCount: number): string {
  if (!measure) return ''
  if (pointCount === 0) return 'Hacé clic en dos superficies del modelo. Valores aproximados.'
  if (pointCount === 1) return 'Seleccioná el segundo punto de la superficie.'
  return 'Medición aproximada entre superficies. Otro clic inicia una nueva.'
}
