import { Fragment } from 'react'
import { GRADE_HINT, GRADE_STYLES } from '@/components/equipment/grade'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HoistControls } from '@/components/viewer/HoistControls'
import { captureFileName } from '@/lib/capture'
import { buildShareUrl } from '@/lib/deepLink'
import { CUT_AXES, CUT_SPECS } from '@/lib/cut'
import { GRADE_LABELS } from '@/lib/legacyBridge'
import { captureView } from '@/scene/capture/captureRegistry'
import { PROJECTION_LABELS } from '@/scene/cameras/projection'
import { registeredComponentIds } from '@/scene/picking/componentObjects'
import { MODE_LABELS, MODE_SUMMARIES, useModeStore } from '@/stores/modeStore'
import { dropsVisible, useToolsStore, zonesVisible } from '@/stores/toolsStore'
import { ENGINE_LABELS, useViewerStore } from '@/stores/viewerStore'

export function StatusBar() {
  const mode = useModeStore((s) => s.mode)
  const engine = useViewerStore((s) => s.engine)
  const selection = useViewerStore((s) => (s.engine === 'legacy' ? s.selection : null))
  const edges = useViewerStore((s) => s.edges)
  const toggleEdges = useViewerStore((s) => s.toggleEdges)
  const labels = useViewerStore((s) => s.labels)
  const toggleLabels = useViewerStore((s) => s.toggleLabels)
  const wire = useViewerStore((s) => s.wire)
  const toggleWire = useViewerStore((s) => s.toggleWire)
  const toggleZones = useToolsStore((s) => s.toggleZones)
  // El botón refleja lo pedido (a mano o por el modo QHSE), aunque el despiece oculte la capa un rato.
  const zonesOn = useToolsStore((s) => zonesVisible(s.zones, mode))
  const dropsOn = useToolsStore((s) => dropsVisible(s.drops, mode))
  const cuts = useToolsStore((s) => s.cuts)
  const toggleCut = useToolsStore((s) => s.toggleCut)
  const setCut = useToolsStore((s) => s.setCut)
  const explodeOn = useToolsStore((s) => s.explodeOn)
  const explodeAmount = useToolsStore((s) => s.explodeAmount)
  const exploded = useToolsStore((s) => s.exploded)
  const toggleExplode = useToolsStore((s) => s.toggleExplode)
  const setExplodeAmount = useToolsStore((s) => s.setExplodeAmount)
  const toggleDrops = useToolsStore((s) => s.toggleDrops)
  const dims = useToolsStore((s) => s.dims)
  const toggleDims = useToolsStore((s) => s.toggleDims)
  const measure = useToolsStore((s) => s.measure)
  const toggleMeasure = useToolsStore((s) => s.toggleMeasure)
  const measureKind = useToolsStore((s) => s.measureKind)
  const toggleAngle = useToolsStore((s) => s.toggleAngle)
  const points = useToolsStore((s) => s.points)
  const clearMeasure = useToolsStore((s) => s.clearMeasure)
  const showNotice = useToolsStore((s) => s.showNotice)
  const selectedId = useViewerStore((s) => s.selectedComponentId)
  const activeView = useViewerStore((s) => s.activeView)
  const hasNativeSelection = useViewerStore((s) => s.selectedComponentId !== null)
  const canGoBack = useViewerStore((s) => s.canGoBack)
  const focusSelected = useViewerStore((s) => s.focusSelected)
  const goBack = useViewerStore((s) => s.goBack)
  const orthographic = useViewerStore((s) => s.projection === 'orthographic')
  const toggleProjection = useViewerStore((s) => s.toggleProjection)
  const isolated = useViewerStore((s) => s.isolationSnapshot !== null)
  const toggleIsolation = useViewerStore((s) => s.toggleIsolation)

  const copyLink = async () => {
    const url = buildShareUrl(location.href, { mode, comp: selectedId, view: activeView })
    try {
      await navigator.clipboard.writeText(url)
      showNotice('Enlace copiado')
    } catch {
      showNotice(`No se pudo copiar. Enlace: ${url}`)
    }
  }

  const exportGlb = async () => {
    showNotice('Exportando GLB…')
    try {
      const { exportRigGlb, GLB_FILE_NAME } = await import('@/scene/export/exportGlb')
      const blob = await exportRigGlb()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = GLB_FILE_NAME
      document.body.append(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      showNotice('GLB exportado: geometría de referencia, unidades nominales en metros.')
    } catch (e) {
      showNotice(`No se pudo exportar: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const savePng = async () => {
    const blob = await captureView()
    if (!blob) return showNotice('No se pudo generar la captura')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = captureFileName(new Date())
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    showNotice('Captura guardada: solo el 3D, con la leyenda "no as-built"')
  }

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
              ? '(zonas y puntos DROPS; el resto sin efecto aún)'
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
            variant={wire ? 'secondary' : 'ghost'}
            aria-pressed={wire}
            onClick={toggleWire}
            title="Malla: muestra los triángulos de todos los componentes (reversible)"
            className="shrink-0"
          >
            Malla
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
            variant={dropsOn ? 'secondary' : 'ghost'}
            aria-pressed={dropsOn}
            // En modo QHSE la capa la enciende el modo: el botón no la puede apagar (el modo es una capa derivada).
            disabled={mode === 'qhse'}
            onClick={toggleDrops}
            title="Puntos DROPS por sección y clasificación cualitativa por zona (layout A2): referencia, no una verificación"
            className="shrink-0"
          >
            DROPS
          </Button>
          <Button
            type="button"
            size="xs"
            variant={explodeOn ? 'secondary' : 'ghost'}
            aria-pressed={explodeOn}
            onClick={toggleExplode}
            title="Despiece: separa las piezas para mirarlas. Es solo visual (sin escala ni cálculo); oculta etiquetas, cotas, zonas y DROPS"
            className="shrink-0"
          >
            Despiece
          </Button>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={Math.round(explodeAmount * 100)}
            disabled={!explodeOn}
            aria-label="Separación del despiece"
            onChange={(e) => setExplodeAmount(Number(e.target.value) / 100)}
            className="w-20 shrink-0 accent-violet-500 disabled:opacity-40"
          />
          <span className="shrink-0 font-mono" data-testid="explode-value">
            {explodeOn ? Math.round(explodeAmount * 100) : 0} %
          </span>
          {CUT_AXES.map((axis) => {
            const spec = CUT_SPECS[axis]
            const { on, value } = cuts[axis]
            return (
              <Fragment key={axis}>
                <Button
                  type="button"
                  size="xs"
                  variant={on ? 'secondary' : 'ghost'}
                  aria-pressed={on}
                  onClick={() => toggleCut(axis)}
                  title={spec.title}
                  className="shrink-0"
                >
                  {spec.button}
                </Button>
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={value}
                  disabled={!on}
                  aria-label={spec.slider}
                  onChange={(e) => setCut(axis, Number(e.target.value))}
                  className="w-20 shrink-0 accent-violet-500 disabled:opacity-40"
                />
              </Fragment>
            )
          })}
          <Button
            type="button"
            size="xs"
            variant={measure && measureKind === 'distance' ? 'secondary' : 'ghost'}
            aria-pressed={measure && measureKind === 'distance'}
            disabled={explodeOn || exploded}
            onClick={toggleMeasure}
            title={
              explodeOn || exploded
                ? 'No se mide con el equipo desarmado: apagá el despiece'
                : 'Medir entre dos puntos de la superficie del modelo (aproximado)'
            }
            className="shrink-0"
          >
            Medir
          </Button>
          <Button
            type="button"
            size="xs"
            variant={measure && measureKind === 'angle' ? 'secondary' : 'ghost'}
            aria-pressed={measure && measureKind === 'angle'}
            disabled={explodeOn || exploded}
            onClick={toggleAngle}
            title={
              explodeOn || exploded
                ? 'No se mide con el equipo desarmado: apagá el despiece'
                : 'Medir un ángulo con tres puntos de la superficie (A, vértice B, C) y el desnivel de A a C (aproximado)'
            }
            className="shrink-0"
          >
            Medir ángulo
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
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={copyLink}
            title="Copia un enlace que abre el visor en el componente seleccionado o, sin selección, en la última vista estándar"
            className="shrink-0"
          >
            Copiar enlace
          </Button>
          <HoistControls />
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={exportGlb}
            title="Descarga todo el equipo como GLB (armado, aparejo en reposo), con el aviso de referencia digital dentro del archivo"
            className="shrink-0"
          >
            Exportar GLB
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={savePng}
            title="Descarga una imagen PNG de la escena 3D con la leyenda de referencia digital (no incluye etiquetas ni paneles)"
            className="shrink-0"
          >
            Captura PNG
          </Button>
        </>
      )}
      <Badge variant="outline" className={engine !== 'native' ? 'ml-auto shrink-0' : 'shrink-0'}>
        Motor: {ENGINE_LABELS[engine]}
      </Badge>
    </footer>
  )
}
