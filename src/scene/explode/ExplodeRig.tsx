import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { explodeTranslation, stepExplode } from '@/lib/explode'
import type { Vec3 } from '@/lib/geometry'
import { useToolsStore } from '@/stores/toolsStore'
import { explodeObjects } from './explodeObjects'

/** Separación actual (0–1). */
let current = 0

interface ExplodeRigProps {
  /** Offset autorado de cada componente (a factor 1); sin entrada = no se mueve. */
  offsets: ReadonlyMap<string, Vec3>
}

/**
 * Anima el despiece: lleva la separación actual hacia la pedida y desplaza cada pieza `offset × separación`. La escena es
 * estática (render bajo demanda), así que pide cuadros solo mientras anima. No es una simulación: solo separa piezas.
 */
export function ExplodeRig({ offsets }: ExplodeRigProps) {
  const invalidate = useThree((s) => s.invalidate)
  const shown = useRef(false)

  useEffect(() => useToolsStore.subscribe(() => invalidate()), [invalidate])

  useFrame((_, delta) => {
    const { explodeOn, explodeAmount, setExploded } = useToolsStore.getState()
    const target = explodeOn ? explodeAmount : 0
    if (current === target) return
    current = stepExplode(current, target, Math.min(delta, 0.05))
    for (const [id, object] of explodeObjects()) {
      const [x, y, z] = explodeTranslation(offsets.get(id), current)
      object.position.set(x, y, z)
    }
    const isShown = current > 0
    if (isShown !== shown.current) {
      shown.current = isShown
      setExploded(isShown)
    }
    if (current !== target) invalidate()
  })

  return null
}
