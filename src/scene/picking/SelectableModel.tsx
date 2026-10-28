import type { ThreeEvent } from '@react-three/fiber'
import type { ReactNode } from 'react'
import { useViewerStore } from '@/stores/viewerStore'
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

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    hoverComponent(componentId)
    document.body.style.cursor = 'pointer'
  }
  const out = () => {
    hoverComponent(null)
    document.body.style.cursor = ''
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
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
      {children}
    </group>
  )
}
