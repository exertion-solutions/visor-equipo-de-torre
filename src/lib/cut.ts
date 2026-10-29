import type { Vec3 } from '@/lib/geometry'

/** Ejes de corte: X (longitudinal), Y (altura) y Z (lateral), en el marco de la escena (Y arriba). */
export type CutAxis = 'x' | 'y' | 'z'
export const CUT_AXES: readonly CutAxis[] = ['x', 'y', 'z']

interface CutSpec {
  /** Rango y paso de la perilla (m), los del V2 (`#cut-pos`, `77-cortes`). */
  min: number
  max: number
  step: number
  initial: number
  /** Índice de la coordenada que acota (x = 0, y = 1, z = 2). */
  index: 0 | 1 | 2
  /** Normal del plano (la del V2): se conserva lo que está del lado de `−normal`, es decir coord ≤ posición. */
  normal: Vec3
  button: string
  slider: string
  title: string
}

export const CUT_SPECS: Record<CutAxis, CutSpec> = {
  x: {
    min: -18,
    max: 18,
    step: 0.2,
    initial: 0,
    index: 0,
    normal: [-1, 0, 0],
    button: 'Corte X',
    slider: 'Posición del corte X',
    title: 'Corte visual en el plano X: superficies abiertas, sin tapas ni sólidos CAD',
  },
  y: {
    min: 0.5,
    max: 34,
    step: 0.1,
    initial: 12,
    index: 1,
    normal: [0, -1, 0],
    button: 'Corte Y',
    slider: 'Altura del corte Y',
    title:
      'Corte visual por altura: deja lo que está por debajo (piso de trabajo, BOP, boca de pozo desde arriba). Superficies abiertas, sin tapas',
  },
  z: {
    min: -15,
    max: 15,
    step: 0.1,
    initial: 0,
    index: 2,
    normal: [0, 0, -1],
    button: 'Corte Z',
    slider: 'Posición del corte Z',
    title: 'Corte visual lateral en el plano Z: superficies abiertas, sin tapas ni sólidos CAD',
  },
}

export interface CutState {
  on: boolean
  /** Posición del plano (m): se conserva lo de coordenada ≤ posición. */
  value: number
}
export type Cuts = Record<CutAxis, CutState>

/** Los tres cortes apagados, en su posición inicial. */
export const initialCuts = (): Cuts => ({
  x: { on: false, value: CUT_SPECS.x.initial },
  y: { on: false, value: CUT_SPECS.y.initial },
  z: { on: false, value: CUT_SPECS.z.initial },
})

/** Posición del corte acotada al rango del eje y llevada al paso del deslizador. */
export function clampCut(axis: CutAxis, value: number): number {
  const { min, max, step, initial } = CUT_SPECS[axis]
  if (!Number.isFinite(value)) return initial
  const clamped = Math.min(max, Math.max(min, value))
  // Redondeo al paso sin arrastrar error de coma flotante (3,3000000000000003).
  return Number((Math.round(clamped / step) * step).toFixed(6))
}

/**
 * ¿El punto cae del lado recortado de algún corte activo? Los planos son los del V2: se conserva coord ≤ posición y se quita lo
 * de más allá. El raycaster no respeta los planos de recorte: lo que se ve recortado no debe seleccionarse, medirse ni resaltarse.
 */
export function isCutAway(point: Vec3, cuts: Cuts): boolean {
  return CUT_AXES.some((axis) => cuts[axis].on && point[CUT_SPECS[axis].index] > cuts[axis].value)
}

export const anyCut = (cuts: Cuts): boolean => CUT_AXES.some((axis) => cuts[axis].on)

const fmt = (v: number) => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1).replace('.', ',')

/** Leyenda de los cortes activos: la del V2, con coma decimal. Siempre dice que las superficies quedan abiertas. */
export function cutNote(cuts: Cuts): string {
  const activos = CUT_AXES.filter((axis) => cuts[axis].on).map(
    (axis) => `${axis.toUpperCase()} ≈ ${fmt(cuts[axis].value)} m`,
  )
  return `Corte visual ${activos.join(' · ')}: superficies abiertas, sin tapas ni sólidos CAD.`
}
