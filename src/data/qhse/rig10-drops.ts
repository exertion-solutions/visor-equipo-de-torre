import { z } from 'zod'
import type { Barrier, QhseDataset, Risk } from '@/types'
import { PENDING_TEXT } from './hazards'
import data from './rig10-drops.json'

/**
 * Dataset canónico de puntos de control DROPS del equipo 10 (`rig10-drops.json`, fuente única).
 *
 * - Cualitativo: sin radios, alturas, pesos ni distancias (el schema rechaza esas claves).
 * - Cada punto cita fuente y página (Libro DROPS 2024, RCCO Rev.03) con estatus `procedure`
 *   por decisión del usuario; el Libro no nombra el equipo y su aplicabilidad al equipo 10 la declara
 *   el usuario (ver `meta.assumptions`).
 * - `componentId` y la relación foto equipo 10 <-> punto son INFERIDOS (`inferred: true`).
 * - Las guías genéricas (Manual DROPS, Taller YPF) no son puntos: solo `references`.
 */

/** Los 13 componentes del visor a los que se mapean los puntos (mapeo inferido, no documental). */
export const DROPS_COMPONENT_IDS = [
  'mastil',
  'subestructura',
  'malacate',
  'aparejo',
  'motor',
  'cabina',
  'bop',
  'llave',
  'caballetes',
  'circulacion',
  'vientos',
  'enganche',
  'camion',
] as const

export const DROPS_ZONE_IDS = ['alto', 'medio', 'bajo'] as const

export const DROPS_SECTION_IDS = [
  'corona',
  'debajo-corona',
  'piso-enganche',
  'debajo-piso-enganche',
  'boca-pozo',
  'subestructura-carrier',
  'casilla-maquinista',
  'plano-inclinado',
  'piletas',
  'piso-trabajo',
  'poste-llave',
] as const

/** Claves de medida prohibidas: los documentos no dan radios, alturas, pesos ni distancias. */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['radiusM', 'heightM', 'weightKg', 'distanceM'])
const FORBIDDEN_KEY_PATTERN = /^(radius|height|weight|distance|radio|altura|peso|distancia)/i

const findForbiddenKeys = (
  value: unknown,
  path: (string | number)[] = [],
  found: (string | number)[][] = [],
): (string | number)[][] => {
  if (Array.isArray(value)) {
    value.forEach((item, i) => findForbiddenKeys(item, [...path, i], found))
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key) || FORBIDDEN_KEY_PATTERN.test(key)) found.push([...path, key])
      findForbiddenKeys(child, [...path, key], found)
    }
  }
  return found
}

const nonEmpty = z.string().trim().min(1)
const nullableText = nonEmpty.nullable()

export const dropsComponentIdSchema = z.enum(DROPS_COMPONENT_IDS)
export const dropsZoneIdSchema = z.enum(DROPS_ZONE_IDS)
export const dropsSectionIdSchema = z.enum(DROPS_SECTION_IDS)

const sourceSchema = z.strictObject({
  id: nonEmpty,
  kind: z.enum(['procedure', 'layout', 'photo', 'manufacturer', 'brochure', 'estimate']),
  title: nonEmpty,
  ref: nonEmpty,
  revision: nullableText,
  verified: z.boolean(),
})

const ZONE_META = {
  alto: { label: 'Riesgo ALTO', color: '#EF4444' },
  medio: { label: 'Riesgo MEDIO', color: '#F59E0B' },
  bajo: { label: 'Riesgo BAJO', color: '#22C55E' },
} as const

const zoneSchema = z
  .strictObject({
    id: dropsZoneIdSchema,
    label: z.enum(['Riesgo ALTO', 'Riesgo MEDIO', 'Riesgo BAJO']),
    color: z.enum(['#EF4444', '#F59E0B', '#22C55E']),
    areas: z.array(nonEmpty).min(1),
    sourceId: nonEmpty,
    note: nonEmpty,
  })
  .refine(
    (zone) => zone.label === ZONE_META[zone.id].label && zone.color === ZONE_META[zone.id].color,
    {
      message: 'label/color no corresponden al id de la zona',
    },
  )

