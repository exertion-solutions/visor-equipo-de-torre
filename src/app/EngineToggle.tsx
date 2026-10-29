import { Boxes, HardHat, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ENGINE_LABELS,
  VIEWER_ENGINES,
  useViewerStore,
  type ViewerEngine,
} from '@/stores/viewerStore'

const ENGINE_ICONS: Record<ViewerEngine, LucideIcon> = {
  legacy: HardHat,
  native: Boxes,
}

const ENGINE_HINTS: Record<ViewerEngine, string> = {
  legacy: 'Visor HTML V2 embebido: funcionalidad completa mientras se migra.',
  native: 'Escena React Three Fiber: en migración, sin paridad completa con V2.',
}

/**
 * Selector de motor: V2 compatible (por defecto, funcionalidad completa) o R3F nativo (en migración, con enlaces profundos y
 * captura). Se ofrece siempre: el nativo ya tiene lo central del visor; la paridad completa está en `docs/FEATURE_PARITY.md`.
 */
export function EngineToggle() {
  const engine = useViewerStore((s) => s.engine)
  const setEngine = useViewerStore((s) => s.setEngine)

  return (
    <div
      role="group"
      aria-label="Motor de visualización"
      className="bg-muted inline-flex shrink-0 items-center gap-0.5 rounded-lg p-0.5"
    >
      {VIEWER_ENGINES.map((e) => {
        const Icon = ENGINE_ICONS[e]
        const active = engine === e
        return (
          <Tooltip key={e}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant={active ? 'secondary' : 'ghost'}
                aria-pressed={active}
                onClick={() => setEngine(e)}
                className={active ? 'shadow-sm' : 'text-muted-foreground'}
              >
                <Icon aria-hidden="true" />
                {ENGINE_LABELS[e]}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{ENGINE_HINTS[e]}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
