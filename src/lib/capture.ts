/** Sitio publicado (el mismo de `og:url`): va en cada captura para que la imagen lleve el origen. */
export const SITE_URL = 'exertion-solutions.github.io/visor-equipo-de-torre'

/** Leyenda de cada captura: la imagen sale de contexto, así que el aviso de que no es as-built viaja con ella. */
export const CAPTURE_NOTICE =
  'DIGITAL RIG · Equipo 10 · referencia digital, no as-built · geometría aproximada'

/** Alto de la franja de la leyenda, en píxeles CSS (se escala con la resolución de la captura). */
export const CAPTURE_BAND_CSS = 36

const pad = (n: number) => String(n).padStart(2, '0')

/** Nombre del archivo: `digital-rig-equipo10-20261030-1542.png`. */
export function captureFileName(date: Date): string {
  const d = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  return `digital-rig-equipo10-${d}-${pad(date.getHours())}${pad(date.getMinutes())}.png`
}

/** Alto en píxeles de la franja para una captura de `canvasWidth` px que se ve a `cssWidth` px: mismo escalado que el lienzo. */
export function captureBandHeight(canvasWidth: number, cssWidth: number): number {
  if (cssWidth <= 0) return CAPTURE_BAND_CSS
  return Math.max(1, Math.round((CAPTURE_BAND_CSS * canvasWidth) / cssWidth))
}
