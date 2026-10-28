import { useEffect } from 'react'
import { ComponentCard } from '@/components/equipment/ComponentCard'
import { HoverTooltip } from '@/components/viewer/HoverTooltip'
import { RIG10_RIG } from '@/data/rigs/rig10'
import { useViewerStore } from '@/stores/viewerStore'

/**
 * Capa de interfaz del motor nativo sobre la escena: ficha del componente seleccionado y tooltip del hover. Se carga
 * aparte (lazy) con el visor 3D: los datos del equipo no entran en el paquete principal. Esc deselecciona, como en el V2.
 */
export default function NativeOverlay() {
  const selected = useViewerStore((s) => s.selectedComponentId)
  const selectComponent = useViewerStore((s) => s.selectComponent)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selectComponent(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectComponent])

  return (
    <>
      <HoverTooltip rig={RIG10_RIG} />
      <ComponentCard rig={RIG10_RIG} componentId={selected} onClose={() => selectComponent(null)} />
    </>
  )
}
