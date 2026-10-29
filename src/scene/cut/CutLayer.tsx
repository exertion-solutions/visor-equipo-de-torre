import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Plane, Vector3 } from 'three'
import { CUT_AXES, CUT_SPECS } from '@/lib/cut'
import { useToolsStore } from '@/stores/toolsStore'

/** Planos del V2 (normales −X, −Y, −Z): se conserva coordenada ≤ posición. */
const planes = {
  x: new Plane(new Vector3(...CUT_SPECS.x.normal), 0),
  y: new Plane(new Vector3(...CUT_SPECS.y.normal), 0),
  z: new Plane(new Vector3(...CUT_SPECS.z.normal), 0),
}

/**
 * Cortes de sección X, Y y Z: planos globales del renderer (`clippingPlanes`) que abren todo el equipo y se combinan. Son
 * superficies abiertas, sin tapas ni sólidos: es un corte visual, no un cálculo. El raycaster no respeta los planos:
 * `SelectableModel` descarta los hits recortados. Con render bajo demanda se pide un cuadro al cambiar el estado.
 */
export function CutLayer() {
  const get = useThree((s) => s.get)

  useEffect(() => {
    const apply = () => {
      const { cuts } = useToolsStore.getState()
      const { gl, invalidate } = get()
      for (const axis of CUT_AXES) planes[axis].constant = cuts[axis].value
      gl.clippingPlanes = CUT_AXES.filter((axis) => cuts[axis].on).map((axis) => planes[axis])
      invalidate()
    }
    apply()
    const unsubscribe = useToolsStore.subscribe((s, prev) => {
      if (s.cuts !== prev.cuts) apply()
    })
    return () => {
      unsubscribe()
      get().gl.clippingPlanes = []
    }
  }, [get])

  return null
}
