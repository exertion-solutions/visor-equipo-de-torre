import type { ThreeEvent } from '@react-three/fiber'
import type { ReactNode } from 'react'
import { isCutAway } from '@/lib/cut'
import { useToolsStore } from '@/stores/toolsStore'
import { useViewerStore } from '@/stores/viewerStore'
import { registerExplodeObject } from '@/scene/explode/explodeObjects'
import { registerComponentObject } from './componentObjects'

interface SelectableModelProps {
  componentId: string
  position?: readonly [number, number, number]
  children: ReactNode
}

/**
 * Envuelve un componente: hover, clic y registro del objeto para el contorno.
 * Oculto (aislamiento): no se dibuja y se le quitan los handlers. No alcanza con `visible = false`: three y
 * r3f lanzan el raycast también contra objetos invisibles, y sin handlers el grupo sale de la lista de interacción.
 */
export function SelectableModel({ componentId, position, children }: SelectableModelProps) {
  const hoverComponent = useViewerStore((s) => s.hoverComponent)
  const selectComponent = useViewerStore((s) => s.selectComponent)
  const hidden = useViewerStore((s) => s.hiddenComponentIds.includes(componentId))

  // El raycaster no respeta el plano de corte: un impacto del lado recortado se ignora sin frenar el evento, y r3f lo sigue
  // entregando al siguiente objeto detrás del plano.
  const cutAway = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const { cut, cutX } = useToolsStore.getState()
    return cut && isCutAway(e.point.x, cutX)
  }

  const over = (e: ThreeEvent<PointerEvent>) => {
    if (cutAway(e)) return
    e.stopPropagation()
    hoverComponent(componentId)
    document.body.style.cursor = 'pointer'
  }
  const out = () => {
    // Si el hover ya pasó a otro componente (el de detrás de un plano de corte) no se pisa.
    if (useViewerStore.getState().hoveredComponentId !== componentId) return
    hoverComponent(null)
    document.body.style.cursor = ''
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (cutAway(e)) {
      // Todo lo que está bajo el clic quedó recortado: es un clic en el vacío (deselecciona, como el V2).
      const { cutX, measure } = useToolsStore.getState()
      if (!measure && e.intersections.every((i) => isCutAway(i.point.x, cutX)))
        selectComponent(null)
      return
    }
    e.stopPropagation()
    // Midiendo, el clic pone un punto sobre la superficie en lugar de seleccionar (como el V2).
    if (useToolsStore.getState().measure) {
      useToolsStore.getState().addPoint([e.point.x, e.point.y, e.point.z])
      return
    }
    selectComponent(componentId)
  }

  return (
    <group
      ref={(o) => {
        registerComponentObject(componentId, o)
      }}
      name={`sel_${componentId}`}
      position={position ? [...position] : undefined}
      visible={!hidden}
      onPointerOver={hidden ? undefined : over}
      onPointerOut={hidden ? undefined : out}
      onClick={hidden ? undefined : click}
    >
      {/* El despiece mueve este grupo interno: el seleccionable (y su registro) queda en su lugar. */}
      <group
        ref={(o) => {
          registerExplodeObject(componentId, o)
        }}
        name={`explode_${componentId}`}
      >
        {children}
      </group>
    </group>
  )
}
