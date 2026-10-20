import { describe, expect, it } from 'vitest'
import { HAZARD_LABELS, PENDING_TEXT, QHSE_STATUS_LABELS, isMandatoryStatus } from './qhse/hazards'
import {
  barrierSchema,
  exclusionZoneSchema,
  hazardKindSchema,
  indexSources,
  makeQhseDatasetSchema,
  makeTrainingStepsSchema,
  qhseBasisSchema,
  qhseDatasetSchema,
  qhseStatusSchema,
  riskSchema,
  rigSchema,
  sourceSchema,
  specificationSchema,
} from './schema'

const source = {
  id: 'src-folleto',
  kind: 'brochure',
  title: 'Folleto Equipo 10',
  verified: true,
} as const

const validRig = {
  id: 'RIG-10',
  name: 'Equipo 10',
  service: 'Pulling',
  sources: [source],
  equipment: [],
  components: [
    {
      id: 'mast',
      rigId: 'RIG-10',
      name: 'Mástil',
      family: 'mast',
      confidence: 'A',
      sourceIds: ['src-folleto'],
      specifications: [],
    },
  ],
} as const

describe('catálogo QHSE', () => {
  it('cubre las 12 categorías de peligro del schema', () => {
    expect(Object.keys(HAZARD_LABELS).sort()).toEqual([...hazardKindSchema.options].sort())
  })

  it('cubre los 4 estatus y solo confirmed/procedure son obligatorios', () => {
    expect(Object.keys(QHSE_STATUS_LABELS).sort()).toEqual([...qhseStatusSchema.options].sort())
    expect(isMandatoryStatus('confirmed')).toBe(true)
    expect(isMandatoryStatus('procedure')).toBe(true)
    expect(isMandatoryStatus('goodPractice')).toBe(false)
    expect(isMandatoryStatus('pendingValidation')).toBe(false)
  })
})

describe('qhse basis', () => {
  it('exige fuente salvo pendingValidation', () => {
    expect(qhseBasisSchema.safeParse({ status: 'procedure' }).success).toBe(false)
    expect(qhseBasisSchema.safeParse({ status: 'procedure', sourceId: 's' }).success).toBe(true)
    expect(qhseBasisSchema.safeParse({ status: 'pendingValidation' }).success).toBe(true)
  })

  const zone = {
    id: 'z1',
    riskId: 'r1',
    title: 'Zona',
    hazard: 'lineOfFire',
    shape: { type: 'circle', center: [0, 0], radiusM: 5 },
    basis: { status: 'pendingValidation' },
  }

  it('no admite geometría de zona pendiente de validación salvo que sea ilustrativa', () => {
    expect(exclusionZoneSchema.safeParse(zone).success).toBe(false)
    expect(exclusionZoneSchema.safeParse({ ...zone, shape: undefined }).success).toBe(true)
    expect(exclusionZoneSchema.safeParse({ ...zone, illustrative: true }).success).toBe(true)
  })

  it('una zona ilustrativa nunca puede presentarse como confirmada', () => {
    const confirmed = { ...zone, illustrative: true, basis: { status: 'confirmed', sourceId: 's' } }
    expect(exclusionZoneSchema.safeParse(confirmed).success).toBe(false)
  })

  it('una zona con geometría confirmada o procedure y fuente es válida', () => {
    const ok = { ...zone, basis: { status: 'confirmed', sourceId: 'src-folleto' } }
    expect(exclusionZoneSchema.safeParse(ok).success).toBe(true)
    const proc = { ...zone, basis: { status: 'procedure', sourceId: 'src-folleto' } }
    expect(exclusionZoneSchema.safeParse(proc).success).toBe(true)
  })

  it('una zona con geometría no ilustrativa exige confirmed/procedure (no goodPractice)', () => {
    const bp = { ...zone, basis: { status: 'goodPractice', sourceId: 'src-folleto' } }
    expect(exclusionZoneSchema.safeParse(bp).success).toBe(false)
    expect(exclusionZoneSchema.safeParse({ ...bp, shape: undefined }).success).toBe(true)
    // ilustrativa + goodPractice sigue prohibido: illustrative => pendingValidation
    expect(exclusionZoneSchema.safeParse({ ...bp, illustrative: true }).success).toBe(false)
  })
})

