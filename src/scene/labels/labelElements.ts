/**
 * Registro componente → elemento HTML de su etiqueta. Las etiquetas son HTML por encima del lienzo (React) y las posiciona
 * `LabelsProjector` dentro del Canvas en cada cuadro: este registro es el puente entre los dos, sin pasar por el estado de React.
 */
const elements = new Map<string, HTMLElement>()
const listeners = new Set<() => void>()

export function registerLabelElement(id: string, element: HTMLElement | null): void {
  if (element) elements.set(id, element)
  else elements.delete(id)
  // Una etiqueta que aparece o desaparece hay que reubicarla aunque la cámara no se mueva.
  for (const listener of listeners) listener()
}

export function labelElements(): ReadonlyMap<string, HTMLElement> {
  return elements
}

/** Avisa cuando cambia el conjunto de etiquetas; devuelve la función para dejar de escuchar. */
export function onLabelElementsChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
