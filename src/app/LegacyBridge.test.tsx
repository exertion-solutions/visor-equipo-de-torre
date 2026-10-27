// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MODE, useModeStore } from '@/stores/modeStore'
import { DEFAULT_ENGINE, useViewerStore } from '@/stores/viewerStore'
import { App } from './App'

// Evita crear un contexto WebGL en jsdom.
vi.mock('@/components/viewer/Viewport', () => ({
  Viewport: () => <div data-testid="native-viewport" />,
}))

afterEach(() => {
  cleanup()
  useModeStore.setState({ mode: DEFAULT_MODE })
  useViewerStore.setState({
    engine: DEFAULT_ENGINE,
    selectedComponentId: null,
    legacyReady: false,
    view: null,
    layers: null,
    selection: null,
  })
})

function frameWithBridge() {
  render(<App />)
  const frame = screen.getByTitle(/Visor Digital Rig V2/) as HTMLIFrameElement
  const postMessage = vi.fn()
  const contentWindow = { postMessage } as unknown as Window
  Object.defineProperty(frame, 'contentWindow', { value: contentWindow, configurable: true })
  const fromFrame = (data: unknown) =>
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data, source: contentWindow }))
    })
  return { frame, postMessage, fromFrame }
}

describe('App · puente con el visor V2', () => {
  it('muestra "Cargando visor" hasta que el visor avisa ready', () => {
    const { fromFrame } = frameWithBridge()
    expect(screen.getByRole('status').textContent).toContain('Cargando visor')
    fromFrame({ type: 'rig:ready', version: 1 })
    expect(screen.queryByText(/Cargando visor/)).toBeNull()
    expect(useViewerStore.getState().legacyReady).toBe(true)
  })

  it('al recibir ready reenvía el modo actual', () => {
    const { postMessage, fromFrame } = frameWithBridge()
    act(() => useModeStore.setState({ mode: 'training' }))
    fromFrame({ type: 'rig:ready', version: 1 })
    expect(postMessage).toHaveBeenCalledWith({ type: 'rig:setMode', mode: 'training' }, '*')
  })

  it('tras ready envía setMode una sola vez (reenviarlo re-aplica el preset y pisaría las capas de la URL)', () => {
    const { postMessage, fromFrame } = frameWithBridge()
    act(() => useModeStore.setState({ mode: 'qhse' }))
    fromFrame({ type: 'rig:ready', version: 1 })
    const modeCalls = postMessage.mock.calls.filter(([m]) => m.type === 'rig:setMode')
    expect(modeCalls).toHaveLength(1)
  })

  it('ignora mensajes que no vienen del iframe o están mal formados', () => {
    const { fromFrame } = frameWithBridge()
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { type: 'rig:ready', version: 1 }, source: window }),
      )
    })
    expect(useViewerStore.getState().legacyReady).toBe(false)
    fromFrame({ type: 'rig:select', id: 42 })
    fromFrame('basura')
    expect(useViewerStore.getState().selection).toBeNull()
  })

  it('refleja vista y capas del visor, pero no pisa el modo de la app con el estado del visor', () => {
    const { fromFrame } = frameWithBridge()
    act(() => useModeStore.setState({ mode: 'qhse' }))
    fromFrame({
      type: 'rig:state',
      mode: 'explore',
      view: 'top',
      layers: ['zonas', 'x', 'cotas'],
    })
    expect(useViewerStore.getState().view).toBe('top')
    expect(useViewerStore.getState().layers).toEqual(['zonas', 'cotas'])
    expect(useModeStore.getState().mode).toBe('qhse')
  })

  it('la selección del visor muestra la confiabilidad geométrica en la barra de estado', () => {
    const { fromFrame } = frameWithBridge()
    fromFrame({
      type: 'rig:select',
      id: 'vientos',
      name: 'Vientos',
      grade: 'B',
      status: 'Fuente en conflicto',
    })
    const chip = screen.getByTestId('selection-grade')
    expect(chip.textContent).toContain('Vientos')
    expect(chip.textContent).toContain('B · Parcial')
    fromFrame({ type: 'rig:select', id: null })
    expect(screen.queryByTestId('selection-grade')).toBeNull()
  })
})