const sectionSchema = z.strictObject({
  id: dropsSectionIdSchema,
  label: nonEmpty,
  order: z.number().int().positive(),
  zone: dropsZoneIdSchema.nullable(),
  zoneBasis: nonEmpty,
  pageRange: nonEmpty,
  sourceId: nonEmpty,
})

const pointSchema = z.strictObject({
  id: nonEmpty,
  sectionId: dropsSectionIdSchema,
  order: z.number().int().positive(),
  name: nonEmpty,
  componentId: dropsComponentIdSchema,
  componentIdBasis: z.literal('inferido'),
  /** Sujeción primaria: texto del Libro. */
  primary: nullableText,
  /** Retención de seguridad: texto del Libro. */
  secondary: nullableText,
  secondaryRequired: z.boolean(),
  /** Cantidades y diámetros solo como texto tal como constan en el Libro. */
  quantity: nullableText,
  observation: nullableText,
  flags: z.array(nonEmpty),
  zone: dropsZoneIdSchema.nullable(),
  basis: z.strictObject({
    status: z.literal('procedure'),
    sourceId: nonEmpty,
    page: z.number().int().positive(),
    note: nullableText,
  }),
})

const referenceSchema = z.strictObject({
  id: nonEmpty,
  title: nonEmpty,
  date: nonEmpty,
  summary: nonEmpty,
  relatedPointIds: z.array(nonEmpty),
  sourceId: nonEmpty,
})

const duplicates = (ids: readonly string[]): string[] => [
  ...new Set(ids.filter((id, i) => ids.indexOf(id) !== i)),
]

const datasetObjectSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    meta: z.strictObject({
      rigId: nonEmpty,
      title: nonEmpty,
      generated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      assumptions: z.array(nonEmpty).min(1),
      disclaimer: nonEmpty,
    }),
    sources: z.array(sourceSchema).min(1),
    zones: z.array(zoneSchema).length(DROPS_ZONE_IDS.length),
    sections: z.array(sectionSchema).length(DROPS_SECTION_IDS.length),
    points: z.array(pointSchema).min(1),
    references: z.array(referenceSchema),
  })
  .superRefine((ds, ctx) => {
    const issue = (message: string, path: (string | number)[]): void => {
      ctx.addIssue({ code: 'custom', message, path })
    }

    const groups = [
      ['sources', ds.sources],
      ['zones', ds.zones],
      ['sections', ds.sections],
      ['points', ds.points],
      ['references', ds.references],
    ] as const
    for (const [key, items] of groups) {
      for (const dup of duplicates(items.map((i) => i.id))) {
        issue(`${key} con id duplicado: ${dup}`, [key])
      }
    }
    if (new Set(ds.sections.map((s) => s.order)).size !== ds.sections.length) {
      issue('sections con order repetido', ['sections'])
    }

    const sourceById = new Map(ds.sources.map((s) => [s.id, s]))
    const sectionById = new Map(ds.sections.map((s) => [s.id, s]))
    const pointById = new Map(ds.points.map((p) => [p.id, p]))
    const requireSource = (id: string, path: (string | number)[]): void => {
      if (!sourceById.has(id)) issue(`fuente inexistente: ${id}`, path)
    }

    ds.zones.forEach((z, i) => requireSource(z.sourceId, ['zones', i, 'sourceId']))
    ds.sections.forEach((s, i) => {
      requireSource(s.sourceId, ['sections', i, 'sourceId'])
      if (s.zone === null && s.zoneBasis !== 'No clasificada en layout A2') {
        issue("una sección sin zona debe declarar zoneBasis 'No clasificada en layout A2'", [
          'sections',
          i,
          'zoneBasis',
        ])
      }
    })

    const pointsPerSection = new Map<string, number[]>()
    ds.points.forEach((p, i) => {
      const section = sectionById.get(p.sectionId)
      if (section === undefined) {
        issue(`sectionId inexistente: ${p.sectionId}`, ['points', i, 'sectionId'])
      } else if (p.zone !== section.zone) {
        issue(
          `zone ${String(p.zone)} != zone ${String(section.zone)} de la sección ${section.id}`,
          ['points', i, 'zone'],
        )
      }
      const orders = pointsPerSection.get(p.sectionId) ?? []
      if (orders.includes(p.order)) {
        issue(`order ${p.order} repetido en la sección ${p.sectionId}`, ['points', i, 'order'])
      }
      pointsPerSection.set(p.sectionId, [...orders, p.order])

      const src = sourceById.get(p.basis.sourceId)
      if (src === undefined) {
        issue(`fuente inexistente: ${p.basis.sourceId}`, ['points', i, 'basis', 'sourceId'])
      } else if (!src.verified || src.kind === 'estimate') {
        issue(
          `fuente ${src.id} no apta para procedure: debe estar verificada y no ser estimación`,
          ['points', i, 'basis', 'sourceId'],
        )
      }
      if (p.secondaryRequired && p.secondary === null) {
        issue('secondaryRequired:true exige el texto de la retención en secondary', [
          'points',
          i,
          'secondary',
        ])
      }
      if (p.flags.includes('dudoso') && (p.observation ?? '').trim().length === 0) {
        issue("un punto 'dudoso' debe explicar la duda en observation", [
          'points',
          i,
          'observation',
        ])
      }
    })
    for (const section of ds.sections) {
      if (!pointsPerSection.has(section.id)) {
        issue(`la sección ${section.id} no tiene puntos`, ['sections'])
      }
    }

    ds.references.forEach((r, i) => {
      requireSource(r.sourceId, ['references', i, 'sourceId'])
      for (const pid of r.relatedPointIds) {
        if (!pointById.has(pid))
          issue(`punto inexistente: ${pid}`, ['references', i, 'relatedPointIds'])
      }
    })
  })