describe('rigSchema', () => {
  it('acepta un rig consistente', () => {
    expect(rigSchema.safeParse(validRig).success).toBe(true)
  })

  it('rechaza fuentes inexistentes, ids duplicados, parentId huérfano y confianza inválida', () => {
    const c = validRig.components[0]
    expect(
      rigSchema.safeParse({ ...validRig, components: [{ ...c, sourceIds: ['nope'] }] }).success,
    ).toBe(false)
    expect(rigSchema.safeParse({ ...validRig, components: [c, c] }).success).toBe(false)
    expect(
      rigSchema.safeParse({ ...validRig, components: [{ ...c, parentId: 'ghost' }] }).success,
    ).toBe(false)
    expect(
      rigSchema.safeParse({ ...validRig, components: [{ ...c, confidence: 'D' }] }).success,
    ).toBe(false)
  })

  it('exige rutas de modelo bajo /models', () => {
    const c = validRig.components[0]
    expect(
      rigSchema.safeParse({
        ...validRig,
        components: [{ ...c, model: '/models/rig10/mast.glb' }],
      }).success,
    ).toBe(true)
    expect(
      rigSchema.safeParse({ ...validRig, components: [{ ...c, model: 'http://x/mast.glb' }] })
        .success,
    ).toBe(false)
  })

  it('rechaza rutas de modelo con "..", "//", backslashes, "." o %-encoding', () => {
    const c = validRig.components[0]
    const parse = (model: string) =>
      rigSchema.safeParse({ ...validRig, components: [{ ...c, model }] }).success
    expect(parse('/models/rig10/mast.gltf')).toBe(true)
    expect(parse('/models/rig10/mast.v2..final.glb')).toBe(true)
    expect(parse('/models/../secret.glb')).toBe(false)
    expect(parse('/models/rig10/../../x.glb')).toBe(false)
    expect(parse('/models//rig10/mast.glb')).toBe(false)
    expect(parse('/models/rig10' + String.fromCharCode(92) + 'mast.glb')).toBe(false)
    expect(parse('/models/./mast.glb')).toBe(false)
    expect(parse('/models/%2e%2e/x.glb')).toBe(false)
    expect(parse('/models/rig10%2Fmast.glb')).toBe(false)
    expect(parse('/other/mast.glb')).toBe(false)
  })
})

describe('rigSchema: referencias cruzadas', () => {
  const c = validRig.components[0]
  const eq = { id: 'eq1', rigId: 'RIG-10', name: 'Mástil y aparejo', componentIds: ['mast'] }
  const spec = {
    key: 'anchorDistance',
    label: 'Distancia de anclajes',
    value: 25,
    unit: 'm',
    confidence: 'B',
    sourceId: 'src-folleto',
  }
  const withSpec = (s: object) => ({ ...validRig, components: [{ ...c, specifications: [s] }] })

  it('equipment: rigId y componentIds deben coincidir con el rig', () => {
    expect(rigSchema.safeParse({ ...validRig, equipment: [eq] }).success).toBe(true)
    expect(
      rigSchema.safeParse({ ...validRig, equipment: [{ ...eq, rigId: 'OTRO' }] }).success,
    ).toBe(false)
    expect(
      rigSchema.safeParse({ ...validRig, equipment: [{ ...eq, componentIds: ['ghost'] }] }).success,
    ).toBe(false)
    expect(rigSchema.safeParse({ ...validRig, equipment: [eq, eq] }).success).toBe(false)
  })

  it('conflicts[].sourceId debe existir en rig.sources', () => {
    const other = { ...source, id: 'src-layout', kind: 'layout' } as const
    const conflict = (sourceId: string) => ({ ...spec, conflicts: [{ sourceId, value: 20 }] })
    const rig = (s: object) => ({ ...withSpec(s), sources: [source, other] })
    expect(rigSchema.safeParse(rig(conflict('src-layout'))).success).toBe(true)
    expect(rigSchema.safeParse(rig(conflict('ghost'))).success).toBe(false)
  })

  it('una especificación A exige fuente verificada y no estimada', () => {
    const a = { ...spec, confidence: 'A', sourceId: 'src-x' }
    const rig = (s: object) => ({
      ...withSpec(a),
      sources: [source, { ...source, id: 'src-x', ...s }],
    })
    expect(rigSchema.safeParse(rig({})).success).toBe(true)
    expect(rigSchema.safeParse(rig({ verified: false })).success).toBe(false)
    expect(rigSchema.safeParse(rig({ kind: 'estimate' })).success).toBe(false)
  })
})

