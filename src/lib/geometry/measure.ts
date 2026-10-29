export type Vec3 = readonly [number, number, number]

/** Distancia euclídea entre dos puntos (metros). */
export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
}

/** Distancia proyectada en el plano horizontal XZ (Y es vertical). */
export function horizontalDistance(a: Vec3, b: Vec3): number {
  return Math.hypot(b[0] - a[0], b[2] - a[2])
}

export function verticalDistance(a: Vec3, b: Vec3): number {
  return Math.abs(b[1] - a[1])
}

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
}

/** Rótulo de una medición entre dos puntos del modelo: siempre aproximada ("≈ … m · modelo"), nunca una cota. */
export function formatApproxMeters(meters: number): string {
  return `≈ ${meters.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m · modelo`
}

/**
 * Ángulo ABC en grados (vértice en `b`), entre 0 y 180. `null` si un lado tiene largo cero (A o C coinciden con el vértice):
 * el ángulo no está definido y no se inventa uno.
 */
export function angleAtVertex(a: Vec3, b: Vec3, c: Vec3): number | null {
  const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as const
  const v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]] as const
  const lu = Math.hypot(...u)
  const lv = Math.hypot(...v)
  if (lu === 0 || lv === 0) return null
  const cos = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (lu * lv)
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI
}

/** Desnivel de A a C (con signo: positivo si C está más alto) y distancia horizontal entre ambos (m). */
export function levelDifference(a: Vec3, c: Vec3): { dy: number; dh: number } {
  return { dy: c[1] - a[1], dh: horizontalDistance(a, c) }
}

const fmt = (n: number, digits: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** Rótulo de la medición de ángulo: siempre aproximado y del modelo; `null` si el ángulo no está definido. */
export function formatApproxAngle(a: Vec3, b: Vec3, c: Vec3): string | null {
  const angle = angleAtVertex(a, b, c)
  if (angle === null) return null
  const { dy, dh } = levelDifference(a, c)
  return `≈ ${fmt(angle, 1)}° · desnivel A→C ${fmt(dy, 2)} m · horiz. ${fmt(dh, 2)} m · modelo`
}
