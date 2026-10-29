import { useEffect, useRef } from 'react'
import { getDropsDataset, type DropsSection } from '@/data/qhse/rig10-drops'
import { DROPS_ANCHORS } from '@/data/qhse/rig10-drops-native'
import { buildSectionViews, plural, zoneColor, zoneWord } from '@/lib/drops'
import { registerToolLabel } from '@/scene/tools/toolLabelElements'
import { useDropsVisible, useToolsStore } from '@/stores/toolsStore'

const SECTIONS = buildSectionViews(getDropsDataset(), DROPS_ANCHORS)

function Marker({
  section,
  count,
  anchor,
}: {
  section: DropsSection
  count: number
  anchor: readonly [number, number, number]
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const open = useToolsStore((s) => s.dropsSection === section.id)
  const openSection = useToolsStore((s) => s.openDropsSection)
  const [x, y, z] = anchor
  useEffect(() => {
    if (ref.current)
      registerToolLabel(`drops-${section.id}`, { element: ref.current, point: [x, y, z] })
    return () => registerToolLabel(`drops-${section.id}`, null)
  }, [section.id, x, y, z])

  return (
    <button
      ref={ref}
      type="button"
      data-testid={`drops-marker-${section.id}`}
      style={{ display: 'none' }}
      data-display="flex"
      data-separar=""
      aria-expanded={open}
      aria-label={`${section.label}: ${plural(count, 'punto', 'puntos')}, zona ${zoneWord(section.zone)}. Posición aproximada del modelo.`}
      title={`${section.label} · posición aproximada del modelo`}
      onClick={() => openSection(open ? null : section.id)}
      // Borde punteado: la posición del marcador es aproximada (no hay geometría etiquetada en el modelo).
      className={`pointer-events-auto absolute top-0 left-0 flex items-center gap-1.5 rounded-full border border-dashed bg-[#0a0b12]/85 py-0.5 pr-2 pl-1 text-[11px] whitespace-nowrap will-change-transform ${
        open ? 'border-white' : 'border-white/50'
      }`}
    >
      <span
        aria-hidden="true"
        style={{ background: zoneColor(section.zone) }}
        className="size-2.5 shrink-0 rounded-full"
      />
      <span>
        {count} · {zoneWord(section.zone)}
      </span>
    </button>
  )
}

/**
 * Marcadores DROPS (equivale a los de `50-drops-layer.js`): uno por sección del Libro, con la cantidad de puntos y la
 * zona del A2 en palabras. Cada uno abre su sección en el panel. Su posición es aproximada (borde punteado); la ubica
 * `ToolsLayer` dentro del Canvas.
 */
export function DropsMarkers() {
  const visible = useDropsVisible()
  if (!visible) return null
  return (
    <div
      role="group"
      aria-label="Marcadores DROPS por sección"
      data-testid="drops-markers"
      className="pointer-events-none absolute inset-0 z-[6] overflow-hidden"
    >
      {SECTIONS.map((v) => (
        <Marker key={v.section.id} section={v.section} count={v.count} anchor={v.anchor} />
      ))}
    </div>
  )
}
