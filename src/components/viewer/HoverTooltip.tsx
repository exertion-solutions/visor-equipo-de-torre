import { useEffect, useRef } from 'react'
import type { Rig } from '@/types'
import { useViewerStore } from '@/stores/viewerStore'

interface HoverTooltipProps {
  rig: Rig
}

/**
 * Nombre del componente bajo el puntero, junto al cursor (como el tooltip del V2). La posición se mueve con el DOM, sin
 * estado de React: un `pointermove` no re-renderiza nada. Con el dedo (táctil) no se muestra: no hay "pasar por encima".
 */
export function HoverTooltip({ rig }: HoverTooltipProps) {
  const hovered = useViewerStore((s) => s.hoveredComponentId)
  const ref = useRef<HTMLDivElement>(null)
  const pointer = useRef({ x: 0, y: 0, touch: false })

  useEffect(() => {
    const place = () => {
      const el = ref.current
      if (!el) return
      el.style.transform = `translate(${pointer.current.x + 14}px, ${pointer.current.y + 16}px)`
      el.style.display = pointer.current.touch ? 'none' : ''
    }
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' }
      place()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    place()
    return () => window.removeEventListener('pointermove', onMove)
  }, [hovered])

  const name = hovered ? rig.components.find((c) => c.id === hovered)?.name : undefined
  if (!name) return null
  return (
    <div
      ref={ref}
      role="tooltip"
      data-testid="hover-tooltip"
      className="bg-popover text-popover-foreground pointer-events-none fixed top-0 left-0 z-20 rounded-md border px-2 py-1 text-xs shadow-md"
    >
      {name}
    </div>
  )
}
