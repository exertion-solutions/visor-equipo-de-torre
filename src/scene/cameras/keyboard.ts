import type { Vec3 } from '@/lib/geometry'

/**
 * Manejo de la cámara con teclado (el de `72-teclado` del V2): flechas giran e inclinan, Mayús + flechas desplazan, + y − hacen zoom.
 * Lógica pura sobre posición y objetivo (metros, Y arriba); la aplica `KeyboardRig` a la cámara y a los controles de órbita.
 */
export const YAW_STEP_DEG = 7.5
export const TILT_STEP_DEG = 5
export const ZOOM_FACTOR = 1.15
export const PAN_FRACTION = 0.05

export type KeyAction =
  | { type: 'yaw'; deg: number }
  | { type: 'tilt'; deg: number }
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'zoom'; factor: number }
  | { type: 'help' }
  | { type: 'close' }

/** Acción de una tecla (`null` si no es un atajo): la tabla del V2. */
export function keyAction(key: string, shift: boolean): KeyAction | null {
  switch (key) {
    case '?':
    case 'h':
    case 'H':
      return { type: 'help' }
    case 'Escape':
      return { type: 'close' }
    case '+':
    case '=':
      return { type: 'zoom', factor: ZOOM_FACTOR }
    case '-':
    case '_':
      return { type: 'zoom', factor: 1 / ZOOM_FACTOR }
    case 'ArrowLeft':
      return shift ? { type: 'pan', dx: -1, dy: 0 } : { type: 'yaw', deg: -YAW_STEP_DEG }
    case 'ArrowRight':
      return shift ? { type: 'pan', dx: 1, dy: 0 } : { type: 'yaw', deg: YAW_STEP_DEG }
    case 'ArrowUp':
      return shift ? { type: 'pan', dx: 0, dy: 1 } : { type: 'tilt', deg: TILT_STEP_DEG }
    case 'ArrowDown':
      return shift ? { type: 'pan', dx: 0, dy: -1 } : { type: 'tilt', deg: -TILT_STEP_DEG }
    default:
      return null
  }
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const len = (v: Vec3) => Math.hypot(v[0], v[1], v[2])

/** Gira la cámara alrededor del eje vertical que pasa por el objetivo (grados; + = hacia +X desde −Z, como el V2). */
export function orbitYaw(position: Vec3, target: Vec3, deg: number): Vec3 {
  const o = sub(position, target)
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  // Rotación alrededor de Y (la misma de `applyAxisAngle(Y, a)`).
  return add(target, [o[0] * c + o[2] * s, o[1], -o[0] * s + o[2] * c])
}

/**
 * Inclina la cámara (sube o baja) alrededor del objetivo. No pasa por la vertical ni baja del horizonte: el mismo criterio que
 * la órbita con mouse. Devuelve la posición actual si el giro se saldría de ese rango.
 */
export function orbitTilt(position: Vec3, target: Vec3, deg: number): Vec3 {
  const o = sub(position, target)
  const l = len(o)
  if (l === 0) return position
  // Eje horizontal perpendicular a la dirección (Y × o), normalizado.
  const rx = o[2]
  const rz = -o[0]
  const rl = Math.hypot(rx, rz)
  if (rl === 0) return position
  const axis: Vec3 = [rx / rl, 0, rz / rl]
  const a = (-deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  const d = axis[0] * o[0] + axis[2] * o[2]
  // Rodrigues: o·c + (axis × o)·s + axis·(axis·o)(1 − c)
  const cross: Vec3 = [
    axis[1] * o[2] - axis[2] * o[1],
    axis[2] * o[0] - axis[0] * o[2],
    axis[0] * o[1] - axis[1] * o[0],
  ]
  const n: Vec3 = [
    o[0] * c + cross[0] * s + axis[0] * d * (1 - c),
    o[1] * c + cross[1] * s,
    o[2] * c + cross[2] * s + axis[2] * d * (1 - c),
  ]
  const angle = Math.acos(Math.max(-1, Math.min(1, n[1] / len(n))))
  // Tampoco se cruza la vertical (el V2 lo permitía si caía a más de 0,05 rad del otro lado, y la vista se daba vuelta).
  const cruza = n[0] * o[0] + n[2] * o[2] <= 0
  if (cruza || angle < 0.05 || angle > Math.PI / 2 - 0.01) return position
  return add(target, n)
}

/** Cuánto se desplaza un paso de Mayús + flecha: 5 % de la distancia (perspectiva) o de 40 m / zoom (ortográfica). */
export function panStep(distance: number, zoom: number, orthographic: boolean): number {
  return (orthographic ? 40 / (zoom || 1) : distance) * PAN_FRACTION
}

/** Zoom en perspectiva: acerca o aleja manteniendo la dirección, entre 2 y 400 m del objetivo. */
export function zoomDistance(distance: number, factor: number): number {
  return Math.max(2, Math.min(400, distance / factor))
}

/** Zoom en ortográfica: escala la cámara entre 0,2 y 40. */
export function zoomOrtho(zoom: number, factor: number): number {
  return Math.max(0.2, Math.min(40, zoom * factor))
}
