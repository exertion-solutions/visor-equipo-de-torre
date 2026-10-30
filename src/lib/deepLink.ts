import { CAMERA_PRESET_IDS, type CameraPresetId } from '@/scene/cameras/presets'
import { DEFAULT_MODE, isAppMode, type AppMode } from '@/types/mode'

/** Enlaces profundos del visor: `?comp=<componente>` o `?vp=<sector de "Ir a equipo">` (los aplica legacy-ext/91-enlaces.js). */
export const LINK_PARAMS = ['comp', 'vp'] as const
const LINK_ID = /^[a-z0-9-]{1,40}$/

/** `src` del iframe con los enlaces profundos válidos de la URL de la app; lo demás se descarta. */
export function legacyViewerSrc(base: string, search: string): string {
  const p = new URLSearchParams(search)
  let src = base
  for (const k of LINK_PARAMS) {
    const v = p.get(k)
    if (v && LINK_ID.test(v)) src += `${src.includes('?') ? '&' : '?'}${k}=${v}`
  }
  return src
}

/** Ids del motor nativo: `sk575_bop`, `carrier_huella`… (con guion bajo; los del V2 son `bop`, `mastil`…). */
const NATIVE_COMPONENT_ID = /^[a-z0-9_-]{1,40}$/

export interface NativeLink {
  /** Componente a seleccionar y encuadrar; la existencia la comprueba quien lo aplica (los datos están en otro chunk). */
  comp: string | null
  /** Vista estándar de cámara. Si hay componente, manda el componente. */
  view: CameraPresetId | null
  /** Sector de "Ir a equipo" (`bop`, `piso-trabajo`…); la existencia la comprueba quien lo aplica. Si viene, manda sobre el resto. */
  vp: string | null
}

/** Enlace profundo del motor nativo (`?engine=native&comp=sk575_bop` o `&view=side`); lo inválido se descarta. */
export function parseNativeLink(search: string): NativeLink {
  const p = new URLSearchParams(search)
  const comp = p.get('comp')
  const view = p.get('view')
  const vp = p.get('vp')
  return {
    vp: vp && LINK_ID.test(vp) ? vp : null,
    comp: comp && NATIVE_COMPONENT_ID.test(comp) ? comp : null,
    view: (CAMERA_PRESET_IDS as readonly string[]).includes(view ?? '')
      ? (view as CameraPresetId)
      : null,
  }
}

/**
 * Enlace para compartir lo que se está viendo en el motor nativo: `?engine=native` + el modo (si no es EXPLORE) + el sector de
 * "Ir a equipo" si se está en uno o, si no, el componente seleccionado o, sin selección, la vista estándar. Solo lo que sirve para reconstruir la vista: nada de capas ni
 * estado interno. `href` es la URL de la página; se descartan su query y su hash.
 */
export function buildShareUrl(
  href: string,
  state: { mode?: AppMode; comp: string | null; view: CameraPresetId | null; vp?: string | null },
): string {
  const url = new URL(href)
  const p = new URLSearchParams({ engine: 'native' })
  if (state.mode && isAppMode(state.mode) && state.mode !== DEFAULT_MODE) p.set('mode', state.mode)
  if (state.vp && LINK_ID.test(state.vp)) p.set('vp', state.vp)
  else if (state.comp && NATIVE_COMPONENT_ID.test(state.comp)) p.set('comp', state.comp)
  else if (state.view) p.set('view', state.view)
  return `${url.origin}${url.pathname}?${p.toString()}`
}
