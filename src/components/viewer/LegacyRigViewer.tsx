import { useEffect, useRef, useState } from 'react'
import {
  parseLegacyMessage,
  type AppToLegacyMessage,
  type LegacySetModeMessage,
} from '@/lib/legacyBridge'
import { getInitialUrlState } from '@/lib/urlState'
import { useModeStore, type AppMode } from '@/stores/modeStore'
import { useViewerStore } from '@/stores/viewerStore'

export type { LegacySetModeMessage }

/**
 * Ruta del visor V2 autocontenido, servido desde `public/legacy/`.
 * `?embedded` oculta su barra de modos propia: la app controla el modo por postMessage.
 */
export const LEGACY_VIEWER_SRC = `${import.meta.env.BASE_URL}legacy/TACKER10_Digital_Rig_V2.html?embedded`

/** Si el visor no avisa `ready` (p. ej. una copia en caché sin el puente), se retira el cartel igual. */
const READY_FALLBACK_MS = 45_000

/**
 * Modo compatibilidad: embebe el visor HTML/Three.js V2 mientras el motor R3F
 * nativo no tiene paridad funcional. Sandbox real: scripts y descargas (PNG/GLB por blob),
 * SIN `allow-same-origin` (con `allow-scripts` lo anularía): el visor corre en origen opaco y
 * no puede tocar el DOM, storage ni cookies de la app anfitriona. El V2 es autocontenido.
 *
 * Protocolo de mensajes: `docs/LEGACY_BRIDGE.md` / `src/lib/legacyBridge.ts`.
 * `modeStore` es la única fuente de verdad del modo; vista/capas/selección se reflejan desde el visor.
 *
 * El iframe NO se desmonta al cambiar de motor (`active=false` solo lo oculta): así se conservan cámara,
 * capas y mediciones y no se vuelve a bajar el HTML (≈7 MB).
 */
export function LegacyRigViewer({ active = true }: { active?: boolean }) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const mode = useModeStore((s) => s.mode)
  const ready = useViewerStore((s) => s.legacyReady)
  const [giveUp, setGiveUp] = useState(false)
  // Último modo enviado al visor: evita reenviarlo (cada setMode re-aplica el preset y pisaría las capas de la URL).
  const sentMode = useRef<AppMode | null>(null)

  const post = (message: AppToLegacyMessage) => {
    // Origen opaco (sandbox sin allow-same-origin): solo '*' es posible; los mensajes no llevan datos sensibles.
    frameRef.current?.contentWindow?.postMessage(message, '*')
  }
  // Ref-latest: el listener de `message` se registra una sola vez y usa siempre el `post` actual.
  const postRef = useRef(post)
  useEffect(() => {
    postRef.current = post
  })

  // Visor → app.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return
      const msg = parseLegacyMessage(e.data)
      if (!msg) return
      const store = useViewerStore.getState()
      switch (msg.type) {
        case 'tacker:ready': {
          const first = !store.legacyReady
          store.setLegacyReady(true)
          // Estado inicial: primero el modo (aplica su preset de capas) y luego lo explícito de la URL.
          const m = useModeStore.getState().mode
          sentMode.current = m
          postRef.current({ type: 'tacker:setMode', mode: m })
          if (first) {
            const init = getInitialUrlState()
            if (init.view) postRef.current({ type: 'tacker:setView', view: init.view })
            if (init.layers) postRef.current({ type: 'tacker:setLayers', layers: init.layers })
          }
          break
        }
        case 'tacker:state':
          // El modo NO se lee del visor: `modeStore` manda (evita pisar el modo de la URL con el estado inicial).
          store.setLegacyState({ view: msg.view, layers: msg.layers })
          break
        case 'tacker:select':
          store.setSelection(msg.selection)
          break
      }
    }
    window.addEventListener('message', onMessage)
    // Por si el visor ya había arrancado antes de que este componente escuchara (recarga en caliente).
    postRef.current({ type: 'tacker:ping' })
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // App → visor: cambios de modo posteriores al arranque.
  useEffect(() => {
    if (!ready || sentMode.current === mode) return
    sentMode.current = mode
    postRef.current({ type: 'tacker:setMode', mode })
  }, [mode, ready])

  useEffect(() => {
    if (ready) return
    const t = setTimeout(() => setGiveUp(true), READY_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [ready])

  const loading = !ready && !giveUp

  return (
    <div className={active ? 'absolute inset-0' : 'hidden'} aria-hidden={!active}>
      <iframe
        ref={frameRef}
        title="Visor TACKER 10 V2 (modo compatibilidad)"
        src={LEGACY_VIEWER_SRC}
        sandbox="allow-scripts allow-downloads"
        tabIndex={active ? 0 : -1}
        className="block h-full w-full border-0"
      />
      {loading && <LoadingOverlay />}
    </div>
  )
}

function LoadingOverlay() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-background/90 absolute inset-0 z-10 grid place-items-center backdrop-blur-sm"
    >
      <div className="flex w-64 flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium">Cargando visor 3D…</p>
        <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
          <div className="bg-primary h-full w-1/3 animate-[loader-slide_1.4s_ease-in-out_infinite] rounded-full" />
        </div>
        <p className="text-muted-foreground text-xs">
          {slow
            ? 'Sigue cargando: el visor pesa ≈7 MB (incluye el modelo SK-575). Puede tardar unos segundos más.'
            : 'Preparando el modelo TACKER 10'}
        </p>
      </div>
    </div>
  )
}
