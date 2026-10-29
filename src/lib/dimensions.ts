import type { Vec3 } from '@/lib/geometry'
import { midpoint } from '@/lib/geometry'
import type { Rig } from '@/types'

/**
 * Una cota del equipo: apunta a una especificación del componente (`componentId` + `specKey`), de donde salen el rótulo, el
 * nivel A/B/C y las fuentes en conflicto, así el número no se escribe dos veces. Lo propio de la cota es dónde se dibuja la
 * línea (`from` → `to`, metros, marco de escena): es orientativo, no un plano.
 */
export interface DimensionLine {
  id: string
  componentId: string
  specKey: string
  /** Largo en metros de lo que se acota. Con `valueText` es el de esta línea (la especificación trae dos valores). */
  meters: number
  /** Texto del valor cuando no es un solo número (p. ej. "27,4 ± 3 m"). Debe estar contenido en la especificación. */
  valueText?: string
  from: Vec3
  to: Vec3
}

export interface DimensionView {
  id: string
  /** Rótulo completo: valor · qué se acota · nivel A/B/C (y "Fuente en conflicto" si la especificación lo tiene). */
  text: string
  confidence: 'A' | 'B' | 'C'
  conflict: boolean
  from: Vec3
  to: Vec3
  /** Punto medio de la línea: donde se ubica el rótulo. */
  anchor: Vec3
}

/**
 * Cotas listas para dibujar: el rótulo sale de la especificación del componente (su etiqueta, su nivel de confianza y
 * si hay fuentes en conflicto). Una cota cuya especificación no existe se descarta en lugar de inventar el dato.
 */
export function buildDimensions(rig: Rig, lines: readonly DimensionLine[]): DimensionView[] {
  const views: DimensionView[] = []
  for (const line of lines) {
    const spec = rig.components
      .find((c) => c.id === line.componentId)
      ?.specifications.find((s) => s.key === line.specKey)
    if (!spec) continue
    const value =
      line.valueText ?? `${line.meters.toLocaleString('es-AR', { maximumFractionDigits: 4 })} m`
    const conflict = (spec.conflicts?.length ?? 0) > 0
    const parts = [value, spec.label, spec.confidence, ...(conflict ? ['Fuente en conflicto'] : [])]
    views.push({
      id: line.id,
      text: parts.join(' · '),
      confidence: spec.confidence,
      conflict,
      from: line.from,
      to: line.to,
      anchor: midpoint(line.from, line.to),
    })
  }
  return views
}

const TICK = 0.18

/**
 * Segmentos (de a pares de puntos) de una línea de cota: la línea y una marca transversal en cada extremo, como el V2. La
 * marca es perpendicular a la línea y al eje Z; si la línea va a lo largo de Z se usa el eje X.
 */
export function dimensionSegments(from: Vec3, to: Vec3): Vec3[] {
  const d: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
  const length = Math.hypot(...d) || 1
  const n: Vec3 = [d[0] / length, d[1] / length, d[2] / length]
  // n × Z
  let s: Vec3 = [n[1], -n[0], 0]
  if (Math.hypot(...s) < 0.1) s = [1, 0, 0]
  const k = TICK / (Math.hypot(...s) || 1)
  const t: Vec3 = [s[0] * k, s[1] * k, s[2] * k]
  const plus = (p: Vec3): Vec3 => [p[0] + t[0], p[1] + t[1], p[2] + t[2]]
  const minus = (p: Vec3): Vec3 => [p[0] - t[0], p[1] - t[1], p[2] - t[2]]
  return [from, to, minus(from), plus(from), minus(to), plus(to)]
}
