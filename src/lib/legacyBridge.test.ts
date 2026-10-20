import { describe, expect, it } from 'vitest'
import { normalizeLayers, parseLegacyMessage } from './legacyBridge'

describe('parseLegacyMessage', () => {
  it('rechaza lo que no es un mensaje conocido', () => {
    for (const bad of [null, undefined, 'x', 3, {}, { type: 5 }, { type: 'otra:cosa' }]) {
      expect(parseLegacyMessage(bad)).toBeNull()
    }
  })

  it('ready', () => {
    expect(parseLegacyMessage({ type: 'rig:ready', version: 1 })).toEqual({
      type: 'rig:ready',
      version: 1,
    })
  })

  it('state: filtra modo, vista y capas inválidos', () => {
    expect(
      parseLegacyMessage({ type: 'rig:state', mode: 'x', view: 'y', layers: ['cotas', 7, 'z'] }),
    ).toEqual({ type: 'rig:state', mode: null, view: null, layers: ['cotas'] })
    expect(parseLegacyMessage({ type: 'rig:state' })).toEqual({
      type: 'rig:state',
      mode: null,
      view: null,
      layers: [],
    })
  })

  it('select: con componente, sin componente y con id inválido', () => {
    expect(
      parseLegacyMessage({
        type: 'rig:select',
        id: 'bop',
        name: 'BOP',
        grade: 'B',
        status: 'Parcial',
      }),
    ).toEqual({
      type: 'rig:select',
      selection: { id: 'bop', name: 'BOP', grade: 'B', status: 'Parcial' },
    })
    expect(parseLegacyMessage({ type: 'rig:select', id: 'bop', grade: 'Z' })).toEqual({
      type: 'rig:select',
      selection: { id: 'bop', name: null, grade: null, status: null },
    })
    expect(parseLegacyMessage({ type: 'rig:select', id: null })).toEqual({
      type: 'rig:select',
      selection: null,
    })
    expect(parseLegacyMessage({ type: 'rig:select', id: 5 })).toBeNull()
  })
})

describe('normalizeLayers', () => {
  it('deduplica y ordena', () => {
    expect(normalizeLayers(['drops', 'zonas', 'drops', 'nope'])).toEqual(['zonas', 'drops'])
  })
})
