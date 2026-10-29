export interface LabelBox {
  id: string
  /** Centro del rótulo en píxeles. */
  x: number
  y: number
  /** Tamaño en píxeles. */
  w: number
  h: number
}

/** Tolerancia de coma flotante: un rótulo apoyado justo sobre otro (distancia = suma de mitades + hueco) no los pisa. */
const EPS = 1e-6

const overlaps = (a: LabelBox, b: LabelBox, gap: number): boolean =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 + gap - EPS &&
  Math.abs(a.y - b.y) < (a.h + b.h) / 2 + gap - EPS

/**
 * Separa rótulos que se pisan: se recorren de arriba hacia abajo (y, luego x, luego id: orden estable) y cada uno baja lo
 * justo para no tapar a los ya colocados. Solo se mueve en vertical y hacia abajo, así el orden y la columna de cada
 * rótulo se conservan; los que no se pisan quedan exactamente donde estaban. Devuelve la posición de cada id.
 */
export function separateLabels(
  boxes: readonly LabelBox[],
  gap = 2,
): Map<string, { x: number; y: number }> {
  const placed: LabelBox[] = []
  const out = new Map<string, { x: number; y: number }>()
  const ordered = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id))
  for (const box of ordered) {
    const next = { ...box }
    for (let guard = 0; guard < ordered.length + 1; guard++) {
      const hit = placed.find((p) => overlaps(p, next, gap))
      if (!hit) break
      next.y = hit.y + (hit.h + next.h) / 2 + gap
    }
    placed.push(next)
    out.set(box.id, { x: next.x, y: next.y })
  }
  return out
}
