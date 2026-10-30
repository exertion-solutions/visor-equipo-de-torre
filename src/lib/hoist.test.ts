import { describe, expect, it } from 'vitest'
import {
  cableStretch,
  clampHoist,
  HOIST_MAX,
  HOIST_MIN,
  HOIST_REST,
  stepHoist,
  type HoistState,
} from './hoist'

describe('clampHoist', () => {
  it('acota a 7–25 m y lleva al paso de 0,05', () => {
    expect(clampHoist(3)).toBe(HOIST_MIN)
    expect(clampHoist(99)).toBe(HOIST_MAX)
    expect(clampHoist(14.02)).toBe(14)
    expect(clampHoist(14.03)).toBe(14.05)
  })
  it('un valor inválido vuelve al reposo (14 m)', () => {
    expect(clampHoist(Number.NaN)).toBe(HOIST_REST)
  })
})

describe('stepHoist', () => {
  it('sube o baja a 1 m/s', () => {
    expect(stepHoist({ height: 14, dir: 1 }, 0.02)).toEqual({ height: 14.02, dir: 1 })
    expect(stepHoist({ height: 14, dir: -1 }, 0.02).height).toBeCloseTo(13.98, 10)
  })
  it('limita el paso a 50 ms: un cuadro lento no da un salto', () => {
    expect(stepHoist({ height: 14, dir: 1 }, 2).height).toBeCloseTo(14.05, 10)
    expect(stepHoist({ height: 14, dir: 1 }, -1).height).toBe(14)
  })
  it('rebota en los extremos', () => {
    expect(stepHoist({ height: 24.99, dir: 1 }, 0.05)).toEqual({ height: HOIST_MAX, dir: -1 })
    expect(stepHoist({ height: 7.01, dir: -1 }, 0.05)).toEqual({ height: HOIST_MIN, dir: 1 })
  })
  it('un recorrido completo ida y vuelta pasa por ambos extremos y no se sale', () => {
    let s: HoistState = { height: HOIST_REST, dir: 1 }
    let max = 0
    let min = 99
    for (let i = 0; i < 2000; i++) {
      s = stepHoist(s, 0.05)
      max = Math.max(max, s.height)
      min = Math.min(min, s.height)
      expect(s.height).toBeGreaterThanOrEqual(HOIST_MIN)
      expect(s.height).toBeLessThanOrEqual(HOIST_MAX)
    }
    expect([max, min]).toEqual([HOIST_MAX, HOIST_MIN])
  })
})

describe('cableStretch', () => {
  it('en reposo (dy = 0) no estira', () => {
    expect(cableStretch(32.4, 10.6, 0)).toEqual({ scale: 1, offset: 0 })
  })
  it('el extremo inferior sigue al bloque y el superior queda en la corona', () => {
    const top = 32.4
    const bottom = 10.6
    for (const dy of [-7, -3.5, 4, 11]) {
      const { scale, offset } = cableStretch(top, bottom, dy)
      // Alturas resultantes de los extremos: y' = escala·y + corrimiento.
      expect(scale * top + offset).toBeCloseTo(top, 10)
      expect(scale * bottom + offset).toBeCloseTo(bottom + dy, 10)
    }
  })
  it('nunca se aplasta del todo ni con una línea degenerada', () => {
    expect(cableStretch(30, 10, 25).scale).toBe(0.05)
    expect(cableStretch(10, 10, 3)).toEqual({ scale: 1, offset: 0 })
  })
})
