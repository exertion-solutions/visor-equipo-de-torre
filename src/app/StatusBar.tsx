import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { GRADE_LABELS, type GeometryGrade } from '@/lib/legacyBridge'
import { MODE_LABELS, MODE_SUMMARIES, useModeStore } from '@/stores/modeStore'
import { ENGINE_LABELS, useViewerStore } from '@/stores/viewerStore'

const GRADE_STYLES: Record<GeometryGrade, string> = {
  A: 'border-emerald-500/60 text-emerald-300',
  B: 'border-amber-500/60 text-amber-300',
  C: 'border-orange-500/60 text-orange-300',
}

const GRADE_HINT =
  'Confiabilidad geométrica del componente: A confirmado (documentado) · B parcial · C aproximado. Lo pendiente de relevamiento se trata como aproximado. Referencia digital, no as-built.'

export function StatusBar() {
  const mode = useModeStore((s) => s.mode)
  const engine = useViewerStore((s) => s.engine)
  const selection = useViewerStore((s) => (s.engine === 'legacy' ? s.selection : null))
  const edges = useViewerStore((s) => s.edges)
  const toggleEdges = useViewerStore((s) => s.toggleEdges)

  return (
    <footer
      aria-label="Barra de estado"
      className="bg-card/60 text-muted-foreground flex items-center gap-x-4 gap-y-1 border-t px-3 py-1.5 text-xs sm:px-4"
    >
      <span className="hidden min-w-0 shrink-0 sm:inline">
        Modo: <span className="text-foreground font-medium">{MODE_LABELS[mode]}</span>
        {/* El modo controla el visor V2 embebido (puente postMessage); el motor nativo aún no lo consume. */}
        {engine === 'native' ? (
          <span className="ml-1 italic">(sin efecto visual aún)</span>
        ) : (
          <span
            className="ml-1 hidden max-w-[34ch] truncate align-bottom xl:inline-block"
            title={MODE_SUMMARIES[mode]}
          >
            · {MODE_SUMMARIES[mode]}
          </span>
        )}
      </span>
      {selection && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="flex min-w-0 shrink items-center gap-1.5"
              data-testid="selection-grade"
            >
              <span className="truncate">
                Selección:{' '}
                <span className="text-foreground font-medium">
                  {selection.name ?? selection.id}
                </span>
              </span>
              {selection.grade && (
                <Badge variant="outline" className={GRADE_STYLES[selection.grade]}>
                  {selection.grade} · {GRADE_LABELS[selection.grade]}
                </Badge>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {selection.status ? `${selection.status}. ` : ''}
            {GRADE_HINT}
          </TooltipContent>
        </Tooltip>
      )}
      {/* Aviso de confianza: siempre visible, también en pantallas chicas. */}
      <span className="min-w-0 flex-1 truncate sm:flex-none">
        Geometría: referencia digital · no as-built
      </span>
      <span className="hidden shrink-0 md:inline">Escala: 1 unidad = 1 m</span>
      {engine === 'native' && (
        <Button
          type="button"
          size="xs"
          variant={edges ? 'secondary' : 'ghost'}
          aria-pressed={edges}
          onClick={toggleEdges}
          title="Sombreado con aristas (estilo CAD)"
          className="ml-auto shrink-0"
        >
          Aristas
        </Button>
      )}
      <Badge variant="outline" className={engine === 'native' ? 'shrink-0' : 'ml-auto shrink-0'}>
        Motor: {ENGINE_LABELS[engine]}
      </Badge>
    </footer>
  )
}
