import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box3, Vector3, type Camera, type PerspectiveCamera } from 'three'
import { clampToFence, EYE_HEIGHT, lookPoint } from '@/lib/walk'
import { flightArc, flightPosition } from '@/lib/viewpoints'
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
import {
  createOrthoCamera,
  matchView,
  setFov,
  setOrthoZoom,
  syncCameraMatrices,
} from '@/scene/cameras/rig'
import { getComponentObject } from '@/scene/picking/componentObjects'
import { useViewerStore } from '@/stores/viewerStore'

interface Transition {
  from: CameraView
  to: CameraView
  start: number
  /** Duración (ms); la de las vistas estándar y el foco, o la del vuelo a un sector. */
  duration: number
  /** Arco vertical del vuelo (m); 0 en las vistas estándar. */
  arc: number
  /** Campo de visión inicial y final de un vuelo a un sector. */
  fov?: { from: number; to: number }
  /** Al terminar: se devuelven los límites de la órbita (los relaja la primera persona). */
  restoreLimits?: boolean
}

/** Vista guardada por el primer foco: además de posición y objetivo, la proyección y su escala (como el legacy). */
interface SavedView extends CameraView {
  projection: Projection
  span: number
  zoom: number
  fov: number
}

/** Lo único que se usa de OrbitControls (drei lo publica como `controls` con `makeDefault`). */
interface OrbitHandle {
  target: Vector3
  object: Camera
  update: () => unknown
  minDistance: number
  maxPolarAngle: number
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
  /** Límites de la órbita antes de relajarlos para la primera persona (acercarse a menos de 3 m, mirar hacia arriba). */
  const limits = useRef<{ min: number; polar: number } | null>(null)
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

  /** Guarda la vista previa la primera vez que un foco o un sector toma la cámara: "Volver" regresa a ella. */
  const saveView = useCallback(
    (current: CameraView) => {
      if (savedView.current) return
      savedView.current = {
        ...current,
        projection: useViewerStore.getState().projection,
        span: span.current,
        zoom: ortho.zoom,
        fov: perspective.fov,
      }
      setCanGoBack(true)
    },
    [ortho, perspective, setCanGoBack],
  )

  useEffect(() => {
    // La cámara y los controles se leen del estado de r3f en el momento: el cambio de proyección los reemplaza.
    const { camera, controls } = get()
    const handle = controls as OrbitHandle | null
    if (!command || !handle || command.seq === lastSeq.current) return
    lastSeq.current = command.seq
    const current: CameraView = { position: toVec(camera.position), target: toVec(handle.target) }
    const restoreLimits = () => {
      if (!limits.current) return
      handle.minDistance = limits.current.min
      handle.maxPolarAngle = limits.current.polar
      limits.current = null
    }
    let goal: CameraView
    let duration = FOCUS_DURATION_MS
    let arc = 0
    let fov: Transition['fov']
    let restoreAtEnd = false
    if (command.type === 'viewpoint' || command.type === 'walk') {
      // Primera persona: perspectiva, y la órbita sin sus límites (se mira hacia arriba y se está a menos de 3 m del objetivo).
      saveView(current)
      if (!limits.current) limits.current = { min: handle.minDistance, polar: handle.maxPolarAngle }
      handle.minDistance = 0.1
      handle.maxPolarAngle = Math.PI - 0.05
      if (useViewerStore.getState().projection === 'orthographic') setProjection('perspective')
      if (command.type === 'viewpoint') {
        goal = { position: command.position, target: command.target }
        duration = command.ms
        arc = flightArc(
          Math.hypot(...current.position.map((v, i) => v - command.position[i]!)),
          command.ms,
        )
        fov = { from: perspective.fov, to: command.fov }
      } else {
        const [x, z] = clampToFence(current.position[0], current.position[2], command.fence)
        const yaw = Math.atan2(
          current.target[0] - current.position[0],
          current.target[2] - current.position[2],
        )
        const position: Vec3 = [x, EYE_HEIGHT, z]
        goal = { position, target: lookPoint(position, yaw, 0, 4) }
        duration = 0
        fov = { from: perspective.fov, to: 60 }
      }
    } else if (command.type === 'focus') {
      restoreLimits()
      const object = getComponentObject(command.componentId)
      if (!object) return
      const box = new Box3().setFromObject(object)
      if (box.isEmpty()) return
      goal = computeFocusView({ min: toVec(box.min), max: toVec(box.max) }, current)
      // Como en el legacy: solo el primer foco guarda la vista; los siguientes la conservan.
      saveView(current)
      // En ortográfica la distancia no encuadra: se ajusta el alto del frustum al tamaño del componente.
      if (useViewerStore.getState().projection === 'orthographic') {
        span.current = focusSpan(toVec(box.getSize(new Vector3())))
        setOrthoZoom(ortho, 1)
        syncCameras()
      }
    } else if (command.type === 'view') {
      // Vista estándar (como `Uh` del legacy): la proyección ya la fijó el store; acá se reinicia la escala ortográfica,
      // se descarta la vista guardada por un foco ("Volver" deja de tener a dónde volver) y se anima hasta el preset.
      restoreLimits()
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
      fov = { from: perspective.fov, to: saved.fov }
      // El vuelo de vuelta arranca desde un punto que los límites normales no admiten: se devuelven al terminar.
      restoreAtEnd = limits.current !== null
    }
    if (duration === 0) {
      // Salto: se aplica ya (sin animar).
      camera.position.set(...goal.position)
      handle.target.set(...goal.target)
      if (fov) {
        setFov(perspective, fov.to)
      }
      handle.update()
      transition.current = null
    } else {
      transition.current = {
        from: current,
        to: goal,
        start: performance.now(),
        duration,
        arc,
        fov,
        restoreLimits: restoreAtEnd,
      }
    }
    invalidate()
  }, [
    command,
    get,
    ortho,
    perspective,
    invalidate,
    saveView,
    setCanGoBack,
    setProjection,
    syncCameras,
  ])

  // Si el motor nativo se desmonta, no queda un "Volver" que no puede ejecutarse.
  useEffect(() => () => setCanGoBack(false), [setCanGoBack])

  // `state` trae la cámara y los controles vigentes: con la del último render, un cambio de proyección en pleno
  // movimiento haría mover la cámara vieja.
  useFrame((state) => {
    const t = transition.current
    const handle = state.controls as OrbitHandle | null
    if (!t || !handle) return
    const k = Math.min((performance.now() - t.start) / t.duration, 1)
    const e = easeInOutCubic(k)
    const view = lerpView(t.from, t.to, e)
    state.camera.position.set(
      ...(t.arc ? flightPosition(t.from.position, t.to.position, e, t.arc) : view.position),
    )
    handle.target.set(...view.target)
    if (t.fov && (state.camera as PerspectiveCamera).isPerspectiveCamera) {
      setFov(state.camera as PerspectiveCamera, t.fov.from + (t.fov.to - t.fov.from) * e)
    }
    handle.update()
    if (k >= 1) {
      transition.current = null
      if (t.restoreLimits && limits.current) {
        handle.minDistance = limits.current.min
        handle.maxPolarAngle = limits.current.polar
        limits.current = null
        handle.update()
      }
    } else invalidate()
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
