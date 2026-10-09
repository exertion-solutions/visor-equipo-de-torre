import { useLoader, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useViewerStore } from '@/stores/viewerStore'
import { addEdges, setEdgesVisible } from './edges'
import { configureGltfLoader } from './gltf'
import { enableShadows } from './shadows'

interface RigModelProps {
  /** Ruta bajo public/, p. ej. `/models/tacker10/mast.glb`. Unidades: metros, Y arriba. */
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
  useEffect(() => {
    setEdgesVisible(edges, showEdges)
    invalidate()
  }, [edges, showEdges, invalidate])
  return <primitive object={gltf.scene} />
}
