import {
  BufferGeometry,
  EdgesGeometry,
  Float32BufferAttribute,
  Matrix3,
  Vector3,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
} from 'three'
import { EDGE_ANGLE } from './edges'

/**
 * Modelo SK-575 de referencia (public/models/tacker10/sk575_*.glb) para la Capa CAD del visor V2 (legacy-ext/77-capa-cad.js).
 * El V2 trae su propio three minificado (sin GLTFLoader ni Meshopt) y corre en un iframe de origen opaco: la app carga los GLB
 * y le manda por postMessage datos planos (arrays transferibles), ya en coordenadas de mundo (origen boca de pozo, Y arriba).
 */
export const SK575_GLBS = [
  'acumulador',
  'aparejo',
  'bomba',
  'bop',
  'carrier',
  'cuadro',
  'izaje',
  'llave',
  'manifold',
  'mastil',
  'piletas',
  'piso',
  'planchada',
  'pozo_vecino',
  'tiros',
  'vientos',
].map((id) => `sk575_${id}`)

export interface CadMeshData {
  component: string
  name: string
  position: Float32Array
  normal: Float32Array
  index: Uint32Array | null
  /** Aristas vivas (EdgesGeometry, mismo umbral que el visor CAD de referencia), pares de puntos en mundo. */
  edges: Float32Array
  /** Factores PBR en espacio lineal (como los guarda three). */
  color: [number, number, number]
  metalness: number
  roughness: number
  emissive: [number, number, number]
}

/** Aplana cada Mesh de `root` a datos planos en mundo (dequantiza KHR_mesh_quantization vía fromBufferAttribute). */
export function extractCadMeshes(root: Object3D, component: string, edgeAngle = EDGE_ANGLE): CadMeshData[] {
  root.updateMatrixWorld(true)
  const out: CadMeshData[] = []
  const v = new Vector3()
  const nm = new Matrix3()
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    const src = mesh.geometry
    const pos = src.getAttribute('position')
    const position = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
      position.set([v.x, v.y, v.z], i * 3)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(position, 3))
    const index = src.index ? Uint32Array.from({ length: src.index.count }, (_, i) => src.index!.getX(i)) : null
    if (index) geo.setIndex(Array.from(index))

    const nrm = src.getAttribute('normal')
    let normal: Float32Array
    if (nrm) {
      nm.getNormalMatrix(mesh.matrixWorld)
      normal = new Float32Array(nrm.count * 3)
      for (let i = 0; i < nrm.count; i++) {
        v.fromBufferAttribute(nrm, i).applyMatrix3(nm).normalize()
        normal.set([v.x, v.y, v.z], i * 3)
      }
    } else {
      geo.computeVertexNormals()
      normal = geo.getAttribute('normal').array as Float32Array
    }

    const edgesGeo = new EdgesGeometry(geo, edgeAngle)
    const edges = edgesGeo.getAttribute('position').array as Float32Array
    edgesGeo.dispose()
    geo.dispose()

    const m = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as Material &
      Partial<MeshStandardMaterial>
    out.push({
      component,
      name: mesh.name,
      position,
      normal,
      index,
      edges,
      color: m.color ? [m.color.r, m.color.g, m.color.b] : [0.6, 0.6, 0.6],
      metalness: m.metalness ?? 0,
      roughness: m.roughness ?? 1,
      emissive: m.emissive ? [m.emissive.r, m.emissive.g, m.emissive.b] : [0, 0, 0],
    })
  })
  return out
}

/** Arrays a transferir en el postMessage (evita copiar ~MB). */
export function cadTransferables(meshes: readonly CadMeshData[]): ArrayBuffer[] {
  return meshes.flatMap((m) =>
    [m.position, m.normal, m.index, m.edges].flatMap((a) => (a ? [a.buffer as ArrayBuffer] : [])),
  )
}

/** Carga los 16 GLB del SK-575 (Meshopt; sin texturas, así que no hace falta renderer ni KTX2). */
export async function loadSk575CadMeshes(baseUrl: string): Promise<CadMeshData[]> {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ])
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const scenes = await Promise.all(
    SK575_GLBS.map((id) => loader.loadAsync(`${baseUrl}models/tacker10/${id}.glb`).then((g) => [id, g.scene] as const)),
  )
  return scenes.flatMap(([id, scene]) => extractCadMeshes(scene, id))
}
