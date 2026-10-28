import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three'
import { afterEach, describe, expect, it } from 'vitest'
import {
  getComponentObject,
  registeredComponentIds,
  registerComponentObject,
  resolveMeshes,
  resolveObjects,
} from './componentObjects'

describe('registro de objetos por componente', () => {
  afterEach(() => {
    registerComponentObject('a', null)
    registerComponentObject('b', null)
  })

  it('registra, recupera y borra', () => {
    const g = new Group()
    registerComponentObject('a', g)
    expect(getComponentObject('a')).toBe(g)
    registerComponentObject('a', null)
    expect(getComponentObject('a')).toBeUndefined()
  })

  it('registeredComponentIds lista los ids montados', () => {
    registerComponentObject('a', new Group())
    registerComponentObject('b', new Group())
    expect(registeredComponentIds().sort()).toEqual(['a', 'b'])
    registerComponentObject('a', null)
    expect(registeredComponentIds()).toEqual(['b'])
  })

  it('resolveObjects ignora null, ids desconocidos y repetidos', () => {
    const a = new Group()
    const b = new Group()
    registerComponentObject('a', a)
    registerComponentObject('b', b)
    expect(resolveObjects([null, 'zzz', 'a', 'a', 'b'])).toEqual([a, b])
  })

  it('resolveMeshes baja a las mallas hijas (las capas no se heredan del grupo)', () => {
    const g = new Group()
    const m = new Mesh(new BoxGeometry(), new MeshBasicMaterial())
    const inner = new Group()
    inner.add(m)
    g.add(inner)
    registerComponentObject('a', g)
    expect(resolveMeshes(['a'])).toEqual([m])
    expect(resolveMeshes([null, 'zzz'])).toEqual([])
  })
})
