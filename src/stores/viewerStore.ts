import { create } from 'zustand'
import type { LegacyLayer, LegacySelection, LegacyView } from '@/lib/legacyBridge'

/** legacy = visor V2 embebido (iframe); native = escena R3F (aún sin paridad). */
export const VIEWER_ENGINES = ['legacy', 'native'] as const
export type ViewerEngine = (typeof VIEWER_ENGINES)[number]

export const DEFAULT_ENGINE: ViewerEngine = 'legacy'

export const ENGINE_LABELS: Record<ViewerEngine, string> = {
  legacy: 'V2 compatible',
  native: 'R3F nativo',
}

export function isViewerEngine(value: unknown): value is ViewerEngine {
  return typeof value === 'string' && (VIEWER_ENGINES as readonly string[]).includes(value)
}

interface ViewerState {
  engine: ViewerEngine
  selectedComponentId: string | null
  /** Componente bajo el puntero en la escena nativa (contorno de hover). */
  hoveredComponentId: string | null
  /** El visor V2 embebido terminó de arrancar (`tacker:ready`). */
  legacyReady: boolean
  /** Espejo del estado del visor V2 (`tacker:state`); `null` = aún desconocido. */
  view: LegacyView | null
  layers: LegacyLayer[] | null
  /** Componente seleccionado en el V2, con su confiabilidad geométrica. */
  selection: LegacySelection | null
  /** Motor nativo: aristas vivas sobre los GLB ("sombreado con aristas" de un CAD). */
  edges: boolean
  setEngine: (engine: ViewerEngine) => void
  selectComponent: (id: string | null) => void
  hoverComponent: (id: string | null) => void
  setLegacyReady: (ready: boolean) => void
  setLegacyState: (state: { view: LegacyView | null; layers: LegacyLayer[] }) => void
  setSelection: (selection: LegacySelection | null) => void
  toggleEdges: () => void
}

export const useViewerStore = create<ViewerState>()((set) => ({
  engine: DEFAULT_ENGINE,
  selectedComponentId: null,
  hoveredComponentId: null,
  legacyReady: false,
  view: null,
  layers: null,
  selection: null,
  edges: true,
  setEngine: (engine) => set({ engine }),
  selectComponent: (selectedComponentId) => set({ selectedComponentId }),
  hoverComponent: (hoveredComponentId) => set({ hoveredComponentId }),
  setLegacyReady: (legacyReady) => set({ legacyReady }),
  setLegacyState: ({ view, layers }) => set({ view, layers }),
  setSelection: (selection) => set({ selection, selectedComponentId: selection?.id ?? null }),
  toggleEdges: () => set((s) => ({ edges: !s.edges })),
}))
