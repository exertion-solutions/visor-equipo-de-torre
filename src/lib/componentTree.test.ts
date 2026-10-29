import { describe, expect, it } from 'vitest'
import { RIG10_RIG, RIG10_SCENE } from '@/data/rigs/rig10'
import type { Rig } from '@/types'
import { buildComponentTree, groupVisibility } from './componentTree'

const rig = (): Rig => ({
  id: 'R',
  name: 'R',
  service: 'Pulling',
  sources: [],
  equipment: [
    { id: 'e1', rigId: 'R', name: 'Equipo 1', componentIds: ['a', 'b', 'sin-ficha'] },
    { id: 'e2', rigId: 'R', name: 'Equipo 2', componentIds: ['c'] },
  ],
  components: (['a', 'b', 'c'] as const).map((id) => ({
    id,
    rigId: 'R',
    name: id.toUpperCase(),
    family: 'auxiliary' as const,
    confidence: 'C' as const,
    sourceIds: [],
    specifications: [],
  })),
})

describe('buildComponentTree', () => {
  it('agrupa por equipo, en el orden del modelo, y solo con lo que está en escena', () => {
    const tree = buildComponentTree(rig(), ['b', 'a', 'sin-ficha'])
    expect(tree.map((g) => g.id)).toEqual(['e1'])
    expect(tree[0]?.items.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('un grupo sin componentes en escena no aparece', () => {
    expect(buildComponentTree(rig(), ['c']).map((g) => g.id)).toEqual(['e2'])
    expect(buildComponentTree(rig(), [])).toEqual([])
  })

  it('el equipo 10 muestra exactamente los componentes de la escena, sin repetir ninguno', () => {
    const ids = RIG10_SCENE.map((m) => m.componentId)
    const shown = buildComponentTree(RIG10_RIG, ids).flatMap((g) => g.items.map((i) => i.id))
    expect([...shown].sort()).toEqual([...ids].sort())
    expect(new Set(shown).size).toBe(shown.length)
  })
})

describe('groupVisibility', () => {
  const group = buildComponentTree(rig(), ['a', 'b'])[0]!
  it('distingue todos, ninguno y parcial', () => {
    expect(groupVisibility(group, [])).toBe('all')
    expect(groupVisibility(group, ['a'])).toBe('some')
    expect(groupVisibility(group, ['a', 'b'])).toBe('none')
    expect(groupVisibility(group, ['zzz'])).toBe('all')
  })
})
