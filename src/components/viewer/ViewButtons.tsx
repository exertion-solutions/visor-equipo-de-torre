import { Button } from '@/components/ui/button'
import {
  CAMERA_PRESET_IDS,
  CAMERA_PRESET_LABELS,
  presetProjection,
  type CameraPresetId,
} from '@/scene/cameras/presets'
import { PROJECTION_LABELS } from '@/scene/cameras/projection'
import { useViewerStore } from '@/stores/viewerStore'

/** Texto corto del botón; el nombre completo va en `aria-label` y en el título. */
const SHORT_LABELS: Record<CameraPresetId, string> = {
  iso: 'Iso',
  front: 'Frontal',
  side: 'Lateral',
  top: 'Superior',
  well: 'Pozo',
}

interface ViewButtonsProps {
  /** En pantallas angostas la ficha ocupa el borde inferior: los botones se suben para no quedar debajo. */
  raised?: boolean
}

/**
 * Vistas estándar del motor nativo (equivale a `#views` del V2): isométrica, frontal, lateral, superior y boca de pozo.
 * Cada una anima la cámara a su preset y fija la proyección (ortográfica salvo "Boca de pozo"), como el legacy.
 */
export function ViewButtons({ raised = false }: ViewButtonsProps) {
  const activeView = useViewerStore((s) => s.activeView)
  const setView = useViewerStore((s) => s.setView)

  return (
    <div
      role="group"
      aria-label="Vistas estándar"
      data-testid="view-buttons"
      className={`bg-card/95 absolute left-3 z-10 flex gap-0.5 rounded-lg border p-0.5 shadow-lg backdrop-blur ${
        raised ? 'bottom-[48%] sm:bottom-3' : 'bottom-3'
      }`}
    >
      {CAMERA_PRESET_IDS.map((id) => (
        <Button
          key={id}
          type="button"
          size="xs"
          variant={activeView === id ? 'secondary' : 'ghost'}
          aria-pressed={activeView === id}
          aria-label={CAMERA_PRESET_LABELS[id]}
          title={`${CAMERA_PRESET_LABELS[id]} (${PROJECTION_LABELS[presetProjection(id)].toLowerCase()})`}
          onClick={() => setView(id)}
        >
          {SHORT_LABELS[id]}
        </Button>
      ))}
    </div>
  )
}