describe('specificationSchema: conflictos', () => {
  const spec = {
    key: 'anchorDistance',
    label: 'Distancia de anclajes',
    value: 25,
    confidence: 'B',
    sourceId: 'src-layout',
  }
  const conflict = { sourceId: 'src-folleto', value: 20 }

  it('acepta un conflicto de otra fuente con otro valor y confianza B/C', () => {
    expect(specificationSchema.safeParse({ ...spec, conflicts: [conflict] }).success).toBe(true)
    expect(
      specificationSchema.safeParse({ ...spec, confidence: 'C', conflicts: [conflict] }).success,
    ).toBe(true)
  })

  it('una especificación en conflicto no puede ser confianza A (sin conflicto sí)', () => {
    expect(specificationSchema.safeParse({ ...spec, confidence: 'A' }).success).toBe(true)
    expect(specificationSchema.safeParse({ ...spec, confidence: 'A', conflicts: [] }).success).toBe(
      true,
    )
    expect(
      specificationSchema.safeParse({ ...spec, confidence: 'A', conflicts: [conflict] }).success,
    ).toBe(false)
  })

  it('un conflicto no puede repetir la fuente principal ni el mismo valor', () => {
    const mismaFuente = { ...conflict, sourceId: 'src-layout' }
    expect(specificationSchema.safeParse({ ...spec, conflicts: [mismaFuente] }).success).toBe(false)
    const mismoValor = { ...conflict, value: 25 }
    expect(specificationSchema.safeParse({ ...spec, conflicts: [mismoValor] }).success).toBe(false)
    // comparación estricta: 25 (número) y '25' (texto) son valores distintos
    const otroTipo = { ...conflict, value: '25' }
    expect(specificationSchema.safeParse({ ...spec, conflicts: [otroTipo] }).success).toBe(true)
  })
})

describe('sourceSchema', () => {
  it('exige verified booleano', () => {
    expect(sourceSchema.safeParse(source).success).toBe(true)
    expect(sourceSchema.safeParse({ ...source, verified: false }).success).toBe(true)
    expect(sourceSchema.safeParse({ ...source, verified: undefined }).success).toBe(false)
    expect(sourceSchema.safeParse({ ...source, verified: 'si' }).success).toBe(false)
  })
})

describe('rigSchema service', () => {
  it('admite los tres servicios y rechaza otros o su ausencia', () => {
    for (const service of ['Pulling', 'Workover', 'Pulling / Workover']) {
      expect(rigSchema.safeParse({ ...validRig, service }).success).toBe(true)
    }
    expect(rigSchema.safeParse({ ...validRig, service: 'Drilling' }).success).toBe(false)
    expect(rigSchema.safeParse({ ...validRig, service: 'pulling' }).success).toBe(false)
    expect(rigSchema.safeParse({ ...validRig, service: undefined }).success).toBe(false)
  })
})

