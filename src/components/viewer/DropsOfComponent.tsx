import { getDropsDataset } from '@/data/qhse/rig10-drops'
import { DROPS_NATIVE_COMPONENTS } from '@/data/qhse/rig10-drops-native'
import { highestZone, plural, pointsOf } from '@/lib/drops'
import { useDropsVisible, useToolsStore } from '@/stores/toolsStore'
import { ZoneBadge } from './DropsPanel'

const dataset = getDropsDataset()

/**
 * Bloque DROPS de la ficha de un componente (con la capa encendida): cuántos puntos del Libro se le asignan (asignación
 * inferida, propia del modelo) y su zona más alta, con acceso a la sección de cada uno.
 */
export function DropsOfComponent({ componentId }: { componentId: string | null }) {
  const visible = useDropsVisible()
  const openSection = useToolsStore((s) => s.openDropsSection)
  if (!visible || !componentId) return null
  const points = pointsOf(dataset, DROPS_NATIVE_COMPONENTS[componentId] ?? [])
  const sectionIds = [...new Set(points.map((p) => p.sectionId))]

  return (
    <section aria-label="Puntos DROPS" data-testid="drops-of-component">
      <h3 className="text-muted-foreground mb-1 font-medium tracking-wide uppercase">DROPS</h3>
      {points.length === 0 ? (
        <p>Este componente no tiene puntos DROPS asignados.</p>
      ) : (
        <>
          <div className="mb-1 flex flex-wrap gap-1">
            <ZoneBadge zone={highestZone(points)} />
            <span>{plural(points.length, 'punto', 'puntos')}</span>
          </div>
          <p className="text-muted-foreground mb-1">
            Zona más alta entre sus puntos; la asignación de componente es propia del modelo (
            {plural(sectionIds.length, 'sección', 'secciones')}).
          </p>
          <ul className="flex flex-wrap gap-1">
            {sectionIds.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className="rounded border px-1.5 py-0.5 hover:bg-white/10"
                  onClick={() => openSection(id)}
                >
                  {dataset.sections.find((s) => s.id === id)?.label ?? id}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
