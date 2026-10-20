import { describe, expect, it } from 'vitest'
import { normalizeLayers, parseLegacyMessage } from './legacyBridge'

describe('parseLegacyMessage', () => {
  it('rechaza lo que no es un mensaje conocido', () => {
    for (const bad of [null, undefined, 'x', 3, {}, { type: 5 }, { type: 'otra:cosa' }]) {
      expect(parseLegacyMessage(bad)).toBeNull()
    }
  })

  it('ready', () => {
    expect(parseLegacyMessage({ type: 'tacker:ready', version: 1 })).toEqual({
      type: 'tacker:ready',
      version: 1,
    })
  })

  it('state: filtra modo, vista y capas inválidos', () => {
    expect(
      parseLegacyMessage({ type: 'tacker:state', mode: 'x', view: 'y', layers: ['cotas', 7, 'z'] }),
    ).toEqual({ type: 'tacker:state', mode: null, view: null, layers: ['cotas'] })
    expect(parseLegacyMessage({ type: 'tacker:state' })).toEqual({
      type: 'tacker:state',
      mode: null,
      view: null,
      layers: [],
    })
  })

  it('select: con componente, sin componente y con id inválido', () => {
    expect(
      parseLegacyMessage({
        type: 'tacker:select',
        id: 'bop',
        name: 'BOP',
        grade: 'B',
        status: 'Parcial',
      }),
    ).toEqual({
      type: 'tacker:select',
      selection: { id: 'bop', name: 'BOP', grade: 'B', status: 'Parcial' },
    })
    expect(parseLegacyMessage({ type: 'tacker:select', id: 'bop', grade: 'Z' })).toEqual({
      type: 'tacker:select',
      selection: { id: 'bop', name: null, grade: null, status: null },
    })
    expect(parseLegacyMessage({ type: 'tacker:select', id: null })).toEqual({
      type: 'tacker:select',
      selection: null,
    })
    expect(parseLegacyMessage({ type: 'tacker:select', id: 5 })).toBeNull()
  })
})

describe('parseLegacyMessage · visitas', () => {
  it('acepta un total entero no negativo y rechaza el resto', () => {
    expect(parseLegacyMessage({ type: 'tacker:visitas', value: 1234 })).toEqual({
      type: 'tacker:visitas',
      value: 1234,
    })
    expect(parseLegacyMessage({ type: 'tacker:visitas', value: 0 })).toEqual({
      type: 'tacker:visitas',
      value: 0,
    })
    for (const value of [-1, 1.5, NaN, '12', null, undefined]) {
      expect(parseLegacyMessage({ type: 'tacker:visitas', value })).toBeNull()
    }
  })
})

describe('normalizeLayers', () => {
  it('deduplica y ordena', () => {
    expect(normalizeLayers(['drops', 'zonas', 'drops', 'nope'])).toEqual(['zonas', 'drops'])
  })
})
