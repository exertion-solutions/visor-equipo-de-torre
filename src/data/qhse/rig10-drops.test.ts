import { describe, expect, it } from 'vitest'
import { indexSources, makeQhseDatasetSchema, qhseDatasetSchema } from '../schema'
import { PENDING_TEXT } from './hazards'
import rawData from './rig10-drops.json'
import {
  DROPS_COMPONENT_IDS,
  DROPS_SECTION_IDS,
  dropsDatasetSchema,
  getDropsDataset,
  parseDropsDataset,
  pointsByComponent,
  pointsBySection,
  toQhseDataset,
  zoneOf,
  type DropsDataset,
  type DropsPoint,
} from './rig10-drops'

const ds = getDropsDataset()

const clone = (): DropsDataset => structuredClone(ds)

const at = <T>(items: readonly T[], index: number): T => {
  const item = items[index]
  if (item === undefined) throw new Error(`sin elemento en el índice ${index}`)
  return item
}

const pointOf = (d: DropsDataset, id: string): DropsPoint => {
  const p = d.points.find((x) => x.id === id)
  if (p === undefined) throw new Error(`sin punto ${id}`)
  return p
}

const EXPECTED_IDS = [
  ...[
    'COR-1',
    'COR-2',
    'COR-3',
    'COR-4',
    'COR-5',
    'COR-6',
    'COR-7',
    'COR-8',
    'COR-9',
    'COR-10',
    'COR-11',
  ],
  ...Array.from({ length: 9 }, (_, i) => `DCO-${i + 1}`),
  ...Array.from({ length: 13 }, (_, i) => `PE-${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `DPE-${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `BP-${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `SUB-${i + 1}`),
  ...Array.from({ length: 3 }, (_, i) => `CAS-${i + 1}`),
  ...Array.from({ length: 2 }, (_, i) => `PLA-${i + 1}`),
  ...Array.from({ length: 2 }, (_, i) => `PIL-${i + 1}`),
  ...Array.from({ length: 6 }, (_, i) => `PT-${i + 1}`),
  ...Array.from({ length: 3 }, (_, i) => `PRL-${i + 1}`),
]

describe('rig10-drops.json', () => {
  it('pasa el schema y getDropsDataset() lo devuelve parseado', () => {
    expect(dropsDatasetSchema.safeParse(rawData).success).toBe(true)
    expect(ds.schemaVersion).toBe(1)
    expect(ds.meta.rigId).toBe('RIG-10')
    expect(ds.meta.generated).toBe('2026-09-25')
    expect(getDropsDataset()).toBe(ds)
  })

  it('tiene los 66 puntos con los ids del Libro', () => {
    expect(ds.points).toHaveLength(66)
    expect(ds.points.map((p) => p.id).sort()).toEqual([...EXPECTED_IDS].sort())
  })

  it('cuenta los puntos por sección como el Libro', () => {
    const expected = {
      corona: 11,
      'debajo-corona': 9,
      'piso-enganche': 13,
      'debajo-piso-enganche': 9,
      'boca-pozo': 4,
      'subestructura-carrier': 4,
      'casilla-maquinista': 3,
      'plano-inclinado': 2,
      piletas: 2,
      'piso-trabajo': 6,
      'poste-llave': 3,
    } as const
    expect(Object.keys(expected).sort()).toEqual([...DROPS_SECTION_IDS].sort())
    for (const [id, count] of Object.entries(expected)) {
      expect(
        ds.points.filter((p) => p.sectionId === id),
        id,
      ).toHaveLength(count)
    }
    expect(ds.sections.map((s) => s.id)).toEqual(Object.keys(expected))
  })

  it('zonas del A2: alto/medio/bajo con sus áreas, sin radios ni cotas', () => {
    expect(ds.zones.map((z) => [z.id, z.label, z.color])).toEqual([
      ['alto', 'Riesgo ALTO', '#EF4444'],
      ['medio', 'Riesgo MEDIO', '#F59E0B'],
      ['bajo', 'Riesgo BAJO', '#22C55E'],
    ])
    const zoneBySection = Object.fromEntries(ds.sections.map((s) => [s.id, s.zone]))
    expect(zoneBySection).toEqual({
      corona: 'alto',
      'debajo-corona': 'alto',
      'piso-enganche': 'alto',
      'debajo-piso-enganche': 'alto',
      'boca-pozo': 'medio',
      'subestructura-carrier': 'medio',
      'casilla-maquinista': 'medio',
      'plano-inclinado': 'medio',
      piletas: 'bajo',
      'piso-trabajo': null,
      'poste-llave': null,
    })
    for (const z of ds.zones) expect(z.sourceId).toBe('powsg020-a2')
  })

  it('piso-trabajo y poste-llave no figuran en el A2: zona null', () => {
    for (const id of ['piso-trabajo', 'poste-llave'] as const) {
      const section = ds.sections.find((s) => s.id === id)
      expect(section?.zone).toBeNull()
      expect(section?.zoneBasis).toBe('No clasificada en POWSG020-A2')
      for (const p of pointsBySection(id)) expect(p.zone).toBeNull()
    }
  })

  it('la zona de cada punto es la de su sección', () => {
    const zoneBySection = new Map(ds.sections.map((s) => [s.id, s.zone]))
    for (const p of ds.points) expect(p.zone, p.id).toBe(zoneBySection.get(p.sectionId))
  })

  it('cada punto cita procedimiento verificado con página; las guías genéricas no son puntos', () => {
    const sources = new Map(ds.sources.map((s) => [s.id, s]))
    for (const p of ds.points) {
      expect(p.basis.status).toBe('procedure')
      expect(p.basis.sourceId).toBe('libro-drops-2024')
      expect(p.basis.page).toBeGreaterThanOrEqual(1)
      expect(p.basis.page).toBeLessThanOrEqual(25)
      expect(sources.get(p.basis.sourceId)?.verified).toBe(true)
      expect(p.componentIdBasis).toBe('inferido')
      expect(DROPS_COMPONENT_IDS).toContain(p.componentId)
    }
    const kinds = Object.fromEntries(ds.sources.map((s) => [s.id, s.kind]))
    expect(kinds['manual-drops-rev04']).not.toBe('procedure')
    expect(kinds['taller-ypf-drops']).not.toBe('procedure')
  })

  it('incluye las 9 fuentes pedidas, todas revisadas', () => {
    expect(ds.sources.map((s) => s.id).sort()).toEqual(
      [
        'alerta-ypf-inc18068',
        'libro-drops-2024',
        'manual-drops-rev04',
        'powsg020-a1',
        'powsg020-a2',
        'powsg020-a3',
        'powsg020-rev02',
        'taller-ypf-drops',
        'tk10-drops-2023',
      ].sort(),
    )
    expect(ds.sources.every((s) => s.verified)).toBe(true)
  })

  it('marca como dudosas solo COR-10, COR-11 y PLA-1, con explicación', () => {
    const dudosos = ds.points.filter((p) => p.flags.includes('dudoso'))
    expect(dudosos.map((p) => p.id).sort()).toEqual(['COR-10', 'COR-11', 'PLA-1'])
    for (const p of dudosos) expect(p.observation, p.id).toMatch(/DUDOSO/)
  })

  it('secondaryRequired:false cuando el Libro dice "No requerida"', () => {
    for (const p of ds.points) {
      if (p.secondary?.toLowerCase().startsWith('no requerida')) {
        expect(p.secondaryRequired, p.id).toBe(false)
      }
    }
    expect(pointOf(ds, 'COR-7').secondaryRequired).toBe(true)
    expect(pointOf(ds, 'BP-2').secondary).toBe('NA')
  })

  it('componentId inferido según la regla acordada', () => {
    const comp = (id: string) => pointOf(ds, id).componentId
    for (const id of ['COR-1', 'COR-5', 'COR-11', 'DCO-1', 'DCO-9', 'DPE-1', 'DPE-9']) {
      expect(comp(id), id).toBe('mastil')
    }
    for (const id of ['DCO-4', 'DCO-5', 'DCO-6', 'DCO-7', 'DCO-8', 'DPE-4', 'PE-10', 'PE-13']) {
      expect(comp(id), id).toBe('vientos')
    }
    for (const id of ['PE-1', 'PE-3', 'PE-12']) expect(comp(id), id).toBe('enganche')
    expect(comp('BP-1')).toBe('malacate')
    for (const id of ['BP-2', 'BP-3', 'BP-4']) expect(comp(id), id).toBe('aparejo')
    expect(comp('SUB-1')).toBe('camion')
    for (const id of ['SUB-2', 'SUB-3', 'SUB-4']) expect(comp(id), id).toBe('subestructura')
    for (const p of pointsBySection('piso-trabajo')) expect(p.componentId).toBe('subestructura')
    for (const p of pointsBySection('casilla-maquinista')) expect(p.componentId).toBe('cabina')
    for (const p of pointsBySection('poste-llave')) expect(p.componentId).toBe('llave')
    for (const p of pointsBySection('plano-inclinado')) expect(p.componentId).toBe('caballetes')
    for (const p of pointsBySection('piletas')) expect(p.componentId).toBe('circulacion')
  })

  it('ningún campo de medida inventado (radios, alturas, pesos, distancias)', () => {
    const keys = new Set<string>()
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) v.forEach(walk)
      else if (typeof v === 'object' && v !== null) {
        for (const [k, child] of Object.entries(v)) {
          keys.add(k)
          walk(child)
        }
      }
    }
    walk(rawData)
    for (const banned of ['radiusM', 'heightM', 'weightKg', 'distanceM']) {
      expect(keys.has(banned), banned).toBe(false)
    }
    expect(
      [...keys].filter((k) =>
        /^(radius|height|weight|distance|radio|altura|peso|distancia)/i.test(k),
      ),
    ).toEqual([])
    // Las cifras del Libro (diámetros, cantidades) solo viajan como texto.
    for (const p of ds.points) expect(['string', 'object']).toContain(typeof p.quantity)
  })

  it('documenta el conflicto de nivel y la ausencia de radios/cotas del A2 en meta.assumptions', () => {
    const text = ds.meta.assumptions.join('\n')
    expect(text).toMatch(/boca de pozo/i)
    expect(text).toMatch(/6\.3\.5/)
    expect(text).toMatch(/SIN radio ni cota/)
    expect(text).toMatch(/declara el usuario/)
  })
})

describe('TK10 (05/10/2023)', () => {
  it('36 fotos, 26 correctas y 10 hallazgos', () => {
    const tk = ds.tk10Inspection
    expect(tk.date).toBe('2023-10-05')
    expect(tk.total).toBe(36)
    expect(tk.correct).toBe(26)
    expect(tk.findings).toHaveLength(10)
    expect(tk.findings.map((f) => f.photo)).toEqual([4, 8, 19, 21, 22, 30, 32, 33, 34, 35])
    for (const f of tk.findings) {
      expect(f.inferred).toBe(true)
      expect(f.relatedPointIds.length).toBeGreaterThan(0)
    }
  })

  it('el estado por punto es coherente con los hallazgos y siempre inferido', () => {
    for (const p of ds.points) {
      expect(p.tk10.inferred).toBe(true)
      expect(p.tk10.status === 'sin-dato', p.id).toBe(p.tk10.photos.length === 0)
    }
    for (const f of ds.tk10Inspection.findings) {
      for (const pid of f.relatedPointIds) {
        const p = pointOf(ds, pid)
        expect(p.tk10.status, pid).toBe('hallazgo')
        expect(p.tk10.photos, pid).toContain(f.photo)
      }
    }
    expect(ds.points.filter((p) => p.tk10.status === 'sin-dato').length).toBeGreaterThan(0)
  })

  it('las referencias incluyen el incidente YPF del giratorio ligado a BP-1', () => {
    const ref = ds.references.find((r) => r.id === 'ref-ypf-giratorio-winche')
    expect(ref?.relatedPointIds).toEqual(['BP-1'])
    expect(ref?.sourceId).toBe('alerta-ypf-inc18068')
    expect(ref?.summary).toMatch(/5,3 mts/)
    expect(ref?.date).toBe('2024-10-07')
  })
})

describe('schema: reglas de integridad', () => {
  it('rechaza claves de medida en cualquier nivel', () => {
    for (const key of ['radiusM', 'heightM', 'weightKg', 'distanceM']) {
      const bad = clone()
      Object.assign(at(bad.points, 0), { [key]: 1 })
      expect(() => parseDropsDataset(bad), key).toThrow(/clave de medida prohibida/)
      const badMeta = clone()
      Object.assign(badMeta.meta, { [key]: 1 })
      expect(dropsDatasetSchema.safeParse(badMeta).success, key).toBe(false)
    }
  })

  it('rechaza claves desconocidas (objetos estrictos)', () => {
    const bad = clone()
    Object.assign(bad.zones[0] ?? {}, { extra: true })
    expect(dropsDatasetSchema.safeParse(bad).success).toBe(false)
  })

  it('rechaza ids duplicados, sectionId y sourceId inexistentes', () => {
    const dup = clone()
    at(dup.points, 1).id = at(dup.points, 0).id
    expect(dropsDatasetSchema.safeParse(dup).success).toBe(false)

    const badSection = clone()
    Object.assign(at(badSection.points, 0), { sectionId: 'inexistente' })
    expect(dropsDatasetSchema.safeParse(badSection).success).toBe(false)

    const badSource = clone()
    at(badSource.points, 0).basis.sourceId = 'no-existe'
    expect(dropsDatasetSchema.safeParse(badSource).success).toBe(false)
  })

  it('rechaza un punto cuya zona difiere de la de su sección', () => {
    const bad = clone()
    at(bad.points, 0).zone = 'bajo'
    expect(dropsDatasetSchema.safeParse(bad).success).toBe(false)
    const badNull = clone()
    pointOf(badNull, 'PT-1').zone = 'medio'
    expect(dropsDatasetSchema.safeParse(badNull).success).toBe(false)
  })

  it('rechaza componentId fuera de los 13 y basis con fuente no verificada', () => {
    const badComp = clone()
    Object.assign(at(badComp.points, 0), { componentId: 'top-drive' })
    expect(dropsDatasetSchema.safeParse(badComp).success).toBe(false)

    const unverified = clone()
    const libro = unverified.sources.find((s) => s.id === 'libro-drops-2024')
    if (libro === undefined) throw new Error('sin Libro')
    libro.verified = false
    expect(dropsDatasetSchema.safeParse(unverified).success).toBe(false)
  })

  it('rechaza conteos TK10 distintos y hallazgos que los puntos no reflejan', () => {
    const badTotal = clone()
    Object.assign(badTotal.tk10Inspection, { total: 35 })
    expect(dropsDatasetSchema.safeParse(badTotal).success).toBe(false)

    const missingFinding = clone()
    missingFinding.tk10Inspection.findings.pop()
    expect(dropsDatasetSchema.safeParse(missingFinding).success).toBe(false)

    const desync = clone()
    pointOf(desync, 'COR-1').tk10.status = 'correcto'
    expect(dropsDatasetSchema.safeParse(desync).success).toBe(false)
  })

  it('rechaza inferred:false y basis distinto de procedure', () => {
    const notInferred = clone()
    Object.assign(at(notInferred.points, 0).tk10, { inferred: false })
    expect(dropsDatasetSchema.safeParse(notInferred).success).toBe(false)
    const basis = clone()
    Object.assign(at(basis.points, 0).basis, { status: 'confirmed' })
    expect(dropsDatasetSchema.safeParse(basis).success).toBe(false)
  })
})

describe('helpers', () => {
  it('pointsBySection y pointsByComponent filtran sin mutar', () => {
    expect(pointsBySection('corona')).toHaveLength(11)
    expect(pointsBySection('boca-pozo').map((p) => p.id)).toEqual(['BP-1', 'BP-2', 'BP-3', 'BP-4'])
    expect(pointsByComponent('vientos').map((p) => p.id)).toEqual([
      'DCO-4',
      'DCO-5',
      'DCO-6',
      'DCO-7',
      'DCO-8',
      'PE-10',
      'PE-13',
      'DPE-4',
    ])
    expect(pointsByComponent('bop')).toEqual([])
    const total = DROPS_COMPONENT_IDS.reduce((n, id) => n + pointsByComponent(id).length, 0)
    expect(total).toBe(66)
  })

  it('zoneOf devuelve la zona más alta entre los puntos del componente (alto > medio > bajo > null)', () => {
    expect(zoneOf('mastil')).toBe('alto')
    expect(zoneOf('enganche')).toBe('alto')
    expect(zoneOf('vientos')).toBe('alto')
    expect(zoneOf('aparejo')).toBe('medio')
    expect(zoneOf('malacate')).toBe('medio')
    expect(zoneOf('cabina')).toBe('medio')
    expect(zoneOf('caballetes')).toBe('medio')
    expect(zoneOf('camion')).toBe('medio')
    expect(zoneOf('circulacion')).toBe('bajo')
    // Solo tiene puntos sin zona (poste de retenida): no se presenta como Baja.
    expect(zoneOf('llave')).toBeNull()
    // Sin puntos.
    expect(zoneOf('bop')).toBeNull()
    expect(zoneOf('motor')).toBeNull()
  })

  it('zoneOf: prioridad alto > medio > bajo con un dataset sintético', () => {
    const d = clone()
    const sub = pointOf(d, 'SUB-1') // camion, medio
    expect(zoneOf('camion', d)).toBe('medio')
    sub.zone = 'bajo'
    sub.sectionId = 'piletas'
    expect(zoneOf('camion', d)).toBe('bajo')
    sub.zone = 'alto'
    sub.sectionId = 'corona'
    expect(zoneOf('camion', d)).toBe('alto')
  })
})

describe('toQhseDataset', () => {
  const qhse = toQhseDataset()

  it('valida con qhseDatasetSchema', () => {
    const result = qhseDatasetSchema.safeParse(qhse)
    expect(result.success, JSON.stringify(result.error?.issues.slice(0, 3))).toBe(true)
  })

  it('valida con makeQhseDatasetSchema (componentes y fuentes del dataset)', () => {
    const sources = indexSources(
      ds.sources.map((s) => ({ id: s.id, kind: s.kind, title: s.title, verified: s.verified })),
    )
    const schema = makeQhseDatasetSchema(new Set(DROPS_COMPONENT_IDS), sources)
    const result = schema.safeParse(qhse)
    expect(result.success, JSON.stringify(result.error?.issues.slice(0, 3))).toBe(true)
  })

  it('un riesgo por sección y una barrera preventiva por punto, sin zonas de exclusión', () => {
    expect(qhse.rigId).toBe('RIG-10')
    expect(qhse.risks).toHaveLength(DROPS_SECTION_IDS.length)
    expect(qhse.barriers).toHaveLength(66)
    expect(qhse.zones).toEqual([])
    for (const r of qhse.risks) {
      expect(r.hazard).toBe('droppedObjects')
      expect(r.basis).toEqual({ status: 'pendingValidation' })
      expect(r.event).toBe(PENDING_TEXT)
      expect(r.consequence).toBe(PENDING_TEXT)
    }
    const riskIds = new Set(qhse.risks.map((r) => r.id))
    for (const b of qhse.barriers) {
      expect(b.type).toBe('preventive')
      expect(riskIds.has(b.riskId)).toBe(true)
      expect(b.basis.sourceId).toBe('libro-drops-2024')
    }
  })

  it('no inventa medidas ni exclusiones en el derivado', () => {
    const json = JSON.stringify(qhse)
    expect(json).not.toMatch(/radiusM|heightM|weightKg|distanceM|"shape"/)
  })
})
