import { describe, expect, it } from 'vitest'
import { anyCut, clampCut, CUT_SPECS, cutNote, initialCuts, isCutAway, type Cuts } from './cut'

const con = (patch: Partial<Record<'x' | 'y' | 'z', number>>): Cuts => {
  const cuts = initialCuts()
  for (const [axis, value] of Object.entries(patch) as ['x' | 'y' | 'z', number][])
    cuts[axis] = { on: true, value }
  return cuts
}

describe('clampCut', () => {
  it('acota cada eje a su rango y lo lleva al paso', () => {
    expect(clampCut('x', 40)).toBe(18)
    expect(clampCut('x', -40)).toBe(-18)
    expect(clampCut('x', 3.14)).toBe(3.2)
    expect(clampCut('y', 0)).toBe(0.5)
    expect(clampCut('y', 99)).toBe(34)
    expect(clampCut('y', 12.34)).toBe(12.3)
    expect(clampCut('z', -99)).toBe(-15)
    expect(clampCut('z', 3.3)).toBe(3.3)
  })
  it('un valor inválido vuelve a la posición inicial del eje', () => {
    expect(clampCut('x', Number.NaN)).toBe(0)
    expect(clampCut('y', Number.NaN)).toBe(12)
  })
  it('las posiciones iniciales son las del V2', () => {
    expect([CUT_SPECS.x.initial, CUT_SPECS.y.initial, CUT_SPECS.z.initial]).toEqual([0, 12, 0])
  })
})

describe('isCutAway', () => {
  it('sin cortes encendidos nada se descarta', () => {
    expect(isCutAway([99, 99, 99], initialCuts())).toBe(false)
  })
  it('X quita lo de +X, Y lo de arriba y Z lo de +Z (el borde se conserva)', () => {
    expect(isCutAway([2.1, 0, 0], con({ x: 2 }))).toBe(true)
    expect(isCutAway([2, 0, 0], con({ x: 2 }))).toBe(false)
    expect(isCutAway([0, 12.1, 0], con({ y: 12 }))).toBe(true)
    expect(isCutAway([0, 11, 0], con({ y: 12 }))).toBe(false)
    expect(isCutAway([0, 0, 1], con({ z: 0 }))).toBe(true)
    expect(isCutAway([0, 0, -1], con({ z: 0 }))).toBe(false)
  })
  it('se combinan: basta con que lo recorte uno', () => {
    const cuts = con({ x: 0, y: 5 })
    expect(isCutAway([-3, 6, 0], cuts)).toBe(true)
    expect(isCutAway([1, 2, 0], cuts)).toBe(true)
    expect(isCutAway([-1, 2, 0], cuts)).toBe(false)
  })
  it('un eje apagado no recorta aunque tenga posición', () => {
    expect(isCutAway([0, 50, 0], con({ x: 10 }))).toBe(false)
  })
})

describe('cutNote', () => {
  it('lleva cada eje activo con su posición (coma decimal) y aclara que no hay tapas ni sólidos CAD', () => {
    expect(cutNote(con({ x: -2.4 }))).toBe(
      'Corte visual X ≈ -2,4 m: superficies abiertas, sin tapas ni sólidos CAD.',
    )
    expect(cutNote(con({ x: 0, y: 12 }))).toBe(
      'Corte visual X ≈ 0,0 m · Y ≈ 12,0 m: superficies abiertas, sin tapas ni sólidos CAD.',
    )
  })
})

describe('anyCut', () => {
  it('dice si hay algún corte encendido', () => {
    expect(anyCut(initialCuts())).toBe(false)
    expect(anyCut(con({ z: 1 }))).toBe(true)
  })
})
