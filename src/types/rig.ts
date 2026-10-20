/**
 * Modelo de datos base de DIGITAL RIG.
 * Unidades: 1 unidad 3D = 1 metro (ver CLAUDE.md). Todo dato numérico declara su fuente.
 */

/** A = documentado · B = parcialmente documentado · C = aproximado */
export type GeometryConfidence = 'A' | 'B' | 'C'

export type SourceKind = 'brochure' | 'layout' | 'manufacturer' | 'photo' | 'procedure' | 'estimate'

/** Trazabilidad de un dato. `ref` apunta al documento, página o norma concreta. */
export interface Source {
  id: string
  kind: SourceKind
  title: string
  ref?: string
  revision?: string
  /** ¿Se revisó contra el documento original? `false` = transcripción sin contrastar; la UI no la presenta como validada. */
  verified: boolean
}

/** Otra fuente que declara un valor distinto para la misma especificación. */
export interface SourceConflict {
  sourceId: string
  value: number | string | boolean
  note?: string
}

export interface Specification {
  key: string
  label: string
  value: number | string | boolean
  unit?: string
  /** Confianza del dato (no de la geometría). */
  confidence: GeometryConfidence
  sourceId: string
  /** Si hay fuentes en conflicto, la UI muestra "Fuente en conflicto" y no elige una en silencio. */
  conflicts?: SourceConflict[]
}

/** Familias de componentes de un equipo Pulling/Workover (no de un drilling rig). */
export type ComponentFamily =
  | 'carrier'
  | 'hoisting'
  | 'mast'
  | 'workfloor'
  | 'power'
  | 'well-control'
  | 'circulation'
  | 'auxiliary'
  | 'anchoring'
  | 'lighting'

export interface Component {
  id: string
  rigId: string
  name: string
  family: ComponentFamily
  /** Confianza de la geometría 3D asociada. Nunca presentar C como as-built. */
  confidence: GeometryConfidence
  sourceIds: string[]
  parentId?: string
  specifications: Specification[]
  /** Qué NO representa la geometría (p. ej. "reeving visual esquemático"). Se muestra junto al nivel A/B/C. */
  scope?: string
  /** Desplazamiento de despiece autorado en metros [x, y, z] a factor 1. Determinista; no se calcula. */
  explodeOffset?: [number, number, number]
  /** Ruta bajo public/, p. ej. `/models/rig10/mast.glb`. */
  model?: string
}

export interface Equipment {
  id: string
  rigId: string
  name: string
  componentIds: string[]
}

/** Tipo de servicio del equipo (mobile pulling/workover; nunca drilling). */
export type RigService = 'Pulling' | 'Workover' | 'Pulling / Workover'

export interface Rig {
  id: string
  name: string
  service: RigService
  sources: Source[]
  equipment: Equipment[]
  components: Component[]
}
