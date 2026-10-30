import { describe, expect, it } from 'vitest'
import {
  keyAction,
  orbitTilt,
  orbitYaw,
  panStep,
  zoomDistance,
  zoomOrtho,
  YAW_STEP_DEG,
  TILT_STEP_DEG,
} from './keyboard'

const dist = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!)

describe('keyAction', () => {
  it('flechas giran e inclinan, con Mayús desplazan', () => {
    expect(keyAction('ArrowLeft', false)).toEqual({ type: 'yaw', deg: -YAW_STEP_DEG })
    expect(keyAction('ArrowRight', false)).toEqual({ type: 'yaw', deg: YAW_STEP_DEG })
    expect(keyAction('ArrowUp', false)).toEqual({ type: 'tilt', deg: TILT_STEP_DEG })
    expect(keyAction('ArrowDown', false)).toEqual({ type: 'tilt', deg: -TILT_STEP_DEG })
    expect(keyAction('ArrowLeft', true)).toEqual({ type: 'pan', dx: -1, dy: 0 })
    expect(keyAction('ArrowUp', true)).toEqual({ type: 'pan', dx: 0, dy: 1 })
  })
  it('+ y − hacen zoom (también = y _), ? y H abren la ayuda y Esc cierra', () => {
    expect(keyAction('+', false)).toMatchObject({ type: 'zoom' })
    expect(keyAction('=', false)).toMatchObject({ type: 'zoom' })
    const out = keyAction('-', false)
    expect(out && out.type === 'zoom' && out.factor < 1).toBe(true)
    for (const k of ['?', 'h', 'H']) expect(keyAction(k, false)).toEqual({ type: 'help' })
    expect(keyAction('Escape', false)).toEqual({ type: 'close' })
  })
  it('cualquier otra tecla no es un atajo', () => {
    expect(keyAction('a', false)).toBeNull()
    expect(keyAction('Tab', false)).toBeNull()
    expect(keyAction('Enter', false)).toBeNull()
  })
})

describe('orbitYaw', () => {
  const target: [number, number, number] = [-2, 13, 0]
  const pos: [number, number, number] = [38, 53, 42]
  it('conserva la distancia al objetivo y la altura', () => {
    const p = orbitYaw(pos, target, 7.5)
    expect(dist(p, target)).toBeCloseTo(dist(pos, target), 9)
    expect(p[1]).toBeCloseTo(pos[1], 9)
  })
  it('un giro completo (48 pasos de 7,5°) vuelve al punto de partida', () => {
    let p: [number, number, number] = pos
    for (let i = 0; i < 48; i++) p = orbitYaw(p, target, 7.5) as [number, number, number]
    expect(dist(p, pos)).toBeLessThan(1e-9)
  })
  it('girar y desgirar es la identidad, y 90° manda +Z a +X relativo al objetivo', () => {
    expect(dist(orbitYaw(orbitYaw(pos, target, 30), target, -30), pos)).toBeLessThan(1e-9)
    const p = orbitYaw([0, 0, 10], [0, 0, 0], 90)
    expect(p[0]).toBeCloseTo(10, 9)
    expect(p[2]).toBeCloseTo(0, 9)
  })
})

describe('orbitTilt', () => {
  const target: [number, number, number] = [0, 0, 0]
  it('conserva la distancia y cambia la altura: subir con + y bajar con −', () => {
    const start: [number, number, number] = [10, 10, 0]
    const up = orbitTilt(start, target, 5)
    const down = orbitTilt(start, target, -5)
    expect(dist(up, target)).toBeCloseTo(dist(start, target), 9)
    expect(up[1]).toBeGreaterThan(start[1])
    expect(down[1]).toBeLessThan(start[1])
  })
  it('no pasa por la vertical ni baja del horizonte', () => {
    expect(orbitTilt([0.2, 10, 0], target, 5)).toEqual([0.2, 10, 0])
    expect(orbitTilt([10, 0.05, 0], target, -5)).toEqual([10, 0.05, 0])
  })
  it('cámara sobre el objetivo o en el objetivo: no se mueve', () => {
    expect(orbitTilt([0, 5, 0], target, 5)).toEqual([0, 5, 0])
    expect(orbitTilt([0, 0, 0], target, 5)).toEqual([0, 0, 0])
  })
})

describe('desplazamiento y zoom', () => {
  it('paso de desplazamiento: 5 % de la distancia, o de 40 m / zoom en ortográfica', () => {
    expect(panStep(60, 1, false)).toBeCloseTo(3, 9)
    expect(panStep(60, 2, true)).toBeCloseTo(1, 9)
  })
  it('el zoom se acota (2–400 m en perspectiva, 0,2–40 en ortográfica)', () => {
    expect(zoomDistance(60, 1.15)).toBeCloseTo(52.17, 2)
    expect(zoomDistance(2.1, 1.15)).toBe(2)
    expect(zoomDistance(399, 1 / 1.15)).toBe(400)
    expect(zoomOrtho(1, 1.15)).toBeCloseTo(1.15, 9)
    expect(zoomOrtho(39, 1.15)).toBe(40)
    expect(zoomOrtho(0.21, 1 / 1.15)).toBe(0.2)
  })
})
