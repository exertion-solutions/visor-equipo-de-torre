/** Recorrido del aparejo (bloque con gancho, amelas y elevador), el del V2: ilustrativo, sin validar. */
export const HOIST_MIN = 7
export const HOIST_MAX = 25
export const HOIST_STEP = 0.05
/** Altura del bloque en reposo (m): la del modelo (`cad/sk575/modelo.py`, ZA) y el valor inicial del deslizador. */
export const HOIST_REST = 14
/** Velocidad de la animación (m/s), la del V2. */
export const HOIST_SPEED = 1
/** Aviso al animar: es didáctica, no una simulación dinámica. */
export const HOIST_NOTICE =
  'Animación didáctica: recorrido y aparejado sin validar. No es una simulación dinámica.'

export function clampHoist(value: number): number {
  if (!Number.isFinite(value)) return HOIST_REST
  const clamped = Math.min(HOIST_MAX, Math.max(HOIST_MIN, value))
  return Number((Math.round(clamped / HOIST_STEP) * HOIST_STEP).toFixed(6))
}

export interface HoistState {
  /** Altura actual del bloque (m). */
  height: number
  /** +1 sube, −1 baja. */
  dir: 1 | -1
}

/**
 * Un paso de la animación: sube o baja a 1 m/s y rebota en los extremos (7 y 25 m). Como el V2, cada paso se limita a 50 ms
 * para que un cuadro lento no dé un salto.
 */
export function stepHoist(state: HoistState, dt: number): HoistState {
  const step = Math.min(Math.max(dt, 0), 0.05) * HOIST_SPEED
  let height = state.height + state.dir * step
  let dir = state.dir
  if (height >= HOIST_MAX) {
    height = HOIST_MAX
    dir = -1
  } else if (height <= HOIST_MIN) {
    height = HOIST_MIN
    dir = 1
  }
  return { height, dir }
}

/**
 * Las líneas del aparejo van de la corona (fija) al bloque: se estiran en vertical desde su extremo superior. `top` y `bottom` son
 * las alturas de la línea en reposo y `dy` lo que bajó o subió el bloque. Devuelve la escala en Y y el corrimiento que deja el
 * extremo superior en su lugar (mínimo 5 % para que nunca se aplaste del todo).
 */
export function cableStretch(
  top: number,
  bottom: number,
  dy: number,
): { scale: number; offset: number } {
  const span = top - bottom
  if (span <= 0) return { scale: 1, offset: 0 }
  const scale = Math.max(0.05, (top - (bottom + dy)) / span)
  return { scale, offset: top * (1 - scale) }
}
