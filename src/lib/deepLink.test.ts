import { describe, expect, it } from 'vitest'
import { buildShareUrl, legacyViewerSrc, parseNativeLink } from './deepLink'

describe('legacyViewerSrc', () => {
  const base = '/x/legacy/Digital_Rig_V2.html?embedded'
  it('pasa comp y vp válidos al iframe', () => {
    expect(legacyViewerSrc(base, '?mode=qhse&comp=bop&vp=piso-enganche')).toBe(
      `${base}&comp=bop&vp=piso-enganche`,
    )
  })
  it('descarta valores inválidos', () => {
    expect(legacyViewerSrc(base, '?comp=<script>&vp=A B')).toBe(base)
    expect(legacyViewerSrc(base, '')).toBe(base)
  })
})

describe('parseNativeLink', () => {
  it('lee el componente (id nativo con guion bajo) y la vista', () => {
    expect(parseNativeLink('?engine=native&comp=sk575_bop')).toEqual({
      comp: 'sk575_bop',
      view: null,
    })
    expect(parseNativeLink('?engine=native&view=side')).toEqual({ comp: null, view: 'side' })
    expect(parseNativeLink('?comp=carrier_huella&view=top')).toEqual({
      comp: 'carrier_huella',
      view: 'top',
      vp: null,
    })
  })
  it('descarta lo inválido: ids con símbolos o largos y vistas desconocidas', () => {
    expect(parseNativeLink('?comp=<script>&view=abajo')).toEqual({
      comp: null,
      view: null,
      vp: null,
    })
    expect(parseNativeLink(`?comp=${'a'.repeat(41)}`).comp).toBeNull()
    expect(parseNativeLink('')).toEqual({ comp: null, view: null, vp: null })
  })
})

describe('buildShareUrl', () => {
  const page = 'https://exertion-solutions.github.io/visor-equipo-de-torre/?dev=1&x=2#hash'
  const site = 'https://exertion-solutions.github.io/visor-equipo-de-torre/'
  it('con componente: engine + comp, sin query ni hash previos', () => {
    expect(buildShareUrl(page, { comp: 'sk575_bop', view: 'side' })).toBe(
      `${site}?engine=native&comp=sk575_bop`,
    )
  })
  it('sin componente: engine + vista; sin nada: solo el motor', () => {
    expect(buildShareUrl(page, { comp: null, view: 'top' })).toBe(`${site}?engine=native&view=top`)
    expect(buildShareUrl(page, { comp: null, view: null })).toBe(`${site}?engine=native`)
  })
  it('el modo va solo si no es EXPLORE', () => {
    expect(buildShareUrl(page, { mode: 'qhse', comp: null, view: 'iso' })).toBe(
      `${site}?engine=native&mode=qhse&view=iso`,
    )
    expect(buildShareUrl(page, { mode: 'explore', comp: null, view: null })).toBe(
      `${site}?engine=native`,
    )
  })
  it('ida y vuelta con parseNativeLink', () => {
    const url = buildShareUrl(page, { comp: 'sk575_mastil', view: null })
    expect(parseNativeLink(new URL(url).search)).toEqual({
      comp: 'sk575_mastil',
      view: null,
      vp: null,
    })
  })
})

describe('enlaces a un sector (vp)', () => {
  it('se lee y se descarta si es inválido', () => {
    expect(parseNativeLink('?engine=native&vp=piso-trabajo').vp).toBe('piso-trabajo')
    expect(parseNativeLink('?vp=<script>').vp).toBeNull()
    expect(parseNativeLink('?vp=SK575_Bop').vp).toBeNull()
  })
  const site = 'https://exertion-solutions.github.io/visor-equipo-de-torre/'
  it('el sector manda sobre el componente y la vista al compartir', () => {
    expect(buildShareUrl(site, { comp: 'sk575_bop', view: 'side', vp: 'bop' })).toBe(
      `${site}?engine=native&vp=bop`,
    )
    expect(buildShareUrl(site, { comp: 'sk575_bop', view: null, vp: null })).toBe(
      `${site}?engine=native&comp=sk575_bop`,
    )
  })
  it('ida y vuelta', () => {
    const url = buildShareUrl(site, { comp: null, view: null, vp: 'piso-enganche' })
    expect(parseNativeLink(new URL(url).search).vp).toBe('piso-enganche')
  })
})
