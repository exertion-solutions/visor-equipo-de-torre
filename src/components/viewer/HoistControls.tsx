import { Button } from '@/components/ui/button'
import { HOIST_MAX, HOIST_MIN, HOIST_STEP } from '@/lib/hoist'
import { useToolsStore } from '@/stores/toolsStore'

const meters = (m: number) =>
  m.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Animación del aparejo (equivale a `#c-play` / `#hoist` del V2): botón para animar el recorrido didáctico y deslizador de la
 * altura aproximada del bloque. Es un componente aparte: durante la animación la altura se publica en cada cuadro y solo este
 * se vuelve a dibujar, no toda la barra de estado.
 */
export function HoistControls() {
  const height = useToolsStore((s) => s.hoistHeight)
  const playing = useToolsStore((s) => s.hoistPlaying)
  const blocked = useToolsStore((s) => s.explodeOn || s.exploded)
  const toggle = useToolsStore((s) => s.toggleHoistPlay)
  const setHeight = useToolsStore((s) => s.setHoistHeight)

  return (
    <>
      <Button
        type="button"
        size="xs"
        variant={playing ? 'secondary' : 'ghost'}
        aria-pressed={playing}
        disabled={blocked}
        onClick={toggle}
        title={
          blocked
            ? 'Armá el equipo (apagá el despiece) para animar el aparejo'
            : 'Anima el recorrido del aparejo entre 7 y 25 m: didáctico, sin validar; no es una simulación dinámica'
        }
        className="shrink-0"
      >
        {playing ? 'Pausar movimiento' : 'Animar aparejo'}
      </Button>
      <input
        type="range"
        min={HOIST_MIN}
        max={HOIST_MAX}
        step={HOIST_STEP}
        value={height}
        disabled={blocked}
        aria-label="Altura aproximada del aparejo"
        onChange={(e) => setHeight(Number(e.target.value))}
        className="w-20 shrink-0 accent-violet-500 disabled:opacity-40"
      />
      <span className="shrink-0 font-mono" data-testid="hoist-value">
        ≈ {meters(height)} m
      </span>
    </>
  )
}
