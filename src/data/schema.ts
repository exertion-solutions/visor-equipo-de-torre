import { z } from 'zod'
import type { QhseStatus, Source } from '@/types'
import { PENDING_TEXT, isMandatoryStatus } from './qhse/hazards'

/**
 * Validación de integridad de los datos del rig (se ejecuta en tests y, cuando existan datos,
 * al cargarlos). Refleja las reglas de CLAUDE.md: trazabilidad de fuentes y QHSE sin inventos.
 */
export const confidenceSchema = z.enum(['A', 'B', 'C'])

export const qhseStatusSchema = z.enum([
  'confirmed',
  'procedure',
  'goodPractice',
  'pendingValidation',
])

export const hazardKindSchema = z.enum([
  'lineOfFire',
  'droppedObjects',
  'highPressure',
  'suspendedLoad',
  'mobileEquipment',
  'workingAtHeight',
  'pinchPoints',
  'rotatingEquipment',
  'wellControl',
  'chemicals',
  'noise',
  'emergencyRoutes',
])

export const sourceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['brochure', 'layout', 'manufacturer', 'photo', 'procedure', 'estimate']),
  title: z.string().min(1),
  ref: z.string().optional(),
  revision: z.string().optional(),
  /** ¿Revisada contra el documento original? */
  verified: z.boolean(),
})

const specificationObjectSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.union([z.number(), z.string(), z.boolean()]),
  unit: z.string().optional(),
  confidence: confidenceSchema,
  sourceId: z.string().min(1),
  conflicts: z
    .array(
      z.object({
        sourceId: z.string().min(1),
        value: z.union([z.number(), z.string(), z.boolean()]),
        note: z.string().optional(),
      }),
    )
    .optional(),
})

/**
 * Una especificación con `conflicts` no vacío no está "documentada": `confidence` no puede ser 'A'.
 * Un conflicto debe venir de OTRA fuente y declarar OTRO valor (comparación estricta `===`:
 * 25 y '25' cuentan como valores distintos). La existencia de `conflicts[].sourceId` en el rig
 * la verifica `rigSchema`.
 */
export const specificationSchema = specificationObjectSchema.superRefine((spec, ctx) => {
  const conflicts = spec.conflicts ?? []
  if (conflicts.length > 0 && spec.confidence === 'A') {
    ctx.addIssue({
      code: 'custom',
      message: 'Una especificación en conflicto no puede tener confianza A',
      path: ['confidence'],
    })
  }
  conflicts.forEach((c, i) => {
    if (c.sourceId === spec.sourceId) {
      ctx.addIssue({
        code: 'custom',
        message: `El conflicto repite la fuente principal (${c.sourceId})`,
        path: ['conflicts', i, 'sourceId'],
      })
    }
    if (c.value === spec.value) {
      ctx.addIssue({
        code: 'custom',
        message: 'El conflicto declara el mismo valor que la especificación: no es un conflicto',
        path: ['conflicts', i, 'value'],
      })
    }
  })
})

/**
 * Ruta de modelo bajo `/models/`: solo `.glb`/`.gltf`; sin segmentos `.` ni `..`, sin `//`,
 * sin backslashes y sin variantes percent-encoded de `.`, `/` o backslash.
 */
const isSafeModelPath = (p: string): boolean =>
  /^\/models\/.+\.(glb|gltf)$/.test(p) &&
  !p.includes('\\') &&
  !p.includes('//') &&
  !/%(2e|2f|5c)/i.test(p) &&
  !p.split('/').some((seg) => seg === '..' || seg === '.')

export const componentSchema = z.object({
  id: z.string().min(1),
  rigId: z.string().min(1),
  name: z.string().min(1),
  family: z.enum([
    'carrier',
    'hoisting',
    'mast',
    'workfloor',
    'power',
    'well-control',
    'circulation',
    'auxiliary',
    'anchoring',
    'lighting',
  ]),
  confidence: confidenceSchema,
  sourceIds: z.array(z.string().min(1)).min(1),
  parentId: z.string().optional(),
  specifications: z.array(specificationSchema),
  scope: z.string().min(1).optional(),
  explodeOffset: z.tuple([z.number(), z.number(), z.number()]).optional(),
  model: z
    .string()
    .refine(isSafeModelPath, 'model debe ser /models/**/*.glb|gltf, sin "..", "//" ni backslashes')
    .optional(),
})

