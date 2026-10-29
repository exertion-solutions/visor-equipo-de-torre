import { useMemo } from 'react'
import { DoubleSide, Shape } from 'three'
import { RIG10_QHSE } from '@/data/qhse/rig10-qhse'
import { useZonesVisible } from '@/stores/toolsStore'
import type { ExclusionZone } from '@/types'

/** Rojo de las zonas del V2 (relleno traslúcido y, en la envolvente del mástil, un anillo). */
const ZONE_COLOR = '#EF4444'
const Y = 0.03

function Footprint({ zone }: { zone: ExclusionZone }) {
  const shape = zone.shape
  const polygon = useMemo(() => {
    if (shape?.type !== 'polygon') return null
    const s = new Shape()
    shape.pointsM.forEach(([x, z], i) => (i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z)))
    return s
  }, [shape])
  if (!shape) return null

  const fill = (
    <meshBasicMaterial
      color={ZONE_COLOR}
      transparent
      opacity={0.09}
      depthWrite={false}
      side={DoubleSide}
    />
  )
  if (shape.type === 'circle') {
    const [x, z] = shape.center
    return (
      <group name={`zona_${zone.id}`} userData={{ zoneId: zone.id }} position={[x, Y, z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <circleGeometry args={[shape.radiusM, 96]} />
          {fill}
        </mesh>
        {/* Contorno: la envolvente se lee también sin el relleno (el color no es el único canal). */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} renderOrder={2}>
          <ringGeometry args={[Math.max(shape.radiusM - 0.3, 0.05), shape.radiusM, 96]} />
          <meshBasicMaterial
            color={ZONE_COLOR}
            transparent
            opacity={0.8}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      </group>
    )
  }
  if (shape.type === 'rect') {
    const [x, z] = shape.center
    return (
      <group
        name={`zona_${zone.id}`}
        userData={{ zoneId: zone.id }}
        position={[x, Y, z]}
        rotation={[0, shape.rotationRad ?? 0, 0]}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <planeGeometry args={shape.sizeM} />
          {fill}
        </mesh>
      </group>
    )
  }
  return (
    <group name={`zona_${zone.id}`} userData={{ zoneId: zone.id }} position={[0, Y, 0]}>
      {polygon && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <shapeGeometry args={[polygon]} />
          {fill}
        </mesh>
      )}
    </group>
  )
}

/**
 * Zonas ilustrativas de riesgo (equivale a `#t-zones` del V2): envolventes gráficas sobre el terreno, sin validar. No son
 * exclusiones aprobadas ni controles operacionales; el panel QHSE las rotula así y no muestra su medida. Solo se
 * dibujan zonas con geometría (sin dato no se inventa una forma).
 */
export function ZonesLayer() {
  const visible = useZonesVisible()
  if (!visible) return null
  return (
    <group name="zonas_ilustrativas">
      {RIG10_QHSE.zones.map((zone) => (
        <Footprint key={zone.id} zone={zone} />
      ))}
    </group>
  )
}
