import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { buildComponentTree, groupVisibility } from '@/lib/componentTree'
import { useViewerStore } from '@/stores/viewerStore'
import type { Rig } from '@/types'
import { GRADE_STYLES } from './grade'

interface ComponentTreeProps {
  rig: Rig
  /** Ids de los componentes montados en la escena: solo ellos se pueden mostrar, ocultar o seleccionar. */
  sceneIds: readonly string[]
}

/** En pantallas angostas el panel arranca plegado para no tapar la escena. */
const abiertoAlInicio = () =>
  typeof window === 'undefined' ||
  !window.matchMedia ||
  window.matchMedia('(min-width: 640px)').matches

/**
 * Panel de componentes del motor nativo (equivale a `#tree` del V2): los componentes agrupados por equipo, con una
 * casilla para mostrar u ocultar cada uno o todo el grupo, y el nombre para seleccionarlo (abre la ficha). Seleccionar
 * desde acá es lo mismo que hacer clic en la escena: sirve también para los componentes que quedan tapados.
 */
export function ComponentTree({ rig, sceneIds }: ComponentTreeProps) {
  const [open, setOpen] = useState(abiertoAlInicio)
  const groups = useMemo(() => buildComponentTree(rig, sceneIds), [rig, sceneIds])
  const selected = useViewerStore((s) => s.selectedComponentId)
  const hidden = useViewerStore((s) => s.hiddenComponentIds)
  const selectComponent = useViewerStore((s) => s.selectComponent)
  const setComponentsVisible = useViewerStore((s) => s.setComponentsVisible)

  const choose = (id: string) => {
    // Un componente oculto que se elige en el árbol se muestra: la ficha y el contorno no tendrían a qué apuntar.
    if (hidden.includes(id)) setComponentsVisible([id], true)
    selectComponent(selected === id ? null : id)
  }

  return (
    <aside
      aria-label="Panel de componentes"
      data-testid="component-tree"
      className="bg-card/95 absolute top-24 left-3 z-10 sm:top-14 flex max-h-[calc(100%-7rem)] sm:max-h-[calc(100%-4.5rem)] w-[min(16rem,calc(100%-1.5rem))] flex-col rounded-lg border shadow-lg backdrop-blur"
    >
      <header className="flex items-center gap-1 px-2 py-1.5">
        <h2 className="flex-1 px-1 text-sm font-semibold">Componentes</h2>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-expanded={open}
          aria-label={open ? 'Plegar panel de componentes' : 'Desplegar panel de componentes'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <ChevronDown /> : <ChevronRight />}
        </Button>
      </header>
      {open && (
        <div className="min-h-0 flex-1 overflow-y-auto border-t">
          <div className="space-y-3 p-2 text-xs">
            {groups.map((group) => {
              const visibility = groupVisibility(group, hidden)
              return (
                <section key={group.id} aria-label={group.name}>
                  <label className="text-muted-foreground mb-1 flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      aria-label={`Mostrar ${group.name}`}
                      checked={visibility === 'all'}
                      ref={(el) => {
                        if (el) el.indeterminate = visibility === 'some'
                      }}
                      onChange={(e) =>
                        setComponentsVisible(
                          group.items.map((i) => i.id),
                          e.target.checked,
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate" title={group.name}>
                      {group.name}
                    </span>
                  </label>
                  <ul>
                    {group.items.map((item) => {
                      const isHidden = hidden.includes(item.id)
                      const isSelected = selected === item.id
                      return (
                        <li
                          key={item.id}
                          data-testid={`tree-item-${item.id}`}
                          className={`flex items-center gap-2 rounded-md border px-1.5 ${
                            isSelected
                              ? 'border-violet-500/50 bg-violet-500/15'
                              : 'hover:bg-foreground/5 border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Mostrar ${item.name}`}
                            checked={!isHidden}
                            onChange={(e) => setComponentsVisible([item.id], e.target.checked)}
                          />
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            title={item.name}
                            onClick={() => choose(item.id)}
                            className={`flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left ${
                              isHidden ? 'opacity-40' : ''
                            }`}
                          >
                            <span className="min-w-0 flex-1 truncate">{item.name}</span>
                            <span
                              className={`shrink-0 rounded border px-1 text-[10px] leading-4 ${GRADE_STYLES[item.confidence]}`}
                              title={`Confianza geométrica ${item.confidence}`}
                            >
                              {item.confidence}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>
        </div>
      )}
    </aside>
  )
}
