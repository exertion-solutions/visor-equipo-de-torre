import { describe, expect, it } from 'vitest'
import { RIG10_RIG, RIG10_SCENE } from '@/data/rigs/rig10'
import { FAMILY_COLORS, labelPosition, numberComponents } from './componentLabels'
import { buildComponentTree } from './componentTree'

describe('labelPosition (regla del V2)', () => {
  it('el centro del NDC cae en el centro del lienzo y el eje Y se invierte', () => {
    expect(labelPosition({ x: 0, y: 0, z: 0.5 }, 1000, 600)).toEqual({ x: 500, y: 300 })
    expect(labelPosition({ x: 1, y: 1, z: 0 }, 1000, 600)).toEqual({ x: 1000, y: 0 })
    expect(labelPosition({ x: -1, y: -1, z: 0 }, 1000, 600)).toEqual({ x: 0, y: 600 })
  })

  it('se oculta detrás de la cámara, más allá del plano lejano o fuera de la pantalla', () => {
    expect(labelPosition({ x: 0, y: 0, z: -1.01 }, 100, 100)).toBeNull()
    expect(labelPosition({ x: 0, y: 0, z: 1.01 }, 100, 100)).toBeNull()
    expect(labelPosition({ x: 1.11, y: 0, z: 0 }, 100, 100)).toBeNull()
    expect(labelPosition({ x: 0, y: -1.11, z: 0 }, 100, 100)).toBeNull()
  })

  it('tolera hasta un 10 % fuera del borde, como el V2', () => {
    expect(labelPosition({ x: 1.1, y: -1.1, z: 1 }, 100, 100)).not.toBeNull()
  })
})

describe('numberComponents', () => {
  const tree = buildComponentTree(
    RIG10_RIG,
    RIG10_SCENE.map((m) => m.componentId),
  )
  it('numera de 1 a N, sin repetir, en el orden del árbol', () => {
    const numbers = numberComponents(tree)
    const ids = tree.flatMap((g) => g.items.map((i) => i.id))
    expect(numbers.size).toBe(ids.length)
    expect(ids.map((id) => numbers.get(id))).toEqual(ids.map((_, i) => i + 1))
  })
})

describe('FAMILY_COLORS', () => {
  it('cada familia del equipo 10 tiene color', () => {
    for (const c of RIG10_RIG.components)
      expect(FAMILY_COLORS[c.family], c.id).toMatch(/^#[0-9a-f]{6}$/)
  })
})
