import type { Vec3 } from '@/lib/geometry'
import type { Viewpoint, ViewpointsData } from '@/data/viewpoints/rig10-viewpoints'

/** ¿El nombre de un nodo es del sector? Igual al prefijo o `prefijo_algo` (el criterio del V2). */
export function matchesPrefix(name: string, prefixes: readonly string[]): boolean {
  return !!name && prefixes.some((p) => name === p || name.startsWith(`${p}_`))
}

/**
 * Sector al que pertenece un objeto 3D, dados los nombres de él y de sus ancestros: gana el prefijo más largo (el subnodo
 * `sk575_enganche` es del piso de enganche aunque cuelgue del mástil). `null` si no es de ningún sector.
 */
export function viewpointOfNames(
  names: readonly string[],
  viewpoints: readonly Viewpoint[],
): Viewpoint | null {
  let best: Viewpoint | null = null
  let longest = 0
  for (const name of names)
    for (const vp of viewpoints)
      for (const prefix of vp.objeto3D)
        if (matchesPrefix(name, [prefix]) && prefix.length > longest) {
          best = vp
          longest = prefix.length
        }
  return best
}

/** Altura de ojos de un sector: cota del piso + altura de ojos (1,70 m). */
export function eyeHeight(vp: Viewpoint, data: ViewpointsData): number {
  return data.pisos[vp.piso].cota + data.alturaOjos
}

/** Altura del arco del vuelo (m): 12 % de la distancia, hasta 8 m; sin duración (salto instantáneo) no hay arco. */
export function flightArc(distance: number, ms: number): number {
  return ms > 0 ? Math.min(8, distance * 0.12) : 0
}

/** Posición en el vuelo: interpolación lineal más un arco vertical que sube y baja (e = avance suavizado, 0–1). */
export function flightPosition(from: Vec3, to: Vec3, e: number, arc: number): Vec3 {
  return [
    from[0] + (to[0] - from[0]) * e,
    from[1] + (to[1] - from[1]) * e + Math.sin(Math.PI * e) * arc,
    from[2] + (to[2] - from[2]) * e,
  ]
}

/** Paradas del recorrido guiado: solo las que existen entre los sectores. */
export function tourStops(data: ViewpointsData): string[] {
  const ids = new Set(data.viewpoints.map((v) => v.id))
  return data.recorrido.paradas.filter((id) => ids.has(id))
}

/** Milisegundos hasta la parada siguiente de un recorrido automático: el vuelo más el tiempo de la parada. */
export function stopDelayMs(data: ViewpointsData): number {
  return data.transicion.ms + data.recorrido.segundosPorParada * 1000
}
