import { EffectComposer, N8AO, Outline, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useMemo } from 'react'
import { resolveMeshes } from '@/scene/picking/componentObjects'
import { useViewerStore } from '@/stores/viewerStore'
import { useCameraIdle } from './useCameraIdle'

const HOVER_COLOR = 0x9fd0ff
const SELECT_COLOR = 0xf2b632
const HIGHLIGHT_COLOR = 0xffe08a

/**
 * Postproceso (SMAA en lugar de MSAA: el blit multisample falla con el AO): contorno de hover y selección, AO solo con la cámara quieta y tone mapping neutral.
 * El tone mapping del renderer no aplica a los render targets del composer, por eso se hace acá.
 */
export function PostFx() {
  const hovered = useViewerStore((s) => s.hoveredComponentId)
  const selected = useViewerStore((s) => s.selectedComponentId)
  const highlighted = useViewerStore((s) => s.highlightIds)
  const idle = useCameraIdle(250)

  const hoverObjects = useMemo(
    () => resolveMeshes(hovered && hovered !== selected ? [hovered] : []),
    [hovered, selected],
  )
  const selectObjects = useMemo(() => resolveMeshes([selected]), [selected])
  // Sector del recorrido: contorno claro, sin abrir la ficha del componente.
  const highlightObjects = useMemo(() => resolveMeshes(highlighted), [highlighted])

  return (
    <EffectComposer multisampling={0} enableNormalPass={false} autoClear={false}>
      {idle && <N8AO aoRadius={2.5} distanceFalloff={1} intensity={2} quality="medium" />}
      <Outline
        selection={hoverObjects}
        selectionLayer={10}
        visibleEdgeColor={HOVER_COLOR}
        hiddenEdgeColor={HOVER_COLOR}
        edgeStrength={2.5}
        blur
      />
      <Outline
        selection={selectObjects}
        selectionLayer={11}
        visibleEdgeColor={SELECT_COLOR}
        hiddenEdgeColor={SELECT_COLOR}
        edgeStrength={4}
        blur
      />
      <Outline
        selection={highlightObjects}
        selectionLayer={12}
        visibleEdgeColor={HIGHLIGHT_COLOR}
        hiddenEdgeColor={HIGHLIGHT_COLOR}
        edgeStrength={3}
        blur
      />
      <SMAA />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  )
}