/** Solo `pendingValidation` puede omitir fuente. */
export const qhseBasisSchema = z
  .object({
    status: qhseStatusSchema,
    sourceId: z.string().min(1).optional(),
    note: z.string().optional(),
  })
  .refine((b) => b.status === 'pendingValidation' || b.sourceId !== undefined, {
    message: 'Toda información QHSE no pendiente debe citar su fuente',
    path: ['sourceId'],
  })

const riskObjectSchema = z.object({
  id: z.string().min(1),
  rigId: z.string().min(1),
  hazard: hazardKindSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  /** Qué puede pasar. No vacío; en `pendingValidation` puede ser `PENDING_TEXT` en lugar de inventarlo. */
  event: z.string().trim().min(1),
  /** Qué produce el evento. No vacío; en `pendingValidation` puede ser `PENDING_TEXT`. */
  consequence: z.string().trim().min(1),
  componentIds: z.array(z.string()),
  basis: qhseBasisSchema,
})

const isPendingText = (text: string): boolean =>
  text.trim().toLowerCase() === PENDING_TEXT.toLowerCase()

/**
 * `event`/`consequence` nunca vacíos. Sin fuente (`pendingValidation`) se admite el centinela
 * `PENDING_TEXT` ('Pendiente de definición') para no empujar a inventar texto; un riesgo
 * `goodPractice`/`confirmed`/`procedure` con el centinela (sin distinguir mayúsculas) es inválido.
 */
export const riskSchema = riskObjectSchema.superRefine((r, ctx) => {
  if (r.basis.status === 'pendingValidation') return
  for (const field of ['event', 'consequence'] as const) {
    if (isPendingText(r[field])) {
      ctx.addIssue({
        code: 'custom',
        message: `${field}: un riesgo ${r.basis.status} no puede quedar 'Pendiente de definición'`,
        path: [field],
      })
    }
  }
})

export const barrierTypeSchema = z.enum(['preventive', 'mitigative'])

export const barrierSchema = z.object({
  id: z.string().min(1),
  riskId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  type: barrierTypeSchema,
  /** Texto libre; nunca un valor numérico de desempeño inventado. */
  performanceNote: z.string().min(1).optional(),
  basis: qhseBasisSchema,
})

const point2 = z.tuple([z.number(), z.number()])

export const zoneShapeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('circle'), center: point2, radiusM: z.number().positive() }),
  z.object({
    type: z.literal('rect'),
    center: point2,
    sizeM: z.tuple([z.number().positive(), z.number().positive()]),
    rotationRad: z.number().optional(),
  }),
  z.object({ type: z.literal('polygon'), pointsM: z.array(point2).min(3) }),
])

/**
 * Una zona con geometría que NO sea `illustrative` exige estatus obligatorio (`confirmed` o
 * `procedure`, con fuente): una buena práctica o un dato pendiente no justifican dibujar una
 * distancia como exclusión. Una zona `illustrative` (envolvente gráfica sin validar) es siempre
 * `pendingValidation`: nunca confirmed/procedure ni goodPractice.
 */
export const exclusionZoneSchema = z
  .object({
    id: z.string().min(1),
    riskId: z.string().min(1),
    title: z.string().min(1),
    hazard: hazardKindSchema,
    shape: zoneShapeSchema.optional(),
    illustrative: z.boolean().optional(),
    basis: qhseBasisSchema,
  })
  .refine(
    (z) => z.shape === undefined || z.illustrative === true || isMandatoryStatus(z.basis.status),
    {
      message:
        'Una zona con geometría exige confirmed/procedure, o marcarse illustrative (pendingValidation)',
      path: ['shape'],
    },
  )
  .refine((z) => z.illustrative !== true || z.basis.status === 'pendingValidation', {
    message: 'Una zona illustrative debe estar en pendingValidation',
    path: ['illustrative'],
  })

/** Bases que obligan a que el riesgo declare cómo se controla (barrera) o por qué no. */
const CONTROL_REQUIRED_STATUSES: ReadonlySet<QhseStatus> = new Set(['confirmed', 'procedure'])

/**
 * Orden de fuerza del respaldo: confirmed = procedure (2) > goodPractice (1) > pendingValidation (0).
 * Una barrera o zona nunca puede tener un estatus más fuerte que el de su riesgo padre.
 */
const STATUS_STRENGTH: Record<QhseStatus, number> = {
  confirmed: 2,
  procedure: 2,
  goodPractice: 1,
  pendingValidation: 0,
}