const pending = { status: 'pendingValidation' } as const
const confirmedBasis = { status: 'confirmed', sourceId: 'src-folleto' } as const

const risk = {
  id: 'r1',
  rigId: 'RIG-10',
  hazard: 'suspendedLoad',
  title: 'Carga suspendida',
  event: 'Caída de la carga',
  consequence: 'Lesión al personal',
  componentIds: ['mast'],
  basis: pending,
} as const

const barrier = {
  id: 'b1',
  riskId: 'r1',
  title: 'Barrera',
  type: 'preventive',
  basis: pending,
} as const

const dsZone = { id: 'z1', riskId: 'r1', title: 'Zona', hazard: 'suspendedLoad', basis: pending }

const dataset = { rigId: 'RIG-10', risks: [risk], barriers: [barrier], zones: [dsZone] }

describe('riskSchema (bow-tie)', () => {
  it('exige event y consequence no vacíos', () => {
    expect(riskSchema.safeParse(risk).success).toBe(true)
    expect(riskSchema.safeParse({ ...risk, event: '' }).success).toBe(false)
    expect(riskSchema.safeParse({ ...risk, event: '   ' }).success).toBe(false)
    expect(riskSchema.safeParse({ ...risk, consequence: '' }).success).toBe(false)
    expect(riskSchema.safeParse({ ...risk, event: undefined }).success).toBe(false)
    expect(riskSchema.safeParse({ ...risk, consequence: undefined }).success).toBe(false)
  })

  it('un riesgo pendiente admite el centinela PENDING_TEXT; el resto exige texto real', () => {
    expect(PENDING_TEXT).toBe('Pendiente de definición')
    const sentinel = { ...risk, event: PENDING_TEXT, consequence: PENDING_TEXT }
    expect(riskSchema.safeParse(sentinel).success).toBe(true)
    expect(riskSchema.safeParse({ ...sentinel, event: '' }).success).toBe(false)
    for (const basis of [
      confirmedBasis,
      { status: 'procedure', sourceId: 'src-folleto' },
      { status: 'goodPractice', sourceId: 'src-folleto' },
    ] as const) {
      expect(riskSchema.safeParse({ ...risk, basis }).success).toBe(true)
      expect(riskSchema.safeParse({ ...risk, basis, event: PENDING_TEXT }).success).toBe(false)
      expect(riskSchema.safeParse({ ...risk, basis, consequence: PENDING_TEXT }).success).toBe(
        false,
      )
      const shouted = `  ${PENDING_TEXT.toUpperCase()} `
      expect(riskSchema.safeParse({ ...risk, basis, event: shouted }).success).toBe(false)
    }
  })

  it('un riesgo no pendiente exige fuente', () => {
    expect(riskSchema.safeParse({ ...risk, basis: { status: 'confirmed' } }).success).toBe(false)
    expect(riskSchema.safeParse({ ...risk, basis: confirmedBasis }).success).toBe(true)
  })
})

describe('barrierSchema', () => {
  it('exige type preventive|mitigative', () => {
    expect(barrierSchema.safeParse(barrier).success).toBe(true)
    expect(barrierSchema.safeParse({ ...barrier, type: 'mitigative' }).success).toBe(true)
    expect(barrierSchema.safeParse({ ...barrier, type: 'other' }).success).toBe(false)
    expect(barrierSchema.safeParse({ ...barrier, type: undefined }).success).toBe(false)
  })

  it('performanceNote es texto libre opcional (no numérico)', () => {
    const note = { ...barrier, performanceNote: 'Inspección según procedimiento' }
    expect(barrierSchema.safeParse(note).success).toBe(true)
    expect(barrierSchema.safeParse({ ...barrier, performanceNote: 0.99 }).success).toBe(false)
    expect(barrierSchema.safeParse({ ...barrier, performanceNote: '' }).success).toBe(false)
  })

  it('una barrera sin fuente solo es válida como pendingValidation', () => {
    const sinFuente = (status: string) => ({ ...barrier, basis: { status } })
    expect(barrierSchema.safeParse(sinFuente('procedure')).success).toBe(false)
    expect(barrierSchema.safeParse(sinFuente('goodPractice')).success).toBe(false)
    expect(barrierSchema.safeParse(sinFuente('pendingValidation')).success).toBe(true)
    expect(barrierSchema.safeParse({ ...barrier, basis: confirmedBasis }).success).toBe(true)
  })
})

