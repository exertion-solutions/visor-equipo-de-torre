/** Función de captura que registra el lienzo (`CaptureBridge`); la usa la barra de estado, fuera del Canvas. */
type Capture = () => Promise<Blob | null>

let capture: Capture | null = null

export function registerCapture(fn: Capture | null): void {
  capture = fn
}

/** PNG de lo que se ve, con la leyenda; `null` si el visor no está montado o el navegador no pudo codificarlo. */
export function captureView(): Promise<Blob | null> {
  return capture ? capture() : Promise.resolve(null)
}
