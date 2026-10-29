import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Plane, Vector3 } from 'three'
import { useToolsStore } from '@/stores/toolsStore'

/** Plano del V2: normal −X, se conserva x ≤ posición. */
const plane = new Plane(new Vector3(-1, 0, 0), 0)

/**
 * Corte de sección X: un plano global del renderer (`clippingPlanes`) que abre todo el equipo. Son superficies abiertas, sin
 * tapas ni sólidos: es un corte visual, no un cálculo. El raycaster no respeta el plano: `SelectableModel` descarta los hits
 * recortados. Con render bajo demanda se pide un cuadro al cambiar el estado.
 */
export function CutLayer() {
  const get = useThree((s) => s.get)

  useEffect(() => {
    const apply = () => {
      const { cut, cutX } = useToolsStore.getState()
      const { gl, invalidate } = get()
      plane.constant = cutX
      gl.clippingPlanes = cut ? [plane] : []
      invalidate()
    }
    apply()
    const unsubscribe = useToolsStore.subscribe((s, prev) => {
      if (s.cut !== prev.cut || s.cutX !== prev.cutX) apply()
    })
    return () => {
      unsubscribe()
      get().gl.clippingPlanes = []
    }
  }, [get])

  return null
}
