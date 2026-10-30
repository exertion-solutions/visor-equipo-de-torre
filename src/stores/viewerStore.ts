import { create } from 'zustand'
import type { LegacyLayer, LegacySelection, LegacyView } from '@/lib/legacyBridge'
import type { Vec3 } from '@/lib/geometry'
import type { Fence } from '@/lib/walk'
import { presetProjection, type CameraPresetId } from '@/scene/cameras/presets'
import { DEFAULT_PROJECTION, type Projection } from '@/scene/cameras/projection'

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
  | { type: 'focus'; componentId: string; seq: number }
  | { type: 'back'; seq: number }
  | { type: 'view'; view: CameraPresetId; seq: number }
  /** Vuelo a una vista en primera persona (perspectiva, con su fov): `ms` = 0 es un salto. Guarda la vista previa para "Volver". */
  | { type: 'viewpoint'; position: Vec3; target: Vec3; fov: number; ms: number; seq: number }
  /** Pasa a la altura de los ojos (1,70 m) en el lugar donde está la cámara, dentro del vallado, y mirando hacia donde miraba. */
  | { type: 'walk'; fence: Fence; seq: number }

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
  /** Componentes resaltados por un sector del recorrido (contorno dorado, sin abrir la ficha). */
  highlightIds: readonly string[]
  /** Ayuda de atajos de teclado abierta (`?` o `H` con el foco en el lienzo). */
  helpOpen: boolean
  /** Malla (wireframe) sobre todos los materiales; apagada al arrancar. Reversible: no cambia ningún otro dato del material. */
  wire: boolean
  /** Etiquetas numeradas sobre los componentes (apagadas al arrancar, como en el V2). */
  labels: boolean
  /** Última vista estándar elegida (botón resaltado); `null` = ninguna. El legacy tampoco la limpia al orbitar. */
  activeView: CameraPresetId | null
  /** Motor nativo: proyección de la cámara (la aplica `CameraRig`, conservando posición y objetivo). */
  projection: Projection
  /** Componentes ocultos en la escena nativa: ni se dibujan ni reciben hover ni clic. */
  hiddenComponentIds: readonly string[]
  /** Ocultos previos al aislamiento; `null` = no hay aislamiento activo ("Aislar selección"). */
  isolationSnapshot: readonly string[] | null
  setEngine: (engine: ViewerEngine) => void
  selectComponent: (id: string | null) => void
  hoverComponent: (id: string | null) => void
  setLegacyReady: (ready: boolean) => void
  setLegacyState: (state: { view: LegacyView | null; layers: LegacyLayer[] }) => void
  setSelection: (selection: LegacySelection | null) => void
  toggleEdges: () => void
  toggleLabels: () => void
  toggleWire: () => void
  setHelpOpen: (open: boolean) => void
  setHighlight: (ids: readonly string[]) => void
  /** Vuela a una vista en primera persona (la ejecuta `CameraRig`). */
  flyTo: (view: { position: Vec3; target: Vec3; fov: number; ms: number }) => void
  /** Baja la cámara a la altura de los ojos para caminar (la ejecuta `CameraRig`). */
  standUp: (fence: Fence) => void
  /** Encuadra el componente seleccionado (no hace nada sin selección). */
  focusSelected: () => void
  /** Restaura la vista previa al primer foco (no hace nada si no hay vista guardada). */
  goBack: () => void
  setCanGoBack: (canGoBack: boolean) => void
  /**
   * Va a una vista estándar: fija la proyección (ortográfica salvo "Boca de pozo"), anula el "Volver" y anima la cámara
   * (la ejecuta `CameraRig`). Como en el legacy.
   */
  setView: (view: CameraPresetId) => void
  setProjection: (projection: Projection) => void
  toggleProjection: () => void
  /**
   * "Aislar selección": oculta todos los componentes de `allIds` salvo el seleccionado; si ya está aislado,
   * restaura lo que estaba oculto antes. Sin selección (o con una que no está en `allIds`) no hace nada.
   */
  toggleIsolation: (allIds: readonly string[]) => void
  /**
   * Muestra u oculta componentes a mano (panel de componentes). Ocultar el seleccionado o el que tiene hover los
   * deselecciona. Un cambio manual termina el aislamiento: ya no hay un estado previo al que volver.
   */
  setComponentsVisible: (ids: readonly string[], visible: boolean) => void
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
  labels: false,
  wire: false,
  helpOpen: false,
  highlightIds: [],
  activeView: null,
  projection: DEFAULT_PROJECTION,
  hiddenComponentIds: [],
  isolationSnapshot: null,
  setEngine: (engine) => set({ engine }),
  selectComponent: (selectedComponentId) => set({ selectedComponentId }),
  hoverComponent: (hoveredComponentId) => set({ hoveredComponentId }),
  setLegacyReady: (legacyReady) => set({ legacyReady }),
  setLegacyState: ({ view, layers }) => set({ view, layers }),
  setSelection: (selection) => set({ selection, selectedComponentId: selection?.id ?? null }),
  toggleEdges: () => set((s) => ({ edges: !s.edges })),
  toggleLabels: () => set((s) => ({ labels: !s.labels })),
  toggleWire: () => set((s) => ({ wire: !s.wire })),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setHighlight: (highlightIds) => set({ highlightIds }),
  flyTo: (view) =>
    set((s) => ({
      cameraCommand: { type: 'viewpoint', ...view, seq: (s.cameraCommand?.seq ?? 0) + 1 },
    })),
  standUp: (fence) =>
    set((s) => ({ cameraCommand: { type: 'walk', fence, seq: (s.cameraCommand?.seq ?? 0) + 1 } })),
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
  setView: (view) => {
    const { cameraCommand } = get()
    set({
      activeView: view,
      projection: presetProjection(view),
      cameraCommand: { type: 'view', view, seq: (cameraCommand?.seq ?? 0) + 1 },
    })
  },
  setProjection: (projection) => set({ projection }),
  toggleProjection: () =>
    set((s) => ({ projection: s.projection === 'orthographic' ? 'perspective' : 'orthographic' })),
  toggleIsolation: (allIds) => {
    const { isolationSnapshot, hiddenComponentIds, selectedComponentId, hoveredComponentId } = get()
    if (isolationSnapshot) {
      set({ hiddenComponentIds: isolationSnapshot, isolationSnapshot: null })
      return
    }
    if (!selectedComponentId || !allIds.includes(selectedComponentId)) return
    const hidden = allIds.filter((id) => id !== selectedComponentId)
    set({
      hiddenComponentIds: hidden,
      isolationSnapshot: hiddenComponentIds,
      // Un componente que se oculta no puede quedar con el contorno de hover.
      hoveredComponentId:
        hoveredComponentId && hidden.includes(hoveredComponentId) ? null : hoveredComponentId,
    })
  },
  setComponentsVisible: (ids, visible) => {
    const { hiddenComponentIds, selectedComponentId, hoveredComponentId } = get()
    const hidden = visible
      ? hiddenComponentIds.filter((id) => !ids.includes(id))
      : [...hiddenComponentIds, ...ids.filter((id) => !hiddenComponentIds.includes(id))]
    set({
      hiddenComponentIds: hidden,
      isolationSnapshot: null,
      selectedComponentId:
        selectedComponentId && hidden.includes(selectedComponentId) ? null : selectedComponentId,
      hoveredComponentId:
        hoveredComponentId && hidden.includes(hoveredComponentId) ? null : hoveredComponentId,
    })
  },
}))
