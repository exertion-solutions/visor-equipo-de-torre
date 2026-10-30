import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Raycaster, Vector3, type Mesh, type Object3D, type PerspectiveCamera } from 'three'
import { RIG10_VIEWPOINTS } from '@/data/viewpoints/rig10-viewpoints'
import {
  clampToFence,
  EYE_HEIGHT,
  lookPoint,
  MAX_PITCH,
  MOUSE_SENSITIVITY,
  slide,
  stepSeconds,
  TURN_SPEED,
  walkDelta,
  WALK_RADIUS,
  yawOf,
} from '@/lib/walk'
import { getComponentObject, registeredComponentIds } from '@/scene/picking/componentObjects'
import { useTourStore } from '@/stores/tourStore'

/** Estado de la caminata (fuera de React: cambia en cada cuadro). */
const walk = { yaw: 0, pitch: 0, last: 0, locked: false }
const keys = new Set<string>()
const MOVE_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])
/** Componentes que no estorban: son huellas planas sobre el terreno, no volúmenes. */
const FLAT = new Set(['layout_locacion', 'carrier_huella'])

const raycaster = new Raycaster()
raycaster.params.Line = { threshold: 0 }
const origin = new Vector3()
const direction = new Vector3()

const visible = (o: Object3D) => {
  for (let n: Object3D | null = o; n; n = n.parent) if (!n.visible) return false
  return true
}

/**
 * ¿Se puede dar el paso? Tres rayos horizontales (centro y a ±radio, el ancho del caminante) a 0,40 y 1,20 m contra los
 * volúmenes visibles: con uno solo, al rozar el canto de un equipo el rayo pasaba por una rendija y se lo atravesaba.
 */
function free(x: number, z: number, dx: number, dz: number): boolean {
  const length = Math.hypot(dx, dz)
  if (length === 0) return true
  direction.set(dx / length, 0, dz / length)
  raycaster.near = 0
  raycaster.far = length + WALK_RADIUS
  const px = -direction.z * WALK_RADIUS
  const pz = direction.x * WALK_RADIUS
  const solids = registeredComponentIds()
    .filter((id) => !FLAT.has(id))
    .map((id) => getComponentObject(id))
    .filter((o): o is Object3D => !!o && visible(o))
  for (const h of [0.4, 1.2])
    for (const k of [-1, 0, 1]) {
      origin.set(x + k * px, h, z + k * pz)
      raycaster.set(origin, direction)
      if (
        raycaster
          .intersectObjects(solids, true)
          .some((i) => (i.object as Mesh).isMesh && visible(i.object))
      )
        return false
    }
  return true
}

interface OrbitHandle {
  target: Vector3
  enabled: boolean
  update: () => unknown
}

/**
 * Modo caminata en primera persona (equivale al de `87-recorridos`): ojos a 1,70 m, 1,4 m/s, W A S D o flechas, mouse para mirar
 * (con el puntero capturado; sin Pointer Lock se camina con el teclado), colisión con los equipos y sin salir del vallado. Esc sale.
 * Es una herramienta visual: no hay zonas de exclusión documentadas que respetar.
 */
export function WalkRig() {
  const get = useThree((s) => s.get)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    let active = false
    const canvas = get().gl.domElement

    const start = () => {
      const { camera, controls } = get()
      const handle = controls as unknown as OrbitHandle | null
      if (!handle || active) return
      active = true
      const d = handle.target.clone().sub(camera.position)
      walk.yaw = yawOf(d.x, d.z)
      walk.pitch = 0
      walk.last = performance.now()
      walk.locked = false
      handle.enabled = false
      keys.clear()
      document.body.classList.add('rig-walking')
      try {
        const r = canvas.requestPointerLock() as unknown as Promise<void> | undefined
        r?.catch?.(() => {})
      } catch {
        /* sin Pointer Lock (iframe, pruebas sin cabeza): se camina con el teclado */
      }
      invalidate()
    }
    const stop = () => {
      if (!active) return
      active = false
      const { camera, controls } = get()
      const handle = controls as unknown as OrbitHandle | null
      keys.clear()
      document.body.classList.remove('rig-walking')
      if (handle) {
        const p: [number, number, number] = [
          camera.position.x,
          camera.position.y,
          camera.position.z,
        ]
        handle.target.set(...lookPoint(p, walk.yaw, walk.pitch, 4))
        handle.enabled = true
        handle.update()
      }
      if (document.pointerLockElement === canvas) document.exitPointerLock()
      invalidate()
    }
    const sync = () => (useTourStore.getState().walking ? start() : stop())

    const onKeyDown = (e: KeyboardEvent) => {
      if (!active) return
      if (e.key === 'Escape') {
        e.preventDefault()
        useTourStore.getState().stopWalk()
        return
      }
      const target = e.target as HTMLElement | null
      if (!MOVE_KEYS.has(e.code) || (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))
        return
      keys.add(e.code)
      e.preventDefault()
      e.stopPropagation()
      invalidate()
    }
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code)
    const onMouse = (e: MouseEvent) => {
      if (!active || document.pointerLockElement !== canvas) return
      walk.yaw -= e.movementX * MOUSE_SENSITIVITY
      walk.pitch = Math.min(
        MAX_PITCH,
        Math.max(-MAX_PITCH, walk.pitch - e.movementY * MOUSE_SENSITIVITY),
      )
    }
    const onLock = () => {
      if (!active) return
      if (document.pointerLockElement === canvas) walk.locked = true
      else if (walk.locked) useTourStore.getState().stopWalk() // Esc suelta el puntero: sale del modo
    }
    const clear = () => keys.clear()

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clear)
    document.addEventListener('mousemove', onMouse)
    document.addEventListener('pointerlockchange', onLock)
    const unsubscribe = useTourStore.subscribe((s, prev) => {
      if (s.walking !== prev.walking) sync()
    })
    sync()
    return () => {
      unsubscribe()
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clear)
      document.removeEventListener('mousemove', onMouse)
      document.removeEventListener('pointerlockchange', onLock)
      stop()
    }
  }, [get, invalidate])

  useFrame(({ camera, controls }) => {
    const handle = controls as unknown as OrbitHandle | null
    if (!useTourStore.getState().walking || !handle || handle.enabled) return
    const now = performance.now()
    const dt = stepSeconds(now, walk.last)
    walk.last = now
    const forward =
      (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
      (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0)
    const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0)
    const turn = (keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0)
    if (turn) walk.yaw += turn * TURN_SPEED * dt
    if (forward || strafe) {
      const [dx0, dz0] = walkDelta(walk.yaw, forward, strafe, dt)
      const { x, z } = camera.position
      const [dx, dz] = slide(x, z, dx0, dz0, free)
      const [nx, nz] = clampToFence(x + dx, z + dz, RIG10_VIEWPOINTS.locacion)
      camera.position.set(nx, EYE_HEIGHT, nz)
    }
    const p: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z]
    handle.target.set(...lookPoint(p, walk.yaw, walk.pitch, 1))
    ;(camera as PerspectiveCamera).lookAt(handle.target)
    invalidate()
  })

  return null
}
