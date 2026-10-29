import { describe, expect, it } from 'vitest'
import { separateLabels, type LabelBox } from './labelLayout'

const box = (id: string, x: number, y: number, w = 80, h = 20): LabelBox => ({ id, x, y, w, h })
const collide = (a: { x: number; y: number }, b: { x: number; y: number }, w = 80, h = 20) =>
  Math.abs(a.x - b.x) < w && Math.abs(a.y - b.y) < h

describe('separateLabels', () => {
  it('deja donde estaban los que no se pisan', () => {
    const out = separateLabels([box('a', 100, 100), box('b', 300, 100), box('c', 100, 200)])
    expect(out.get('a')).toEqual({ x: 100, y: 100 })
    expect(out.get('b')).toEqual({ x: 300, y: 100 })
    expect(out.get('c')).toEqual({ x: 100, y: 200 })
  })

  it('separa los que se pisan, solo hacia abajo y sin cambiar de columna', () => {
    const boxes = [box('a', 100, 100), box('b', 105, 104), box('c', 98, 110), box('d', 102, 100)]
    const out = separateLabels(boxes)
    for (const b of boxes) {
      const p = out.get(b.id)!
      expect(p.x, b.id).toBe(b.x)
      expect(p.y, b.id).toBeGreaterThanOrEqual(b.y)
    }
    const ps = boxes.map((b) => out.get(b.id)!)
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 1; j < ps.length; j++)
        expect(collide(ps[i]!, ps[j]!), `${i}-${j}`).toBe(false)
  })

  it('es estable: el mismo conjunto en otro orden da las mismas posiciones', () => {
    const boxes = [box('a', 100, 100), box('b', 101, 101), box('c', 99, 102)]
    const one = separateLabels(boxes)
    const two = separateLabels([...boxes].reverse())
    for (const b of boxes) expect(two.get(b.id), b.id).toEqual(one.get(b.id))
  })

  it('un conjunto vacío o de uno no cambia nada', () => {
    expect(separateLabels([]).size).toBe(0)
    expect(separateLabels([box('a', 5, 5)]).get('a')).toEqual({ x: 5, y: 5 })
  })
})
