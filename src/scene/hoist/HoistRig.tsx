import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Box3, Group, Matrix4, Vector3, type Object3D } from 'three'
import { cableStretch, HOIST_REST, stepHoist, type HoistState } from '@/lib/hoist'
import { explodeObjects } from '@/scene/explode/explodeObjects'
import { useToolsStore } from '@/stores/toolsStore'

const COMPONENT_ID = 'sk575_aparejo'

interface Pivot {
  object: Group
  /** Las líneas se estiran; el resto (bloque, gancho, amelas, elevador) se traslada. */
  cable: boolean
  /** Alturas del extremo superior e inferior en reposo, en el marco local del nodo del componente. */
  top: number
  bottom: number
}

let pivots: Pivot[] | null = null
/** Escala del nodo del componente respecto del mundo: el movimiento se aplica en su marco local. */
let localScale = 1
let state: HoistState = { height: HOIST_REST, dir: 1 }
const scale = new Vector3()

/**
 * Cada nodo por material del aparejo (`sk575_aparejo_acero`, `…_cable`, …; cuelgan del nodo del componente, como en el V2) se
 * envuelve en un pivote: el GLB no se toca (sus nodos conservan su transformación) y el movimiento vive en el pivote.
 * Devuelve `false` mientras el GLB no está cargado.
 */
function setup(): boolean {
  const holder = explodeObjects().get(COMPONENT_ID)
  const root = holder?.children[0]
  if (!root || root.children.length === 0 || !root.getObjectByProperty('isMesh', true)) return false
  const component = root.getObjectByName(COMPONENT_ID) ?? root
  component.updateWorldMatrix(true, true)
  const inverse = new Matrix4().copy(component.matrixWorld).invert()
  localScale = component.getWorldScale(scale).y || 1
  const made: Pivot[] = []
  for (const child of [...component.children] as Object3D[]) {
    const box = new Box3().setFromObject(child).applyMatrix4(inverse)
    const object = new Group()
    object.name = `${child.name}_pivote`
    object.userData.hoist = true
    component.add(object)
    object.add(child)
    made.push({ object, cable: child.name.endsWith('_cable'), top: box.max.y, bottom: box.min.y })
  }
  pivots = made
  return true
}

/** Pone el bloque a `height` m: lo que cuelga se traslada y las líneas se estiran entre la corona (fija) y el bloque. */
function apply(height: number): void {
  // Los desplazamientos son de mundo; el pivote vive en el marco local del nodo del componente.
  const dy = (height - HOIST_REST) / localScale
  for (const p of pivots ?? []) {
    if (p.cable) {
      const { scale, offset } = cableStretch(p.top, p.bottom, dy)
      p.object.scale.y = scale
      p.object.position.y = offset
    } else {
      p.object.position.y = dy
    }
  }
}

/**
 * Animación didáctica del aparejo (el recorrido de 7 a 25 m del V2): sube y baja el bloque a 1 m/s y estira las líneas. Es ilustrativa,
 * sin validar: no es una simulación dinámica. Con render bajo demanda pide cuadros solo mientras anima o se mueve el deslizador.
 */
export function HoistRig() {
  const get = useThree((s) => s.get)

  useEffect(() => {
    const invalidate = () => get().invalidate()
    const poll = setInterval(() => {
      if (pivots || !setup()) return
      state = { height: useToolsStore.getState().hoistHeight, dir: 1 }
      apply(state.height)
      invalidate()
      clearInterval(poll)
    }, 250)
    const unsubscribe = useToolsStore.subscribe(invalidate)
    return () => {
      clearInterval(poll)
      unsubscribe()
    }
  }, [get])

  useFrame((_, delta) => {
    if (!pivots) return
    const { hoistPlaying, hoistHeight, syncHoist } = useToolsStore.getState()
    if (hoistPlaying) {
      state = stepHoist(state, delta)
      apply(state.height)
      syncHoist(state.height)
      get().invalidate()
    } else if (hoistHeight !== state.height) {
      state = { ...state, height: hoistHeight }
      apply(hoistHeight)
    }
  })

  return null
}
