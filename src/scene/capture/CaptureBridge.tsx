import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { CAPTURE_NOTICE, captureBandHeight, SITE_URL } from '@/lib/capture'
import { registerCapture } from './captureRegistry'

/**
 * Captura PNG de la escena: renderiza un cuadro y lo copia en el mismo turno (con render bajo demanda el búfer no se
 * conserva entre cuadros) a un lienzo propio con una franja inferior con la leyenda "referencia digital, no as-built" y el
 * sitio. Solo sale el 3D: las etiquetas, cotas y paneles son HTML y no entran.
 */
export function CaptureBridge() {
  const get = useThree((s) => s.get)

  useEffect(() => {
    registerCapture(async () => {
      const { gl, advance, size } = get()
      advance(performance.now())
      const src = gl.domElement
      const band = captureBandHeight(src.width, size.width)
      const out = document.createElement('canvas')
      out.width = src.width
      out.height = src.height + band
      const ctx = out.getContext('2d')
      if (!ctx) return null
      ctx.fillStyle = '#0b0d12'
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.drawImage(src, 0, 0)
      const font = Math.round(band * 0.36)
      ctx.font = `${font}px system-ui, sans-serif`
      ctx.textBaseline = 'middle'
      const y = src.height + band / 2
      const margin = Math.round(band * 0.4)
      ctx.fillStyle = '#c9d2e3'
      ctx.textAlign = 'left'
      ctx.fillText(CAPTURE_NOTICE, margin, y)
      ctx.fillStyle = '#8c95aa'
      ctx.textAlign = 'right'
      ctx.fillText(SITE_URL, out.width - margin, y)
      return new Promise<Blob | null>((resolve) => out.toBlob((b) => resolve(b), 'image/png'))
    })
    return () => registerCapture(null)
  }, [get])

  return null
}
