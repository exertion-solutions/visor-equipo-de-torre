import { useEffect, useRef, useState } from 'react'
import {
  KV_PREFIX,
  isKvKey,
  parseLegacyMessage,
  type AppToLegacyMessage,
  type LegacySetModeMessage,
} from '@/lib/legacyBridge'
import { getInitialUrlState } from '@/lib/urlState'
import { LINK_PARAMS, legacyViewerSrc } from '@/lib/deepLink'
import { useModeStore, type AppMode } from '@/stores/modeStore'
import { useViewerStore } from '@/stores/viewerStore'

export type { LegacySetModeMessage }

/**
 * Ruta del visor V2 autocontenido, servido desde `public/legacy/`.
 * `?embedded` oculta su barra de modos propia: la app controla el modo por postMessage.
 */
export const LEGACY_VIEWER_SRC = `${import.meta.env.BASE_URL}legacy/Digital_Rig_V2.html?embedded`

/** Almacén de campo del visor en el localStorage de la app (el iframe sandbox no tiene storage propio). */
function kvItems(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(KV_PREFIX) && isKvKey(k)) out[k] = localStorage.getItem(k) ?? ''
    }
  } catch {
    /* sin storage: el visor sigue en memoria */
  }
  return out
}

/** Escribe `comp`/`vp` en la URL de la app (sin historial) y la copia al portapapeles. */
async function copyLink(comp: string | null, vp: string | null): Promise<void> {
  const u = new URL(location.href)
  for (const k of LINK_PARAMS) u.searchParams.delete(k)
  if (vp) u.searchParams.set('vp', vp)
  else if (comp) u.searchParams.set('comp', comp)
  history.replaceState(history.state, '', u.toString())
  try {
    await navigator.clipboard.writeText(u.toString())
  } catch {
    /* sin permiso de portapapeles: queda en la barra de direcciones */
  }
}

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
/** GLB del modelo SK-575 desde la carpeta del sitio (ids ya validados por `parseLegacyMessage`). */
async function fetchGlbs(ids: string[]): Promise<Record<string, ArrayBuffer>> {
  const pares = await Promise.all(
    ids.map(async (id) => {
      const r = await fetch(`${import.meta.env.BASE_URL}models/rig10/${id}.glb`)
      if (!r.ok) throw new Error(`${id}: HTTP ${r.status}`)
      return [id, await r.arrayBuffer()] as const
    }),
  )
  return Object.fromEntries(pares)
}

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
        case 'rig:ready': {
          const first = !store.legacyReady
          store.setLegacyReady(true)
          // Estado inicial: primero el modo (aplica su preset de capas) y luego lo explícito de la URL.
          const m = useModeStore.getState().mode
          sentMode.current = m
          postRef.current({ type: 'rig:setMode', mode: m })
          if (first) {
            const init = getInitialUrlState()
            if (init.view) postRef.current({ type: 'rig:setView', view: init.view })
            if (init.layers) postRef.current({ type: 'rig:setLayers', layers: init.layers })
          }
          break
        }
        case 'rig:state':
          // El modo NO se lee del visor: `modeStore` manda (evita pisar el modo de la URL con el estado inicial).
          store.setLegacyState({ view: msg.view, layers: msg.layers })
          break
        case 'rig:select':
          store.setSelection(msg.selection)
          break
        case 'rig:kvGet':
          postRef.current({ type: 'rig:kvInit', items: kvItems() })
          break
        case 'rig:kvSet':
          try {
            if (msg.value === null) localStorage.removeItem(msg.key)
            else localStorage.setItem(msg.key, msg.value)
          } catch {
            /* storage lleno o bloqueado */
          }
          break
        case 'rig:link':
          void copyLink(msg.comp, msg.vp)
          break
        case 'rig:glbGet': {
          // Sin conexión el iframe sandbox no llega al caché del sitio; la app sí (public/sw.js). Si falla, responde
          // vacío para que el visor pase enseguida a su respaldo en vez de esperar.
          const target = frameRef.current?.contentWindow
          void fetchGlbs(msg.ids)
            .then((bufs) =>
              target?.postMessage({ type: 'rig:glbs', bufs }, '*', Object.values(bufs)),
            )
            .catch(() => target?.postMessage({ type: 'rig:glbs', bufs: {} }, '*'))
          break
        }
      }
    }
    window.addEventListener('message', onMessage)
    // Por si el visor ya había arrancado antes de que este componente escuchara (recarga en caliente).
    postRef.current({ type: 'rig:ping' })
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // App → visor: cambios de modo posteriores al arranque.
  useEffect(() => {
    if (!ready || sentMode.current === mode) return
    sentMode.current = mode
    postRef.current({ type: 'rig:setMode', mode })
  }, [mode, ready])

  useEffect(() => {
    if (ready) return
    const t = setTimeout(() => setGiveUp(true), READY_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [ready])

  const loading = !ready && !giveUp
  // Se calcula una sola vez: cambiar `src` recargaría el visor.
  const [src] = useState(() => legacyViewerSrc(LEGACY_VIEWER_SRC, location.search))

  return (
    <div className={active ? 'absolute inset-0' : 'hidden'} aria-hidden={!active}>
      <iframe
        ref={frameRef}
        title="Visor Digital Rig V2 (modo compatibilidad)"
        src={src}
        sandbox="allow-scripts allow-downloads"
        allow="xr-spatial-tracking; fullscreen"
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
            : 'Preparando el modelo del equipo'}
        </p>
      </div>
    </div>
  )
}
