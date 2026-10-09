import { describe, expect, it } from 'vitest'
import { rigSchema } from '../schema'
import { SK575_IDS, TACKER10_RIG, TACKER10_SCENE } from './tacker10'

// Solo las claves (sin cargar): existencia de cada GLB en public/ sin depender de node:fs.
const GLBS_EN_PUBLIC = new Set(
  Object.keys(import.meta.glob('/public/models/tacker10/*.glb')).map((k) =>
    k.replace('/public', ''),
  ),
)

const conflictsOf = (componentId: string, key: string) =>
  TACKER10_RIG.components
    .find((c) => c.id === componentId)
    ?.specifications.find((s) => s.key === key)
    ?.conflicts?.map((c) => c.sourceId)

describe('TACKER10_RIG', () => {
  it('cumple el schema (fuentes, ids únicos, conflictos, rutas de modelo)', () => {
    const r = rigSchema.safeParse(TACKER10_RIG)
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })

  it('ninguna geometría CAD se presenta como as-built (confianza C)', () => {
    for (const c of TACKER10_RIG.components.filter((c) => c.model)) {
      expect(c.confidence).toBe('C')
      expect(c.scope).toBeTruthy()
    }
  })

  it('la escena solo referencia componentes con modelo y no dibuja el mástil sin base documentada', () => {
    const conModelo = new Map(TACKER10_RIG.components.map((c) => [c.id, c.model]))
    for (const m of TACKER10_SCENE) expect(conModelo.get(m.componentId)).toBe(m.url)
    expect(TACKER10_SCENE.map((m) => m.componentId)).not.toContain('mastil')
  })

  it('cada GLB de la escena existe en public/', () => {
    for (const m of TACKER10_SCENE) expect(GLBS_EN_PUBLIC.has(m.url), m.url).toBe(true)
  })

  it('el modelo SK-575 tiene sus 16 componentes, en escena y agrupados en equipos', () => {
    expect(SK575_IDS).toHaveLength(16)
    const enEscena = new Set(TACKER10_SCENE.map((m) => m.componentId))
    const enEquipos = new Set(TACKER10_RIG.equipment.flatMap((e) => e.componentIds))
    for (const id of SK575_IDS) {
      expect(enEscena.has(id), id).toBe(true)
      expect(enEquipos.has(id), id).toBe(true)
      expect(TACKER10_RIG.components.find((c) => c.id === id)?.scope).toMatch(/no as-built/)
    }
  })

  it('los conflictos de fuente quedan declarados', () => {
    // piso_trabajo sigue con 2 specs en conflicto: el plano 8123 (3,606 m) se suma a modelHeightM.
    const piso = TACKER10_RIG.components.find((c) => c.id === 'piso_trabajo')
    expect(piso?.specifications.filter((s) => s.conflicts?.length)).toHaveLength(2)
    expect(conflictsOf('piso_trabajo', 'modelHeightM')).toContain('src-plano-8123')
    expect(conflictsOf('sk575_piso', 'floorHeightM')).toEqual(['src-folleto', 'src-legacy-v2'])
    expect(conflictsOf('sk575_aparejo', 'lines')).toEqual(['src-folleto'])
    expect(conflictsOf('sk575_bop', 'nominalBore')).toEqual(['src-manual-bop-11'])
    expect(conflictsOf('sk575_carrier', 'wheelbaseFt')).toEqual(['src-parts-sk575'])
    expect(conflictsOf('sk575_vientos', 'anchorDistance')).toEqual([
      'src-layout',
      'src-folleto',
      'src-placa-api',
    ])
  })
})
