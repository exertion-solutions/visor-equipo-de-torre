import { describe, expect, it } from 'vitest'
import { RIG10_RIG } from '@/data/rigs/rig10'
import { RIG10_DIMENSIONS } from '@/data/rigs/rig10-dimensions'
import { distance } from '@/lib/geometry'
import { buildDimensions, dimensionSegments } from './dimensions'

const specOf = (componentId: string, key: string) =>
  RIG10_RIG.components.find((c) => c.id === componentId)?.specifications.find((s) => s.key === key)

describe('cotas del equipo 10 (datos)', () => {
  it('cada cota apunta a una especificación que existe', () => {
    for (const d of RIG10_DIMENSIONS) expect(specOf(d.componentId, d.specKey), d.id).toBeDefined()
  })

  it('los ids son únicos', () => {
    const ids = RIG10_DIMENSIONS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('el largo de la línea es el de la cota, y el de la cota es el de la especificación', () => {
    for (const d of RIG10_DIMENSIONS) {
      expect(distance(d.from, d.to), d.id).toBeCloseTo(d.meters, 6)
      const spec = specOf(d.componentId, d.specKey)!
      if (d.valueText === undefined) expect(d.meters, d.id).toBe(spec.value)
      else expect(String(spec.value), d.id).toContain(d.valueText)
    }
  })

  it('ninguna línea queda bajo el terreno', () => {
    for (const d of RIG10_DIMENSIONS) {
      expect(d.from[1], d.id).toBeGreaterThanOrEqual(0)
      expect(d.to[1], d.id).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('buildDimensions', () => {
  const views = buildDimensions(RIG10_RIG, RIG10_DIMENSIONS)

  it('arma una vista por cota, con su valor, su especificación y su nivel A/B/C', () => {
    expect(views).toHaveLength(RIG10_DIMENSIONS.length)
    const mast = views.find((v) => v.id === 'altura-mastil')!
    expect(mast.text).toBe('31,71 m · Altura (104 ft) · A')
    expect(mast.confidence).toBe('A')
    // El piso tiene otras fuentes con valores distintos (folleto, V2 previo): el rótulo lo dice.
    expect(views.find((v) => v.id === 'altura-piso')!.text).toBe(
      '3,606 m · Altura del piso (12 ft) · B · Fuente en conflicto',
    )
  })

  it('el rótulo marca la fuente en conflicto solo cuando la especificación la tiene', () => {
    for (const v of views) {
      const dim = RIG10_DIMENSIONS.find((d) => d.id === v.id)!
      const conflict = (specOf(dim.componentId, dim.specKey)?.conflicts?.length ?? 0) > 0
      expect(v.conflict, v.id).toBe(conflict)
      expect(v.text.includes('Fuente en conflicto'), v.id).toBe(conflict)
    }
    expect(views.find((v) => v.id === 'anclaje-lado-carrier')!.text).toMatch(/Fuente en conflicto$/)
  })

  it('el ancla es el punto medio de la línea', () => {
    const d = RIG10_DIMENSIONS.find((x) => x.id === 'altura-piso')!
    expect(views.find((v) => v.id === 'altura-piso')!.anchor).toEqual([
      d.from[0],
      d.to[1] / 2,
      d.from[2],
    ])
  })

  it('una cota sin especificación se descarta, no se inventa', () => {
    const roto = [{ ...RIG10_DIMENSIONS[0]!, specKey: 'no-existe' }]
    expect(buildDimensions(RIG10_RIG, roto)).toEqual([])
  })
})

describe('dimensionSegments', () => {
  it('línea más una marca de 0,36 m en cada extremo, perpendicular a la línea', () => {
    for (const d of RIG10_DIMENSIONS) {
      const seg = dimensionSegments(d.from, d.to)
      expect(seg).toHaveLength(6)
      expect(seg[0]).toEqual(d.from)
      expect(seg[1]).toEqual(d.to)
      const axis = [d.to[0] - d.from[0], d.to[1] - d.from[1], d.to[2] - d.from[2]]
      for (const [a, b] of [
        [seg[2], seg[3]],
        [seg[4], seg[5]],
      ] as const) {
        const tick = [b![0] - a![0], b![1] - a![1], b![2] - a![2]] as const
        expect(Math.hypot(...tick), d.id).toBeCloseTo(0.36, 6)
        expect(tick[0] * axis[0]! + tick[1] * axis[1]! + tick[2] * axis[2]!, d.id).toBeCloseTo(0, 6)
      }
    }
  })

  it('una línea a lo largo de Z usa el eje X para la marca', () => {
    const seg = dimensionSegments([0, 0, 0], [0, 0, 5])
    expect(seg[3]![0] - seg[2]![0]).toBeCloseTo(0.36, 6)
  })
})
