import { describe, expect, it } from 'vitest'
import { distance, type Vec3 } from '@/lib/geometry'
import {
  FOCUS_DURATION_MS,
  computeFocusView,
  easeInOutCubic,
  focusDirection,
  focusDistance,
  lerpView,
  type CameraView,
} from './focus'

const unit = (v: Vec3): Vec3 => {
  const len = Math.hypot(v[0], v[1], v[2])
  return [v[0] / len, v[1] / len, v[2] / len]
}

describe('focusDistance (legacy: clamp(máx × 1,35 + 3, 6, 70))', () => {
  it('usa la dimensión mayor', () => {
    expect(focusDistance([10, 2, 2])).toBeCloseTo(16.5)
    expect(focusDistance([2, 10, 2])).toBeCloseTo(16.5)
    expect(focusDistance([2, 2, 10])).toBeCloseTo(16.5)
  })

  it('no baja de 6 m (componentes chicos)', () => {
    expect(focusDistance([1, 1, 1])).toBe(6)
    expect(focusDistance([0, 0, 0])).toBe(6)
  })

  it('no supera 70 m (el mástil de ~32 m queda en 46,2 m, sin tope)', () => {
    expect(focusDistance([31.7, 3, 3])).toBeCloseTo(45.795)
    expect(focusDistance([100, 1, 1])).toBe(70)
  })
})

describe('focusDirection', () => {
  it('conserva la dirección objetivo → cámara (normalizada)', () => {
    const d = focusDirection([10, 4, 10], [0, 0, 0])
    const expected = unit([10, 4, 10])
    expect(d[0]).toBeCloseTo(expected[0])
    expect(d[1]).toBeCloseTo(expected[1])
    expect(d[2]).toBeCloseTo(expected[2])
  })

  it('usa la dirección de respaldo si la vista es casi cenital (y > 0,8)', () => {
    const fallback = unit([0.6, 0.35, 0.72])
    const d = focusDirection([0, 10, 1], [0, 0, 0])
    expect(d[0]).toBeCloseTo(fallback[0])
    expect(d[1]).toBeCloseTo(fallback[1])
    expect(d[2]).toBeCloseTo(fallback[2])
  })

  it('usa la dirección de respaldo si la vista es rasante (y < 0,05)', () => {
    expect(focusDirection([10, 0, 0], [0, 0, 0])[1]).toBeCloseTo(unit([0.6, 0.35, 0.72])[1])
  })

  it('usa la dirección de respaldo si cámara y objetivo coinciden (sin NaN)', () => {
    const d = focusDirection([3, 3, 3], [3, 3, 3])
    expect(d.every(Number.isFinite)).toBe(true)
    expect(Math.hypot(...d)).toBeCloseTo(1)
  })
})

describe('computeFocusView', () => {
  const current: CameraView = { position: [40, 40, 42], target: [-2, 13, 0] } // vista isométrica

  it('apunta al centro de la caja y se ubica a focusDistance en la dirección actual', () => {
    const bounds = { min: [-4, 0, -1] as Vec3, max: [6, 2, 1] as Vec3 } // 10 × 2 × 2 m
    const view = computeFocusView(bounds, current)
    expect(view.target).toEqual([1, 1, 0])
    expect(distance(view.position, view.target)).toBeCloseTo(focusDistance([10, 2, 2]))
    const dir = unit([
      view.position[0] - view.target[0],
      view.position[1] - view.target[1],
      view.position[2] - view.target[2],
    ])
    const expected = focusDirection(current.position, current.target)
    expect(dir[0]).toBeCloseTo(expected[0])
    expect(dir[1]).toBeCloseTo(expected[1])
    expect(dir[2]).toBeCloseTo(expected[2])
  })

  it('un componente chico queda a 6 m del objetivo', () => {
    const bounds = { min: [0, 0, 0] as Vec3, max: [1, 1, 1] as Vec3 }
    expect(distance(computeFocusView(bounds, current).position, [0.5, 0.5, 0.5])).toBeCloseTo(6)
  })

  it('desde la vista superior no mira en vertical (usa la dirección de respaldo)', () => {
    const top: CameraView = { position: [-2.5, 72, 0.02], target: [-2.5, 0, 0] }
    const view = computeFocusView({ min: [0, 0, 0], max: [4, 4, 4] }, top)
    expect((view.position[1] - view.target[1]) / distance(view.position, view.target)).toBeLessThan(
      0.8,
    )
  })
})

describe('transición', () => {
  it('dura 600 ms como el legacy', () => {
    expect(FOCUS_DURATION_MS).toBe(600)
  })

  it('easeInOutCubic: extremos, punto medio y monotonía', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5)
    expect(easeInOutCubic(0.25)).toBeCloseTo(0.0625) // 4 × 0,25³
    let prev = -1
    for (let i = 0; i <= 20; i++) {
      const v = easeInOutCubic(i / 20)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })

  it('lerpView: k = 0 es el origen, k = 1 el destino, k = 0,5 el punto medio', () => {
    const a: CameraView = { position: [0, 0, 0], target: [0, 10, 0] }
    const b: CameraView = { position: [10, 20, 30], target: [4, 10, 0] }
    expect(lerpView(a, b, 0)).toEqual(a)
    expect(lerpView(a, b, 1)).toEqual(b)
    expect(lerpView(a, b, 0.5)).toEqual({ position: [5, 10, 15], target: [2, 10, 0] })
  })
})
