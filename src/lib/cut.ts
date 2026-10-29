/** Rango y paso de la posición del corte X (m), los del V2 (`#cut-pos`). */
export const CUT_MIN = -18
export const CUT_MAX = 18
export const CUT_STEP = 0.2

/** Posición del corte acotada al rango y llevada al paso del deslizador. */
export function clampCutX(value: number): number {
  if (!Number.isFinite(value)) return 0
  const clamped = Math.min(CUT_MAX, Math.max(CUT_MIN, value))
  return Math.round(clamped / CUT_STEP) * CUT_STEP
}

/**
 * ¿El punto cae del lado recortado? El plano del V2 es de normal −X: se conserva x ≤ posición y se quita lo de +X. El raycaster
 * no respeta los planos de recorte: lo que se ve recortado no debe seleccionarse, medirse ni resaltarse.
 */
export function isCutAway(x: number, cutX: number): boolean {
  return x > cutX
}

/** Texto del corte activo: el del V2, con coma decimal. Siempre dice que las superficies quedan abiertas. */
export function cutNote(cutX: number): string {
  const n = (Math.abs(cutX) < 0.05 ? 0 : cutX).toFixed(1).replace('.', ',')
  return `Corte visual X ≈ ${n} m: superficies abiertas, sin tapas ni sólidos CAD.`
}