/**
 * Schema del dataset. Además de la forma y la integridad referencial, rechaza en cualquier nivel
 * las claves de medida (`radiusM`, `heightM`, `weightKg`, `distanceM` y variantes radius/height/
 * weight/distance/radio/altura/peso/distancia): los documentos no dan esos datos.
 */
export const dropsDatasetSchema = z
  .unknown()
  .superRefine((value, ctx) => {
    for (const path of findForbiddenKeys(value)) {
      ctx.addIssue({
        code: 'custom',
        message: `clave de medida prohibida (los documentos no dan radios, alturas, pesos ni distancias): ${String(path.at(-1))}`,
        path,
      })
    }
  })
  .pipe(datasetObjectSchema)

export type DropsDataset = z.infer<typeof dropsDatasetSchema>
export type DropsSource = DropsDataset['sources'][number]
export type DropsZone = DropsDataset['zones'][number]
export type DropsSection = DropsDataset['sections'][number]
export type DropsPoint = DropsDataset['points'][number]
export type DropsReference = DropsDataset['references'][number]
export type DropsComponentId = z.infer<typeof dropsComponentIdSchema>
export type DropsZoneId = z.infer<typeof dropsZoneIdSchema>
export type DropsSectionId = z.infer<typeof dropsSectionIdSchema>

/** Parsea y valida un dataset arbitrario (lanza `ZodError` si no cumple el contrato). */
export const parseDropsDataset = (input: unknown): DropsDataset => dropsDatasetSchema.parse(input)

let cached: DropsDataset | undefined

/** Dataset canónico validado (se parsea una sola vez). Tratarlo como solo lectura. */
export const getDropsDataset = (): DropsDataset => {
  cached ??= parseDropsDataset(data)
  return cached
}

export const pointsByComponent = (
  componentId: DropsComponentId,
  dataset: DropsDataset = getDropsDataset(),
): DropsPoint[] => dataset.points.filter((p) => p.componentId === componentId)

export const pointsBySection = (
  sectionId: DropsSectionId,
  dataset: DropsDataset = getDropsDataset(),
): DropsPoint[] => dataset.points.filter((p) => p.sectionId === sectionId)

const ZONE_RANK: Record<DropsZoneId, number> = { alto: 3, medio: 2, bajo: 1 }

