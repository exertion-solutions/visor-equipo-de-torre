import { describe, expect, it } from 'vitest'
import { RIG10_VIEWPOINTS, VIEWPOINT_COMPONENTS } from '@/data/viewpoints/rig10-viewpoints'
import { RIG10_SCENE } from '@/data/rigs/rig10'
import {
  eyeHeight,
  flightArc,
  flightPosition,
  matchesPrefix,
  stopDelayMs,
  tourStops,
  viewpointOfNames,
} from './viewpoints'

const D = RIG10_VIEWPOINTS
const SCENE_IDS = new Set(RIG10_SCENE.map((m) => m.componentId))

describe('datos del recorrido', () => {
  it('hay 14 sectores con id único', () => {
    expect(D.viewpoints).toHaveLength(14)
    expect(new Set(D.viewpoints.map((v) => v.id)).size).toBe(14)
  })

  it('la altura de ojos es la cota del piso + 1,70 m (en los sectores a pie)', () => {
    for (const vp of D.viewpoints) {
      expect(vp.camPos[1], vp.id).toBeCloseTo(eyeHeight(vp, D), 2)
    }
  })

  it('los pisos son los del plano del mástil: terreno 0, piso de trabajo 3,61 y de enganche 20,63', () => {
    expect([D.pisos.terreno.cota, D.pisos.pisoTrabajo.cota, D.pisos.pisoEnganche.cota]).toEqual([
      0, 3.61, 20.63,
    ])
    expect(D.alturaOjos).toBe(1.7)
  })

  it('cada sector resalta componentes que existen en la escena (y el acceso, ninguno)', () => {
    for (const vp of D.viewpoints) {
      const ids = VIEWPOINT_COMPONENTS[vp.id]
      expect(ids, vp.id).toBeDefined()
      for (const id of ids!) expect(SCENE_IDS.has(id), `${vp.id} → ${id}`).toBe(true)
      expect(ids!.length > 0, vp.id).toBe(vp.objeto3D.length > 0)
    }
    expect(Object.keys(VIEWPOINT_COMPONENTS).sort()).toEqual(D.viewpoints.map((v) => v.id).sort())
  })

  it('las paradas del recorrido guiado existen y el vuelo dura 1,8 s', () => {
    expect(tourStops(D)).toEqual(['acceso', 'acumulador', 'manifold', 'bop', 'piso-trabajo'])
    expect(D.transicion.ms).toBe(1800)
    expect(stopDelayMs(D)).toBe(1800 + 8 * 1000)
  })

  it('las fichas no inventan nada: lo genérico se rotula pendiente de validación', () => {
    for (const vp of D.viewpoints)
      for (const campo of ['riesgos', 'EPP', 'controles'] as const) {
        const texto = vp.ficha?.[campo]
        if (texto) expect(texto, `${vp.id}.${campo}`).toMatch(/pendiente de validación/)
      }
  })
})

describe('sector de un objeto', () => {
  it('prefijo exacto o con sufijo; no cualquier subcadena', () => {
    expect(matchesPrefix('sk575_bop', ['sk575_bop'])).toBe(true)
    expect(matchesPrefix('sk575_bop_acero', ['sk575_bop'])).toBe(true)
    expect(matchesPrefix('sk575_bopx', ['sk575_bop'])).toBe(false)
    expect(matchesPrefix('', ['sk575_bop'])).toBe(false)
  })

  it('gana el prefijo más largo: el piso de enganche es del sector enganche, no del mástil', () => {
    expect(viewpointOfNames(['sk575_enganche_acero', 'sk575_mastil'], D.viewpoints)?.id).toBe(
      'piso-enganche',
    )
    expect(viewpointOfNames(['sk575_mastil_acero', 'sk575_mastil'], D.viewpoints)?.id).toBe(
      'mastil',
    )
    expect(viewpointOfNames(['sk575_cabina_vidrio', 'sk575_carrier'], D.viewpoints)?.id).toBe(
      'carrier',
    )
  })

  it('lo que no es de ningún sector no devuelve nada', () => {
    expect(viewpointOfNames(['sk575_aparejo_acero', 'sk575_aparejo'], D.viewpoints)).toBeNull()
    expect(viewpointOfNames([], D.viewpoints)).toBeNull()
  })
})

describe('vuelo', () => {
  it('arco: 12 % de la distancia, tope de 8 m, y nada si el salto es instantáneo', () => {
    expect(flightArc(10, 1800)).toBeCloseTo(1.2, 9)
    expect(flightArc(100, 1800)).toBe(8)
    expect(flightArc(100, 0)).toBe(0)
  })
  it('la posición empieza y termina en los extremos, y a mitad de camino sube el arco', () => {
    const a: [number, number, number] = [0, 2, 0]
    const b: [number, number, number] = [10, 2, 20]
    expect(flightPosition(a, b, 0, 4)).toEqual(a)
    const fin = flightPosition(a, b, 1, 4)
    expect(fin[0]).toBeCloseTo(10, 9)
    expect(fin[1]).toBeCloseTo(2, 9)
    expect(fin[2]).toBeCloseTo(20, 9)
    const medio = flightPosition(a, b, 0.5, 4)
    expect([medio[0], medio[1], medio[2]]).toEqual([5, 6, 10])
  })
})