/** Índice de fuentes (id -> tipo y verificación) para `makeQhseDatasetSchema` y `makeTrainingStepsSchema`. */
export type SourceIndex = ReadonlyMap<string, Pick<Source, 'kind' | 'verified'>>

/** Construye el `SourceIndex` a partir de `rig.sources`. */
export const indexSources = (sources: readonly Source[]): SourceIndex =>
  new Map(sources.map((s) => [s.id, { kind: s.kind, verified: s.verified }]))

const findDuplicates = (ids: readonly string[]): string[] =>
  ids.filter((id, i) => ids.indexOf(id) !== i)

/**
 * Con `SourceIndex`: la fuente citada debe existir; y si el estatus es obligatorio
 * (confirmed/procedure) debe estar `verified` y no ser `estimate`.
 */
const checkBasisSource = (
  basis: z.infer<typeof qhseBasisSchema>,
  path: (string | number)[],
  sources: SourceIndex | undefined,
  ctx: z.RefinementCtx,
): void => {
  if (sources === undefined || basis.sourceId === undefined) return
  const src = sources.get(basis.sourceId)
  if (src === undefined) {
    ctx.addIssue({
      code: 'custom',
      message: `fuente inexistente: ${basis.sourceId}`,
      path: [...path, 'basis', 'sourceId'],
    })
    return
  }
  if (isMandatoryStatus(basis.status) && (!src.verified || src.kind === 'estimate')) {
    ctx.addIssue({
      code: 'custom',
      message: `fuente ${basis.sourceId} no apta para ${basis.status}: debe estar verificada y no ser estimación`,
      path: [...path, 'basis', 'sourceId'],
    })
  }
}

const qhseDatasetObjectSchema = z.object({
  rigId: z.string().min(1),
  risks: z.array(riskSchema),
  barriers: z.array(barrierSchema),
  zones: z.array(exclusionZoneSchema),
})

/**
 * Integridad referencial del conjunto QHSE (modelo normalizado por id):
 * ids únicos; barrier.riskId y zone.riskId existen; risk.rigId coincide con el dataset;
 * `zone.hazard === risk.hazard`; barrier/zone no superan el estatus de su riesgo
 * (confirmed = procedure > goodPractice > pendingValidation);
 * risk.componentIds existen (si se conoce el conjunto de componentes);
 * todo riesgo `confirmed`/`procedure` tiene >= 1 barrera NO `pendingValidation` (una barrera
 * pendiente no lo respalda) o una nota explícita en su `basis`;
 * con `sources`, cada `basis.sourceId` existe y, en confirmed/procedure, es verificada y no estimación.
 * La exigencia de fuente por entrada ya la impone `qhseBasisSchema`.
 */