describe('qhseDatasetSchema', () => {
  const strict = makeQhseDatasetSchema(new Set(['mast']))

  it('acepta un conjunto consistente', () => {
    expect(qhseDatasetSchema.safeParse(dataset).success).toBe(true)
    expect(strict.safeParse(dataset).success).toBe(true)
    expect(strict.safeParse({ rigId: 'RIG-10', risks: [], barriers: [], zones: [] }).success).toBe(
      true,
    )
  })

  it('rechaza barrier.riskId y zone.riskId inexistentes', () => {
    const b = { ...dataset, barriers: [{ ...barrier, riskId: 'ghost' }] }
    const z = { ...dataset, zones: [{ ...dsZone, riskId: 'ghost' }] }
    expect(qhseDatasetSchema.safeParse(b).success).toBe(false)
    expect(qhseDatasetSchema.safeParse(z).success).toBe(false)
  })

  it('verifica risk.componentIds contra el rig solo con la factory', () => {
    const d = { ...dataset, risks: [{ ...risk, componentIds: ['ghost'] }] }
    expect(strict.safeParse(d).success).toBe(false)
    expect(qhseDatasetSchema.safeParse(d).success).toBe(true)
  })

  it('rechaza ids duplicados y rigId ajeno', () => {
    expect(strict.safeParse({ ...dataset, risks: [risk, risk] }).success).toBe(false)
    expect(strict.safeParse({ ...dataset, barriers: [barrier, barrier] }).success).toBe(false)
    expect(strict.safeParse({ ...dataset, zones: [dsZone, dsZone] }).success).toBe(false)
    expect(strict.safeParse({ ...dataset, risks: [{ ...risk, rigId: 'OTRO' }] }).success).toBe(
      false,
    )
  })

  it('un riesgo confirmed/procedure exige barrera o nota explícita', () => {
    const conf = { ...risk, basis: confirmedBasis }
    const proc = { ...risk, basis: { status: 'procedure', sourceId: 's' } }
    const sinControl = { ...dataset, risks: [conf], barriers: [] }
    expect(strict.safeParse(sinControl).success).toBe(false)
    expect(strict.safeParse({ ...sinControl, risks: [proc] }).success).toBe(false)
    const respaldada = { ...barrier, basis: { status: 'goodPractice', sourceId: 'src-folleto' } }
    expect(strict.safeParse({ ...sinControl, barriers: [respaldada] }).success).toBe(true)
    // una barrera pendingValidation no respalda a un riesgo confirmed/procedure
    expect(strict.safeParse({ ...sinControl, barriers: [barrier] }).success).toBe(false)
    const conNota = { ...conf, basis: { ...confirmedBasis, note: 'Sin barrera documentada' } }
    expect(strict.safeParse({ ...sinControl, risks: [conNota] }).success).toBe(true)
    const notaVacia = { ...conf, basis: { ...confirmedBasis, note: '  ' } }
    expect(strict.safeParse({ ...sinControl, risks: [notaVacia] }).success).toBe(false)
  })

  it('pendingValidation y goodPractice no exigen barrera', () => {
    const sinControl = { ...dataset, barriers: [] }
    const bp = { ...risk, basis: { status: 'goodPractice', sourceId: 's' } }
    expect(strict.safeParse(sinControl).success).toBe(true)
    expect(strict.safeParse({ ...sinControl, risks: [bp] }).success).toBe(true)
  })

  it('la zona debe compartir hazard con su riesgo', () => {
    const otra = { ...dsZone, hazard: 'lineOfFire' }
    expect(strict.safeParse({ ...dataset, zones: [otra] }).success).toBe(false)
    expect(strict.safeParse({ ...dataset, zones: [dsZone] }).success).toBe(true)
  })
})

