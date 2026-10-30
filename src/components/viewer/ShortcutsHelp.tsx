import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useViewerStore } from '@/stores/viewerStore'

const KEYS: readonly (readonly [string, string])[] = [
  ['← →', 'Girar alrededor del equipo'],
  ['↑ ↓', 'Inclinar la vista'],
  ['Mayús + flechas', 'Desplazar'],
  ['+ / −', 'Acercar / alejar'],
  ['? o H', 'Mostrar u ocultar esta ayuda'],
  ['Esc', 'Cerrar la ayuda / deseleccionar'],
]

const WALK_KEYS: readonly (readonly [string, string])[] = [
  ['W A S D o ↑ ← ↓ →', 'Caminar y girar'],
  ['Mouse', 'Mirar (con el puntero capturado)'],
  ['Esc', 'Salir de la caminata'],
]

/**
 * Ayuda de atajos de teclado (equivale a `#rig-atajos` del V2). Se abre con `?` o `H` con el foco en el lienzo, o con el botón
 * "Atajos" de la barra de estado; Esc la cierra y el foco vuelve al lienzo.
 */
export function ShortcutsHelp() {
  const open = useViewerStore((s) => s.helpOpen)
  const setOpen = useViewerStore((s) => s.setHelpOpen)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) ref.current?.focus()
    else if (
      document.activeElement === document.body ||
      ref.current?.contains(document.activeElement)
    )
      document.querySelector('canvas')?.focus({ preventScroll: true })
  }, [open])

  if (!open) return null
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Atajos de teclado"
      data-testid="shortcuts-help"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === '?' || e.key === 'h' || e.key === 'H') {
          e.preventDefault()
          e.stopPropagation()
          setOpen(false)
        }
      }}
      className="bg-card/97 absolute top-1/2 left-1/2 z-20 w-[min(21rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border p-4 text-sm shadow-xl backdrop-blur outline-none"
    >
      <h2 className="mb-2 text-xs font-semibold tracking-wider text-amber-300 uppercase">
        Atajos de teclado
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {KEYS.map(([k, d]) => (
          <div key={k} className="contents">
            <dt className="font-mono text-amber-200">{k}</dt>
            <dd>{d}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-3 mb-1 text-xs font-semibold tracking-wider text-amber-300 uppercase">
        Modo caminata
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {WALK_KEYS.map(([k, d]) => (
          <div key={k} className="contents">
            <dt className="font-mono text-amber-200">{k}</dt>
            <dd>{d}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground mt-3 text-xs">
        Hacé clic en el modelo o llegá con Tab para usar los atajos.
      </p>
      <Button
        type="button"
        size="xs"
        variant="ghost"
        className="mt-2"
        onClick={() => setOpen(false)}
      >
        Cerrar
      </Button>
    </div>
  )
}