/**
 * Zona más alta entre los puntos de un componente (alto > medio > bajo). `null` si el componente no
 * tiene puntos o todos están sin zona (piso de trabajo y poste de retenida no figuran en el A2).
 * El componente de cada punto es inferido, así que esta zona también lo es.
 */
export const zoneOf = (
  componentId: DropsComponentId,
  dataset: DropsDataset = getDropsDataset(),
): DropsZoneId | null => {
  let best: DropsZoneId | null = null
  for (const point of pointsByComponent(componentId, dataset)) {
    if (point.zone !== null && (best === null || ZONE_RANK[point.zone] > ZONE_RANK[best])) {
      best = point.zone
    }
  }
  return best
}

const uniqueInOrder = <T>(items: readonly T[]): T[] => [...new Set(items)]

/**
 * Deriva el conjunto QHSE (`QhseDataset`: `Risk[]` + `Barrier[]`, sin zonas) del dataset DROPS.
 * Se valida con `qhseDatasetSchema` / `makeQhseDatasetSchema`.
 *
 * Decisión de derivación:
 * - Un `Risk` por sección (`hazard: 'droppedObjects'`, `componentIds` = componentes inferidos de sus
 *   puntos). Los documentos no dan `event` ni `consequence` por sección, y un riesgo `procedure`
 *   no puede llevar el centinela; por eso el riesgo es `pendingValidation` (sin fuente) con
 *   `event`/`consequence` = `PENDING_TEXT`. La clasificación de área del A2 va solo en `description`.
 * - Una `Barrier` `preventive` por punto (sujeción primaria y retención de seguridad del Libro en
 *   `description`/`performanceNote`, fuente y página en `basis`). El schema QHSE impide que una
 *   barrera sea más fuerte que su riesgo, así que la barrera queda `pendingValidation` (conserva
 *   `sourceId` y página) aunque el punto figure como `procedure` en el dataset DROPS. Para
 *   presentarlas como requisito habría que documentar `event`/`consequence` desde el procedimiento
 *   (procedimiento DROPS §6.2 y §6.4) y subir el riesgo a `procedure`: decisión del usuario, no se hace aquí.
 * - Sin zonas de exclusión: no hay geometría documentada (el A2 no trae radios ni cotas).
 */
export const toQhseDataset = (dataset: DropsDataset = getDropsDataset()): QhseDataset => {
  const zoneLabel = new Map(dataset.zones.map((z) => [z.id, z.label]))
  const risks: Risk[] = []
  const barriers: Barrier[] = []

  for (const section of [...dataset.sections].sort((a, b) => a.order - b.order)) {
    const points = pointsBySection(section.id, dataset)
    const riskId = `drops-${section.id}`
    const area =
      section.zone === null
        ? 'Sin clasificación en layout A2'
        : `Clasificación de área layout A2: ${zoneLabel.get(section.zone) ?? section.zone}`
    risks.push({
      id: riskId,
      rigId: dataset.meta.rigId,
      hazard: 'droppedObjects',
      title: `Caída de objetos: ${section.label}`,
      description: `${area}. ${points.length} puntos de control del Libro DROPS 2024 (págs. ${section.pageRange}).`,
      event: PENDING_TEXT,
      consequence: PENDING_TEXT,
      componentIds: uniqueInOrder(points.map((p) => p.componentId)),
      basis: { status: 'pendingValidation' },
    })

    for (const p of [...points].sort((a, b) => a.order - b.order)) {
      barriers.push({
        id: `drops-${p.id}`,
        riskId,
        title: p.name,
        ...(p.primary === null ? {} : { description: `Sujeción primaria: ${p.primary}` }),
        type: 'preventive',
        ...(p.secondary === null
          ? {}
          : { performanceNote: `Retención de seguridad (Libro): ${p.secondary}` }),
        basis: {
          status: 'pendingValidation',
          sourceId: p.basis.sourceId,
          note: `Libro DROPS 2024, pág. ${p.basis.page}. El punto figura como procedure en el dataset DROPS (decisión del usuario); aquí queda pendingValidation porque el riesgo derivado no tiene event/consequence documentados.`,
        },
      })
    }
  }

  return { rigId: dataset.meta.rigId, risks, barriers, zones: [] }
}
