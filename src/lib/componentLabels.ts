import type { ComponentFamily } from '@/types'
import type { ComponentTreeGroup } from './componentTree'

/** Color del distintivo numerado de cada familia (como el V2, que colorea por familia). Solo orienta: no es un código de seguridad. */
export const FAMILY_COLORS: Record<ComponentFamily, string> = {
  carrier: '#e0504f',
  hoisting: '#b07ad6',
  mast: '#c8c2ae',
  workfloor: '#4cc9f0',
  power: '#f4a261',
  'well-control': '#ef476f',
  circulation: '#2ec4b6',
  auxiliary: '#9aa5b1',
  anchoring: '#ffd166',
  lighting: '#fff3b0',
}

/** Número de cada componente del árbol (1, 2, …) en el orden en que se muestra: el mismo en el panel y en las etiquetas. */
export function numberComponents(groups: readonly ComponentTreeGroup[]): Map<string, number> {
  const numbers = new Map<string, number>()
  for (const group of groups)
    for (const item of group.items)
      if (!numbers.has(item.id)) numbers.set(item.id, numbers.size + 1)
  return numbers
}

export interface LabelPosition {
  /** Píxeles CSS desde la esquina superior izquierda del lienzo. */
  x: number
  y: number
}

/**
 * Posición de pantalla de una etiqueta a partir del punto ya proyectado (coordenadas normalizadas del dispositivo), con la
 * regla del V2: se oculta (`null`) si el punto queda detrás de la cámara o más allá del plano lejano (|z| > 1) o a más de
 * un 10 % fuera de la pantalla (|x| o |y| > 1,1), para que una etiqueta no se corte a medias en el borde.
 */
export function labelPosition(
  ndc: { x: number; y: number; z: number },
  width: number,
  height: number,
): LabelPosition | null {
  if (ndc.z < -1 || ndc.z > 1 || Math.abs(ndc.x) > 1.1 || Math.abs(ndc.y) > 1.1) return null
  return { x: (ndc.x * 0.5 + 0.5) * width, y: (-ndc.y * 0.5 + 0.5) * height }
}
