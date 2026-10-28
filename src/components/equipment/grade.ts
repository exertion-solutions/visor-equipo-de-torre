import type { GeometryGrade } from '@/lib/legacyBridge'

/** Color del distintivo de confianza geométrica A/B/C (compartido por la barra de estado y la ficha). */
export const GRADE_STYLES: Record<GeometryGrade, string> = {
  A: 'border-emerald-500/60 text-emerald-300',
  B: 'border-amber-500/60 text-amber-300',
  C: 'border-orange-500/60 text-orange-300',
}

export const GRADE_HINT =
  'Confiabilidad geométrica del componente: A confirmado (documentado) · B parcial · C aproximado. Lo pendiente de relevamiento se trata como aproximado. Referencia digital, no as-built.'
