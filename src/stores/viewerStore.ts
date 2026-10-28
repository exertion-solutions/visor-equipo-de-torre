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

/**
 * Orden de cámara para el motor nativo. `seq` crece en cada orden, así repetir "enfocar" sobre el mismo
 * componente vuelve a disparar la transición.
 */
export type CameraCommand =
  { type: 'focus'; componentId: string; seq: number } | { type: 'back'; seq: number }

interface ViewerState {
  engine: ViewerEngine
  selectedComponentId: string | null
  /** Componente bajo el puntero en la escena nativa (contorno de hover). */
  hoveredComponentId: string | null
  /** El visor V2 embebido terminó de arrancar (`rig:ready`). */
  legacyReady: boolean
  /** Espejo del estado del visor V2 (`rig:state`); `null` = aún desconocido. */
  view: LegacyView | null
  layers: LegacyLayer[] | null
  /** Componente seleccionado en el V2, con su confiabilidad geométrica. */
  selection: LegacySelection | null
  /** Motor nativo: aristas vivas sobre los GLB ("sombreado con aristas" de un CAD). */
  edges: boolean
  /** Última orden de cámara (la ejecuta `CameraRig`); `null` = ninguna. */
  cameraCommand: CameraCommand | null
  /** Hay una vista guardada por un foco: "Volver" la restaura. Lo mantiene `CameraRig`. */
  canGoBack: boolean
  setEngine: (engine: ViewerEngine) => void
  selectComponent: (id: string | null) => void
  hoverComponent: (id: string | null) => void
  setLegacyReady: (ready: boolean) => void
  setLegacyState: (state: { view: LegacyView | null; layers: LegacyLayer[] }) => void
  setSelection: (selection: LegacySelection | null) => void
  toggleEdges: () => void
  /** Encuadra el componente seleccionado (no hace nada sin selección). */
  focusSelected: () => void
  /** Restaura la vista previa al primer foco (no hace nada si no hay vista guardada). */
  goBack: () => void
  setCanGoBack: (canGoBack: boolean) => void
}

export const useViewerStore = create<ViewerState>()((set, get) => ({
  engine: DEFAULT_ENGINE,
  selectedComponentId: null,
  hoveredComponentId: null,
  legacyReady: false,
  view: null,
  layers: null,
  selection: null,
  edges: true,
  cameraCommand: null,
  canGoBack: false,
  setEngine: (engine) => set({ engine }),
  selectComponent: (selectedComponentId) => set({ selectedComponentId }),
  hoverComponent: (hoveredComponentId) => set({ hoveredComponentId }),
  setLegacyReady: (legacyReady) => set({ legacyReady }),
  setLegacyState: ({ view, layers }) => set({ view, layers }),
  setSelection: (selection) => set({ selection, selectedComponentId: selection?.id ?? null }),
  toggleEdges: () => set((s) => ({ edges: !s.edges })),
  focusSelected: () => {
    const { selectedComponentId, cameraCommand } = get()
    if (!selectedComponentId) return
    set({
      cameraCommand: {
        type: 'focus',
        componentId: selectedComponentId,
        seq: (cameraCommand?.seq ?? 0) + 1,
      },
    })
  },
  goBack: () => {
    const { canGoBack, cameraCommand } = get()
    if (!canGoBack) return
    set({ cameraCommand: { type: 'back', seq: (cameraCommand?.seq ?? 0) + 1 } })
  },
  setCanGoBack: (canGoBack) => set({ canGoBack }),
}))
