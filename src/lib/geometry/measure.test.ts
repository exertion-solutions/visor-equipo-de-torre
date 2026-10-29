import { describe, expect, it } from 'vitest'
import {
  angleAtVertex,
  distance,
  formatApproxAngle,
  formatApproxMeters,
  horizontalDistance,
  levelDifference,
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

describe('ángulo y desnivel', () => {
  it('ángulos conocidos con el vértice en B', () => {
    expect(angleAtVertex([1, 0, 0], [0, 0, 0], [0, 1, 0])).toBeCloseTo(90, 10)
    expect(angleAtVertex([1, 0, 0], [0, 0, 0], [-1, 0, 0])).toBeCloseTo(180, 10)
    expect(angleAtVertex([1, 0, 0], [0, 0, 0], [2, 0, 0])).toBeCloseTo(0, 5)
    expect(angleAtVertex([1, 0, 0], [0, 0, 0], [1, 1, 0])).toBeCloseTo(45, 10)
    // El vértice es el segundo punto: mover B cambia el ángulo.
    expect(angleAtVertex([0, 0, 0], [1, 0, 0], [1, 1, 0])).toBeCloseTo(90, 10)
  })
  it('es simétrico en A y C y no depende de la escala', () => {
    const a = angleAtVertex([3, 1, 2], [0, 0, 0], [-1, 4, 2])
    expect(a).toBeCloseTo(angleAtVertex([-1, 4, 2], [0, 0, 0], [3, 1, 2])!, 10)
    expect(a).toBeCloseTo(angleAtVertex([30, 10, 20], [0, 0, 0], [-10, 40, 20])!, 10)
  })
  it('con un lado de largo cero el ángulo no está definido', () => {
    expect(angleAtVertex([1, 1, 1], [1, 1, 1], [2, 3, 4])).toBeNull()
    expect(formatApproxAngle([1, 1, 1], [1, 1, 1], [2, 3, 4])).toBeNull()
  })
  it('desnivel con signo de A a C y distancia horizontal', () => {
    expect(levelDifference([0, 1, 0], [3, 3.5, 4])).toEqual({ dy: 2.5, dh: 5 })
    expect(levelDifference([0, 3, 0], [3, 1, 4]).dy).toBe(-2)
  })
  it('rótulo aproximado, con coma decimal y del modelo', () => {
    expect(formatApproxAngle([1, 0, 0], [0, 0, 0], [3, 4, 0])).toBe(
      '≈ 53,1° · desnivel A→C 4,00 m · horiz. 2,00 m · modelo',
    )
  })
})
