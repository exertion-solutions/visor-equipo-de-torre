import { useEffect, useRef, type ReactNode } from 'react'
import {
  distance,
  formatApproxAngle,
  formatApproxMeters,
  midpoint,
  type Vec3,
} from '@/lib/geometry'
import { RIG10_DIMENSION_VIEWS } from '@/scene/tools/dimensionViews'
import { registerToolLabel } from '@/scene/tools/toolLabelElements'
import { useDimsVisible, useToolsStore } from '@/stores/toolsStore'

/** Un rótulo: lo ubica `ToolsLayer` (dentro del Canvas) a través del registro, no React. Arranca oculto. */
function ToolPill({
  id,
  anchor,
  className,
  children,
}: {
  id: string
  anchor: Vec3
  className: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [x, y, z] = anchor
  useEffect(() => {
    if (ref.current) registerToolLabel(id, { element: ref.current, point: [x, y, z] })
    return () => registerToolLabel(id, null)
  }, [id, x, y, z])
  return (
    <div
      ref={ref}
      data-testid={`tool-label-${id}`}
      style={{ display: 'none' }}
      className={`absolute top-0 left-0 rounded border bg-[#0a0b12]/85 px-1.5 py-0.5 text-[11px] whitespace-nowrap will-change-transform ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * Rótulos de las cotas del equipo (valor · qué se acota · nivel A/B/C, y "Fuente en conflicto" cuando la especificación la
 * tiene) y de la medición ("≈ x,xx m · modelo": siempre aproximada). No reciben clics.
 */
export function ToolLabels() {
  const dims = useDimsVisible()
  const exploded = useToolsStore((s) => s.exploded)
  const points = useToolsStore((s) => s.points)
  // Con el despiece la medición se oculta: sus puntos quedaron sobre el equipo armado.
  const kind = useToolsStore((s) => s.measureKind)
  const [a, b, c] = exploded ? [] : points
  const angleText = kind === 'angle' && a && b && c ? formatApproxAngle(a, b, c) : null
  const distanceShown = kind === 'distance' && a && b
  if (!dims && !distanceShown && !angleText) return null

  return (
    <div
      data-testid="tool-labels"
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
    >
      {dims &&
        RIG10_DIMENSION_VIEWS.map((d) => (
          <ToolPill
            key={d.id}
            id={`dim-${d.id}`}
            anchor={d.anchor}
            className={
              d.conflict ? 'border-amber-400/50 text-amber-300' : 'border-teal-300/40 text-teal-200'
            }
          >
            {d.text}
          </ToolPill>
        ))}
      {angleText && b && (
        <ToolPill id="measure-angle" anchor={b} className="border-yellow-300/60 text-yellow-200">
          {angleText}
        </ToolPill>
      )}
      {distanceShown && a && b && (
        <ToolPill
          id="measure"
          anchor={midpoint(a, b)}
          className="border-yellow-300/60 text-yellow-200"
        >
          {formatApproxMeters(distance(a, b))}
        </ToolPill>
      )}
    </div>
  )
}
