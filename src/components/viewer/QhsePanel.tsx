import {
  CONTROLS_TITLE,
  RIG10_QHSE,
  ZONES_LEGEND_TITLE,
  ZONES_NOTICE,
} from '@/data/qhse/rig10-qhse'
import { BARRIER_TYPE_LABELS, HAZARD_LABELS, QHSE_STATUS_LABELS } from '@/data/qhse/hazards'
import { useModeStore } from '@/stores/modeStore'
import { useZonesVisible } from '@/stores/toolsStore'

interface QhsePanelProps {
  /** En pantallas angostas la ficha ocupa el borde inferior: el panel se sube para no quedar debajo. */
  raised?: boolean
}

/**
 * Panel QHSE del motor nativo (equivale al panel único del V2): la leyenda "ZONAS ILUSTRATIVAS — SIN VALIDAR" con el
 * aviso de que no sustituyen exclusiones aprobadas y, en modo QHSE, los controles orientativos. Cada pieza lleva su
 * estatus en texto ("Pendiente de validación"): el color nunca es el único canal. No muestra ninguna medida de las zonas.
 */
export function QhsePanel({ raised = false }: QhsePanelProps) {
  const visible = useZonesVisible()
  const mode = useModeStore((s) => s.mode)
  if (!visible) return null

  return (
    <aside
      aria-label="Panel QHSE"
      data-testid="qhse-panel"
      className={`bg-card/95 absolute right-3 left-3 z-10 max-h-[40%] overflow-y-auto rounded-lg border p-3 text-xs shadow-lg backdrop-blur sm:right-auto sm:left-1/2 sm:w-[24rem] sm:max-h-[45%] sm:-translate-x-1/2 ${
        raised ? 'bottom-[calc(48%+3rem)] sm:bottom-14' : 'bottom-14'
      }`}
    >
      <h2 className="font-semibold tracking-wide text-amber-300">{ZONES_LEGEND_TITLE}</h2>
      <ul className="mt-1.5 space-y-1">
        {RIG10_QHSE.zones.map((zone) => (
          <li key={zone.id} data-testid={`zone-${zone.id}`} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-sm border border-red-400 bg-red-500/30"
            />
            <span className="min-w-0 flex-1">{zone.title}</span>
            <span className="text-muted-foreground shrink-0">
              {QHSE_STATUS_LABELS[zone.basis.status]}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-1.5" data-testid="zones-notice">
        {ZONES_NOTICE}
      </p>
      {mode === 'qhse' && (
        <details open className="mt-2 border-t pt-2" data-testid="qhse-controls">
          <summary className="cursor-pointer font-medium text-amber-300">{CONTROLS_TITLE}</summary>
          <ul className="mt-1.5 space-y-2">
            {RIG10_QHSE.barriers.map((barrier) => {
              const risk = RIG10_QHSE.risks.find((r) => r.id === barrier.riskId)
              return (
                <li key={barrier.id} data-testid={`control-${barrier.id}`}>
                  <p className="font-medium">
                    {barrier.title}
                    {risk && (
                      <span className="text-muted-foreground font-normal">
                        {' '}
                        · {HAZARD_LABELS[risk.hazard]}
                      </span>
                    )}
                  </p>
                  <p>{barrier.description}</p>
                  <p className="text-muted-foreground">
                    {QHSE_STATUS_LABELS[barrier.basis.status]} · {BARRIER_TYPE_LABELS[barrier.type]}
                  </p>
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </aside>
  )
}
