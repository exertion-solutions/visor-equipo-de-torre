import type { Vec3 } from '@/lib/geometry'
import data from './rig10-viewpoints.json'

/**
 * Recorrido en primera persona del equipo 10 (`rig10-viewpoints.json`, la misma fuente del visor V2): sectores a los que se va
 * ("Ir a equipo"), recorrido guiado y datos de la caminata.
 *
 * Es una herramienta VISUAL: las posiciones de cámara son una elección visual (2–4 m del equipo), no puestos de trabajo ni
 * distancias de seguridad, y no hay zonas de exclusión documentadas que respetar. Las fichas de riesgos, EPP y controles son
 * referencia genérica pendiente de validación y se muestran como tales.
 */
export interface ViewpointFicha {
  funcion?: string
  riesgos?: string
  EPP?: string
  controles?: string
}

export type ViewpointFloor = 'terreno' | 'pisoTrabajo' | 'pisoEnganche'

export interface Viewpoint {
  id: string
  nombre: string
  /** Prefijos de nombre de los nodos del modelo que pertenecen al sector (los del V2). */
  objeto3D: readonly string[]
  piso: ViewpointFloor
  camPos: Vec3
  target: Vec3
  fov: number
  ficha?: ViewpointFicha
}

export interface ViewpointsData {
  aviso: string
  alturaOjos: number
  pisos: Record<ViewpointFloor, { cota: number; fuente: string }>
  /** Vallado de la locación en planta: [x, z] mínimo y máximo (m). */
  locacion: { min: readonly [number, number]; max: readonly [number, number] }
  caminata: { velocidad: number; radio: number }
  transicion: { ms: number }
  recorrido: { paradas: readonly string[]; segundosPorParada: number }
  viewpoints: readonly Viewpoint[]
}

export const RIG10_VIEWPOINTS = data as unknown as ViewpointsData

/**
 * Componentes nativos que se resaltan en cada sector. Los nodos que en el V2 eran otra pieza (`sk575_cabina`, `sk575_motor`,
 * `sk575_enganche`) son subnodos de un componente nativo: se resalta el componente que los contiene. Sin componente (acceso)
 * no se resalta nada.
 */
export const VIEWPOINT_COMPONENTS: Readonly<Record<string, readonly string[]>> = {
  acceso: [],
  acumulador: ['sk575_acumulador'],
  manifold: ['sk575_manifold'],
  bop: ['sk575_bop'],
  'piso-trabajo': ['sk575_piso'],
  llave: ['sk575_llave'],
  'piso-enganche': ['sk575_mastil'],
  cuadro: ['sk575_cuadro'],
  planchada: ['sk575_planchada', 'sk575_tiros'],
  bomba: ['sk575_bomba'],
  piletas: ['sk575_piletas'],
  carrier: ['sk575_carrier'],
  mastil: ['sk575_mastil', 'sk575_izaje', 'sk575_vientos'],
  'pozo-vecino': ['sk575_pozo_vecino'],
}
