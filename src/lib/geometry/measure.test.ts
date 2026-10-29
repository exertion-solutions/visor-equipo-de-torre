import { describe, expect, it } from 'vitest'
import {
  distance,
  formatApproxMeters,
  horizontalDistance,
  midpoint,
  verticalDistance,
} from './measure'

describe('measure', () => {
  it('distancia euclídea 3-4-5', () => {
    expect(distance([0, 0, 0], [3, 0, 4])).toBe(5)
  })

  it('distancia horizontal ignora Y', () => {
    expect(horizontalDistance([0, 10, 0], [3, 0, 4])).toBe(5)
  })

  it('distancia vertical es absoluta', () => {
    expect(verticalDistance([0, 2, 0], [0, -1, 0])).toBe(3)
  })

  it('punto medio', () => {
    expect(midpoint([0, 0, 0], [2, 4, 6])).toEqual([1, 2, 3])
  })

  it('las distancias anclaje-centro documentadas son consistentes (25 m por eje → 35,4 m de diagonal)', () => {
    expect(distance([0, 0, 0], [25, 0, 25])).toBeCloseTo(35.36, 2)
  })
})

describe('formatApproxMeters', () => {
  it('siempre rotula la medición como aproximada y del modelo, con dos decimales', () => {
    expect(formatApproxMeters(12.3456)).toBe('≈ 12,35 m · modelo')
    expect(formatApproxMeters(3)).toBe('≈ 3,00 m · modelo')
    expect(formatApproxMeters(0)).toBe('≈ 0,00 m · modelo')
  })
})
