import { describe, expect, it } from 'vitest'
import { clampToFence, lookPoint, slide, stepSeconds, walkDelta, WALK_SPEED, yawOf } from './walk'

describe('walkDelta', () => {
  it('adelante con yaw 0 va a +Z a 1,4 m/s', () => {
    const [dx, dz] = walkDelta(0, 1, 0, 1)
    expect(dx).toBeCloseTo(0, 9)
    expect(dz).toBeCloseTo(WALK_SPEED, 9)
  })
  it('con yaw 90° adelante va a +X; atrás al revés; el costado es perpendicular', () => {
    const [fx, fz] = walkDelta(Math.PI / 2, 1, 0, 1)
    expect([Math.round(fx * 100) / 100, Math.round(fz * 100) / 100]).toEqual([1.4, 0])
    const [bx] = walkDelta(Math.PI / 2, -1, 0, 1)
    expect(bx).toBeCloseTo(-1.4, 9)
    const [sx, sz] = walkDelta(0, 0, 1, 1)
    expect([Math.round(sx * 100) / 100, Math.round(sz * 100) / 100]).toEqual([-1.4, 0])
  })
  it('en diagonal no se camina más rápido', () => {
    const [dx, dz] = walkDelta(0.7, 1, 1, 1)
    expect(Math.hypot(dx, dz)).toBeCloseTo(WALK_SPEED, 9)
  })
  it('sin teclas no se mueve; el desplazamiento es proporcional al tiempo', () => {
    expect(walkDelta(1, 0, 0, 1)).toEqual([0, 0])
    expect(Math.hypot(...walkDelta(0.3, 1, 0, 0.5))).toBeCloseTo(0.7, 9)
  })
})

describe('stepSeconds', () => {
  it('limita el paso a 0,25 s y no admite tiempo negativo', () => {
    expect(stepSeconds(1100, 1000)).toBeCloseTo(0.1, 9)
    expect(stepSeconds(5000, 1000)).toBe(0.25)
    expect(stepSeconds(1000, 2000)).toBe(0)
  })
})

describe('slide', () => {
  const pared = (xmax: number) => (x: number, _z: number, dx: number) => x + dx <= xmax
  it('libre: se mueve entero', () => {
    expect(slide(0, 0, 0.1, 0.1, () => true)).toEqual([0.1, 0.1])
  })
  it('contra una pared en X desliza por Z', () => {
    expect(slide(1, 0, 0.1, 0.2, pared(1))).toEqual([0, 0.2])
  })
  it('contra una pared en Z desliza por X', () => {
    const paredZ = (_x: number, z: number, _dx: number, dz: number) => z + dz <= 1
    expect(slide(0, 1, 0.3, 0.2, paredZ)).toEqual([0.3, 0])
  })
  it('en un rincón no se mueve', () => {
    expect(slide(0, 0, 0.1, 0.1, () => false)).toEqual([0, 0])
  })
})

describe('vallado y mirada', () => {
  const fence = { min: [-45, -30.5], max: [33.5, 30.5] } as const
  it('no sale del vallado', () => {
    expect(clampToFence(100, -100, fence)).toEqual([33.5, -30.5])
    expect(clampToFence(-50, 40, fence)).toEqual([-45, 30.5])
    expect(clampToFence(3, 4, fence)).toEqual([3, 4])
  })
  it('lookPoint y yawOf son inversos en horizontal', () => {
    const p = lookPoint([0, 1.7, 0], Math.PI / 2, 0, 4)
    expect(p[0]).toBeCloseTo(4, 9)
    expect(p[1]).toBeCloseTo(1.7, 9)
    expect(p[2]).toBeCloseTo(0, 9)
    expect(yawOf(p[0], p[2])).toBeCloseTo(Math.PI / 2, 9)
    expect(lookPoint([0, 0, 0], 0, Math.PI / 6, 2)[1]).toBeCloseTo(1, 9)
  })
})
