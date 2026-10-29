import { describe, expect, it } from 'vitest'
import { clampExplodeAmount, explodeTranslation, stepExplode } from './explode'

describe('explodeTranslation', () => {
  it('con factor 0 deja el componente en su posición original', () => {
    expect(explodeTranslation([5, 3, -2], 0)).toEqual([0, 0, 0])
  })
  it('es el offset autorado por el factor', () => {
    expect(explodeTranslation([5, 3, -2], 0.5)).toEqual([2.5, 1.5, -1])
    expect(explodeTranslation([5, 3, -2], 1)).toEqual([5, 3, -2])
  })
  it('un componente sin offset no se mueve', () => {
    expect(explodeTranslation(undefined, 1)).toEqual([0, 0, 0])
  })
})

describe('stepExplode', () => {
  it('avanza hacia el objetivo sin pasarse', () => {
    const a = stepExplode(0, 1, 1 / 60)
    expect(a).toBeGreaterThan(0)
    expect(a).toBeLessThan(1)
    expect(stepExplode(0, 1, 10)).toBe(1)
  })
  it('también vuelve a 0 y llega exacto', () => {
    expect(stepExplode(0.0004, 0, 0.016)).toBe(0)
    expect(stepExplode(0.6, 0, 1 / 60)).toBeLessThan(0.6)
  })
  it('sin tiempo no se mueve', () => {
    expect(stepExplode(0.2, 1, 0)).toBe(0.2)
  })
})

describe('clampExplodeAmount', () => {
  it('acota entre 1 % y 100 %', () => {
    expect(clampExplodeAmount(0)).toBe(0.01)
    expect(clampExplodeAmount(3)).toBe(1)
    expect(clampExplodeAmount(0.4)).toBe(0.4)
  })
  it('un valor inválido vuelve al de arranque', () => {
    expect(clampExplodeAmount(Number.NaN)).toBe(0.6)
  })
})
