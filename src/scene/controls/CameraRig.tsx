import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box3, Vector3, type Camera, type PerspectiveCamera } from 'three'
import type { Vec3 } from '@/lib/geometry'
import { CAMERA_PRESETS, DEFAULT_CAMERA_PRESET, presetSpan } from '@/scene/cameras/presets'
import {
  FOCUS_DURATION_MS,
  computeFocusView,
  easeInOutCubic,
  lerpView,
  type CameraView,
} from '@/scene/cameras/focus'
import { ORTHO_SPAN, focusSpan, type Projection } from '@/scene/cameras/projection'
import { createOrthoCamera, matchView, setOrthoZoom, syncCameraMatrices } from '@/scene/cameras/rig'
import { getComponentObject } from '@/scene/picking/componentObjects'
import { useViewerStore } from '@/stores/viewerStore'

interface Transition {
  from: CameraView
  to: CameraView
  start: number
}

/** Vista guardada por el primer foco: además de posición y objetivo, la proyección y su escala (como el legacy). */
interface SavedView extends CameraView {
  projection: Projection
  span: number
  zoom: number
}

/** Lo único que se usa de OrbitControls (drei lo publica como `controls` con `makeDefault`). */
interface OrbitHandle {
  target: Vector3
  object: Camera
  update: () => unknown
}

const toVec = (v: Vector3): Vec3 => [v.x, v.y, v.z]

/**
 * Órbita con límites (no baja del terreno; zoom acotado a la escala de un equipo, ~32 m de mástil) y
 * ejecución de las órdenes de cámara del store: enfocar el componente seleccionado, volver y cambiar la
 * proyección (perspectiva / ortográfica) conservando posición y objetivo.
 */
export function CameraRig() {
  const get = useThree((s) => s.get)
  const set = useThree((s) => s.set)
  const invalidate = useThree((s) => s.invalidate)
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const command = useViewerStore((s) => s.cameraCommand)
  const projection = useViewerStore((s) => s.projection)
  const setCanGoBack = useViewerStore((s) => s.setCanGoBack)
  const setProjection = useViewerStore((s) => s.setProjection)
  const transition = useRef<Transition | null>(null)
  const savedView = useRef<SavedView | null>(null)
  // Las órdenes anteriores al montaje no se repiten (el motor se desmonta al volver al V2 y se remonta).
  const lastSeq = useRef(useViewerStore.getState().cameraCommand?.seq ?? 0)

  // Los controles se quedan siempre con la cámara de perspectiva (la que crea el Canvas): drei los recrea, y
  // reinicia su objetivo, si cambia la cámara que reciben. La proyección se cambia reasignando `controls.object`,
  // como hace el legacy (`qt.object = wt`).
  const [perspective] = useState(() => get().camera as PerspectiveCamera)
  const ortho = useMemo(() => createOrthoCamera(), [])
  /** Alto del frustum ortográfico (m): 44 en la vista general, menor al enfocar un componente. */
  const span = useRef(ORTHO_SPAN)

  /** r3f solo actualiza el aspecto de la cámara activa: se sincronizan las dos a mano. */
  const syncCameras = useCallback(() => {
    syncCameraMatrices(perspective, ortho, span.current, width, height)
    invalidate()
  }, [ortho, perspective, width, height, invalidate])

  useEffect(() => syncCameras(), [syncCameras])

  // Cambio de proyección: misma posición y objetivo, otra cámara.
  useEffect(() => {
    const handle = get().controls as OrbitHandle | null
    const next = projection === 'orthographic' ? ortho : perspective
    const current = get().camera
    if (!handle || current === next) return
    const target = handle.target.clone()
    matchView(next, current, target)
    handle.object = next
    set({ camera: next })
    syncCameras()
    handle.update()
  }, [projection, ortho, perspective, get, set, syncCameras])

  useEffect(() => {
    // La cámara y los controles se leen del estado de r3f en el momento: el cambio de proyección los reemplaza.
    const { camera, controls } = get()
    const handle = controls as OrbitHandle | null
    if (!command || !handle || command.seq === lastSeq.current) return
    lastSeq.current = command.seq
    const current: CameraView = { position: toVec(camera.position), target: toVec(handle.target) }
    let goal: CameraView
    if (command.type === 'focus') {
      const object = getComponentObject(command.componentId)
      if (!object) return
      const box = new Box3().setFromObject(object)
      if (box.isEmpty()) return
      goal = computeFocusView({ min: toVec(box.min), max: toVec(box.max) }, current)
      // Como en el legacy: solo el primer foco guarda la vista; los siguientes la conservan.
      if (!savedView.current) {
        savedView.current = {
          ...current,
          projection: useViewerStore.getState().projection,
          span: span.current,
          zoom: ortho.zoom,
        }
        setCanGoBack(true)
      }
      // En ortográfica la distancia no encuadra: se ajusta el alto del frustum al tamaño del componente.
      if (useViewerStore.getState().projection === 'orthographic') {
        span.current = focusSpan(toVec(box.getSize(new Vector3())))
        setOrthoZoom(ortho, 1)
        syncCameras()
      }
    } else if (command.type === 'view') {
      // Vista estándar (como `Uh` del legacy): la proyección ya la fijó el store; acá se reinicia la escala ortográfica,
      // se descarta la vista guardada por un foco ("Volver" deja de tener a dónde volver) y se anima hasta el preset.
      const preset = CAMERA_PRESETS[command.view]
      goal = { position: [...preset.position], target: [...preset.target] }
      savedView.current = null
      setCanGoBack(false)
      span.current = presetSpan(command.view)
      setOrthoZoom(ortho, 1)
      syncCameras()
    } else {
      const saved = savedView.current
      if (!saved) return
      goal = saved
      savedView.current = null
      setCanGoBack(false)
      if (useViewerStore.getState().projection !== saved.projection) setProjection(saved.projection)
      span.current = saved.span
      setOrthoZoom(ortho, saved.zoom)
      syncCameras()
    }
    transition.current = { from: current, to: goal, start: performance.now() }
    invalidate()
  }, [command, get, ortho, invalidate, setCanGoBack, setProjection, syncCameras])

  // Si el motor nativo se desmonta, no queda un "Volver" que no puede ejecutarse.
  useEffect(() => () => setCanGoBack(false), [setCanGoBack])

  // `state` trae la cámara y los controles vigentes: con la del último render, un cambio de proyección en pleno
  // movimiento haría mover la cámara vieja.
  useFrame((state) => {
    const t = transition.current
    const handle = state.controls as OrbitHandle | null
    if (!t || !handle) return
    const k = Math.min((performance.now() - t.start) / FOCUS_DURATION_MS, 1)
    const view = lerpView(t.from, t.to, easeInOutCubic(k))
    state.camera.position.set(...view.position)
    handle.target.set(...view.target)
    handle.update()
    if (k >= 1) transition.current = null
    else invalidate()
  })

  return (
    <OrbitControls
      makeDefault
      camera={perspective}
      enableDamping
      dampingFactor={0.09}
      target={[...CAMERA_PRESETS[DEFAULT_CAMERA_PRESET].target]}
      minDistance={3}
      maxDistance={160}
      maxPolarAngle={Math.PI / 2}
    />
  )
}
