/**
 * Estado compartible en la URL: `?mode=qhse&view=iso&layers=zonas,cotas` (+ `dev=1` para el motor nativo).
 * Puro y sin React: `parseUrlState` / `buildSearch` se prueban sin DOM.
 */
import {
  isLegacyView,
  normalizeLayers,
  type LegacyLayer,
  type LegacyView,
} from '@/lib/legacyBridge'
import { DEFAULT_MODE, isAppMode, type AppMode } from '@/types/mode'

export interface UrlState {
  mode: AppMode
  /** `null` = no viene en la URL (el visor conserva su vista por defecto). */
  view: LegacyView | null
  /** `null` = no viene en la URL (rige el preset del modo). `[]` = explícitamente sin capas. */
  layers: LegacyLayer[] | null
}

export const DEFAULT_VIEW: LegacyView = 'iso'

export function parseUrlState(search: string): UrlState {
  const p = new URLSearchParams(search)
  const mode = p.get('mode')
  const view = p.get('view')
  const layers = p.get('layers')
  return {
    mode: isAppMode(mode) ? mode : DEFAULT_MODE,
    view: isLegacyView(view) ? view : null,
    layers: layers === null ? null : normalizeLayers(layers.split(',').map((s) => s.trim())),
  }
}

/** Motor pedido por la URL: `?engine=native` abre el nativo; sin el parámetro (o con otro valor) rige el V2. */
export function parseEngineParam(search: string): 'native' | null {
  return new URLSearchParams(search).get('engine') === 'native' ? 'native' : null
}

/** `search` con el motor reflejado: `engine=native` solo con el nativo (el V2 es el valor por defecto). */
export function withEngine(search: string, engine: 'legacy' | 'native'): string {
  const p = new URLSearchParams(search)
  p.delete('engine')
  if (engine === 'native') p.set('engine', 'native')
  const s = p.toString().replace(/%2C/g, ',')
  return s ? `?${s}` : ''
}

/**
 * Devuelve `search` con los parámetros de estado actualizados, conservando cualquier otro (`dev`, …).
 * Solo se escribe lo que difiere del valor por defecto; `layers=` vacío se conserva cuando el modo no
 * es EXPLORE, para que "todas las capas apagadas" sobreviva a recargar (si no, volvería el preset).
 */
export function buildSearch(search: string, state: UrlState): string {
  const p = new URLSearchParams(search)
  for (const k of ['mode', 'view', 'layers']) p.delete(k)
  if (state.mode !== DEFAULT_MODE) p.set('mode', state.mode)
  if (state.view && state.view !== DEFAULT_VIEW) p.set('view', state.view)
  if (state.layers && (state.layers.length > 0 || state.mode !== DEFAULT_MODE)) {
    p.set('layers', state.layers.join(','))
  }
  const s = p.toString().replace(/%2C/g, ',')
  return s ? `?${s}` : ''
}

let initial: UrlState | null = null
let initialSearch: string | null = null

/** Query con la que se abrió la página (memoizada): de ahí salen el motor y los enlaces profundos, una sola vez. */
export function getInitialSearch(): string {
  return (initialSearch ??= typeof location === 'undefined' ? '' : location.search)
}

/** Estado que traía la URL al abrir la página (memoizado). Se aplica al visor V2 una sola vez, en `ready`. */
export function getInitialUrlState(): UrlState {
  return (initial ??= parseUrlState(typeof location === 'undefined' ? '' : location.search))
}
