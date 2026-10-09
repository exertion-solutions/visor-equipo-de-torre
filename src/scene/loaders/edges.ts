import { EdgesGeometry, LineBasicMaterial, LineSegments, type Mesh, type Object3D } from 'three'

/** Ángulo entre caras (°) a partir del cual se dibuja arista: el mismo que el visor CAD de referencia (~/cad/visor.py). */
export const EDGE_ANGLE = 28

const material = new LineBasicMaterial({ color: '#0b0d10', transparent: true, opacity: 0.55 })

/**
 * "Sombreado con aristas" (como AutoCAD/SolidWorks): agrega a cada Mesh un LineSegments hijo con sus aristas vivas.
 * Las líneas no participan del picking ni del contorno (no son Mesh). Idempotente. Devuelve todas las líneas del árbol.
 */
export function addEdges(root: Object3D, angle = EDGE_ANGLE): LineSegments[] {
  const meshes: Mesh[] = []
  root.traverse((obj) => {
    if ((obj as Mesh).isMesh) meshes.push(obj as Mesh)
  })
  return meshes.map((mesh) => {
    const prev = mesh.children.find((c) => c.userData.edges) as LineSegments | undefined
    if (prev) return prev
    const lines = new LineSegments(new EdgesGeometry(mesh.geometry, angle), material)
    lines.userData.edges = true
    lines.raycast = () => {}
    mesh.add(lines)
    return lines
  })
}

/** Muestra u oculta las aristas que devolvió `addEdges`. */
export function setEdgesVisible(lines: readonly LineSegments[], visible: boolean): void {
  for (const l of lines) l.visible = visible
}
