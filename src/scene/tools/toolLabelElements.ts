import type { Vec3 } from '@/lib/geometry'

/**
 * Registro rótulo → (elemento HTML, punto 3D) de las cotas y la medición. Los rótulos son HTML por encima del lienzo (React)
 * y los ubica `ToolsLayer` dentro del Canvas en cada cuadro: este registro los conecta sin pasar por el estado de React.
 */
interface ToolLabel {
  element: HTMLElement
  point: Vec3
}
const labels = new Map<string, ToolLabel>()
const listeners = new Set<() => void>()

export function registerToolLabel(id: string, label: ToolLabel | null): void {
  if (label) labels.set(id, label)
  else labels.delete(id)
  for (const listener of listeners) listener()
}

export function toolLabels(): ReadonlyMap<string, ToolLabel> {
  return labels
}

/** Avisa cuando cambia el conjunto de rótulos (hay que reubicarlos aunque la cámara no se mueva). */
export function onToolLabelsChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
