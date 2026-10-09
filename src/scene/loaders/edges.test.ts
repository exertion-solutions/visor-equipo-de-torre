import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Raycaster, SphereGeometry } from 'three'
import { describe, expect, it } from 'vitest'
import { addEdges } from './edges'

describe('addEdges', () => {
  it('agrega una línea por Mesh con las aristas vivas y es idempotente', () => {
    const root = new Group()
    const box = new Mesh(new BoxGeometry(), new MeshStandardMaterial())
    root.add(box)

    const lines = addEdges(root)

    expect(lines).toHaveLength(1)
    expect(box.children).toContain(lines[0])
    expect(lines[0]!.geometry.attributes.position!.count).toBe(24) // 12 aristas del cubo
    expect(addEdges(root)[0]).toBe(lines[0])
    expect(box.children).toHaveLength(1)
  })

  it('una esfera teselada fina no tiene aristas vivas y las líneas no capturan el picking', () => {
    const sphere = new Mesh(new SphereGeometry(1, 64, 32), new MeshStandardMaterial())
    const lines = addEdges(sphere)[0]!

    expect(lines.geometry.attributes.position!.count).toBe(0)
    const hits = new Raycaster().intersectObject(lines)
    expect(hits).toHaveLength(0)
  })
})
