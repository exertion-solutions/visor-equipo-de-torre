import { describe, expect, it } from 'vitest'
import { rigSchema } from '../schema'
import { SK575_IDS, RIG10_RIG, RIG10_SCENE } from './rig10'

// Solo las claves (sin cargar): existencia de cada GLB en public/ sin depender de node:fs.
const GLBS_EN_PUBLIC = new Set(
  Object.keys(import.meta.glob('/public/models/rig10/*.glb')).map((k) => k.replace('/public', '')),
)

const conflictsOf = (componentId: string, key: string) =>
  RIG10_RIG.components
    .find((c) => c.id === componentId)
    ?.specifications.find((s) => s.key === key)
    ?.conflicts?.map((c) => c.sourceId)

describe('RIG10_RIG', () => {
  it('cumple el schema (fuentes, ids únicos, conflictos, rutas de modelo)', () => {
    const r = rigSchema.safeParse(RIG10_RIG)
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })

  it('ninguna geometría CAD se presenta como as-built (confianza C)', () => {
    for (const c of RIG10_RIG.components.filter((c) => c.model)) {
      expect(c.confidence).toBe('C')
      expect(c.scope).toBeTruthy()
    }
  })

  it('la escena solo referencia componentes con modelo y no dibuja el mástil sin base documentada', () => {
    const conModelo = new Map(RIG10_RIG.components.map((c) => [c.id, c.model]))
    for (const m of RIG10_SCENE) expect(conModelo.get(m.componentId)).toBe(m.url)
    expect(RIG10_SCENE.map((m) => m.componentId)).not.toContain('mastil')
  })

  it('el piso de trabajo se dibuja una sola vez: lo dibuja sk575_piso, no la envolvente vieja piso_trabajo', () => {
    const enEscena = RIG10_SCENE.map((m) => m.componentId)
    expect(enEscena).toContain('sk575_piso')
    expect(enEscena).not.toContain('piso_trabajo')
    // Los datos de la envolvente (medidas del folleto y fuentes en conflicto) se conservan en el componente.
    expect(
      RIG10_RIG.components.find((c) => c.id === 'piso_trabajo')?.specifications.length,
    ).toBeGreaterThan(0)
  })

  it('cada GLB de la escena existe en public/', () => {
    for (const m of RIG10_SCENE) expect(GLBS_EN_PUBLIC.has(m.url), m.url).toBe(true)
  })

  it('el modelo SK-575 tiene sus 16 componentes, en escena y agrupados en equipos', () => {
    expect(SK575_IDS).toHaveLength(16)
    const enEscena = new Set(RIG10_SCENE.map((m) => m.componentId))
    const enEquipos = new Set(RIG10_RIG.equipment.flatMap((e) => e.componentIds))
    for (const id of SK575_IDS) {
      expect(enEscena.has(id), id).toBe(true)
      expect(enEquipos.has(id), id).toBe(true)
      expect(RIG10_RIG.components.find((c) => c.id === id)?.scope).toMatch(/no as-built/)
    }
  })

  it('los conflictos de fuente quedan declarados', () => {
    // piso_trabajo sigue con 2 specs en conflicto: el plano del mástil (3,606 m) se suma a modelHeightM.
    const piso = RIG10_RIG.components.find((c) => c.id === 'piso_trabajo')
    expect(piso?.specifications.filter((s) => s.conflicts?.length)).toHaveLength(2)
    expect(conflictsOf('piso_trabajo', 'modelHeightM')).toContain('src-plano-mastil')
    expect(conflictsOf('sk575_piso', 'floorHeightM')).toEqual(['src-folleto', 'src-legacy-v2'])
    expect(conflictsOf('sk575_aparejo', 'lines')).toEqual(['src-folleto'])
    expect(conflictsOf('sk575_bop', 'nominalBore')).toEqual(['src-folleto', 'src-manual-bop-11'])
    expect(conflictsOf('sk575_carrier', 'wheelbaseFt')).toEqual(['src-parts-sk575'])
    expect(conflictsOf('sk575_vientos', 'anchorDistance')).toEqual([
      'src-layout',
      'src-folleto',
      'src-placa-api',
    ])
  })
})
