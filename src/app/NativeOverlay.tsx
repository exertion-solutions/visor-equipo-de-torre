import { useEffect } from 'react'
import { ComponentCard } from '@/components/equipment/ComponentCard'
import { ComponentTree } from '@/components/equipment/ComponentTree'
import { ComponentLabels } from '@/components/viewer/ComponentLabels'
import { HoverTooltip } from '@/components/viewer/HoverTooltip'
import { ToolLabels } from '@/components/viewer/ToolLabels'
import { ViewButtons } from '@/components/viewer/ViewButtons'
import { RIG10_RIG, RIG10_SCENE } from '@/data/rigs/rig10'
import { useViewerStore } from '@/stores/viewerStore'

const SCENE_IDS = RIG10_SCENE.map((m) => m.componentId)

/**
 * Capa de interfaz del motor nativo sobre la escena: panel de componentes, etiquetas, vistas estándar, ficha del seleccionado y
 * tooltip del hover. Se carga
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
      <ComponentLabels rig={RIG10_RIG} sceneIds={SCENE_IDS} />
      <ToolLabels />
      <ComponentTree rig={RIG10_RIG} sceneIds={SCENE_IDS} />
      <ViewButtons raised={selected !== null} />
      <HoverTooltip rig={RIG10_RIG} />
      <ComponentCard rig={RIG10_RIG} componentId={selected} onClose={() => selectComponent(null)} />
    </>
  )
}
