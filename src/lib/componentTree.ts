import type { ComponentFamily, GeometryConfidence, Rig } from '@/types'

export interface ComponentTreeItem {
  id: string
  name: string
  confidence: GeometryConfidence
  family: ComponentFamily
}

export interface ComponentTreeGroup {
  id: string
  name: string
  items: ComponentTreeItem[]
}

/**
 * Árbol del panel de componentes: Equipo → Componente (jerarquía del modelo de datos, `rig.equipment`). Solo entran los
 * componentes que están montados en la escena (`sceneIds`): los que tienen ficha pero no geometría no se pueden mostrar
 * ni ocultar. El orden es el de `componentIds` de cada equipo; un grupo sin componentes en escena no aparece.
 */
export function buildComponentTree(rig: Rig, sceneIds: readonly string[]): ComponentTreeGroup[] {
  const inScene = new Set(sceneIds)
  const byId = new Map(rig.components.map((c) => [c.id, c]))
  const groups: ComponentTreeGroup[] = []
  for (const equipment of rig.equipment) {
    const items: ComponentTreeItem[] = []
    for (const id of equipment.componentIds) {
      const component = byId.get(id)
      if (component && inScene.has(id))
        items.push({
          id,
          name: component.name,
          confidence: component.confidence,
          family: component.family,
        })
    }
    if (items.length > 0) groups.push({ id: equipment.id, name: equipment.name, items })
  }
  return groups
}

/** Estado de la casilla de un grupo: todos visibles, ninguno o parcial (casilla indeterminada). */
export function groupVisibility(
  group: ComponentTreeGroup,
  hiddenIds: readonly string[],
): 'all' | 'none' | 'some' {
  const hidden = group.items.filter((item) => hiddenIds.includes(item.id)).length
  if (hidden === 0) return 'all'
  return hidden === group.items.length ? 'none' : 'some'
}
