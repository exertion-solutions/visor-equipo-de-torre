import { RIG10_RIG } from '@/data/rigs/rig10'
import { RIG10_DIMENSIONS } from '@/data/rigs/rig10-dimensions'
import { buildDimensions } from '@/lib/dimensions'

/** Cotas del equipo 10 ya armadas (rótulo, nivel A/B/C, conflicto y extremos): se calculan una vez. */
export const RIG10_DIMENSION_VIEWS = buildDimensions(RIG10_RIG, RIG10_DIMENSIONS)
