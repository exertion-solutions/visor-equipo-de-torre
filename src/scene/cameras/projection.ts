import type { Vec3 } from '@/lib/geometry'

/**
 * Proyección de cámara, heredada del visor legacy (Digital_Rig_V2.html, `#c-ortho`).
 * Lógica pura (sin three ni React) para poder probarla. Unidades: metros.
 */
export const PROJECTIONS = ['perspective', 'orthographic'] as const
export type Projection = (typeof PROJECTIONS)[number]

/**
 * El nativo arranca en perspectiva (su aspecto actual); el legacy arranca en ortográfica. Ver docs/FEATURE_PARITY.md.
 */
export const DEFAULT_PROJECTION: Projection = 'perspective'

export const PROJECTION_LABELS: Record<Projection, string> = {
  perspective: 'Perspectiva',
  orthographic: 'Ortográfica',
}

/** Alto del frustum ortográfico (m) de la vista general del legacy. */
export const ORTHO_SPAN = 44

/** Plano de recorte cercano y lejano de la cámara ortográfica del legacy. */
export const ORTHO_NEAR = 0.1
export const ORTHO_FAR = 600

export interface OrthoFrustum {
  left: number
  right: number
  top: number
  bottom: number
}

/**
 * Frustum ortográfico para un alto `span` (m) y el aspecto del canvas: el alto es fijo y el ancho sigue al aspecto.
 * El aspecto es ancho / max(1, alto), como en el legacy (un canvas sin alto no produce un frustum degenerado).
 */
export function orthoFrustum(span: number, width: number, height: number): OrthoFrustum {
  const aspect = width / Math.max(1, height)
  return {
    left: (-span * aspect) / 2,
    right: (span * aspect) / 2,
    top: span / 2,
    bottom: -span / 2,
  }
}

/** Alto del frustum al enfocar un componente en ortográfica: max(4, máx(alto, 0,75 × ancho, 0,75 × fondo) × 1,4 + 2). */
export function focusSpan(size: Vec3): number {
  return Math.max(4, Math.max(size[1], size[0] * 0.75, size[2] * 0.75) * 1.4 + 2)
}
