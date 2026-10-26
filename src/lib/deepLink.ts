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