const checkQhseIntegrity = (
  ds: z.infer<typeof qhseDatasetObjectSchema>,
  ctx: z.RefinementCtx,
  componentIds: ReadonlySet<string> | undefined,
  sources: SourceIndex | undefined,
): void => {
  const groups = [
    ['risks', ds.risks],
    ['barriers', ds.barriers],
    ['zones', ds.zones],
  ] as const
  for (const [key, items] of groups) {
    for (const dup of new Set(findDuplicates(items.map((i) => i.id)))) {
      ctx.addIssue({ code: 'custom', message: `${key} con id duplicado: ${dup}`, path: [key] })
    }
  }

  const riskById = new Map(ds.risks.map((r) => [r.id, r]))
  const risksWithBackingBarrier = new Set(
    ds.barriers.filter((b) => b.basis.status !== 'pendingValidation').map((b) => b.riskId),
  )

  ds.risks.forEach((r, i) => {
    if (r.rigId !== ds.rigId) {
      ctx.addIssue({
        code: 'custom',
        message: `rigId ${r.rigId} != ${ds.rigId}`,
        path: ['risks', i, 'rigId'],
      })
    }
    if (componentIds !== undefined) {
      for (const cid of r.componentIds) {
        if (!componentIds.has(cid)) {
          ctx.addIssue({
            code: 'custom',
            message: `componentId inexistente: ${cid}`,
            path: ['risks', i, 'componentIds'],
          })
        }
      }
    }
    const hasNote = (r.basis.note ?? '').trim().length > 0
    if (
      CONTROL_REQUIRED_STATUSES.has(r.basis.status) &&
      !risksWithBackingBarrier.has(r.id) &&
      !hasNote
    ) {
      ctx.addIssue({
        code: 'custom',
        message: `riesgo ${r.id} (${r.basis.status}) sin barrera respaldada (no pendingValidation) ni nota explícita`,
        path: ['risks', i, 'basis', 'note'],
      })
    }
    checkBasisSource(r.basis, ['risks', i], sources, ctx)
  })

  const checkChildStrength = (
    kind: 'barrera' | 'zona',
    key: 'barriers' | 'zones',
    i: number,
    child: { id: string; basis: { status: QhseStatus } },
    parent: { id: string; basis: { status: QhseStatus } },
  ): void => {
    if (STATUS_STRENGTH[child.basis.status] > STATUS_STRENGTH[parent.basis.status]) {
      ctx.addIssue({
        code: 'custom',
        message: `${kind} ${child.id} (${child.basis.status}) más fuerte que su riesgo ${parent.id} (${parent.basis.status})`,
        path: [key, i, 'basis', 'status'],
      })
    }
  }

  ds.barriers.forEach((b, i) => {
    const parent = riskById.get(b.riskId)
    if (parent === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `riskId inexistente: ${b.riskId}`,
        path: ['barriers', i, 'riskId'],
      })
    } else {
      checkChildStrength('barrera', 'barriers', i, b, parent)
    }
    checkBasisSource(b.basis, ['barriers', i], sources, ctx)
  })

  ds.zones.forEach((z, i) => {
    const parent = riskById.get(z.riskId)
    if (parent === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `riskId inexistente: ${z.riskId}`,
        path: ['zones', i, 'riskId'],
      })
    } else {
      if (z.hazard !== parent.hazard) {
        ctx.addIssue({
          code: 'custom',
          message: `zona ${z.id}: hazard ${z.hazard} != hazard ${parent.hazard} del riesgo ${parent.id}`,
          path: ['zones', i, 'hazard'],
        })
      }
      checkChildStrength('zona', 'zones', i, z, parent)
    }
    checkBasisSource(z.basis, ['zones', i], sources, ctx)
  })
}

/**
 * Conjunto QHSE con integridad interna (riesgos/barreras/zonas). No verifica `componentIds`
 * ni las fuentes contra el rig: para eso usar `makeQhseDatasetSchema(componentIds, sources)`.
 */
export const qhseDatasetSchema = qhseDatasetObjectSchema.superRefine((ds, ctx) =>
  checkQhseIntegrity(ds, ctx, undefined, undefined),
)

/**
 * Igual que `qhseDatasetSchema`, y además cada `risk.componentIds` debe existir en `componentIds`.
 * `sources` (opcional, ver `indexSources(rig.sources)`): si se pasa, todo `basis.sourceId` de
 * riesgos, barreras y zonas debe existir en el mapa y, para `confirmed`/`procedure`, la fuente debe
 * ser `verified === true` y `kind !== 'estimate'`. Sin `sources` esa parte NO se verifica.
 */
export const makeQhseDatasetSchema = (componentIds: ReadonlySet<string>, sources?: SourceIndex) =>
  qhseDatasetObjectSchema.superRefine((ds, ctx) =>
    checkQhseIntegrity(ds, ctx, componentIds, sources),
  )

export const trainingStepSchema = z.object({
  id: z.string().min(1),
  rigId: z.string().min(1),
  order: z.number().int().nonnegative(),
  title: z.string().min(1),
  instruction: z.string().min(1),
  componentIds: z.array(z.string()),
  riskIds: z.array(z.string()).optional(),
  basis: qhseBasisSchema,
})

/**
 * Conjunto de pasos de entrenamiento con integridad referencial: ids únicos, `order` único por
 * `rigId`, `componentIds` ⊆ `componentIds` y `riskIds` ⊆ `riskIds`. `sources` (opcional) aplica
 * la misma verificación de `basis.sourceId` que `makeQhseDatasetSchema`; sin él no se verifica.
 */
