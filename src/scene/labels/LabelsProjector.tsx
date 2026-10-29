import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Box3, Vector3, type Object3D } from 'three'
import { labelPosition } from '@/lib/componentLabels'
import { getComponentObject } from '@/scene/picking/componentObjects'
import { useViewerStore } from '@/stores/viewerStore'
import { labelElements, onLabelElementsChange } from './labelElements'

/** Punto de anclaje de la etiqueta: el centro de la caja del componente. */
const anchors = new WeakMap<Object3D, Vector3>()
const box = new Box3()
function anchorOf(object: Object3D): Vector3 | null {
  const cached = anchors.get(object)
  if (cached) return cached
  box.setFromObject(object)
  // Un GLB que aún no cargó tiene la caja vacía: no se guarda, se vuelve a intentar en el cuadro siguiente.
  if (box.isEmpty()) return null
  const anchor = box.getCenter(new Vector3())
  anchors.set(object, anchor)
  return anchor
}

const point = new Vector3()

/**
 * Ubica las etiquetas HTML sobre sus componentes: en cada cuadro proyecta el anclaje de cada uno y mueve su elemento
 * (transform, sin pasar por React). Una etiqueta se oculta si su componente está oculto o queda fuera de pantalla. A
 * diferencia del V2 no se espacia cada 2 cuadros: son ~20 proyecciones y con render bajo demanda el último cuadro de un
 * movimiento no puede saltearse.
 */
export function LabelsProjector() {
  const invalidate = useThree((s) => s.invalidate)
  const frame = useRef(0)

  useEffect(() => onLabelElementsChange(invalidate), [invalidate])

  useFrame(({ camera, size }) => {
    const { labels, hiddenComponentIds } = useViewerStore.getState()
    if (!labels || labelElements().size === 0) return
    camera.updateMatrixWorld()
    frame.current++
    for (const [id, element] of labelElements()) {
      const object = getComponentObject(id)
      const anchor = object && !hiddenComponentIds.includes(id) ? anchorOf(object) : null
      const position = anchor
        ? labelPosition(point.copy(anchor).project(camera), size.width, size.height)
        : null
      if (!position) {
        element.style.display = 'none'
        continue
      }
      element.style.display = 'flex'
      element.style.transform = `translate(${position.x}px, ${position.y}px) translate(-50%, -50%)`
    }
  })

  return null
}
