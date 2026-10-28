import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Box3, type Vector3 } from 'three'
import type { Vec3 } from '@/lib/geometry'
import { CAMERA_PRESETS, DEFAULT_CAMERA_PRESET } from '@/scene/cameras/presets'
import {
  FOCUS_DURATION_MS,
  computeFocusView,
  easeInOutCubic,
  lerpView,
  type CameraView,
} from '@/scene/cameras/focus'
import { getComponentObject } from '@/scene/picking/componentObjects'
import { useViewerStore } from '@/stores/viewerStore'

interface Transition {
  from: CameraView
  to: CameraView
  start: number
}

/** Lo único que se usa de OrbitControls (drei lo publica como `controls` con `makeDefault`). */
interface OrbitTarget {
  target: Vector3
  update: () => unknown
}

const toVec = (v: Vector3): Vec3 => [v.x, v.y, v.z]

/**
 * Órbita con límites (no baja del terreno; zoom acotado a la escala de un equipo, ~32 m de mástil) y
 * ejecución de las órdenes de cámara del store: enfocar el componente seleccionado y volver.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitTarget | null
  const invalidate = useThree((s) => s.invalidate)
  const command = useViewerStore((s) => s.cameraCommand)
  const setCanGoBack = useViewerStore((s) => s.setCanGoBack)
  const transition = useRef<Transition | null>(null)
  const savedView = useRef<CameraView | null>(null)
  // Las órdenes anteriores al montaje no se repiten (el motor se desmonta al volver al V2 y se remonta).
  const lastSeq = useRef(useViewerStore.getState().cameraCommand?.seq ?? 0)

  useEffect(() => {
    if (!command || !controls || command.seq === lastSeq.current) return
    lastSeq.current = command.seq
    const current: CameraView = { position: toVec(camera.position), target: toVec(controls.target) }
    let goal: CameraView
    if (command.type === 'focus') {
      const object = getComponentObject(command.componentId)
      if (!object) return
      const box = new Box3().setFromObject(object)
      if (box.isEmpty()) return
      goal = computeFocusView({ min: toVec(box.min), max: toVec(box.max) }, current)
      // Como en el legacy: solo el primer foco guarda la vista; los siguientes la conservan.
      if (!savedView.current) {
        savedView.current = current
        setCanGoBack(true)
      }
    } else {
      if (!savedView.current) return
      goal = savedView.current
      savedView.current = null
      setCanGoBack(false)
    }
    transition.current = { from: current, to: goal, start: performance.now() }
    invalidate()
  }, [command, camera, controls, invalidate, setCanGoBack])

  // Si el motor nativo se desmonta, no queda un "Volver" que no puede ejecutarse.
  useEffect(() => () => setCanGoBack(false), [setCanGoBack])

  useFrame(() => {
    const t = transition.current
    if (!t || !controls) return
    const k = Math.min((performance.now() - t.start) / FOCUS_DURATION_MS, 1)
    const view = lerpView(t.from, t.to, easeInOutCubic(k))
    camera.position.set(...view.position)
    controls.target.set(...view.target)
    controls.update()
    if (k >= 1) transition.current = null
    else invalidate()
  })

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.09}
      target={[...CAMERA_PRESETS[DEFAULT_CAMERA_PRESET].target]}
      minDistance={3}
      maxDistance={160}
      maxPolarAngle={Math.PI / 2}
    />
  )
}
