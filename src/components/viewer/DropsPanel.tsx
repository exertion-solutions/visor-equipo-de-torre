import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDropsDataset, type DropsPoint, type DropsZoneId } from '@/data/qhse/rig10-drops'
import { plural, zoneColor, zoneWord } from '@/lib/drops'
import { useDropsVisible, useToolsStore } from '@/stores/toolsStore'
import { useViewerStore } from '@/stores/viewerStore'

const dataset = getDropsDataset()
const sourceById = new Map(dataset.sources.map((s) => [s.id, s]))
const NOTE_APPROX = 'Posición del marcador aproximada (modelo), no as-built.'

export function ZoneBadge({ zone }: { zone: DropsZoneId | null }) {
  return (
    <Badge variant="outline" data-testid="zone-badge" className="gap-1.5">
      <span
        aria-hidden="true"
        style={{ background: zoneColor(zone) }}
        className="size-2 rounded-full"
      />
      {zoneWord(zone)}
    </Badge>
  )
}

/** Tarjeta de un punto de control: texto del Libro tal cual, con su estatus, su zona y su fuente (y la página). */
export function PointCard({ point }: { point: DropsPoint }) {
  const source = sourceById.get(point.basis.sourceId)
  const related = dataset.references.filter((r) => r.relatedPointIds.includes(point.id))
  return (
    <li data-testid={`drops-point-${point.id}`} className="rounded border p-2">
      <p>
        <span className="text-muted-foreground font-mono">{point.id}</span>{' '}
        <strong>{point.name}</strong>
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {/* Procedimiento de referencia: figura en el Libro DROPS; su aplicabilidad al equipo 10 es decisión interna. */}
        <Badge variant="outline">Procedimiento</Badge>
        <ZoneBadge zone={point.zone} />
        {point.flags.map((f) => (
          <Badge key={f} variant="outline">
            {f.replace(/-/g, ' ')}
          </Badge>
        ))}
      </div>
      <dl className="mt-1.5 space-y-0.5">
        <Row label="Sujeción primaria" value={point.primary?.trim() || 'Sin dato'} />
        <Row
          label="Retención secundaria"
          value={
            point.secondary?.trim() ||
            (point.secondaryRequired === false ? 'No requerida' : 'Sin dato')
          }
        />
        <Row label="Cantidad" value={point.quantity?.trim() || 'Sin dato'} />
        {point.observation?.trim() && <Row label="Observación" value={point.observation} />}
        <Row
          label="Fuente"
          value={`${source?.title ?? point.basis.sourceId}, pág. ${point.basis.page}${
            source && !source.verified ? ' (fuente sin verificar)' : ''
          }`}
        />
        {point.basis.note && <Row label="Nota de la fuente" value={point.basis.note} />}
      </dl>
      {related.map((r) => (
        <p key={r.id} className="text-muted-foreground mt-1">
          Referencia relacionada: {r.title} ({r.date}) — {r.summary}
        </p>
      ))}
    </li>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground inline">{label}: </dt>
      <dd className="inline">{value}</dd>
    </div>
  )
}

/** Resumen de un conjunto de puntos: la zona más alta no se calcula acá, se pasa ya resuelta. */
export function AssumptionsNote() {
  return (
    <details className="text-muted-foreground border-t pt-2" data-testid="drops-assumptions">
      <summary className="cursor-pointer">Supuestos y alcance</summary>
      <ul className="mt-1 list-disc space-y-1 pl-4">
        {dataset.meta.assumptions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </details>
  )
}

/**
 * Panel de una sección DROPS (equivale al panel lateral de `50-drops-layer.js`): zona del A2 y su base, páginas del Libro,
 * y los puntos de control con su texto, estatus y fuente. Comparte el costado de la ficha: se oculta al seleccionar un
 * componente. Es referencia de lo que debe tener cada control, no una verificación.
 */
export function DropsPanel() {
  const visible = useDropsVisible()
  const sectionId = useToolsStore((s) => s.dropsSection)
  const openSection = useToolsStore((s) => s.openDropsSection)
  const componentSelected = useViewerStore((s) => s.selectedComponentId !== null)
  const section = dataset.sections.find((s) => s.id === sectionId)
  if (!visible || !section || componentSelected) return null
  const points = dataset.points
    .filter((p) => p.sectionId === section.id)
    .sort((a, b) => a.order - b.order)

  return (
    <aside
      aria-label="Panel DROPS"
      data-testid="drops-panel"
      className="bg-card/95 absolute inset-x-2 bottom-2 z-10 flex max-h-[45%] flex-col rounded-lg border shadow-lg backdrop-blur sm:inset-x-auto sm:top-14 sm:right-3 sm:bottom-3 sm:max-h-none sm:w-96"
    >
      <header className="flex items-start gap-2 border-b p-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm leading-snug font-semibold">{section.label}</h2>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <ZoneBadge zone={section.zone} />
            <Badge variant="outline">{plural(points.length, 'punto', 'puntos')}</Badge>
          </div>
        </div>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label="Cerrar panel DROPS"
          onClick={() => openSection(null)}
        >
          <X />
        </Button>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-xs">
        <p className="text-muted-foreground">Base de la zona: {section.zoneBasis}</p>
        <p className="text-muted-foreground">Páginas del Libro: {section.pageRange}</p>
        <p className="text-muted-foreground" data-testid="drops-approx">
          {NOTE_APPROX}
        </p>
        <ul className="space-y-2">
          {points.map((p) => (
            <PointCard key={p.id} point={p} />
          ))}
        </ul>
        <AssumptionsNote />
      </div>
      <footer role="note" className="text-muted-foreground border-t p-2 text-[11px]">
        {dataset.meta.disclaimer}
      </footer>
    </aside>
  )
}
