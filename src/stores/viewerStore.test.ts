import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_ENGINE,
  ENGINE_LABELS,
  VIEWER_ENGINES,
  isViewerEngine,
  useViewerStore,
} from './viewerStore'

describe('viewerStore', () => {
  beforeEach(() =>
    useViewerStore.setState({
      engine: DEFAULT_ENGINE,
      selectedComponentId: null,
      hoveredComponentId: null,
    }),
  )

  it('arranca en motor legacy y sin selección', () => {
    expect(VIEWER_ENGINES).toEqual(['legacy', 'native'])
    expect(useViewerStore.getState().engine).toBe('legacy')
    expect(useViewerStore.getState().selectedComponentId).toBeNull()
  })

  it('tiene etiqueta para cada motor', () => {
    for (const e of VIEWER_ENGINES) expect(ENGINE_LABELS[e]).toBeTruthy()
  })

  it('cambia de motor', () => {
    useViewerStore.getState().setEngine('native')
    expect(useViewerStore.getState().engine).toBe('native')
  })

  it('selecciona y deselecciona un componente', () => {
    useViewerStore.getState().selectComponent('mast')
    expect(useViewerStore.getState().selectedComponentId).toBe('mast')
    useViewerStore.getState().selectComponent(null)
    expect(useViewerStore.getState().selectedComponentId).toBeNull()
  })

  it('hover es independiente de la selección y se limpia', () => {
    useViewerStore.getState().selectComponent('mastil')
    useViewerStore.getState().hoverComponent('piso_trabajo')
    expect(useViewerStore.getState().hoveredComponentId).toBe('piso_trabajo')
    expect(useViewerStore.getState().selectedComponentId).toBe('mastil')
    useViewerStore.getState().hoverComponent(null)
    expect(useViewerStore.getState().hoveredComponentId).toBeNull()
  })

  describe('órdenes de cámara', () => {
    beforeEach(() => useViewerStore.setState({ cameraCommand: null, canGoBack: false }))

    it('enfocar sin selección no emite ninguna orden', () => {
      useViewerStore.getState().focusSelected()
      expect(useViewerStore.getState().cameraCommand).toBeNull()
    })

    it('enfocar emite una orden sobre el componente seleccionado', () => {
      useViewerStore.getState().selectComponent('bop')
      useViewerStore.getState().focusSelected()
      expect(useViewerStore.getState().cameraCommand).toEqual({
        type: 'focus',
        componentId: 'bop',
        seq: 1,
      })
    })

    it('repetir el foco sobre el mismo componente emite una orden nueva (seq crece)', () => {
      useViewerStore.getState().selectComponent('bop')
      useViewerStore.getState().focusSelected()
      useViewerStore.getState().focusSelected()
      expect(useViewerStore.getState().cameraCommand?.seq).toBe(2)
    })

    it('volver sin vista guardada no emite ninguna orden', () => {
      useViewerStore.getState().goBack()
      expect(useViewerStore.getState().cameraCommand).toBeNull()
    })

    it('volver con vista guardada emite una orden "back" con seq posterior', () => {
      useViewerStore.getState().selectComponent('mastil')
      useViewerStore.getState().focusSelected()
      useViewerStore.getState().setCanGoBack(true)
      useViewerStore.getState().goBack()
      expect(useViewerStore.getState().cameraCommand).toEqual({ type: 'back', seq: 2 })
    })
  })

  it('isViewerEngine rechaza valores inválidos', () => {
    expect(isViewerEngine('native')).toBe(true)
    expect(isViewerEngine('threejs')).toBe(false)
    expect(isViewerEngine(null)).toBe(false)
  })
})
