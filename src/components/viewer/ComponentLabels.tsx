import { useEffect, useMemo, useRef } from 'react'
import { FAMILY_COLORS, numberComponents } from '@/lib/componentLabels'
import { buildComponentTree, type ComponentTreeItem } from '@/lib/componentTree'
import { registerLabelElement } from '@/scene/labels/labelElements'
import { useViewerStore } from '@/stores/viewerStore'
import type { Rig } from '@/types'

interface ComponentLabelsProps {
  rig: Rig
  /** Ids de los componentes montados en la escena. */
  sceneIds: readonly string[]
}

/** Una etiqueta: la ubica `LabelsProjector` (dentro del Canvas) a través del registro, no React. Arranca oculta. */
function LabelPill({ item, number }: { item: ComponentTreeItem; number: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    registerLabelElement(item.id, ref.current)
    return () => registerLabelElement(item.id, null)
  }, [item.id])
  return (
    <div
      ref={ref}
      data-testid={`label-${item.id}`}
      style={{ display: 'none' }}
      className="absolute top-0 left-0 flex max-w-[16rem] items-center gap-1.5 rounded-full border border-white/15 bg-[#0a0b12]/80 py-0.5 pr-2 pl-0.5 text-[11.5px] whitespace-nowrap will-change-transform"
    >
      <b
        style={{ background: FAMILY_COLORS[item.family] }}
        className="grid size-[18px] shrink-0 place-items-center rounded-full font-mono text-[10px] font-medium text-[#05060a]"
      >
        {number}
      </b>
      <span className="truncate">{item.name}</span>
    </div>
  )
}

/**
 * Etiquetas numeradas sobre los componentes (equivale a `#t-labels` / `#labels` del V2): una etiqueta por componente
 * visible, con el mismo número que el panel de componentes. Solo se dibujan con las etiquetas activadas; no reciben
 * clics (no tapan la escena) y, por decorativas, quedan fuera del árbol de accesibilidad: el nombre ya está en el panel.
 */
export function ComponentLabels({ rig, sceneIds }: ComponentLabelsProps) {
  const labels = useViewerStore((s) => s.labels)
  const hidden = useViewerStore((s) => s.hiddenComponentIds)
  const groups = useMemo(() => buildComponentTree(rig, sceneIds), [rig, sceneIds])
  const numbers = useMemo(() => numberComponents(groups), [groups])
  if (!labels) return null

  return (
    <div
      aria-hidden="true"
      data-testid="component-labels"
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
    >
      {groups.flatMap((group) =>
        group.items
          .filter((item) => !hidden.includes(item.id))
          .map((item) => (
            <LabelPill key={item.id} item={item} number={numbers.get(item.id) ?? 0} />
          )),
      )}
    </div>
  )
}
