import { Scene, type Line, type Object3D } from 'three'
import { SITE_URL } from '@/lib/capture'
import { getComponentObject, registeredComponentIds } from '@/scene/picking/componentObjects'

/** Nombre del archivo, el del V2. */
export const GLB_FILE_NAME = 'RIG10_Modelo_Aproximado.glb'

/** Lo que viaja dentro del archivo (`scene.extras`): el aviso de que no es as-built no se pierde al abrirlo en otro visor. */
export const GLB_EXTRAS = {
  aviso:
    'Referencia digital, no as-built: geometría aproximada, no apta para fabricación, cálculo ni validación de seguridad.',
  origen: SITE_URL,
  marco: '1 unidad = 1 m, eje Y arriba; origen: boca de pozo a nivel de terreno; carrier hacia −X',
  pose: 'Equipo armado (sin despiece) y aparejo en reposo (14 m)',
} as const

/**
 * Copia de cada componente de la escena, con su id como nombre de nodo, lista para exportar: todo visible (aunque esté oculto o
 * aislado), sin despiece y con el aparejo en reposo, y solo con mallas de triángulos: se quitan todas las líneas (las aristas que
 * agrega el visor y las `*_arista` que traen los GLB, que se derivan de la malla), como el GLB del V2. Los materiales se comparten
 * con la escena: el exportador solo los lee.
 */
export function buildExportScene(): Scene {
  const root = new Scene()
  root.name = 'DIGITAL_RIG_Equipo10'
  root.userData = { ...GLB_EXTRAS }
  for (const id of registeredComponentIds()) {
    const source = getComponentObject(id)
    if (!source) continue
    const copy: Object3D = source.clone(true)
    copy.name = id
    copy.visible = true
    const edges: Object3D[] = []
    copy.traverse((o) => {
      if (o.userData.edges || (o as Line).isLine) edges.push(o)
      else o.visible = true
      // Despiece fuera y aparejo en reposo: la posición de una pieza no depende de lo que se estaba mirando.
      if (o.name.startsWith('explode_')) o.position.set(0, 0, 0)
      if (o.userData.hoist) {
        o.position.set(0, 0, 0)
        o.scale.set(1, 1, 1)
      }
    })
    for (const e of edges) e.removeFromParent()
    root.add(copy)
  }
  return root
}

/** GLB binario de todo el equipo. El exportador se carga recién al exportar: no pesa en el arranque. */
export async function exportRigGlb(): Promise<Blob> {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
  const scene = buildExportScene()
  const buffer = (await new GLTFExporter().parseAsync(scene, {
    binary: true,
    onlyVisible: false,
  })) as ArrayBuffer
  return new Blob([buffer], { type: 'model/gltf-binary' })
}
