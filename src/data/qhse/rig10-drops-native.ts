import type { Vec3 } from '@/lib/geometry'
import type { DropsComponentId, DropsSectionId } from './rig10-drops'

/**
 * Cómo la capa DROPS del motor nativo ubica y asigna los puntos del Libro DROPS. TODO es aproximado y propio del modelo:
 * el Libro y el layout A2 no dan posiciones, radios ni cotas.
 */

const MX = -1 // pie del mástil en X (cad/sk575/modelo.py)
const BASE_Y = 1.2192 // base del mástil sobre el suelo: 4 ft (placa API)
const LEAN = (3.5 * Math.PI) / 180

/** Punto a `t` metros sobre el eje inclinado del mástil (misma fórmula que el V2). */
const onMast = (t: number): Vec3 => [MX + t * Math.sin(LEAN), BASE_Y + t * Math.cos(LEAN), 0]

/**
 * Posición cualitativa APROXIMADA del marcador de cada sección, en el marco de escena (origen = boca de pozo, +X hacia el
 * mástil). Son las del V2 (`fallbackAnchor` de `50-drops-layer.js`), salvo la casilla del maquinista, que ahora se ubica
 * sobre la casilla del modelo. Ninguna es as-built: los marcadores se rotulan "posición aproximada del modelo".
 */
export const DROPS_ANCHORS: Record<DropsSectionId, Vec3> = {
  corona: onMast(30.4),
  'debajo-corona': onMast(24.5),
  // 20,629 m: piso de enganche a 68 ft (plano del mástil, `rackingBoardM`); el 18,5 m del V2 previo es una fuente en conflicto.
  'piso-enganche': onMast(20.629),
  'debajo-piso-enganche': onMast(9),
  'boca-pozo': [0, 2.4, 0],
  'subestructura-carrier': [-4, 1.5, 0],
  // Centro de la casilla del modelo (aproximada): x −1,3 m, piso a 3,5 m + media altura, lado +Z.
  'casilla-maquinista': [-1.3, 4.7, 1.8],
  'plano-inclinado': [4, 1, -1.35],
  piletas: [8, 2, -7.6],
  'piso-trabajo': [0, 2.6, 1],
  'poste-llave': [0.8, 3.6, 0],
}

/**
 * Componentes del dataset DROPS (ids del visor V2, asignación inferida) que corresponden a cada componente del modelo
 * nativo. Es conservador: lo que el dataset no asigna a un componente (acumulador, cilindros de izaje, manifold, bomba y
 * pozo vecino) queda sin puntos en lugar de heredar los de otro. Los sub-nodos del modelo (casilla, motor, piso de enganche)
 * suman a su componente raíz.
 */
export const DROPS_NATIVE_COMPONENTS: Readonly<Record<string, readonly DropsComponentId[]>> = {
  sk575_mastil: ['mastil', 'enganche'],
  sk575_carrier: ['camion', 'cabina', 'motor'],
  sk575_cuadro: ['malacate'],
  sk575_izaje: [],
  sk575_aparejo: ['aparejo'],
  sk575_bop: ['bop'],
  sk575_llave: ['llave'],
  sk575_piso: ['subestructura'],
  sk575_planchada: ['caballetes'],
  sk575_tiros: ['caballetes'],
  sk575_vientos: ['vientos'],
  sk575_pozo_vecino: [],
  sk575_piletas: ['circulacion'],
  sk575_manifold: [],
  sk575_bomba: [],
  sk575_acumulador: [],
}
