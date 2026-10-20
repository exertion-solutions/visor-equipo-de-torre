/**
 * Contrato de mensajes app ⇄ visor V2 embebido (iframe). Documentado en `docs/LEGACY_BRIDGE.md`.
 *
 * El iframe corre con sandbox SIN `allow-same-origin` (origen opaco): la app solo acepta mensajes cuyo
 * `event.source` sea el `contentWindow` del iframe y los valida con estos guardas; nada se asume por forma.
 * El lado del visor vive en `legacy-ext/70-bridge.js`.
 */
import { isAppMode, type AppMode } from '@/types/mode'

export const BRIDGE_VERSION = 1

export const LEGACY_VIEWS = ['iso', 'front', 'side', 'top', 'well'] as const
export type LegacyView = (typeof LEGACY_VIEWS)[number]

/** Capas que el visor V2 puede activar/desactivar. Los ids son los del parámetro `layers` de la URL. */
export const LEGACY_LAYERS = ['zonas', 'cotas', 'etiquetas', 'malla', 'despiece', 'drops'] as const
export type LegacyLayer = (typeof LEGACY_LAYERS)[number]

/** Confiabilidad geométrica: A confirmado · B parcial · C aproximado (ver CLAUDE.md). */
export const GEOMETRY_GRADES = ['A', 'B', 'C'] as const
export type GeometryGrade = (typeof GEOMETRY_GRADES)[number]

export const GRADE_LABELS: Record<GeometryGrade, string> = {
  A: 'Confirmado',
  B: 'Parcial',
  C: 'Aproximado',
}

export function isLegacyView(value: unknown): value is LegacyView {
  return typeof value === 'string' && (LEGACY_VIEWS as readonly string[]).includes(value)
}

export function isLegacyLayer(value: unknown): value is LegacyLayer {
  return typeof value === 'string' && (LEGACY_LAYERS as readonly string[]).includes(value)
}

export function isGeometryGrade(value: unknown): value is GeometryGrade {
  return typeof value === 'string' && (GEOMETRY_GRADES as readonly string[]).includes(value)
}

/** Deduplica y descarta ids desconocidos, conservando el orden canónico de `LEGACY_LAYERS`. */
export function normalizeLayers(input: readonly unknown[]): LegacyLayer[] {
  const wanted = new Set(input.filter(isLegacyLayer))
  return LEGACY_LAYERS.filter((l) => wanted.has(l))
}

// ── app → visor ─────────────────────────────────────────────────────────────────────────────
export type AppToLegacyMessage =
  | { type: 'rig:setMode'; mode: AppMode }
  | { type: 'rig:setView'; view: LegacyView }
  | { type: 'rig:setLayers'; layers: LegacyLayer[] }
  | { type: 'rig:ping' }

/** Compat: nombre histórico del mensaje de modo. */
export type LegacySetModeMessage = Extract<AppToLegacyMessage, { type: 'rig:setMode' }>

// ── visor → app ─────────────────────────────────────────────────────────────────────────────
export interface LegacySelection {
  id: string
  name: string | null
  grade: GeometryGrade | null
  status: string | null
}

export type LegacyToAppMessage =
  | { type: 'rig:ready'; version: number }
  | { type: 'rig:state'; mode: AppMode | null; view: LegacyView | null; layers: LegacyLayer[] }
  | { type: 'rig:select'; selection: LegacySelection | null }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)

/** Valida un `MessageEvent.data` del visor. Devuelve `null` si no es un mensaje conocido y bien formado. */
export function parseLegacyMessage(data: unknown): LegacyToAppMessage | null {
  if (!isRecord(data) || typeof data.type !== 'string') return null
  switch (data.type) {
    case 'rig:ready':
      return { type: 'rig:ready', version: typeof data.version === 'number' ? data.version : 0 }
    case 'rig:state':
      return {
        type: 'rig:state',
        mode: isAppMode(data.mode) ? data.mode : null,
        view: isLegacyView(data.view) ? data.view : null,
        layers: Array.isArray(data.layers) ? normalizeLayers(data.layers) : [],
      }
    case 'rig:select': {
      if (data.id === null || data.id === undefined) return { type: 'rig:select', selection: null }
      if (typeof data.id !== 'string' || !data.id) return null
      return {
        type: 'rig:select',
        selection: {
          id: data.id,
          name: strOrNull(data.name),
          grade: isGeometryGrade(data.grade) ? data.grade : null,
          status: strOrNull(data.status),
        },
      }
    }
    default:
      return null
  }
}
