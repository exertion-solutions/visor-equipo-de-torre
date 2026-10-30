import { useLoader, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import type { Material, Mesh } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useViewerStore } from '@/stores/viewerStore'
import { addEdges, setEdgesVisible } from './edges'
import { configureGltfLoader } from './gltf'
import { enableShadows } from './shadows'

interface RigModelProps {
  /** Ruta bajo public/, p. ej. `/models/rig10/mast.glb`. Unidades: metros, Y arriba. */
  url: string
}

/** Carga un GLB/glTF del rig. Debe montarse dentro de <Suspense>. */
export function RigModel({ url }: RigModelProps) {
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const showEdges = useViewerStore((s) => s.edges)
  const gltf = useLoader(GLTFLoader, url, (loader) => configureGltfLoader(loader, gl))
  // Una vez por GLB: los meshes proyectan/reciben sombra del directionalLight y llevan sus aristas. useLoader cachea
  // `gltf`, así que no se libera nada acá.
  const edges = useMemo(() => {
    enableShadows(gltf.scene)
    return addEdges(gltf.scene)
  }, [gltf])
  const wire = useViewerStore((s) => s.wire)
  useEffect(() => {
    // Con la malla encendida las aristas se suspenden: taparían los triángulos. El botón "Aristas" conserva su estado.
    setEdgesVisible(edges, showEdges && !wire)
    invalidate()
  }, [edges, showEdges, wire, invalidate])
  // Malla: wireframe en los materiales de este GLB. Reversible: solo cambia esa propiedad, nada más del material.
  useEffect(() => {
    gltf.scene.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const m = material as Material & { wireframe?: boolean }
        if (m.wireframe !== undefined && m.wireframe !== wire) {
          m.wireframe = wire
          m.needsUpdate = true
        }
      }
    })
    invalidate()
  }, [gltf, wire, invalidate])
  return <primitive object={gltf.scene} />
}
