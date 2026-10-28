import type { Specification } from '@/types'

/** Valor legible de una especificación: coma decimal, Sí/No para booleanos y la unidad si la hay. */
export function formatSpecValue(value: Specification['value'], unit?: string): string {
  const text =
    typeof value === 'boolean'
      ? value
        ? 'Sí'
        : 'No'
      : typeof value === 'number'
        ? value.toLocaleString('es-AR', { maximumFractionDigits: 4 })
        : value
  return unit ? `${text} ${unit}` : text
}