describe('qhseDatasetSchema: estatus de barreras y zonas vs. su riesgo', () => {
  const strict = makeQhseDatasetSchema(new Set(['mast']))
  const gp = { status: 'goodPractice', sourceId: 'src-folleto' } as const
  const proc = { status: 'procedure', sourceId: 'src-folleto' } as const
  const withRisk = (basis: object) => ({ ...dataset, risks: [{ ...risk, basis }] })
  const withBarrier = (basis: object) => ({ ...barrier, basis })

  it('barrera o zona no pueden superar al riesgo padre', () => {
    // riesgo pendiente: ni goodPractice ni confirmed
    expect(strict.safeParse({ ...dataset, barriers: [withBarrier(gp)] }).success).toBe(false)
    expect(strict.safeParse({ ...dataset, barriers: [withBarrier(confirmedBasis)] }).success).toBe(
      false,
    )
    expect(strict.safeParse({ ...dataset, zones: [{ ...dsZone, basis: gp }] }).success).toBe(false)
    // riesgo goodPractice: una barrera confirmed lo supera; una goodPractice/pendiente no
    expect(
      strict.safeParse({ ...withRisk(gp), barriers: [withBarrier(confirmedBasis)] }).success,
    ).toBe(false)
    expect(strict.safeParse({ ...withRisk(gp), barriers: [withBarrier(gp)] }).success).toBe(true)
    expect(strict.safeParse({ ...withRisk(gp), barriers: [withBarrier(pending)] }).success).toBe(
      true,
    )
    // riesgo confirmed: confirmed y procedure son equivalentes (misma fuerza)
    const conf = withRisk(confirmedBasis)
    expect(strict.safeParse({ ...conf, barriers: [withBarrier(proc)] }).success).toBe(true)
    expect(strict.safeParse({ ...conf, barriers: [withBarrier(gp)] }).success).toBe(true)
    const zonaProc = { ...dsZone, basis: proc }
    expect(
      strict.safeParse({ ...conf, barriers: [withBarrier(gp)], zones: [zonaProc] }).success,
    ).toBe(true)
  })
})

