import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PROJECTION } from '@/scene/cameras/projection'
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

  describe('proyección', () => {
    beforeEach(() => useViewerStore.setState({ projection: DEFAULT_PROJECTION }))

    it('arranca en la proyección por defecto del nativo (perspectiva)', () => {
      expect(DEFAULT_PROJECTION).toBe('perspective')
      expect(useViewerStore.getState().projection).toBe('perspective')
    })

    it('alterna entre perspectiva y ortográfica', () => {
      useViewerStore.getState().toggleProjection()
      expect(useViewerStore.getState().projection).toBe('orthographic')
      useViewerStore.getState().toggleProjection()
      expect(useViewerStore.getState().projection).toBe('perspective')
    })

    it('setProjection fija la proyección pedida (lo usa "Volver" para restaurar la de antes del foco)', () => {
      useViewerStore.getState().setProjection('orthographic')
      useViewerStore.getState().setProjection('orthographic')
      expect(useViewerStore.getState().projection).toBe('orthographic')
    })

    it('alternar no toca la selección ni el aislamiento', () => {
      useViewerStore.setState({ selectedComponentId: 'bop', hiddenComponentIds: ['x'] })
      useViewerStore.getState().toggleProjection()
      expect(useViewerStore.getState().selectedComponentId).toBe('bop')
      expect(useViewerStore.getState().hiddenComponentIds).toEqual(['x'])
    })
  })

  describe('aislamiento', () => {
    const ALL = ['mastil', 'bop', 'carrier', 'piletas'] as const
    beforeEach(() =>
      useViewerStore.setState({
        selectedComponentId: null,
        hoveredComponentId: null,
        hiddenComponentIds: [],
        isolationSnapshot: null,
      }),
    )

    it('sin selección no hace nada', () => {
      useViewerStore.getState().toggleIsolation(ALL)
      expect(useViewerStore.getState().hiddenComponentIds).toEqual([])
      expect(useViewerStore.getState().isolationSnapshot).toBeNull()
    })

    it('con una selección que no está en la escena no oculta nada', () => {
      useViewerStore.getState().selectComponent('otro')
      useViewerStore.getState().toggleIsolation(ALL)
      expect(useViewerStore.getState().hiddenComponentIds).toEqual([])
      expect(useViewerStore.getState().isolationSnapshot).toBeNull()
    })

    it('aísla: oculta todo salvo el seleccionado y conserva la selección', () => {
      useViewerStore.getState().selectComponent('bop')
      useViewerStore.getState().toggleIsolation(ALL)
      const s = useViewerStore.getState()
      expect(s.hiddenComponentIds).toEqual(['mastil', 'carrier', 'piletas'])
      expect(s.isolationSnapshot).toEqual([])
      expect(s.selectedComponentId).toBe('bop')
    })

    it('un segundo toggle restaura el estado inicial', () => {
      useViewerStore.getState().selectComponent('bop')
      useViewerStore.getState().toggleIsolation(ALL)
      useViewerStore.getState().toggleIsolation(ALL)
      const s = useViewerStore.getState()
      expect(s.hiddenComponentIds).toEqual([])
      expect(s.isolationSnapshot).toBeNull()
    })

    it('restaura también lo que ya estaba oculto antes de aislar', () => {
      useViewerStore.setState({ hiddenComponentIds: ['piletas'] })
      useViewerStore.getState().selectComponent('mastil')
      useViewerStore.getState().toggleIsolation(ALL)
      useViewerStore.getState().toggleIsolation(ALL)
      expect(useViewerStore.getState().hiddenComponentIds).toEqual(['piletas'])
    })

    it('deseleccionar no sale del aislamiento y el toggle sigue restaurando', () => {
      useViewerStore.getState().selectComponent('bop')
      useViewerStore.getState().toggleIsolation(ALL)
      useViewerStore.getState().selectComponent(null)
      expect(useViewerStore.getState().isolationSnapshot).not.toBeNull()
      useViewerStore.getState().toggleIsolation(ALL)
      expect(useViewerStore.getState().hiddenComponentIds).toEqual([])
    })

    it('limpia el hover de un componente que queda oculto, pero no el del que sigue visible', () => {
      useViewerStore.getState().selectComponent('bop')
      useViewerStore.getState().hoverComponent('carrier')
      useViewerStore.getState().toggleIsolation(ALL)
      expect(useViewerStore.getState().hoveredComponentId).toBeNull()

      useViewerStore.setState({ hiddenComponentIds: [], isolationSnapshot: null })
      useViewerStore.getState().hoverComponent('bop')
      useViewerStore.getState().toggleIsolation(ALL)
      expect(useViewerStore.getState().hoveredComponentId).toBe('bop')
    })
  })

  it('isViewerEngine rechaza valores inválidos', () => {
    expect(isViewerEngine('native')).toBe(true)
    expect(isViewerEngine('threejs')).toBe(false)
    expect(isViewerEngine(null)).toBe(false)
  })
})
