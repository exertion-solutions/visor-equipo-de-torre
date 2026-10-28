import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Box3, Raycaster, Vector2, Vector3, type Object3D } from 'three'
import { getComponentObject, registeredComponentIds } from '@/scene/picking/componentObjects'
import { useViewerStore } from '@/stores/viewerStore'

/**
 * Sonda para pruebas e2e del motor nativo (`e2e/nativo.e2e.mjs`), como los `window.__rig*` del V2: solo lectura,
 * solo en desarrollo (`import.meta.env.DEV`; en el build de producción no existe) y sin efectos sobre la escena.
 */
export interface NativeProbeState {
  camara: {
    tipo: string
    posicion: number[]
    objetivo: number[]
    zoom: number
    aspecto: number | null
    /** Frustum de la ortográfica; `null` en perspectiva. */
    frustum: { left: number; right: number; top: number; bottom: number } | null
  }
  lienzo: { ancho: number; alto: number }
  tienda: {
    seleccionado: string | null
    hover: string | null
    ocultos: readonly string[]
    aislado: boolean
    proyeccion: string
    puedeVolver: boolean
  }
  /** Ids de los componentes montados y, de ellos, los que se dibujan (`visible`). */
  componentes: string[]
  visibles: string[]
  /** Cuadros que renderizó three (con `frameloop="demand"` no avanza mientras la escena está quieta). */
  cuadros: number
}

export interface NativeProbeApi {
  estado: () => NativeProbeState
  /** Centro y tamaño (m) de la caja de cada componente, en coordenadas de escena. */
  cajas: () => Record<string, { centro: number[]; tamano: number[] }>
  /**
   * Punto del lienzo (coordenadas de cliente) donde un clic selecciona ese componente: el primer punto de una grilla
   * sobre su caja proyectada cuyo primer impacto del raycast es el propio componente y sin otro componente a la misma
   * distancia (geometría coincidente), también a ±2 px (el mouse real cae en píxeles enteros). `null` si no hay.
   */
  puntoClicable: (id: string) => { x: number; y: number } | null
}

declare global {
  interface Window {
    __rigNativo?: NativeProbeApi
  }
}

const arr = (v: Vector3) => [v.x, v.y, v.z]

export function NativeProbe() {
  const get = useThree((s) => s.get)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const api: NativeProbeApi = {
      estado: () => {
        const { camera, controls, size, gl } = get()
        const orto = camera as typeof camera & {
          isOrthographicCamera?: boolean
          left?: number
          right?: number
          top?: number
          bottom?: number
          aspect?: number
        }
        const s = useViewerStore.getState()
        const ids = registeredComponentIds()
        const target = (controls as unknown as { target: Vector3 }).target
        return {
          camara: {
            tipo: camera.type,
            posicion: arr(camera.position),
            objetivo: arr(target),
            zoom: (camera as { zoom?: number }).zoom ?? 1,
            aspecto: orto.aspect ?? null,
            frustum: orto.isOrthographicCamera
              ? {
                  left: orto.left ?? 0,
                  right: orto.right ?? 0,
                  top: orto.top ?? 0,
                  bottom: orto.bottom ?? 0,
                }
              : null,
          },
          lienzo: { ancho: size.width, alto: size.height },
          tienda: {
            seleccionado: s.selectedComponentId,
            hover: s.hoveredComponentId,
            ocultos: s.hiddenComponentIds,
            aislado: s.isolationSnapshot !== null,
            proyeccion: s.projection,
            puedeVolver: s.canGoBack,
          },
          componentes: ids,
          visibles: ids.filter((id) => getComponentObject(id)?.visible),
          cuadros: gl.info.render.frame,
        }
      },
      cajas: () => {
        const out: Record<string, { centro: number[]; tamano: number[] }> = {}
        for (const id of registeredComponentIds()) {
          const object = getComponentObject(id)
          if (!object) continue
          const box = new Box3().setFromObject(object)
          out[id] = {
            centro: arr(box.getCenter(new Vector3())),
            tamano: arr(box.getSize(new Vector3())),
          }
        }
        return out
      },
      puntoClicable: (id) => {
        const { camera, scene, gl } = get()
        const object = getComponentObject(id)
        if (!object) return null
        camera.updateMatrixWorld(true)
        const box = new Box3().setFromObject(object)
        // Caja proyectada → rectángulo en NDC.
        const corners = [0, 1].flatMap((x) =>
          [0, 1].flatMap((y) =>
            [0, 1].map((z) =>
              new Vector3(
                x ? box.max.x : box.min.x,
                y ? box.max.y : box.min.y,
                z ? box.max.z : box.min.z,
              ).project(camera),
            ),
          ),
        )
        const x0 = Math.max(-1, Math.min(...corners.map((c) => c.x)))
        const x1 = Math.min(1, Math.max(...corners.map((c) => c.x)))
        const y0 = Math.max(-1, Math.min(...corners.map((c) => c.y)))
        const y1 = Math.min(1, Math.max(...corners.map((c) => c.y)))
        const ray = new Raycaster()
        const ids = registeredComponentIds()
        const roots = ids.flatMap((cid) => {
          const o = getComponentObject(cid)
          return o && o.visible ? [o] : []
        })
        const ownerOf = (start: Object3D) => {
          for (let o: Object3D | null = start; o && o !== scene; o = o.parent) {
            const found = ids.find((cid) => getComponentObject(cid) === o)
            if (found) return found
          }
          return undefined
        }
        const rect = gl.domElement.getBoundingClientRect()
        // ¿El primer impacto del rayo en `ndc` es `id` y sin otro componente a la misma distancia? Con geometría
        // coincidente el clic y el hover pueden resolverla distinto: ese punto es ambiguo.
        const resuelveA = (ndc: Vector2) => {
          ray.setFromCamera(ndc, camera)
          const hits = ray.intersectObjects(roots, true)
          const first = hits[0]
          if (!first || ownerOf(first.object) !== id) return false
          return !hits.some(
            (h) =>
              h !== first &&
              ownerOf(h.object) !== id &&
              Math.abs(h.distance - first.distance) < 1e-3,
          )
        }
        // El mouse real cae en píxeles enteros: el punto tiene que resistir ±2 px, no solo el centro exacto.
        const dx = 4 / rect.width
        const dy = 4 / rect.height
        const N = 40
        for (let i = 0; i <= N; i++) {
          for (let j = 0; j <= N; j++) {
            const ndc = new Vector2(x0 + ((x1 - x0) * i) / N, y0 + ((y1 - y0) * j) / N)
            const vecinos = [
              ndc,
              new Vector2(ndc.x + dx, ndc.y),
              new Vector2(ndc.x - dx, ndc.y),
              new Vector2(ndc.x, ndc.y + dy),
              new Vector2(ndc.x, ndc.y - dy),
            ]
            if (!vecinos.every(resuelveA)) continue
            return {
              x: rect.left + ((ndc.x + 1) / 2) * rect.width,
              y: rect.top + ((1 - ndc.y) / 2) * rect.height,
            }
          }
        }
        return null
      },
    }
    window.__rigNativo = api
    return () => {
      delete window.__rigNativo
    }
  }, [get])

  return null
}
