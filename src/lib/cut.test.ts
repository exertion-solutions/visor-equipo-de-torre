import { describe, expect, it } from 'vitest'
import { clampCutX, cutNote, isCutAway } from './cut'

describe('clampCutX', () => {
  it('acota a ±18 m y lleva al paso de 0,2', () => {
    expect(clampCutX(40)).toBe(18)
    expect(clampCutX(-40)).toBe(-18)
    expect(clampCutX(3.14)).toBeCloseTo(3.2, 10)
    expect(clampCutX(0)).toBe(0)
  })
  it('un valor inválido vuelve a 0', () => {
    expect(clampCutX(Number.NaN)).toBe(0)
  })
})

describe('isCutAway', () => {
  it('se quita lo de +X del plano y se conserva lo demás (el borde se conserva)', () => {
    expect(isCutAway(2.1, 2)).toBe(true)
    expect(isCutAway(2, 2)).toBe(false)
    expect(isCutAway(-30, 2)).toBe(false)
  })
})

describe('cutNote', () => {
  it('lleva la posición con coma y aclara que no hay tapas ni sólidos CAD', () => {
    expect(cutNote(-2.4)).toBe(
      'Corte visual X ≈ -2,4 m: superficies abiertas, sin tapas ni sólidos CAD.',
    )
    expect(cutNote(0)).toContain('≈ 0,0 m')
  })
})
