import type { DropsDataset, DropsPoint, DropsSection, DropsZoneId } from '@/data/qhse/rig10-drops'
import type { Vec3 } from '@/lib/geometry'

const ZONE_RANK: Record<DropsZoneId, number> = { alto: 3, medio: 2, bajo: 1 }

/** Color de cada zona del A2 y el de "sin clasificar" (el color nunca es el único canal: siempre va la palabra). */
export const ZONE_COLORS: Record<DropsZoneId, string> = {
  alto: '#EF4444',
  medio: '#F59E0B',
  bajo: '#22C55E',
}
export const NO_ZONE_COLOR = '#9CA3AF'

export const zoneColor = (zone: DropsZoneId | null): string =>
  zone ? ZONE_COLORS[zone] : NO_ZONE_COLOR

/** Palabra de la zona: ALTO / MEDIO / BAJO, o SIN CLASIFICAR (el A2 no la define). */
export const zoneWord = (zone: DropsZoneId | null): string =>
  zone ? zone.toUpperCase() : 'SIN CLASIFICAR'

export const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`

export interface SectionView {
  section: DropsSection
  count: number
  anchor: Vec3
}

/** Secciones en el orden del Libro, con su cantidad de puntos y la posición aproximada de su marcador. */
export function buildSectionViews(
  dataset: DropsDataset,
  anchors: Readonly<Record<string, Vec3>>,
): SectionView[] {
  return [...dataset.sections]
    .sort((a, b) => a.order - b.order)
    .flatMap((section) => {
      const anchor = anchors[section.id]
      if (!anchor) return []
      return [
        { section, count: dataset.points.filter((p) => p.sectionId === section.id).length, anchor },
      ]
    })
}

/** Puntos de los componentes del dataset dados, en el orden del Libro. */
export function pointsOf(dataset: DropsDataset, componentIds: readonly string[]): DropsPoint[] {
  return dataset.points
    .filter((p) => componentIds.includes(p.componentId))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

/** Zona más alta entre los puntos dados (alto > medio > bajo); `null` si ninguno está clasificado. */
export function highestZone(points: readonly DropsPoint[]): DropsZoneId | null {
  let best: DropsZoneId | null = null
  for (const p of points) {
    if (p.zone && (best === null || ZONE_RANK[p.zone] > ZONE_RANK[best])) best = p.zone
  }
  return best
}
