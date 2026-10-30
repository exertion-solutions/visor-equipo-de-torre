import { Group, Mesh, MeshBasicMaterial, BoxGeometry, LineSegments, BufferGeometry } from 'three'
import { afterEach, describe, expect, it } from 'vitest'
import { registerComponentObject } from '@/scene/picking/componentObjects'
import { buildExportScene, GLB_EXTRAS } from './exportGlb'

/** Un componente como lo arma la escena: seleccionable → grupo de despiece → GLB con un pivote del aparejo y aristas. */
function component(id: string) {
  const sel = new Group()
  sel.name = `sel_${id}`
  sel.visible = false // oculto (aislamiento): el export lo incluye igual
  const explode = new Group()
  explode.name = `explode_${id}`
  explode.position.set(5, 3, 0)
  const pivot = new Group()
  pivot.userData.hoist = true
  pivot.position.y = 8
  pivot.scale.y = 0.4
  const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
  mesh.name = `${id}_acero`
  const edges = new LineSegments(new BufferGeometry())
  edges.userData.edges = true
  mesh.add(edges)
  pivot.add(mesh)
  explode.add(pivot)
  sel.add(explode)
  registerComponentObject(id, sel)
  return { sel, explode, pivot, mesh }
}

afterEach(() => {
  for (const id of ['a', 'b']) registerComponentObject(id, null)
})

describe('buildExportScene', () => {
  it('un nodo por componente con su id, y el aviso de referencia digital dentro del archivo', () => {
    component('a')
    component('b')
    const scene = buildExportScene()
    expect(scene.children.map((c) => c.name).sort()).toEqual(['a', 'b'])
    expect(scene.userData.aviso).toBe(GLB_EXTRAS.aviso)
    expect(String(scene.userData.aviso)).toMatch(/no as-built/)
    expect(String(scene.userData.marco)).toMatch(/1 unidad = 1 m/)
  })

  it('sale armado y con el aparejo en reposo, sin tocar la escena viva', () => {
    const { explode, pivot } = component('a')
    const scene = buildExportScene()
    const copyExplode = scene.getObjectByName('explode_a')!
    expect(copyExplode.position.toArray()).toEqual([0, 0, 0])
    let copyPivot: Group | undefined
    scene.traverse((o) => {
      if (o.userData.hoist) copyPivot = o as Group
    })
    expect(copyPivot!.position.toArray()).toEqual([0, 0, 0])
    expect(copyPivot!.scale.toArray()).toEqual([1, 1, 1])
    // La escena original conserva su despiece y su pose.
    expect(explode.position.toArray()).toEqual([5, 3, 0])
    expect([pivot.position.y, pivot.scale.y]).toEqual([8, 0.4])
  })

  it('todo visible (también lo oculto) y sin ninguna línea: ni las aristas del visor ni las `*_arista` del GLB', () => {
    const { explode } = component('a')
    const propia = new LineSegments(new BufferGeometry())
    propia.name = 'sk575_a_arista'
    explode.add(propia)
    const scene = buildExportScene()
    expect(scene.getObjectByName('a')!.visible).toBe(true)
    let lineas = 0
    let mallas = 0
    scene.traverse((o) => {
      if ((o as LineSegments).isLineSegments) lineas++
      if ((o as Mesh).isMesh) mallas++
    })
    expect([lineas, mallas]).toEqual([0, 1])
  })

  it('comparte geometría y material con la escena (el exportador solo los lee)', () => {
    const { mesh } = component('a')
    const scene = buildExportScene()
    let copy: Mesh | undefined
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) copy = o as Mesh
    })
    expect(copy!.geometry).toBe(mesh.geometry)
    expect(copy!.material).toBe(mesh.material)
  })
})
