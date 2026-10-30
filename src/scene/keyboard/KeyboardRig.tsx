import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Vector3, type OrthographicCamera } from 'three'
import type { Vec3 } from '@/lib/geometry'
import {
  keyAction,
  orbitTilt,
  orbitYaw,
  panStep,
  zoomDistance,
  zoomOrtho,
} from '@/scene/cameras/keyboard'
import { useViewerStore } from '@/stores/viewerStore'

export const CANVAS_LABEL =
  'Modelo 3D del equipo. Flechas: girar e inclinar · Mayús + flechas: desplazar · + y −: zoom · ?: atajos'

interface OrbitHandle {
  target: Vector3
  enabled: boolean
  update: () => unknown
}

const right = new Vector3()
const up = new Vector3()

/**
 * Manejo del modelo con teclado (equivale a `72-teclado` del V2): el lienzo recibe foco con Tab o con un clic y, con el foco,
 * las flechas giran e inclinan, Mayús + flechas desplazan, + y − hacen zoom, `?` o `H` abren la ayuda y Esc la cierra. Mueve la
 * misma cámara y el mismo objetivo que el mouse, así que el resto de las herramientas no nota la diferencia. Con los controles
 * apagados (la caminata) las flechas son de la caminata y esto no hace nada.
 */
export function KeyboardRig() {
  const get = useThree((s) => s.get)

  useEffect(() => {
    const canvas = get().gl.domElement
    canvas.tabIndex = 0
    canvas.setAttribute('role', 'application')
    canvas.setAttribute('aria-label', CANVAS_LABEL)

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const { camera, controls, invalidate } = get()
      const handle = controls as unknown as OrbitHandle | null
      if (!handle || handle.enabled === false) return
      const action = keyAction(e.key, e.shiftKey)
      if (!action) return
      const { helpOpen, setHelpOpen } = useViewerStore.getState()
      if (action.type === 'close' && !helpOpen) return // Esc sin ayuda abierta: lo toma quien deselecciona
      e.preventDefault()
      e.stopPropagation()
      const pos: Vec3 = [camera.position.x, camera.position.y, camera.position.z]
      const target: Vec3 = [handle.target.x, handle.target.y, handle.target.z]
      if (action.type === 'help') setHelpOpen(!helpOpen)
      else if (action.type === 'close') setHelpOpen(false)
      else if (action.type === 'yaw') camera.position.set(...orbitYaw(pos, target, action.deg))
      else if (action.type === 'tilt') camera.position.set(...orbitTilt(pos, target, action.deg))
      else if (action.type === 'pan') {
        const ortho = camera as OrthographicCamera
        const step = panStep(
          camera.position.distanceTo(handle.target),
          ortho.zoom,
          !!ortho.isOrthographicCamera,
        )
        right.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(action.dx * step)
        up.setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(action.dy * step)
        const d = right.add(up)
        camera.position.add(d)
        handle.target.add(d)
      } else if (action.type === 'zoom') {
        const ortho = camera as OrthographicCamera
        if (ortho.isOrthographicCamera) {
          ortho.zoom = zoomOrtho(ortho.zoom, action.factor)
          ortho.updateProjectionMatrix()
        } else {
          const off = camera.position.clone().sub(handle.target)
          const len = zoomDistance(off.length(), action.factor)
          camera.position.copy(handle.target).add(off.setLength(len))
        }
      }
      handle.update()
      invalidate()
    }
    // El clic en el lienzo le da el foco: así los atajos andan después de orbitar con el mouse.
    const focus = () => canvas.focus({ preventScroll: true })
    canvas.addEventListener('keydown', onKey)
    canvas.addEventListener('pointerdown', focus)
    return () => {
      canvas.removeEventListener('keydown', onKey)
      canvas.removeEventListener('pointerdown', focus)
    }
  }, [get])

  return null
}
