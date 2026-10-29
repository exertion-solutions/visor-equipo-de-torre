import { useEffect } from 'react'
import { Box3 } from 'three'
import { parseNativeLink } from '@/lib/deepLink'
import { getInitialSearch, parseEngineParam } from '@/lib/urlState'
import { getComponentObject, registeredComponentIds } from '@/scene/picking/componentObjects'
import { useViewerStore } from '@/stores/viewerStore'

/** Una sola vez por carga de página: abrir el nativo desde el selector no vuelve a aplicar el enlace de apertura. */
let applied = false

const POLL_MS = 200
const MAX_TRIES = 150 // 30 s: los GLB tardan en bajar

/**
 * Aplica el enlace profundo con el que se abrió la página (`?engine=native&comp=…` o `&view=…`): selecciona y encuadra el
 * componente, o va a la vista estándar. Espera a que haya geometría (el encuadre necesita la caja del modelo). Un id que no es
 * de la escena se ignora y rige la vista, si vino.
 */
export function useNativeLink(sceneIds: readonly string[]): void {
  useEffect(() => {
    if (applied) return
    const search = getInitialSearch()
    if (parseEngineParam(search) !== 'native') return
    const { comp, view } = parseNativeLink(search)
    if (!comp && !view) {
      applied = true
      return
    }
    const validComp = comp && sceneIds.includes(comp) ? comp : null
    let tries = 0
    const timer = setInterval(() => {
      tries++
      const { selectComponent, focusSelected, setView } = useViewerStore.getState()
      if (validComp) {
        const object = getComponentObject(validComp)
        if (object && !new Box3().setFromObject(object).isEmpty()) {
          selectComponent(validComp)
          focusSelected()
          applied = true
        }
      } else if (view && registeredComponentIds().length > 0) {
        setView(view)
        applied = true
      } else if (!view) {
        applied = true
      }
      if (applied || tries >= MAX_TRIES) clearInterval(timer)
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [sceneIds])
}
