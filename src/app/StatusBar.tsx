import { GRADE_HINT, GRADE_STYLES } from '@/components/equipment/grade'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { GRADE_LABELS } from '@/lib/legacyBridge'
import { PROJECTION_LABELS } from '@/scene/cameras/projection'
import { registeredComponentIds } from '@/scene/picking/componentObjects'
import { MODE_LABELS, MODE_SUMMARIES, useModeStore } from '@/stores/modeStore'
import { measureHint, useToolsStore, useZonesVisible } from '@/stores/toolsStore'
import { ENGINE_LABELS, useViewerStore } from '@/stores/viewerStore'

export function StatusBar() {
  const mode = useModeStore((s) => s.mode)
  const engine = useViewerStore((s) => s.engine)
  const selection = useViewerStore((s) => (s.engine === 'legacy' ? s.selection : null))
  const edges = useViewerStore((s) => s.edges)
  const toggleEdges = useViewerStore((s) => s.toggleEdges)
  const labels = useViewerStore((s) => s.labels)
  const toggleLabels = useViewerStore((s) => s.toggleLabels)
  const toggleZones = useToolsStore((s) => s.toggleZones)
  const zonesOn = useZonesVisible()
  const dims = useToolsStore((s) => s.dims)
  const toggleDims = useToolsStore((s) => s.toggleDims)
  const measure = useToolsStore((s) => s.measure)
  const toggleMeasure = useToolsStore((s) => s.toggleMeasure)
  const points = useToolsStore((s) => s.points)
  const clearMeasure = useToolsStore((s) => s.clearMeasure)
  const hint = measureHint(measure, points.length)
  const hasNativeSelection = useViewerStore((s) => s.selectedComponentId !== null)
  const canGoBack = useViewerStore((s) => s.canGoBack)
  const focusSelected = useViewerStore((s) => s.focusSelected)
  const goBack = useViewerStore((s) => s.goBack)
  const orthographic = useViewerStore((s) => s.projection === 'orthographic')
  const toggleProjection = useViewerStore((s) => s.toggleProjection)
  const isolated = useViewerStore((s) => s.isolationSnapshot !== null)
  const toggleIsolation = useViewerStore((s) => s.toggleIsolation)

  return (
    <footer
      aria-label="Barra de estado"
      className="bg-card/60 text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-1.5 text-xs sm:px-4"
    >
      <span className="hidden min-w-0 shrink-0 sm:inline">
        Modo: <span className="text-foreground font-medium">{MODE_LABELS[mode]}</span>
        {/* El modo controla el visor V2 embebido (puente postMessage); el motor nativo aún no lo consume. */}
        {engine === 'native' ? (
          <span className="ml-1 italic">
            {mode === 'qhse'
              ? '(zonas ilustrativas; el resto sin efecto aún)'
              : '(sin efecto visual aún)'}
          </span>
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
      {hint && (
        <span role="status" data-testid="measure-hint" className="text-foreground min-w-0 shrink">
          {hint}
        </span>
      )}
      {/* Aviso de confianza: siempre visible, también en pantallas chicas. */}
      <span className="min-w-0 flex-1 truncate sm:flex-none">
        Geometría: referencia digital · no as-built
      </span>
      <span className="hidden shrink-0 md:inline">Escala: 1 unidad = 1 m</span>
      {engine === 'native' && (
        <>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={!hasNativeSelection}
            onClick={focusSelected}
            title="Encuadra el componente seleccionado"
            className="ml-auto shrink-0"
          >
            Enfocar
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={!canGoBack}
            onClick={goBack}
            title="Vuelve a la vista previa al enfoque"
            className="shrink-0"
          >
            Volver
          </Button>
          <Button
            type="button"
            size="xs"
            variant={isolated ? 'secondary' : 'ghost'}
            aria-pressed={isolated}
            disabled={!hasNativeSelection && !isolated}
            onClick={() => toggleIsolation(registeredComponentIds())}
            title="Oculta todo salvo el componente seleccionado; otro clic restaura"
            className="shrink-0"
          >
            Aislar selección
          </Button>
          <Button
            type="button"
            size="xs"
            variant={orthographic ? 'secondary' : 'ghost'}
            aria-pressed={orthographic}
            onClick={toggleProjection}
            title="Alterna entre proyección ortográfica y perspectiva (mismo encuadre)"
            className="shrink-0"
          >
            {PROJECTION_LABELS.orthographic}
          </Button>
          <Button
            type="button"
            size="xs"
            variant={edges ? 'secondary' : 'ghost'}
            aria-pressed={edges}
            onClick={toggleEdges}
            title="Sombreado con aristas (estilo CAD)"
            className="shrink-0"
          >
            Aristas
          </Button>
          <Button
            type="button"
            size="xs"
            variant={labels ? 'secondary' : 'ghost'}
            aria-pressed={labels}
            onClick={toggleLabels}
            title="Etiquetas numeradas sobre los componentes (el número es el del panel)"
            className="shrink-0"
          >
            Etiquetas
          </Button>
          <Button
            type="button"
            size="xs"
            variant={dims ? 'secondary' : 'ghost'}
            aria-pressed={dims}
            onClick={toggleDims}
            title="Cotas del equipo con su nivel A/B/C: la línea es orientativa, el valor sale de la especificación"
            className="shrink-0"
          >
            Cotas
          </Button>
          <Button
            type="button"
            size="xs"
            variant={zonesOn ? 'secondary' : 'ghost'}
            aria-pressed={zonesOn}
            // En modo QHSE las zonas están encendidas por el modo: el botón no las puede apagar (el modo es una capa derivada).
            disabled={mode === 'qhse'}
            onClick={toggleZones}
            title="Zonas ilustrativas de riesgo: envolventes gráficas sin validar, no son exclusiones aprobadas"
            className="shrink-0"
          >
            Zonas
          </Button>
          <Button
            type="button"
            size="xs"
            variant={measure ? 'secondary' : 'ghost'}
            aria-pressed={measure}
            onClick={toggleMeasure}
            title="Medir entre dos puntos de la superficie del modelo (aproximado)"
            className="shrink-0"
          >
            Medir
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={points.length === 0}
            onClick={clearMeasure}
            title="Borra la medición"
            className="shrink-0"
          >
            Borrar medición
          </Button>
        </>
      )}
      <Badge variant="outline" className={engine !== 'native' ? 'ml-auto shrink-0' : 'shrink-0'}>
        Motor: {ENGINE_LABELS[engine]}
      </Badge>
    </footer>
  )
}
