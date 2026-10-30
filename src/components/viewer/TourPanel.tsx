import { ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RIG10_VIEWPOINTS, type Viewpoint } from '@/data/viewpoints/rig10-viewpoints'
import { stopDelayMs } from '@/lib/viewpoints'
import { useModeStore } from '@/stores/modeStore'
import { TOUR_STOPS, useTourStore } from '@/stores/tourStore'
import { useViewerStore } from '@/stores/viewerStore'

const FIELDS = [
  ['funcion', 'Función'],
  ['riesgos', 'Riesgos'],
  ['EPP', 'EPP'],
  ['controles', 'Controles'],
] as const

const DELAY = stopDelayMs(RIG10_VIEWPOINTS)
const byId = new Map(RIG10_VIEWPOINTS.viewpoints.map((v) => [v.id, v]))

/** Ficha del sector: lo que no está cargado se dice, no se inventa; lo genérico lleva su rótulo de "pendiente de validación". */
function Ficha({ vp }: { vp: Viewpoint }) {
  const filled = FIELDS.filter(([k]) => vp.ficha?.[k])
  return (
    <section
      aria-label={`Ficha de ${vp.nombre}`}
      data-testid="vp-ficha"
      className="bg-foreground/[0.04] rounded-md p-2"
    >
      <h3 className="text-xs font-semibold text-amber-200">{vp.nombre}</h3>
      {filled.length === 0 ? (
        <p className="text-muted-foreground mt-1 text-xs">
          Ficha del sector pendiente de completar.
        </p>
      ) : (
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
          {filled.map(([k, label]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{vp.ficha?.[k]}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

/**
 * Panel "Ir a equipo" del motor nativo (equivale a `#vp-panel` del V2): los 14 sectores, la ficha del sector al que se va,
 * "Volver a vista general", el modo caminata y, en Entrenamiento, el recorrido guiado (anterior / reproducir / siguiente).
 * Es una herramienta VISUAL: las vistas no son puestos de trabajo ni distancias de seguridad.
 */
export function TourPanel() {
  const open = useTourStore((s) => s.open)
  const setOpen = useTourStore((s) => s.setOpen)
  const currentId = useTourStore((s) => s.currentId)
  const stopIndex = useTourStore((s) => s.stopIndex)
  const auto = useTourStore((s) => s.auto)
  const walking = useTourStore((s) => s.walking)
  const go = useTourStore((s) => s.go)
  const back = useTourStore((s) => s.back)
  const play = useTourStore((s) => s.play)
  const next = useTourStore((s) => s.next)
  const prev = useTourStore((s) => s.prev)
  const stop = useTourStore((s) => s.stop)
  const startWalk = useTourStore((s) => s.startWalk)
  const stopWalk = useTourStore((s) => s.stopWalk)
  const canGoBack = useViewerStore((s) => s.canGoBack)
  const training = useModeStore((s) => s.mode === 'training')
  const current = currentId ? byId.get(currentId) : undefined

  // Recorrido automático: pasa a la parada siguiente después del vuelo y del tiempo de la parada.
  useEffect(() => {
    if (!auto) return
    if (stopIndex >= TOUR_STOPS.length - 1) {
      useTourStore.getState().pause()
      return
    }
    const timer = setTimeout(() => stop(stopIndex + 1, true), DELAY)
    return () => clearTimeout(timer)
  }, [auto, stopIndex, stop])

  const position =
    stopIndex >= 0 && TOUR_STOPS[stopIndex]
      ? `Parada ${stopIndex + 1}/${TOUR_STOPS.length} · ${byId.get(TOUR_STOPS[stopIndex]!)?.nombre ?? ''}`
      : `Recorrido guiado · ${TOUR_STOPS.length} paradas`

  return (
    <section
      aria-label="Recorrido en primera persona"
      data-testid="tour-panel"
      className="bg-card/95 pointer-events-auto flex max-h-[55%] shrink-0 flex-col rounded-lg border text-xs shadow-lg backdrop-blur"
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-expanded={open}
        aria-controls="tour-body"
        onClick={() => setOpen(!open)}
        className="justify-start px-2 font-semibold text-amber-200"
      >
        {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        Ir a equipo
      </Button>
      {open && (
        <div id="tour-body" className="min-h-0 space-y-2 overflow-y-auto border-t p-2">
          {current && <Ficha vp={current} />}
          <div role="group" aria-label="Sectores" className="flex flex-wrap gap-1">
            {RIG10_VIEWPOINTS.viewpoints.map((vp) => (
              <Button
                key={vp.id}
                type="button"
                size="xs"
                variant={currentId === vp.id ? 'secondary' : 'outline'}
                aria-current={currentId === vp.id}
                data-testid={`vp-${vp.id}`}
                onClick={() => go(vp.id)}
              >
                {vp.nombre}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            <Button type="button" size="xs" variant="outline" disabled={!canGoBack} onClick={back}>
              Volver a vista general
            </Button>
            <Button
              type="button"
              size="xs"
              variant={walking ? 'secondary' : 'outline'}
              aria-pressed={walking}
              onClick={() => (walking ? stopWalk() : startWalk())}
              title="Caminar por la locación a 1,70 m de altura: W A S D o flechas, mouse para mirar, Esc para salir"
            >
              Modo caminata
            </Button>
          </div>
          {training && (
            <div role="group" aria-label="Recorrido guiado" className="space-y-1 border-t pt-2">
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={prev}
                  aria-label="Parada anterior"
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant={auto ? 'secondary' : 'outline'}
                  aria-pressed={auto}
                  onClick={play}
                >
                  {auto ? 'Pausa' : 'Reproducir'}
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={next}
                  aria-label="Parada siguiente"
                >
                  Siguiente
                </Button>
              </div>
              <p className="text-muted-foreground" data-testid="tour-position">
                {position}
              </p>
            </div>
          )}
          <p className="text-muted-foreground text-[11px] leading-snug">
            Recorrido visual: las vistas no son puestos de trabajo ni distancias de seguridad. Doble
            clic en un equipo para ir a su vista.
          </p>
        </div>
      )}
      {walking && (
        <p role="status" className="text-muted-foreground border-t px-2 py-1">
          Caminata: W A S D o flechas · mouse para mirar · Esc para salir
        </p>
      )}
    </section>
  )
}
