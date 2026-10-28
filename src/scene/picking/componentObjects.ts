import type { Mesh, Object3D } from 'three'

/**
 * Registro componente → objeto 3D raíz, para que los efectos (contorno) encuentren qué resaltar sin recorrer la escena.
 * Un componente = una unidad seleccionable (id = `Component.id` = nodo raíz del GLB).
 */
const objects = new Map<string, Object3D>()

export function registerComponentObject(id: string, object: Object3D | null): void {
  if (object) objects.set(id, object)
  else objects.delete(id)
}

/** Ids de los componentes montados en la escena (visibles u ocultos); base del aislamiento. */
export function registeredComponentIds(): string[] {
  return [...objects.keys()]
}

export function getComponentObject(id: string | null): Object3D | undefined {
  return id ? objects.get(id) : undefined
}

/** Objetos de los ids dados, sin repetidos ni huecos (ids desconocidos se ignoran). */
export function resolveObjects(ids: readonly (string | null)[]): Object3D[] {
  const out: Object3D[] = []
  for (const id of ids) {
    const o = getComponentObject(id)
    if (o && !out.includes(o)) out.push(o)
  }
  return out
}

/**
 * Mallas de los componentes dados. El contorno necesita las mallas: las capas de three no se heredan de un grupo a sus hijos.
 */
export function resolveMeshes(ids: readonly (string | null)[]): Object3D[] {
  const meshes: Object3D[] = []
  for (const root of resolveObjects(ids)) {
    root.traverse((child) => {
      if ((child as Mesh).isMesh) meshes.push(child)
    })
  }
  return meshes
}
