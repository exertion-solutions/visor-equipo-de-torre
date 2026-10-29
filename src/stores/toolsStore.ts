import { create } from 'zustand'
import { clampExplodeAmount, DEFAULT_EXPLODE_AMOUNT } from '@/lib/explode'
import type { Vec3 } from '@/lib/geometry'
import { useModeStore } from './modeStore'
import { useViewerStore } from './viewerStore'

/**
 * Herramientas de inspección del motor nativo (equivalen a `#c-dims` y `#c-measure` del V2): cotas del equipo y medición
 * entre dos puntos de la superficie del modelo.
 */
interface ToolsState {
  /** Cotas del equipo dibujadas con su nivel A/B/C. */
  dims: boolean
  /** Zonas ilustrativas de riesgo (envolventes gráficas sin validar) encendidas a mano; el modo QHSE las enciende solo. */
  zones: boolean
  /** Capa DROPS (marcadores por sección y clasificación A2) encendida a mano; el modo QHSE la enciende sola. */
  drops: boolean
  /** Sección DROPS abierta en el panel (`null` = ninguna). */
  dropsSection: string | null
  /** Despiece encendido (el botón); la separación pedida va en `explodeAmount`. */
  explodeOn: boolean
  /** Separación pedida por la perilla (0,01–1); se recuerda mientras el despiece está apagado. */
  explodeAmount: number
  /** ¿Hay algo desplazado ahora (separación actual > 0)? La escribe el animador al cruzar el 0, no a cada cuadro. */
  exploded: boolean
  /** Modo medir: los clics sobre el modelo ponen puntos en lugar de seleccionar. */
  measure: boolean
  /** Puntos medidos (0, 1 o 2), en el marco de la escena. */
  points: readonly Vec3[]
  toggleDims: () => void
  toggleZones: () => void
  toggleDrops: () => void
  /** Abre una sección en el panel DROPS; deselecciona el componente (comparten el costado del visor). */
  openDropsSection: (id: string | null) => void
  /** Enciende o apaga el despiece. Encenderlo apaga el modo medir (las medidas valen sobre el equipo armado). */
  toggleExplode: () => void
  setExplodeAmount: (amount: number) => void
  setExploded: (exploded: boolean) => void
  /** Activa o desactiva el modo medir. Desactivarlo no borra la medición hecha (como el V2): se borra con `clearMeasure`. */
  toggleMeasure: () => void
  /** Agrega un punto; con dos ya puestos, el siguiente clic empieza una medición nueva. */
  addPoint: (point: Vec3) => void
  clearMeasure: () => void
}

export const useToolsStore = create<ToolsState>()((set) => ({
  dims: false,
  zones: false,
  drops: false,
  dropsSection: null,
  explodeOn: false,
  explodeAmount: DEFAULT_EXPLODE_AMOUNT,
  exploded: false,
  measure: false,
  points: [],
  toggleDims: () => set((s) => ({ dims: !s.dims })),
  toggleZones: () => set((s) => ({ zones: !s.zones })),
  toggleDrops: () => set((s) => ({ drops: !s.drops, dropsSection: null })),
  openDropsSection: (id) => {
    if (id !== null) useViewerStore.getState().selectComponent(null)
    set({ dropsSection: id })
  },
  toggleExplode: () =>
    set((s) => ({ explodeOn: !s.explodeOn, measure: s.explodeOn ? s.measure : false })),
  setExplodeAmount: (amount) => set({ explodeAmount: clampExplodeAmount(amount) }),
  setExploded: (exploded) => set({ exploded }),
  // Con el equipo desarmado no se mide: los puntos quedarían sobre piezas que ya no están ahí.
  toggleMeasure: () => set((s) => (s.explodeOn || s.exploded ? s : { measure: !s.measure })),
  addPoint: (point) =>
    set((s) => ({ points: s.points.length >= 2 ? [point] : [...s.points, point] })),
  clearMeasure: () => set({ points: [] }),
}))

/** Texto de ayuda del modo medir (el del V2); vacío fuera de ese modo. */
export function measureHint(measure: boolean, pointCount: number): string {
  if (!measure) return ''
  if (pointCount === 0) return 'Hacé clic en dos superficies del modelo. Valores aproximados.'
  if (pointCount === 1) return 'Seleccioná el segundo punto de la superficie.'
  return 'Medición aproximada entre superficies. Otro clic inicia una nueva.'
}

/**
 * ¿Se dibujan las zonas ilustrativas? Las enciende el botón "Zonas" o el modo QHSE. El modo es una capa derivada: al salir
 * de QHSE las zonas se apagan solas (salvo que se hayan encendido a mano), sin guardar ni restaurar nada.
 */
export const zonesVisible = (zones: boolean, mode: string): boolean => zones || mode === 'qhse'

export function useZonesVisible(): boolean {
  const zones = useToolsStore((s) => s.zones)
  const mode = useModeStore((s) => s.mode)
  const exploded = useToolsStore((s) => s.exploded)
  // Las zonas están referidas al equipo armado: con el despiece no valen y se ocultan (como en el V2).
  return zonesVisible(zones, mode) && !exploded
}

/** ¿Se muestra la capa DROPS? La enciende el botón "DROPS" o el modo QHSE (capa derivada, como las zonas). */
export const dropsVisible = (drops: boolean, mode: string): boolean => drops || mode === 'qhse'

export function useDropsVisible(): boolean {
  const drops = useToolsStore((s) => s.drops)
  const mode = useModeStore((s) => s.mode)
  const exploded = useToolsStore((s) => s.exploded)
  return dropsVisible(drops, mode) && !exploded
}

/** Cotas visibles: el botón las enciende y el despiece las oculta (están referidas al equipo armado). */
export function useDimsVisible(): boolean {
  const dims = useToolsStore((s) => s.dims)
  const exploded = useToolsStore((s) => s.exploded)
  return dims && !exploded
}
