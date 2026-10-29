import { useEffect } from 'react'
import { ComponentCard } from '@/components/equipment/ComponentCard'
import { ComponentTree } from '@/components/equipment/ComponentTree'
import { ComponentLabels } from '@/components/viewer/ComponentLabels'
import { DropsMarkers } from '@/components/viewer/DropsMarkers'
import { DropsOfComponent } from '@/components/viewer/DropsOfComponent'
import { DropsPanel } from '@/components/viewer/DropsPanel'
import { HoverTooltip } from '@/components/viewer/HoverTooltip'
import { QhsePanel } from '@/components/viewer/QhsePanel'
import { ToolHints } from '@/components/viewer/ToolHints'
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
      <ToolHints />
      {/* Columna izquierda: el panel de componentes cede lugar al panel QHSE (que no tapa el centro de la escena). */}
      <div className="pointer-events-none absolute top-24 bottom-14 left-3 z-10 flex w-[min(16rem,calc(100%-1.5rem))] flex-col gap-2 sm:top-14 sm:w-64">
        <ComponentTree rig={RIG10_RIG} sceneIds={SCENE_IDS} />
        <QhsePanel />
      </div>
      <ViewButtons raised={selected !== null} />
      <DropsMarkers />
      <DropsPanel />
      <HoverTooltip rig={RIG10_RIG} />
      <ComponentCard
        rig={RIG10_RIG}
        componentId={selected}
        onClose={() => selectComponent(null)}
        extra={<DropsOfComponent componentId={selected} />}
      />
    </>
  )
}
