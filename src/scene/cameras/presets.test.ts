import { describe, expect, it } from 'vitest'
import { distance } from '@/lib/geometry'
import {
  CAMERA_PRESETS,
  CAMERA_PRESET_IDS,
  CAMERA_PRESET_LABELS,
  DEFAULT_CAMERA_PRESET,
  presetProjection,
  presetSpan,
} from './presets'

describe('camera presets', () => {
  it('define las cinco vistas del visor legacy', () => {
    expect(Object.keys(CAMERA_PRESETS).sort()).toEqual(['front', 'iso', 'side', 'top', 'well'])
    expect(CAMERA_PRESETS[DEFAULT_CAMERA_PRESET]).toBeDefined()
  })

  it('ninguna cámara queda bajo el terreno ni coincide con su objetivo', () => {
    for (const { position, target } of Object.values(CAMERA_PRESETS)) {
      expect(position[1]).toBeGreaterThan(0)
      expect(distance(position, target)).toBeGreaterThan(1)
    }
  })

  it('la vista superior no es exactamente vertical (evita el gimbal de OrbitControls)', () => {
    const { position, target } = CAMERA_PRESETS.top
    expect(position[0] !== target[0] || position[2] !== target[2]).toBe(true)
  })

  it('la lista de ids y las etiquetas cubren exactamente las cinco vistas', () => {
    expect([...CAMERA_PRESET_IDS].sort()).toEqual(Object.keys(CAMERA_PRESETS).sort())
    expect(Object.keys(CAMERA_PRESET_LABELS).sort()).toEqual([...CAMERA_PRESET_IDS].sort())
  })

  it('como el legacy: todas ortográficas salvo "Boca de pozo", y la superior abarca 62 m (las demás 44 m)', () => {
    for (const id of CAMERA_PRESET_IDS) {
      expect(presetProjection(id)).toBe(id === 'well' ? 'perspective' : 'orthographic')
      expect(presetSpan(id)).toBe(id === 'top' ? 62 : 44)
    }
  })
})
