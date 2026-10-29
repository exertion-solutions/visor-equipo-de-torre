import { anyCut, cutNote } from '@/lib/cut'
import { measureHint, useToolsStore } from '@/stores/toolsStore'

/**
 * Notas de las herramientas de inspección, flotando sobre la escena: la ayuda del modo medir y la leyenda del corte. Van
 * fuera de la barra de estado a propósito: ahí, al aparecer, sumaban una fila y el lienzo se achicaba y corría la escena.
 */
export function ToolHints() {
  const measure = useToolsStore((s) => s.measure)
  const kind = useToolsStore((s) => s.measureKind)
  const points = useToolsStore((s) => s.points.length)
  const cuts = useToolsStore((s) => s.cuts)
  const hint = measureHint(measure, points, kind)
  const cut = anyCut(cuts)
  if (!hint && !cut) return null

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-14 z-10 flex flex-col items-center gap-1 text-center text-xs">
      {hint && (
        <p
          role="status"
          data-testid="measure-hint"
          className="bg-card/90 text-foreground rounded-md border px-2 py-1 shadow backdrop-blur"
        >
          {hint}
        </p>
      )}
      {cut && (
        <p
          data-testid="cut-note"
          className="bg-card/90 text-foreground rounded-md border px-2 py-1 shadow backdrop-blur"
        >
          {cutNote(cuts)}
        </p>
      )}
    </div>
  )
}
