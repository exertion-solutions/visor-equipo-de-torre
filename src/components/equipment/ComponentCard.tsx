import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { GRADE_LABELS } from '@/lib/legacyBridge'
import type { Rig, Source, SourceKind } from '@/types'
import { formatSpecValue } from './format'
import { GRADE_STYLES } from './grade'

const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  brochure: 'Folleto',
  layout: 'Layout',
  manufacturer: 'Fabricante',
  photo: 'Foto',
  procedure: 'Procedimiento',
  estimate: 'Estimación',
}

interface ComponentCardProps {
  rig: Rig
  /** Componente a mostrar; `null` o un id que no está en el equipo = no se dibuja nada. */
  componentId: string | null
  onClose: () => void
}

/**
 * Ficha técnica del componente seleccionado: nivel de confianza A/B/C, alcance de la geometría, especificaciones con
 * su fuente y, cuando las hay, las fuentes en conflicto (nunca se elige una en silencio). No muestra rutas de
 * documentos internos: solo el título de cada fuente.
 */
export function ComponentCard({ rig, componentId, onClose }: ComponentCardProps) {
  const component = componentId ? rig.components.find((c) => c.id === componentId) : undefined
  if (!component) return null
  const sources = new Map<string, Source>(rig.sources.map((s) => [s.id, s]))
  const sourceOf = (id: string) => sources.get(id)

  return (
    <aside
      aria-label="Ficha del componente"
      data-testid="component-card"
      className="bg-card/95 absolute inset-x-2 bottom-2 z-10 flex max-h-[45%] flex-col rounded-lg border shadow-lg backdrop-blur sm:inset-x-auto sm:top-14 sm:right-3 sm:bottom-3 sm:max-h-none sm:w-80"
    >
      <header className="flex items-start gap-2 border-b p-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm leading-snug font-semibold">{component.name}</h2>
          <Badge
            variant="outline"
            data-testid="grade-badge"
            className={`mt-1.5 ${GRADE_STYLES[component.confidence]}`}
          >
            {component.confidence} · {GRADE_LABELS[component.confidence]}
          </Badge>
        </div>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label="Cerrar ficha"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3 text-xs">
          {component.scope && (
            <section aria-label="Alcance de la geometría">
              <h3 className="text-muted-foreground mb-1 font-medium tracking-wide uppercase">
                Alcance
              </h3>
              <p className="leading-relaxed">{component.scope}</p>
            </section>
          )}

          {component.specifications.length > 0 && (
            <section aria-label="Especificaciones">
              <h3 className="text-muted-foreground mb-1 font-medium tracking-wide uppercase">
                Datos
              </h3>
              <ul className="space-y-2.5">
                {component.specifications.map((spec) => {
                  const source = sourceOf(spec.sourceId)
                  return (
                    <li key={spec.key} data-testid="spec">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-muted-foreground">{spec.label}</span>
                        <span className="text-right font-medium">
                          {formatSpecValue(spec.value, spec.unit)}
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className={GRADE_STYLES[spec.confidence]}>
                          {spec.confidence}
                        </Badge>
                        <span>{source?.title ?? spec.sourceId}</span>
                        {source && !source.verified && <span>· sin contrastar</span>}
                      </div>
                      {spec.conflicts && spec.conflicts.length > 0 && (
                        <div
                          role="note"
                          className="mt-1 rounded border border-amber-500/40 p-1.5 text-amber-200"
                        >
                          <strong>Fuente en conflicto</strong>
                          <ul className="mt-0.5 space-y-0.5">
                            {spec.conflicts.map((conflict) => (
                              <li key={`${conflict.sourceId}-${String(conflict.value)}`}>
                                {sourceOf(conflict.sourceId)?.title ?? conflict.sourceId}:{' '}
                                {formatSpecValue(conflict.value)}
                                {conflict.note ? ` (${conflict.note})` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {component.sourceIds.length > 0 && (
            <section aria-label="Fuentes">
              <h3 className="text-muted-foreground mb-1 font-medium tracking-wide uppercase">
                Fuentes
              </h3>
              <ul className="space-y-1">
                {component.sourceIds.map((id) => {
                  const source = sourceOf(id)
                  return (
                    <li key={id}>
                      {source ? (
                        <>
                          {source.title}{' '}
                          <span className="text-muted-foreground">
                            · {SOURCE_KIND_LABELS[source.kind]}
                            {source.verified ? '' : ' · sin contrastar'}
                          </span>
                        </>
                      ) : (
                        id
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      </ScrollArea>

      <footer className="text-muted-foreground border-t p-2 text-[11px]">
        Referencia digital · no as-built
      </footer>
    </aside>
  )
}
