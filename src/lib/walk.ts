/**
 * Modo caminata (el de `87-recorridos` del V2): ojos a 1,70 m del terreno, 1,4 m/s, sin salir del vallado y sin atravesar equipos.
 * Lógica pura (sin three ni React): la colisión la resuelve quien llama con un callback `libre`.
 */
export const EYE_HEIGHT = 1.7
export const WALK_SPEED = 1.4
export const WALK_RADIUS = 0.35
/** Giro con las flechas izquierda y derecha (rad/s). */
export const TURN_SPEED = 1.5
/** Sensibilidad del mouse (rad/px) y límite de la mirada vertical (rad). */
export const MOUSE_SENSITIVITY = 0.0025
export const MAX_PITCH = 1.3

/** Un paso no dura más de 0,25 s: con pocos cuadros por segundo se camina 1,4 m/s reales sin dar un salto. */
export function stepSeconds(nowMs: number, lastMs: number): number {
  return Math.min(0.25, Math.max(0, nowMs - lastMs) / 1000)
}

/**
 * Desplazamiento horizontal de un paso. `forward` y `strafe` van en −1, 0 o 1; el vector se normaliza (en diagonal no se camina más
 * rápido). `yaw` mide desde +Z hacia +X: yaw = 0 mira a +Z.
 */
export function walkDelta(
  yaw: number,
  forward: number,
  strafe: number,
  seconds: number,
  speed = WALK_SPEED,
): [number, number] {
  const n = Math.hypot(forward, strafe)
  if (n === 0) return [0, 0]
  const sy = Math.sin(yaw)
  const cy = Math.cos(yaw)
  return [
    ((forward * sy - strafe * cy) / n) * speed * seconds,
    ((forward * cy + strafe * sy) / n) * speed * seconds,
  ]
}

/** Si el paso está obstruido, desliza por el eje libre (pared de costado); si ambos lo están, no se mueve. */
export function slide(
  x: number,
  z: number,
  dx: number,
  dz: number,
  free: (x: number, z: number, dx: number, dz: number) => boolean,
): [number, number] {
  if (free(x, z, dx, dz)) return [dx, dz]
  if (free(x, z, dx, 0)) return [dx, 0]
  if (free(x, z, 0, dz)) return [0, dz]
  return [0, 0]
}

export interface Fence {
  min: readonly [number, number]
  max: readonly [number, number]
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** Mantiene la posición dentro del vallado de la locación. */
export function clampToFence(x: number, z: number, fence: Fence): [number, number] {
  return [clamp(x, fence.min[0], fence.max[0]), clamp(z, fence.min[1], fence.max[1])]
}

/** Punto al que mira la cámara a `distance` m, dados el giro y la inclinación de la mirada. */
export function lookPoint(
  position: readonly [number, number, number],
  yaw: number,
  pitch: number,
  distance = 1,
): [number, number, number] {
  const c = Math.cos(pitch)
  return [
    position[0] + Math.sin(yaw) * c * distance,
    position[1] + Math.sin(pitch) * distance,
    position[2] + Math.cos(yaw) * c * distance,
  ]
}

/** Giro (yaw) de una dirección horizontal, con la misma convención que `walkDelta`. */
export function yawOf(dx: number, dz: number): number {
  return Math.atan2(dx, dz)
}
