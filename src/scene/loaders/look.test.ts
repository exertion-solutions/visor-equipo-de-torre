import { BoxGeometry, Group, Material, Mesh, MeshStandardMaterial, ShaderLib } from 'three'
import { describe, expect, it } from 'vitest'
import { lightSpots, setNightGlow, setWear, wearShader } from './look'

function escena() {
  const acero = new MeshStandardMaterial({ color: '#9ea3aa', metalness: 1, roughness: 0.26 })
  const luz = new MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffd9a0' })
  const root = new Group()
  const cuerpo = new Mesh(new BoxGeometry(), acero)
  const l1 = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), luz)
  const l2 = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), luz)
  l1.position.set(0, 10, 0)
  l2.position.set(5, 3, 0)
  root.add(cuerpo, l1, l2)
  return { root, acero, luz }
}

describe('look (efectos de presentación)', () => {
  it('wearShader inyecta el ruido en los chunks de MeshStandardMaterial', () => {
    const sh = { vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader }
    wearShader(sh)
    expect(sh.vertexShader).toContain('vW=(modelMatrix')
    expect(sh.fragmentShader).toContain('float sucio=')
    expect(sh.fragmentShader).toContain('roughnessFactor=clamp(')
  })

  it('setWear es reversible y no toca los emisivos', () => {
    const { root, acero, luz } = escena()
    setWear(root, true)
    expect(acero.onBeforeCompile).toBe(wearShader)
    expect(luz.onBeforeCompile).toBe(Material.prototype.onBeforeCompile)
    setWear(root, false)
    expect(acero.onBeforeCompile).toBe(Material.prototype.onBeforeCompile)
    expect(acero.customProgramCacheKey).toBe(Material.prototype.customProgramCacheKey)
  })

  it('noche: brillo de luminarias reversible y una luz por luminaria (grilla 1 m)', () => {
    const { root, luz } = escena()
    setNightGlow(root, true)
    expect(luz.emissiveIntensity).toBe(4)
    setNightGlow(root, false)
    expect(luz.emissiveIntensity).toBe(1)
    const spots = lightSpots(root)
    expect(spots).toHaveLength(2)
    expect(spots.some((p) => Math.abs(p.y - 10) < 0.1)).toBe(true)
    expect(lightSpots(root, 1)).toHaveLength(1)
  })
})
