import type { Object3D } from 'three'

/** Registro componente → grupo que se desplaza con el despiece (hijo del grupo seleccionable: éste no se mueve). */
const objects = new Map<string, Object3D>()

export function registerExplodeObject(id: string, object: Object3D | null): void {
  if (object) objects.set(id, object)
  else objects.delete(id)
}

export function explodeObjects(): ReadonlyMap<string, Object3D> {
  return objects
}
