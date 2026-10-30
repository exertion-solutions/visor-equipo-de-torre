import { create } from 'zustand'
import { clampHoist, HOIST_NOTICE, HOIST_REST } from '@/lib/hoist'
import { clampCut, initialCuts, type CutAxis, type Cuts } from '@/lib/cut'
import { clampExplodeAmount, DEFAULT_EXPLODE_AMOUNT } from '@/lib/explode'
import type { Vec3 } from '@/lib/geometry'
import { useModeStore } from './modeStore'
import { useViewerStore } from './viewerStore'

/**
 * Herramientas de inspección del motor nativo (equivalen a `#c-dims` y `#c-measure` del V2): cotas del equipo y medición
 * entre dos puntos de la superficie del modelo.
 */
export type MeasureKind = 'distance' | 'angle'

/** Puntos que cierra cada medición. */
export const MEASURE_POINTS: Record<MeasureKind, number> = { distance: 2, angle: 3 }

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
  /** Cortes de sección X, Y y Z (planos globales que se combinan; las superficies quedan abiertas, sin tapas). */
  cuts: Cuts
  /** Altura del bloque del aparejo (m): la fija el deslizador o la va escribiendo la animación (a unos 10 Hz). */
  hoistHeight: number
  /** Animación didáctica del aparejo en marcha (sube y baja entre 7 y 25 m). */
  hoistPlaying: boolean
  setHoistHeight: (height: number) => void
  toggleHoistPlay: () => void
  /** La animación publica su altura sin pausarse. */
  syncHoist: (height: number) => void
  /** Aviso breve de una acción (enlace copiado, captura lista); se borra solo. `null` = ninguno. */
  notice: string | null
  showNotice: (text: string) => void
  /** Modo medir: los clics sobre el modelo ponen puntos en lugar de seleccionar. */
  measure: boolean
  /** Qué se mide: distancia entre 2 puntos o ángulo ABC con 3 (A, vértice B, C). Los puntos son de este tipo. */
  measureKind: MeasureKind
  /** Puntos medidos (0 a 2 en distancia, 0 a 3 en ángulo), en el marco de la escena. */
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
  toggleCut: (axis: CutAxis) => void
  setCut: (axis: CutAxis, value: number) => void
  /** Activa o desactiva el modo medir. Desactivarlo no borra la medición hecha (como el V2): se borra con `clearMeasure`. */
  toggleMeasure: () => void
  /** Modo medir ángulo (3 puntos): se excluye con el de distancia, como en el V2. */
  toggleAngle: () => void
  /** Agrega un punto; con dos ya puestos, el siguiente clic empieza una medición nueva. */
  addPoint: (point: Vec3) => void
  clearMeasure: () => void
}

/**
 * Enciende o apaga un tipo de medición. Encender el otro tipo lo reemplaza y descarta los puntos (eran de otro tipo);
 * apagar conserva la medición hecha. Con el equipo desarmado no se mide.
 */
function toggleKind(s: ToolsState, kind: MeasureKind): Partial<ToolsState> {
  if (s.explodeOn || s.exploded) return {}
  if (s.measure && s.measureKind === kind) return { measure: false }
  return { measure: true, measureKind: kind, points: s.measureKind === kind ? s.points : [] }
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined

export const useToolsStore = create<ToolsState>()((set, get) => ({
  dims: false,
  zones: false,
  drops: false,
  dropsSection: null,
  cuts: initialCuts(),
  explodeOn: false,
  explodeAmount: DEFAULT_EXPLODE_AMOUNT,
  exploded: false,
  hoistHeight: HOIST_REST,
  hoistPlaying: false,
  notice: null,
  measure: false,
  measureKind: 'distance',
  points: [],
  toggleDims: () => set((s) => ({ dims: !s.dims })),
  toggleZones: () => set((s) => ({ zones: !s.zones })),
  toggleDrops: () => set((s) => ({ drops: !s.drops, dropsSection: null })),
  openDropsSection: (id) => {
    if (id !== null) useViewerStore.getState().selectComponent(null)
    set({ dropsSection: id })
  },
  toggleExplode: () =>
    set((s) => ({
      explodeOn: !s.explodeOn,
      measure: s.explodeOn ? s.measure : false,
      // Desarmar pausa la animación del aparejo (el V2 también).
      hoistPlaying: s.explodeOn ? s.hoistPlaying : false,
    })),
  setExplodeAmount: (amount) => set({ explodeAmount: clampExplodeAmount(amount) }),
  setExploded: (exploded) => set({ exploded }),
  toggleCut: (axis) =>
    set((s) => ({ cuts: { ...s.cuts, [axis]: { ...s.cuts[axis], on: !s.cuts[axis].on } } })),
  setCut: (axis, value) =>
    set((s) => ({
      cuts: { ...s.cuts, [axis]: { ...s.cuts[axis], value: clampCut(axis, value) } },
    })),
  // Con el equipo desarmado no se mide: los puntos quedarían sobre piezas que ya no están ahí.
  // Mover el deslizador pausa la animación (como el V2) y fija la altura.
  setHoistHeight: (height) => set({ hoistHeight: clampHoist(height), hoistPlaying: false }),
  // Con el equipo desarmado no se anima: el aparejo no está en su lugar.
  toggleHoistPlay: () => {
    const s = get()
    if (s.explodeOn || s.exploded) return
    const playing = !s.hoistPlaying
    set({ hoistPlaying: playing })
    if (playing) s.showNotice(HOIST_NOTICE)
  },
  syncHoist: (height) => set({ hoistHeight: height }),
  showNotice: (text) => {
    set({ notice: text })
    clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => set({ notice: null }), 3500)
  },
  toggleMeasure: () => set((s) => toggleKind(s, 'distance')),
  toggleAngle: () => set((s) => toggleKind(s, 'angle')),
  addPoint: (point) =>
    set((s) => ({
      points: s.points.length >= MEASURE_POINTS[s.measureKind] ? [point] : [...s.points, point],
    })),
  clearMeasure: () => set({ points: [] }),
}))

/** Texto de ayuda del modo medir (el del V2); vacío fuera de ese modo. */
export function measureHint(
  measure: boolean,
  pointCount: number,
  kind: MeasureKind = 'distance',
): string {
  if (!measure) return ''
  if (kind === 'angle') {
    if (pointCount === 0)
      return 'Hacé clic en tres superficies: A, el vértice B y C. Valores aproximados.'
    if (pointCount === 1) return 'Seleccioná el vértice B.'
    if (pointCount === 2) return 'Seleccioná el tercer punto, C.'
    return 'Medición aproximada del modelo. Otro clic inicia una nueva.'
  }
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