export const makeTrainingStepsSchema = (
  componentIds: ReadonlySet<string>,
  riskIds: ReadonlySet<string>,
  sources?: SourceIndex,
) =>
  z.array(trainingStepSchema).superRefine((steps, ctx) => {
    for (const dup of new Set(findDuplicates(steps.map((s) => s.id)))) {
      ctx.addIssue({ code: 'custom', message: `training step con id duplicado: ${dup}` })
    }
    const seenOrders = new Set<string>()
    steps.forEach((s, i) => {
      const key = `${s.rigId}#${s.order}`
      if (seenOrders.has(key)) {
        ctx.addIssue({
          code: 'custom',
          message: `order ${s.order} repetido en rig ${s.rigId}`,
          path: [i, 'order'],
        })
      }
      seenOrders.add(key)
      for (const cid of s.componentIds) {
        if (!componentIds.has(cid)) {
          ctx.addIssue({
            code: 'custom',
            message: `componentId inexistente: ${cid}`,
            path: [i, 'componentIds'],
          })
        }
      }
      for (const rid of s.riskIds ?? []) {
        if (!riskIds.has(rid)) {
          ctx.addIssue({
            code: 'custom',
            message: `riskId inexistente: ${rid}`,
            path: [i, 'riskIds'],
          })
        }
      }
      checkBasisSource(s.basis, [i], sources, ctx)
    })
  })

export const equipmentSchema = z.object({
  id: z.string().min(1),
  rigId: z.string().min(1),
  name: z.string().min(1),
  componentIds: z.array(z.string()),
})

export const rigServiceSchema = z.enum(['Pulling', 'Workover', 'Pulling / Workover'])

export const rigSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    service: rigServiceSchema,
    sources: z.array(sourceSchema),
    equipment: z.array(equipmentSchema),
    components: z.array(componentSchema),
  })
  .superRefine((rig, ctx) => {
    const sourcesById = new Map(rig.sources.map((s) => [s.id, s]))
    const sourceIds = new Set(sourcesById.keys())
    const componentIds = new Set(rig.components.map((c) => c.id))

    if (sourceIds.size !== rig.sources.length) {
      ctx.addIssue({ code: 'custom', message: 'sources con id duplicado', path: ['sources'] })
    }
    if (componentIds.size !== rig.components.length) {
      ctx.addIssue({ code: 'custom', message: 'components con id duplicado', path: ['components'] })
    }
    if (new Set(rig.equipment.map((e) => e.id)).size !== rig.equipment.length) {
      ctx.addIssue({ code: 'custom', message: 'equipment con id duplicado', path: ['equipment'] })
    }

    rig.equipment.forEach((e, i) => {
      if (e.rigId !== rig.id) {
        ctx.addIssue({
          code: 'custom',
          message: `rigId ${e.rigId} != ${rig.id}`,
          path: ['equipment', i, 'rigId'],
        })
      }
      for (const cid of e.componentIds) {
        if (!componentIds.has(cid)) {
          ctx.addIssue({
            code: 'custom',
            message: `componentId inexistente: ${cid}`,
            path: ['equipment', i, 'componentIds'],
          })
        }
      }
    })

    rig.components.forEach((c, i) => {
      if (c.rigId !== rig.id) {
        ctx.addIssue({
          code: 'custom',
          message: `rigId ${c.rigId} != ${rig.id}`,
          path: ['components', i, 'rigId'],
        })
      }
      c.sourceIds.forEach((sid) => {
        if (!sourceIds.has(sid)) {
          ctx.addIssue({
            code: 'custom',
            message: `fuente inexistente: ${sid}`,
            path: ['components', i, 'sourceIds'],
          })
        }
      })
      c.specifications.forEach((s, j) => {
        if (!sourceIds.has(s.sourceId)) {
          ctx.addIssue({
            code: 'custom',
            message: `fuente inexistente: ${s.sourceId}`,
            path: ['components', i, 'specifications', j, 'sourceId'],
          })
        }
        // A = documento original revisado: exige una fuente verificada que no sea una estimación.
        const src = sourcesById.get(s.sourceId)
        if (s.confidence === 'A' && src && (!src.verified || src.kind === 'estimate')) {
          ctx.addIssue({
            code: 'custom',
            message: `Confianza A requiere una fuente verificada y no estimada (${s.sourceId})`,
            path: ['components', i, 'specifications', j, 'confidence'],
          })
        }
        s.conflicts?.forEach((cf, k) => {
          if (!sourceIds.has(cf.sourceId)) {
            ctx.addIssue({
              code: 'custom',
              message: `fuente de conflicto inexistente: ${cf.sourceId}`,
              path: ['components', i, 'specifications', j, 'conflicts', k, 'sourceId'],
            })
          }
        })
      })
      if (c.parentId !== undefined && !componentIds.has(c.parentId)) {
        ctx.addIssue({
          code: 'custom',
          message: `parentId inexistente: ${c.parentId}`,
          path: ['components', i, 'parentId'],
        })
      }
    })
  })

export type RigInput = z.input<typeof rigSchema>
