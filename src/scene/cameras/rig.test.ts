import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { ORTHO_FAR, ORTHO_NEAR } from './projection'
import { createOrthoCamera, matchView, setOrthoZoom, syncCameraMatrices } from './rig'

describe('createOrthoCamera', () => {
  it('es manual (r3f no le pisa el frustum) y usa los planos del legacy', () => {
    const cam = createOrthoCamera()
    expect((cam as OrthographicCamera & { manual?: boolean }).manual).toBe(true)
    expect(cam.near).toBe(ORTHO_NEAR)
    expect(cam.far).toBe(ORTHO_FAR)
  })
})

describe('syncCameraMatrices', () => {
  it('ajusta el frustum ortográfico y el aspecto de la perspectiva al canvas', () => {
    const persp = new PerspectiveCamera(42, 1, 0.1, 600)
    const ortho = createOrthoCamera()
    syncCameraMatrices(persp, ortho, 44, 1000, 500)
    expect(persp.aspect).toBe(2)
    expect(ortho.top).toBe(22)
    expect(ortho.bottom).toBe(-22)
    expect(ortho.right).toBe(44)
    expect(ortho.left).toBe(-44)
  })

  it('refleja un redimensionado posterior en las dos cámaras (la inactiva no lo recibe de r3f)', () => {
    const persp = new PerspectiveCamera(42, 1, 0.1, 600)
    const ortho = createOrthoCamera()
    syncCameraMatrices(persp, ortho, 44, 1000, 500)
    syncCameraMatrices(persp, ortho, 44, 400, 800)
    expect(persp.aspect).toBeCloseTo(0.5)
    expect(ortho.right - ortho.left).toBeCloseTo(22)
    expect(ortho.top - ortho.bottom).toBeCloseTo(44)
  })

  it('un canvas sin alto no deja el aspecto en infinito', () => {
    const persp = new PerspectiveCamera()
    syncCameraMatrices(persp, createOrthoCamera(), 44, 800, 0)
    expect(Number.isFinite(persp.aspect)).toBe(true)
  })
})

describe('setOrthoZoom', () => {
  it('fija el zoom', () => {
    const ortho = createOrthoCamera()
    setOrthoZoom(ortho, 2.5)
    expect(ortho.zoom).toBe(2.5)
  })
})

describe('matchView (alternar proyección no desplaza el encuadre)', () => {
  it('la cámara nueva toma la posición de la actual y mira al mismo objetivo', () => {
    const persp = new PerspectiveCamera(42, 1.7, 0.1, 600)
    persp.position.set(40, 40, 42)
    const target = new Vector3(-2, 13, 0)
    persp.lookAt(target)

    const ortho = createOrthoCamera()
    matchView(ortho, persp, target)

    expect(ortho.position.toArray()).toEqual([40, 40, 42])
    const dirP = persp.getWorldDirection(new Vector3())
    const dirO = ortho.getWorldDirection(new Vector3())
    expect(dirO.distanceTo(dirP)).toBeLessThan(1e-9)
    // El objetivo cae en el centro de la imagen en las dos proyecciones.
    for (const cam of [persp, ortho]) {
      cam.updateMatrixWorld(true)
      const ndc = target.clone().project(cam)
      expect(Math.abs(ndc.x)).toBeLessThan(1e-9)
      expect(Math.abs(ndc.y)).toBeLessThan(1e-9)
    }
  })
})
