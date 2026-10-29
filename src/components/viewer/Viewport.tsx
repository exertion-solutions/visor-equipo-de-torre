import { Canvas } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import { ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace } from 'three'
import { Suspense, useMemo } from 'react'
import { CAMERA_PRESETS, DEFAULT_CAMERA_PRESET } from '@/scene/cameras/presets'
import { ExplodeRig } from '@/scene/explode/ExplodeRig'
import { CameraRig } from '@/scene/controls/CameraRig'
import { NativeProbe } from '@/scene/debug/NativeProbe'
import { LabelsProjector } from '@/scene/labels/LabelsProjector'
import { Lighting } from '@/scene/lighting/Lighting'
import { RigModel } from '@/scene/loaders/RigModel'
import { PostFx } from '@/scene/effects/PostFx'
import { ZonesLayer } from '@/scene/qhse/ZonesLayer'
import { ToolsLayer } from '@/scene/tools/ToolsLayer'
import { SelectableModel } from '@/scene/picking/SelectableModel'
import { useViewerStore } from '@/stores/viewerStore'
import { RIG10_RIG, RIG10_SCENE, type SceneModel } from '@/data/rigs/rig10'
import type { Vec3 } from '@/lib/geometry'

interface ViewportProps {
  /** GLB a cargar (con su posición). Vacío = escena de referencia (grilla 1 m). */
  models?: readonly SceneModel[]
}

export function Viewport({ models = RIG10_SCENE }: ViewportProps) {
  const selectComponent = useViewerStore((s) => s.selectComponent)
  const offsets = useMemo(
    () =>
      new Map<string, Vec3>(
        RIG10_RIG.components.flatMap((c) =>
          c.explodeOffset ? [[c.id, c.explodeOffset] as const] : [],
        ),
      ),
    [],
  )
  return (
    <Canvas
      role="img"
      aria-label="Escena 3D del equipo 10 (referencia digital, no as-built)"
      // Render bajo demanda (escena estática): drei invalida en cada 'change' de OrbitControls,
      // y el damping sigue solo porque cada update() emite 'change' hasta asentarse. r3f invalida
      // al montar/cambiar props; cualquier animación futura debe llamar invalidate().
      frameloop="demand"
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 2]}
      onPointerMissed={() => selectComponent(null)}
      camera={{
        position: [...CAMERA_PRESETS[DEFAULT_CAMERA_PRESET].position],
        fov: 42,
        near: 0.1,
        far: 600,
      }}
      gl={{
        antialias: true,
        outputColorSpace: SRGBColorSpace,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1,
      }}
    >
      <color attach="background" args={['#0b0d12']} />
      <Lighting />
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        sectionSize={10}
        sectionThickness={1}
        fadeDistance={90}
        infiniteGrid
        cellColor="#2a2f3a"
        sectionColor="#4b5566"
      />
      <Suspense fallback={null}>
        {models.map((m) => (
          <SelectableModel key={m.url} componentId={m.componentId} position={m.position}>
            <RigModel url={`${import.meta.env.BASE_URL}${m.url.replace(/^\//, '')}`} />
          </SelectableModel>
        ))}
        <PostFx />
      </Suspense>
      <ExplodeRig offsets={offsets} />
      <CameraRig />
      <LabelsProjector />
      <ToolsLayer />
      <ZonesLayer />
      {import.meta.env.DEV && <NativeProbe />}
    </Canvas>
  )
}
