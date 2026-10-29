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

describe('separateLabels: redondeo de coma flotante', () => {
  // Caso real (ortográfica, lienzo de 614 px de alto): al apoyar un rótulo sobre otro la distancia daba 24,999… en vez de 25,
  // el rótulo seguía "pisando" al de arriba, no bajaba más y dos marcadores quedaban encimados.
  const entrada = [
    { id: 'casilla', x: 629.1459109087866, y: 422.648488742809, w: 79, h: 23 },
    { id: 'poste', x: 667.628590413998, y: 437.8474858902554, w: 127, h: 23 },
    { id: 'sub', x: 620.2652925614301, y: 444.92522784548424, w: 79, h: 23 },
    { id: 'boca', x: 659.73470743857, y: 449.82520304525804, w: 79, h: 23 },
    { id: 'pisoT', x: 649.867353719285, y: 451.367787830372, w: 127, h: 23 },
    { id: 'plano', x: 712.5250498367449, y: 478.4310767809744, w: 79, h: 23 },
  ]

  it('ninguno queda pisado por otro', () => {
    const out = separateLabels(entrada)
    const colocados = entrada.map((b) => ({ ...b, ...out.get(b.id)! }))
    for (let i = 0; i < colocados.length; i++)
      for (let j = i + 1; j < colocados.length; j++) {
        const a = colocados[i]!
        const b = colocados[j]!
        const pisa = Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2
        expect(pisa, `${a.id} y ${b.id}`).toBe(false)
      }
  })

  it('con posiciones al azar tampoco se pisan nunca', () => {
    let seed = 12345
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
    for (let ronda = 0; ronda < 200; ronda++) {
      const boxes = Array.from({ length: 12 }, (_, i) => ({
        id: `b${i}`,
        x: 300 + rnd() * 120,
        y: 100 + rnd() * 160,
        w: 60 + Math.floor(rnd() * 70),
        h: 23,
      }))
      const out = separateLabels(boxes)
      const c = boxes.map((b) => ({ ...b, ...out.get(b.id)! }))
      for (let i = 0; i < c.length; i++)
        for (let j = i + 1; j < c.length; j++) {
          const a = c[i]!
          const b = c[j]!
          expect(
            Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2,
            `ronda ${ronda}: ${a.id} y ${b.id}`,
          ).toBe(false)
        }
    }
  })
})