describe('makeQhseDatasetSchema: fuentes citadas', () => {
  const estimate = { ...source, id: 'src-est', kind: 'estimate' } as const
  const draft = { ...source, id: 'src-draft', verified: false } as const
  const sources = indexSources([source, estimate, draft])
  const withSources = makeQhseDatasetSchema(new Set(['mast']), sources)
  const withoutSources = makeQhseDatasetSchema(new Set(['mast']))
  const bp = (sourceId: string) => ({ status: 'goodPractice', sourceId }) as const
  const conf = (sourceId: string) => ({ status: 'confirmed', sourceId }) as const

  // riesgo goodPractice con su barrera goodPractice; la fuente varía en la barrera
  const ds = (barrierBasis: object, riskBasis: object = bp('src-folleto')) => ({
    ...dataset,
    risks: [{ ...risk, basis: riskBasis }],
    barriers: [{ ...barrier, basis: barrierBasis }],
    zones: [],
  })

  it('acepta fuentes existentes y verificadas', () => {
    expect(withSources.safeParse(ds(bp('src-folleto'))).success).toBe(true)
    expect(withSources.safeParse(ds(conf('src-folleto'), conf('src-folleto'))).success).toBe(true)
  })

  it('rechaza basis.sourceId inexistente en riesgos, barreras y zonas', () => {
    expect(withSources.safeParse(ds(bp('ghost'))).success).toBe(false)
    expect(withSources.safeParse(ds(bp('src-folleto'), bp('ghost'))).success).toBe(false)
    const zone = { ...dsZone, basis: conf('ghost') }
    const d = { ...ds(conf('src-folleto'), conf('src-folleto')), zones: [zone] }
    expect(withSources.safeParse(d).success).toBe(false)
  })

  it('confirmed/procedure exigen fuente verificada y no estimación', () => {
    expect(withSources.safeParse(ds(bp('src-folleto'), conf('src-est'))).success).toBe(false)
    expect(withSources.safeParse(ds(bp('src-folleto'), conf('src-draft'))).success).toBe(false)
    const proc = { status: 'procedure', sourceId: 'src-est' }
    expect(withSources.safeParse(ds(bp('src-folleto'), proc)).success).toBe(false)
    expect(withSources.safeParse(ds(conf('src-est'), conf('src-folleto'))).success).toBe(false)
  })

  it('goodPractice admite fuente no verificada o estimación (no es requisito)', () => {
    expect(withSources.safeParse(ds(bp('src-draft'))).success).toBe(true)
    expect(withSources.safeParse(ds(bp('src-est'))).success).toBe(true)
  })

  it('sin mapa de fuentes no se verifica la fuente citada', () => {
    expect(withoutSources.safeParse(ds(bp('ghost'))).success).toBe(true)
    expect(withoutSources.safeParse(ds(bp('src-folleto'), conf('src-est'))).success).toBe(true)
  })

  it('una zona con geometría confirmada cuyo riesgo es confirmed y con fuente real es válida', () => {
    const zone = {
      id: 'z1',
      riskId: 'r1',
      title: 'Zona',
      hazard: 'suspendedLoad',
      shape: { type: 'circle', center: [0, 0], radiusM: 5 },
      basis: conf('src-folleto'),
    }
    const d = { ...ds(conf('src-folleto'), conf('src-folleto')), zones: [zone] }
    expect(withSources.safeParse(d).success).toBe(true)
  })
})

describe('makeTrainingStepsSchema', () => {
  const step = {
    id: 't1',
    rigId: 'RIG-10',
    order: 1,
    title: 'Paso',
    instruction: 'Instrucción de entrenamiento',
    componentIds: ['mast'],
    riskIds: ['r1'],
    basis: pending,
  }
  const schema = makeTrainingStepsSchema(new Set(['mast']), new Set(['r1']))

  it('acepta pasos consistentes (riskIds opcional)', () => {
    expect(
      schema.safeParse([step, { ...step, id: 't2', order: 2, riskIds: undefined }]).success,
    ).toBe(true)
    expect(schema.safeParse([]).success).toBe(true)
  })

  it('rechaza componentIds y riskIds inexistentes', () => {
    expect(schema.safeParse([{ ...step, componentIds: ['ghost'] }]).success).toBe(false)
    expect(schema.safeParse([{ ...step, riskIds: ['ghost'] }]).success).toBe(false)
  })

  it('rechaza ids duplicados y order repetido dentro del mismo rig', () => {
    expect(schema.safeParse([step, { ...step, order: 2 }]).success).toBe(false)
    expect(schema.safeParse([step, { ...step, id: 't2' }]).success).toBe(false)
    // el mismo order en otro rig es válido
    expect(schema.safeParse([step, { ...step, id: 't2', rigId: 'OTRO' }]).success).toBe(true)
  })

  it('con mapa de fuentes verifica basis.sourceId (sin él no)', () => {
    const conMapa = makeTrainingStepsSchema(
      new Set(['mast']),
      new Set(['r1']),
      indexSources([source]),
    )
    const gp = { ...step, basis: { status: 'goodPractice', sourceId: 'ghost' } }
    expect(conMapa.safeParse([gp]).success).toBe(false)
    expect(schema.safeParse([gp]).success).toBe(true)
  })
})
