import {
  CONTROLS_TITLE,
  RIG10_QHSE,
  ZONES_LEGEND_TITLE,
  ZONES_NOTICE,
} from '@/data/qhse/rig10-qhse'
import { BARRIER_TYPE_LABELS, HAZARD_LABELS, QHSE_STATUS_LABELS } from '@/data/qhse/hazards'
import { getDropsDataset } from '@/data/qhse/rig10-drops'
import { NO_ZONE_COLOR } from '@/lib/drops'
import { useModeStore } from '@/stores/modeStore'
import { useDropsVisible, useZonesVisible } from '@/stores/toolsStore'

/**
 * Panel QHSE del motor nativo (equivale al panel único del V2): la leyenda "ZONAS ILUSTRATIVAS — SIN VALIDAR" con el
 * aviso de que no sustituyen exclusiones aprobadas y, en modo QHSE, los controles orientativos. Cada pieza lleva su
 * estatus en texto ("Pendiente de validación"): el color nunca es el único canal. No muestra ninguna medida de las zonas.
 */
export function QhsePanel() {
  const zonesOn = useZonesVisible()
  const dropsOn = useDropsVisible()
  const visible = zonesOn || dropsOn
  const mode = useModeStore((s) => s.mode)
  if (!visible) return null

  return (
    <aside
      aria-label="Panel QHSE"
      data-testid="qhse-panel"
      className="bg-card/95 pointer-events-auto max-h-[50%] shrink-0 overflow-y-auto rounded-lg border p-3 text-xs shadow-lg backdrop-blur"
    >
      {zonesOn && (
        <section aria-label="Zonas ilustrativas">
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
        </section>
      )}
      {dropsOn && <DropsLegend withDivider={zonesOn} />}
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

const dropsDataset = getDropsDataset()

/**
 * Leyenda de la capa DROPS: las zonas del layout A2 con sus áreas, el aviso de que el A2 no define radios ni distancias y
 * la nota de los marcadores (posición aproximada). La zona va en palabras además del color.
 */
function DropsLegend({ withDivider }: { withDivider: boolean }) {
  return (
    <section
      aria-label="Zonas DROPS"
      data-testid="drops-legend"
      className={withDivider ? 'mt-2 border-t pt-2' : ''}
    >
      <h2 className="font-semibold tracking-wide text-amber-300">
        ZONAS DROPS · layout A2 · clasificación cualitativa
      </h2>
      <ul className="mt-1.5 space-y-1">
        {dropsDataset.zones.map((zone) => (
          <li key={zone.id} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              style={{ background: zone.color }}
              className="mt-0.5 size-3 shrink-0 rounded-sm"
            />
            <span>
              <strong>{zone.label.replace('Riesgo ', '')}</strong>
              <span className="text-muted-foreground"> · {zone.areas.join(', ')}</span>
            </span>
          </li>
        ))}
        <li className="flex items-start gap-2">
          <span
            aria-hidden="true"
            style={{ background: NO_ZONE_COLOR }}
            className="mt-0.5 size-3 shrink-0 rounded-sm"
          />
          <span>
            <strong>SIN CLASIFICAR</strong>
            <span className="text-muted-foreground"> · sección sin zona en el A2</span>
          </span>
        </li>
      </ul>
      <p className="mt-1.5 font-medium" data-testid="a2-notice">
        El A2 no define radios ni distancias: la clasificación no sustituye exclusiones aprobadas.
      </p>
      <p className="text-muted-foreground mt-1">
        Marcador punteado: posición aproximada del modelo.
      </p>
    </section>
  )
}
