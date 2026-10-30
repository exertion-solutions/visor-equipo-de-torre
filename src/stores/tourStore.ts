import { create } from 'zustand'
import { RIG10_VIEWPOINTS, VIEWPOINT_COMPONENTS } from '@/data/viewpoints/rig10-viewpoints'
import { tourStops } from '@/lib/viewpoints'
import { useToolsStore } from './toolsStore'
import { useViewerStore } from './viewerStore'

/**
 * Recorridos del motor nativo (equivalen a `87-recorridos` del V2): "Ir a equipo" (vuelo a un sector con su ficha), el
 * recorrido guiado (modo Entrenamiento) y la caminata en primera persona. Es una herramienta VISUAL: las vistas no son puestos de
 * trabajo ni distancias de seguridad.
 */
interface TourState {
  /** Panel "Ir a equipo" desplegado. */
  open: boolean
  /** Sector actual (`null` = ninguno). */
  currentId: string | null
  /** Parada del recorrido guiado (−1 = todavía ninguna). */
  stopIndex: number
  /** El recorrido guiado avanza solo. */
  auto: boolean
  /** Modo caminata activo. */
  walking: boolean
  setOpen: (open: boolean) => void
  /** Vuela al sector. Una vista manual pausa el recorrido guiado; el avance automático lo conserva (`keepTour`). */
  go: (id: string, keepTour?: boolean) => boolean
  /** Suelta el estado del recorrido (sector, resaltado, recorrido y caminata) sin tocar la cámara. */
  clear: () => void
  /** Vuelve a la vista previa al primer sector. */
  back: () => void
  /** Va a la parada `index` del recorrido guiado (acotada a las paradas que hay). */
  stop: (index: number, follow?: boolean) => void
  play: () => void
  pause: () => void
  next: () => void
  prev: () => void
  startWalk: () => void
  stopWalk: () => void
}

const STOPS = tourStops(RIG10_VIEWPOINTS)
const byId = new Map(RIG10_VIEWPOINTS.viewpoints.map((v) => [v.id, v]))

export const TOUR_STOPS: readonly string[] = STOPS

export const useTourStore = create<TourState>()((set, get) => ({
  open: false,
  currentId: null,
  stopIndex: -1,
  auto: false,
  walking: false,
  setOpen: (open) => set({ open }),

  go: (id, keepTour = false) => {
    const vp = byId.get(id)
    if (!vp) return false
    const viewer = useViewerStore.getState()
    // Como el V2: el equipo se arma (sin despiece) y la caminata se suelta antes de volar.
    if (useToolsStore.getState().explodeOn) useToolsStore.getState().toggleExplode()
    set((s) => ({ currentId: id, walking: false, auto: keepTour ? s.auto : false }))
    viewer.setHighlight(VIEWPOINT_COMPONENTS[id] ?? [])
    viewer.flyTo({
      position: vp.camPos,
      target: vp.target,
      fov: vp.fov,
      ms: RIG10_VIEWPOINTS.transicion.ms,
    })
    return true
  },

  clear: () => {
    useViewerStore.getState().setHighlight([])
    set({ currentId: null, auto: false, walking: false, stopIndex: -1 })
  },

  back: () => {
    get().clear()
    useViewerStore.getState().goBack()
  },

  stop: (index, follow = false) => {
    if (STOPS.length === 0) return
    const i = Math.min(Math.max(index, 0), STOPS.length - 1)
    const auto = follow && get().auto
    get().go(STOPS[i]!, follow)
    set({ stopIndex: i, auto })
  },
  pause: () => set({ auto: false }),
  play: () => {
    const { auto, stopIndex } = get()
    if (auto) return set({ auto: false })
    set({ auto: true })
    // Desde el principio, o si ya llegó a la última parada; si no, sigue desde la actual.
    if (stopIndex < 0 || stopIndex >= STOPS.length - 1) get().stop(0, true)
  },
  next: () => {
    set({ auto: false })
    get().stop(get().stopIndex + 1)
  },
  prev: () => {
    set({ auto: false })
    get().stop(get().stopIndex - 1)
  },

  startWalk: () => {
    if (useToolsStore.getState().explodeOn) useToolsStore.getState().toggleExplode()
    useViewerStore.getState().setHighlight([])
    set({ walking: true, currentId: null, auto: false })
    useViewerStore.getState().standUp(RIG10_VIEWPOINTS.locacion)
  },
  stopWalk: () => set({ walking: false }),
}))

// Otra vista de la cámara (vistas estándar, foco, "Volver") toma la cámara: el recorrido suelta su estado.
useViewerStore.subscribe((s, prev) => {
  const c = s.cameraCommand
  if (c === prev.cameraCommand || !c) return
  if (c.type === 'viewpoint' || c.type === 'walk') return
  const t = useTourStore.getState()
  if (t.currentId || t.walking || t.stopIndex >= 0 || t.auto) t.clear()
})
