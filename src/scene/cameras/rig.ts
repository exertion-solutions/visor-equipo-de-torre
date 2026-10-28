import { OrthographicCamera, type Camera, type PerspectiveCamera, type Vector3 } from 'three'
import { ORTHO_FAR, ORTHO_NEAR, orthoFrustum } from './projection'

/**
 * Operaciones sobre las cámaras del visor nativo, fuera de React: el componente las llama, no las muta él
 * (las reglas de inmutabilidad de React no admiten modificar objetos de three creados en un hook).
 */

/**
 * Cámara ortográfica del visor. Se marca `manual`: r3f no toca el frustum de esas cámaras (lo fijaría en píxeles);
 * acá se calcula con `orthoFrustum`.
 */
export function createOrthoCamera(): OrthographicCamera {
  const camera = new OrthographicCamera(-1, 1, 1, -1, ORTHO_NEAR, ORTHO_FAR)
  Object.assign(camera, { manual: true })
  return camera
}

/**
 * Frustum de la ortográfica (alto `span`, aspecto del canvas) y aspecto de la de perspectiva. r3f solo actualiza la
 * cámara activa, así que cada una puede quedar desactualizada tras un redimensionado mientras estaba inactiva.
 */
export function syncCameraMatrices(
  perspective: PerspectiveCamera,
  ortho: OrthographicCamera,
  span: number,
  width: number,
  height: number,
): void {
  const f = orthoFrustum(span, width, height)
  ortho.left = f.left
  ortho.right = f.right
  ortho.top = f.top
  ortho.bottom = f.bottom
  ortho.updateProjectionMatrix()
  perspective.aspect = width / Math.max(1, height)
  perspective.updateProjectionMatrix()
}

/** Zoom de la ortográfica (el de OrbitControls en ortográfica; 1 = el alto del frustum). */
export function setOrthoZoom(ortho: OrthographicCamera, zoom: number): void {
  ortho.zoom = zoom
  ortho.updateProjectionMatrix()
}

/** `next` toma la posición de `current` y mira a `target`: el encuadre no se desplaza al cambiar de proyección. */
export function matchView(next: Camera, current: Camera, target: Vector3): void {
  next.position.copy(current.position)
  next.lookAt(target)
}
