import { useEffect } from 'react'
import { buildSearch, getInitialUrlState } from '@/lib/urlState'
import { useModeStore } from '@/stores/modeStore'
import { useViewerStore } from '@/stores/viewerStore'

/** Carga el modo de la URL en `modeStore` antes del primer render (evita un parpadeo EXPLORE → modo). */
export function hydrateStoresFromUrl(): void {
  useModeStore.setState({ mode: getInitialUrlState().mode })
}

/**
 * Refleja modo / vista / capas en la URL (`history.replaceState`, sin ensuciar el historial) para poder
 * compartir una vista concreta. Vista y capas provienen del visor V2 (`rig:state`); mientras no hayan
 * llegado se conserva lo que traía la URL, para no borrarlo antes de aplicarlo.
 */
export function useUrlSync(): void {
  const mode = useModeStore((s) => s.mode)
  const view = useViewerStore((s) => s.view)
  const layers = useViewerStore((s) => s.layers)
  const engine = useViewerStore((s) => s.engine)

  useEffect(() => {
    if (engine !== 'legacy') return
    const init = getInitialUrlState()
    const next = buildSearch(location.search, {
      mode,
      view: view ?? init.view,
      layers: layers ?? init.layers,
    })
    if (next !== location.search) {
      history.replaceState(history.state, '', `${location.pathname}${next}${location.hash}`)
    }
  }, [mode, view, layers, engine])
}
