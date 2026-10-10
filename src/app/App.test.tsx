// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

describe('App', () => {
  it('por defecto renderiza el visor V2 en un iframe con el src correcto', () => {
    render(<App />)
    const frame = screen.getByTitle(/Visor TACKER 10 V2/)
    expect(frame.tagName).toBe('IFRAME')
    expect(frame.getAttribute('src')).toBe(
      `${import.meta.env.BASE_URL}legacy/TACKER10_Digital_Rig_V2.html?embedded`,
    )
    expect(screen.queryByTestId('native-viewport')).toBeNull()
    expect(screen.getByRole('button', { name: /V2 compatible/ }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })

  it('el toggle cambia al motor R3F nativo y muestra el aviso de migración', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /R3F nativo/ }))
    expect(await screen.findByTestId('native-viewport')).toBeTruthy()
    // El iframe NO se desmonta (conserva estado y evita re-descargar ≈7 MB): solo se oculta.
    const frame = screen.getByTitle(/Visor TACKER 10 V2/)
    expect(frame.parentElement?.className).toContain('hidden')
    expect(screen.getByRole('button', { name: /R3F nativo/ }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByText(/R3F nativo en migración/)).toBeTruthy()
  })

  it('la barra de estado indica que la geometría no es as-built', () => {
    render(<App />)
    const bar = screen.getByRole('contentinfo', { name: 'Barra de estado' })
    expect(bar.textContent).toContain('no as-built')
    expect(bar.textContent).toContain('1 unidad = 1 m')
    expect(bar.textContent).toContain('EXPLORE')
    expect(bar.textContent).toContain('V2 compatible')
  })

  it('los botones de modo (aria-pressed) actualizan la barra de estado sin aviso en motor V2', () => {
    render(<App />)
    const bar = screen.getByRole('contentinfo', { name: 'Barra de estado' })
    expect(screen.getByRole('button', { name: 'EXPLORE' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'QHSE' }))
    expect(screen.getByRole('button', { name: 'QHSE' }).getAttribute('aria-pressed')).toBe('true')
    expect(bar.textContent).toContain('Modo: QHSE')
    expect(bar.textContent).not.toContain('sin efecto visual')
  })

  it('en motor nativo la barra de estado avisa que el modo aún no tiene efecto visual', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /R3F nativo/ }))
    await screen.findByTestId('native-viewport')
    const bar = screen.getByRole('contentinfo', { name: 'Barra de estado' })
    expect(bar.textContent).toContain('Modo: EXPLORE')
    expect(bar.textContent).toContain('(sin efecto visual aún)')
  })

  it('el modo de la app se reenvía al visor V2 embebido por postMessage una vez que está listo', () => {
    render(<App />)
    const frame = screen.getByTitle(/Visor TACKER 10 V2/) as HTMLIFrameElement
    const postMessage = vi.fn()
    const contentWindow = { postMessage } as unknown as Window
    Object.defineProperty(frame, 'contentWindow', { value: contentWindow, configurable: true })

    // Antes de ready no se envía nada (el visor aún no escucha).
    act(() => useModeStore.getState().setMode('qhse'))
    expect(postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tacker:setMode' }),
      '*',
    )

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'tacker:ready', version: 1 },
          source: contentWindow,
        }),
      )
    })
    expect(postMessage).toHaveBeenLastCalledWith({ type: 'tacker:setMode', mode: 'qhse' }, '*')

    act(() => useModeStore.getState().setMode('training'))
    expect(postMessage).toHaveBeenLastCalledWith({ type: 'tacker:setMode', mode: 'training' }, '*')
  })

  it('el iframe usa sandbox real: sin allow-same-origin', () => {
    render(<App />)
    const sandbox = screen.getByTitle(/Visor TACKER 10 V2/).getAttribute('sandbox') ?? ''
    expect(sandbox).toContain('allow-scripts')
    expect(sandbox).not.toContain('allow-same-origin')
  })
})
