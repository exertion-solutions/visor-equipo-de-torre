import { describe, expect, it } from 'vitest'
import { captureBandHeight, captureFileName, CAPTURE_NOTICE, SITE_URL } from './capture'

describe('captura', () => {
  it('el nombre lleva fecha y hora con ceros a la izquierda', () => {
    expect(captureFileName(new Date(2026, 9, 3, 7, 5))).toBe(
      'digital-rig-equipo10-20261003-0705.png',
    )
  })
  it('la franja escala con la resolución del lienzo', () => {
    expect(captureBandHeight(1280, 1280)).toBe(36)
    expect(captureBandHeight(2560, 1280)).toBe(72)
    expect(captureBandHeight(100, 0)).toBe(36)
  })
  it('la leyenda dice que no es as-built y el sitio es el publicado', () => {
    expect(CAPTURE_NOTICE).toMatch(/no as-built/)
    expect(SITE_URL).toBe('exertion-solutions.github.io/visor-equipo-de-torre')
  })
})
