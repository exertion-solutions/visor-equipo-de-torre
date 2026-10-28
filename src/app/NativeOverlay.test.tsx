// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { useViewerStore } from '@/stores/viewerStore'
import NativeOverlay from './NativeOverlay'

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})
afterEach(() => {
  cleanup()
  useViewerStore.setState({ selectedComponentId: null, hoveredComponentId: null })
})

describe('NativeOverlay', () => {
  it('sin selección no hay ficha', () => {
    render(<NativeOverlay />)
    expect(screen.queryByTestId('component-card')).toBeNull()
  })

  it('al seleccionar un componente del equipo aparece su ficha; al cerrarla se deselecciona', () => {
    render(<NativeOverlay />)
    act(() => useViewerStore.getState().selectComponent('sk575_bop'))
    expect(screen.getByTestId('component-card')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }))
    expect(useViewerStore.getState().selectedComponentId).toBeNull()
    expect(screen.queryByTestId('component-card')).toBeNull()
  })

  it('Esc deselecciona, como en el V2', () => {
    render(<NativeOverlay />)
    act(() => useViewerStore.getState().selectComponent('sk575_bop'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useViewerStore.getState().selectedComponentId).toBeNull()
  })

  it('otra tecla no deselecciona', () => {
    render(<NativeOverlay />)
    act(() => useViewerStore.getState().selectComponent('sk575_bop'))
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(useViewerStore.getState().selectedComponentId).toBe('sk575_bop')
  })

  it('el tooltip muestra el nombre del componente bajo el puntero', () => {
    render(<NativeOverlay />)
    act(() => useViewerStore.getState().hoverComponent('sk575_bop'))
    expect(screen.getByRole('tooltip').textContent?.length).toBeGreaterThan(0)
  })
})
