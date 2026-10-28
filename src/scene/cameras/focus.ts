import type { Vec3 } from '@/lib/geometry'

/**
 * Foco de cámara sobre un componente, heredado del visor legacy (Digital_Rig_V2.html, `#d-focus`).
 * Lógica pura (sin three ni React) para poder probarla. Unidades: metros.
 */
export interface CameraView {
  position: Vec3
  target: Vec3
}

/** Caja envolvente de un componente en coordenadas de escena. */
export interface Bounds {
  min: Vec3
  max: Vec3
}

/** Duración de la transición de cámara del legacy (foco, "Volver" y vistas estándar). */
export const FOCUS_DURATION_MS = 600

const MIN_DISTANCE = 6
const MAX_DISTANCE = 70

/** Dirección de respaldo cuando la cámara mira casi en vertical (cenital/nadir) o coincide con el objetivo. */
const FALLBACK_DIRECTION: Vec3 = normalize([0.6, 0.35, 0.72])

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2])
  return [v[0] / len, v[1] / len, v[2] / len]
}

/** Distancia de la cámara al centro del componente: clamp(dimensión máx. × 1,35 + 3, 6, 70). */
export function focusDistance(size: Vec3): number {
  const largest = Math.max(size[0], size[1], size[2])
  return Math.min(Math.max(largest * 1.35 + 3, MIN_DISTANCE), MAX_DISTANCE)
}

/** Dirección objetivo → cámara (unitaria). Se conserva salvo vista casi cenital (y > 0,8) o rasante (y < 0,05). */
export function focusDirection(position: Vec3, target: Vec3): Vec3 {
  const d: Vec3 = [position[0] - target[0], position[1] - target[1], position[2] - target[2]]
  if (Math.hypot(d[0], d[1], d[2]) === 0) return FALLBACK_DIRECTION
  const n = normalize(d)
  return n[1] > 0.8 || n[1] < 0.05 ? FALLBACK_DIRECTION : n
}

/** Vista que encuadra el componente: objetivo en el centro de su caja, cámara a `focusDistance` en la dirección actual. */
export function computeFocusView(bounds: Bounds, current: CameraView): CameraView {
  const center: Vec3 = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ]
  const size: Vec3 = [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  ]
  const dir = focusDirection(current.position, current.target)
  const dist = focusDistance(size)
  return {
    position: [center[0] + dir[0] * dist, center[1] + dir[1] * dist, center[2] + dir[2] * dist],
    target: center,
  }
}

/** Ease-in-out cúbico del legacy: t en [0, 1]. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function lerpVec(a: Vec3, b: Vec3, k: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

/** Interpolación lineal de posición y objetivo (k ya suavizado con `easeInOutCubic`). */
export function lerpView(from: CameraView, to: CameraView, k: number): CameraView {
  return {
    position: lerpVec(from.position, to.position, k),
    target: lerpVec(from.target, to.target, k),
  }
}
