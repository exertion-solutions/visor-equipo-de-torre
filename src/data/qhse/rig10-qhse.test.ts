import { describe, expect, it } from 'vitest'
import { RIG10_RIG } from '@/data/rigs/rig10'
import { indexSources, makeQhseDatasetSchema } from '@/data/schema'
import { isMandatoryStatus } from './hazards'
import { MAST_ENVELOPE_FACTOR, MAST_HEIGHT_M, RIG10_QHSE } from './rig10-qhse'

describe('RIG10_QHSE', () => {
  const componentIds = new Set(RIG10_RIG.components.map((c) => c.id))

  it('pasa el schema del dataset QHSE contra los componentes y las fuentes del equipo 10', () => {
    const result = makeQhseDatasetSchema(componentIds, indexSources(RIG10_RIG.sources)).safeParse(
      RIG10_QHSE,
    )
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true)
  })

  it('nada se presenta como requisito: todo es pendiente de validación, sin fuente', () => {
    const all = [...RIG10_QHSE.risks, ...RIG10_QHSE.barriers, ...RIG10_QHSE.zones]
    for (const item of all) {
      expect(isMandatoryStatus(item.basis.status), item.id).toBe(false)
      expect(item.basis.status, item.id).toBe('pendingValidation')
      expect(item.basis.sourceId, item.id).toBeUndefined()
    }
  })

  it('las zonas son envolventes ilustrativas y los controles están redactados como recomendación', () => {
    expect(RIG10_QHSE.zones.length).toBe(3)
    for (const z of RIG10_QHSE.zones) expect(z.illustrative, z.id).toBe(true)
    for (const b of RIG10_QHSE.barriers) {
      expect(b.description, b.id).toMatch(/^Se recomienda/)
      expect(b.description, b.id).not.toMatch(/\b(debe|deben|obligatorio|obligatoria|exigido)\b/i)
    }
  })

  it('el radio de la envolvente del mástil sale de su altura documentada', () => {
    const mast = RIG10_RIG.components
      .find((c) => c.id === 'sk575_mastil')
      ?.specifications.find((s) => s.key === 'heightM')
    expect(mast?.value).toBe(MAST_HEIGHT_M)
    const zone = RIG10_QHSE.zones.find((z) => z.id === 'zona-envolvente-mastil')
    expect(zone?.shape).toMatchObject({ type: 'circle' })
    if (zone?.shape?.type === 'circle') {
      expect(zone.shape.radiusM).toBeCloseTo(MAST_ENVELOPE_FACTOR * MAST_HEIGHT_M, 9)
    }
  })
})
