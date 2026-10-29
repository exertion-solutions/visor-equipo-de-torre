import { Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Vector3 } from 'three'
import { dimensionSegments } from '@/lib/dimensions'
import { labelPosition } from '@/lib/componentLabels'
import { separateLabels, type LabelBox } from '@/lib/labelLayout'
import { useToolsStore } from '@/stores/toolsStore'
import { RIG10_DIMENSION_VIEWS } from './dimensionViews'
import { onToolLabelsChange, toolLabels } from './toolLabelElements'

const DIM_COLOR = '#7ADAD2'
const DIM_CONFLICT_COLOR = '#F2B84B'
const MEASURE_COLOR = '#FFD16B'
const point = new Vector3()

/**
 * Cotas del equipo y medición entre dos puntos, dibujadas sin test de profundidad (se ven a través del modelo, como en el V2),
 * y proyector de sus rótulos HTML: en cada cuadro lleva cada uno a su punto de pantalla con la misma regla que las etiquetas.
 */
export function ToolsLayer() {
  const invalidate = useThree((s) => s.invalidate)
  const dims = useToolsStore((s) => s.dims)
  const points = useToolsStore((s) => s.points)

  useEffect(() => onToolLabelsChange(invalidate), [invalidate])

  useFrame(({ camera, size }) => {
    if (toolLabels().size === 0) return
    camera.updateMatrixWorld()
    const separar: LabelBox[] = []
    for (const [id, { element, point: anchor }] of toolLabels()) {
      const position = labelPosition(point.set(...anchor).project(camera), size.width, size.height)
      if (!position) {
        element.style.display = 'none'
        continue
      }
      element.style.display = element.dataset.display ?? 'block'
      element.style.transform = `translate(${position.x}px, ${position.y}px) translate(-50%, -50%)`
      // Los marcadores clicables (data-separar) no se pueden tapar entre sí: se separan en pantalla más abajo.
      if (element.dataset.separar !== undefined)
        separar.push({
          id,
          x: position.x,
          y: position.y,
          w: element.offsetWidth,
          h: element.offsetHeight,
        })
    }
    if (separar.length > 1) {
      const ubicadas = separateLabels(separar)
      for (const { id, x, y } of separar) {
        const p = ubicadas.get(id)
        const label = toolLabels().get(id)
        if (p && label && (p.x !== x || p.y !== y))
          label.element.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`
      }
    }
  })

  return (
    <>
      {dims &&
        RIG10_DIMENSION_VIEWS.map((d) => (
          <Line
            key={d.id}
            segments
            points={dimensionSegments(d.from, d.to)}
            color={d.conflict ? DIM_CONFLICT_COLOR : DIM_COLOR}
            lineWidth={1.5}
            depthTest={false}
            transparent
            renderOrder={8}
          />
        ))}
      {points.map((p, i) => (
        <mesh key={i} position={[...p]} renderOrder={10}>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshBasicMaterial color={MEASURE_COLOR} depthTest={false} transparent />
        </mesh>
      ))}
      {points.length === 2 && (
        <Line
          points={[...points]}
          color={MEASURE_COLOR}
          lineWidth={2}
          depthTest={false}
          transparent
          renderOrder={9}
        />
      )}
    </>
  )
}
