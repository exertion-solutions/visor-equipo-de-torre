import { describe, expect, it } from 'vitest'
import { buildSearch, parseEngineParam, parseUrlState, withEngine, type UrlState } from './urlState'

describe('parseUrlState', () => {
  it('sin parámetros: modo por defecto, vista y capas desconocidas', () => {
    expect(parseUrlState('')).toEqual({ mode: 'explore', view: null, layers: null })
  })

  it('lee modo, vista y capas', () => {
    expect(parseUrlState('?mode=qhse&view=front&layers=zonas,cotas')).toEqual({
      mode: 'qhse',
      view: 'front',
      layers: ['zonas', 'cotas'],
    })
  })

  it('descarta valores inválidos y capas desconocidas; conserva el orden canónico', () => {
    expect(parseUrlState('?mode=drilling&view=abajo&layers=drops,foo,zonas,zonas')).toEqual({
      mode: 'explore',
      view: null,
      layers: ['zonas', 'drops'],
    })
  })

  it('layers= vacío significa explícitamente sin capas', () => {
    expect(parseUrlState('?layers=').layers).toEqual([])
  })
})

describe('buildSearch', () => {
  it('omite los valores por defecto', () => {
    expect(buildSearch('', { mode: 'explore', view: 'iso', layers: [] })).toBe('')
  })

  it('escribe modo, vista y capas, y conserva otros parámetros', () => {
    expect(buildSearch('?dev=1', { mode: 'qhse', view: 'top', layers: ['zonas', 'cotas'] })).toBe(
      '?dev=1&mode=qhse&view=top&layers=zonas,cotas',
    )
  })

  it('reemplaza lo anterior', () => {
    expect(
      buildSearch('?mode=qhse&layers=zonas', {
        mode: 'training',
        view: null,
        layers: ['etiquetas'],
      }),
    ).toBe('?mode=training&layers=etiquetas')
  })

  it('conserva "sin capas" fuera de EXPLORE para que no vuelva el preset al recargar', () => {
    expect(buildSearch('', { mode: 'qhse', view: null, layers: [] })).toBe('?mode=qhse&layers=')
  })

  it('ida y vuelta', () => {
    const state: UrlState = { mode: 'operation', view: 'side', layers: ['cotas', 'malla'] }
    expect(parseUrlState(buildSearch('', state))).toEqual(state)
  })
})

describe('motor en la URL', () => {
  it('solo engine=native abre el nativo; lo demás es el V2', () => {
    expect(parseEngineParam('?engine=native')).toBe('native')
    expect(parseEngineParam('')).toBeNull()
    expect(parseEngineParam('?engine=legacy')).toBeNull()
    expect(parseEngineParam('?engine=otro')).toBeNull()
  })
  it('withEngine escribe engine=native y lo quita con el V2, conservando el resto', () => {
    expect(withEngine('?mode=qhse', 'native')).toBe('?mode=qhse&engine=native')
    expect(withEngine('?engine=native&comp=sk575_bop', 'legacy')).toBe('?comp=sk575_bop')
    expect(withEngine('', 'legacy')).toBe('')
    expect(withEngine('?engine=native', 'native')).toBe('?engine=native')
  })
})
