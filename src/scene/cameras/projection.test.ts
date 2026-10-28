import { describe, expect, it } from 'vitest'
import { ORTHO_SPAN, PROJECTIONS, PROJECTION_LABELS, focusSpan, orthoFrustum } from './projection'

describe('projection', () => {
  it('define las dos proyecciones del visor legacy, con etiqueta', () => {
    expect([...PROJECTIONS].sort()).toEqual(['orthographic', 'perspective'])
    for (const p of PROJECTIONS) expect(PROJECTION_LABELS[p]).toBeTruthy()
  })

  it('el alto de la vista general es el del legacy (44 m)', () => {
    expect(ORTHO_SPAN).toBe(44)
  })
})

describe('orthoFrustum (legacy: ±span × aspecto / 2 de ancho, ±span / 2 de alto)', () => {
  it('canvas apaisado 2:1: el ancho es el doble del alto', () => {
    const f = orthoFrustum(44, 1000, 500)
    expect(f.top).toBe(22)
    expect(f.bottom).toBe(-22)
    expect(f.right).toBe(44)
    expect(f.left).toBe(-44)
  })

  it('es simétrico y el alto no depende del aspecto', () => {
    for (const [w, h] of [
      [1280, 760],
      [390, 700],
      [800, 800],
    ] as const) {
      const f = orthoFrustum(30, w, h)
      expect(f.left).toBeCloseTo(-f.right)
      expect(f.bottom).toBeCloseTo(-f.top)
      expect(f.top - f.bottom).toBeCloseTo(30)
      expect((f.right - f.left) / (f.top - f.bottom)).toBeCloseTo(w / h)
    }
  })

  it('un canvas sin alto no produce un frustum degenerado (NaN o infinito)', () => {
    const f = orthoFrustum(44, 800, 0)
    expect(Object.values(f).every(Number.isFinite)).toBe(true)
    expect(f.right).toBeGreaterThan(0)
  })
})

describe('focusSpan (legacy: max(4, máx(alto, 0,75 × ancho, 0,75 × fondo) × 1,4 + 2))', () => {
  it('usa el alto si domina', () => {
    expect(focusSpan([2, 31.7, 3])).toBeCloseTo(31.7 * 1.4 + 2)
  })

  it('pondera ancho y fondo por 0,75', () => {
    expect(focusSpan([20, 4, 4])).toBeCloseTo(20 * 0.75 * 1.4 + 2)
    expect(focusSpan([4, 4, 20])).toBeCloseTo(20 * 0.75 * 1.4 + 2)
  })

  it('no baja de 4 m (componentes chicos)', () => {
    expect(focusSpan([0.5, 0.5, 0.5])).toBe(4)
    expect(focusSpan([0, 0, 0])).toBe(4)
  })
})
