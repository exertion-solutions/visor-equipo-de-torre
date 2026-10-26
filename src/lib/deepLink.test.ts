import { describe, expect, it } from 'vitest'
import { legacyViewerSrc } from './deepLink'

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
