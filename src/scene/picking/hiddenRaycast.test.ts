import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

/**
 * Premisa del aislamiento (docs/FEATURE_PARITY.md, fila "Aislamiento"): three NO excluye del raycast a un objeto con
 * `visible = false`. Por eso `SelectableModel` oculta quitando los handlers (así el grupo sale de la lista de
 * interacción de r3f) y no confía en `visible`. Si este test falla tras actualizar three, revisar esa decisión.
 */
describe('raycast sobre objetos ocultos (three)', () => {
  const ray = () => new Raycaster(new Vector3(0, 0, 10), new Vector3(0, 0, -1))
  const box = () => new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial())

  it('un mesh con visible = false igual recibe hits', () => {
    const m = box()
    m.visible = false
    expect(ray().intersectObject(m, false).length).toBeGreaterThan(0)
  })

  it('un hijo cuyo padre está oculto igual recibe hits', () => {
    const g = new Group()
    g.add(box())
    g.visible = false
    expect(ray().intersectObject(g, true).length).toBeGreaterThan(0)
  })

  it('solo las capas excluyen del raycast', () => {
    const m = box()
    m.layers.set(5)
    expect(ray().intersectObject(m, false)).toHaveLength(0)
  })
})
