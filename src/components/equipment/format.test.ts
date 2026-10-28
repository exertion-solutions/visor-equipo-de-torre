import { describe, expect, it } from 'vitest'
import { formatSpecValue } from './format'

describe('formatSpecValue', () => {
  it('usa coma decimal y punto de miles (es-AR)', () => {
    expect(formatSpecValue(31.71, 'm')).toBe('31,71 m')
    expect(formatSpecValue(1.2192, 'm')).toBe('1,2192 m')
    expect(formatSpecValue(97000, 'lb')).toBe('97.000 lb')
  })

  it('no agrega unidad si no la hay y conserva el texto tal cual', () => {
    expect(formatSpecValue(3.5)).toBe('3,5')
    expect(formatSpecValue('≈ 30 ft entre primer y último eje')).toBe(
      '≈ 30 ft entre primer y último eje',
    )
  })

  it('traduce los booleanos', () => {
    expect(formatSpecValue(true)).toBe('Sí')
    expect(formatSpecValue(false)).toBe('No')
  })
})
