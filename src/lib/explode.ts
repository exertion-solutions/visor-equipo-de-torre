import type { Vec3 } from '@/lib/geometry'

/** Separación inicial al encender el despiece (la del V2: 60 %). */
export const DEFAULT_EXPLODE_AMOUNT = 0.6
/** Por debajo de esta diferencia el despiece "llega" al objetivo sin seguir animando (el V2 usa el mismo umbral). */
const SNAP = 0.001
/** Velocidad de la animación (1/s), la del V2. */
const SPEED = 7

/** Desplazamiento de un componente a un factor dado: `offset × factor`. Sin offset o con factor 0 = posición original. */
export function explodeTranslation(offset: Vec3 | undefined, factor: number): Vec3 {
  if (!offset || factor === 0) return [0, 0, 0]
  return [offset[0] * factor, offset[1] * factor, offset[2] * factor]
}

/** Lleva `current` hacia `target` en `dt` segundos (suavizado exponencial como el V2); llega exacto en el último paso. */
export function stepExplode(current: number, target: number, dt: number): number {
  const diff = target - current
  if (Math.abs(diff) < SNAP) return target
  return current + diff * Math.min(1, Math.max(dt, 0) * SPEED)
}

/** Separación pedida por la perilla: 1–100 % como fracción, acotada. */
export function clampExplodeAmount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_EXPLODE_AMOUNT
  return Math.min(1, Math.max(0.01, value))
}
