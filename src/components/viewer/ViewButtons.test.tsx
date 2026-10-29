// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useViewerStore } from '@/stores/viewerStore'
import { ViewButtons } from './ViewButtons'

beforeEach(() =>
  useViewerStore.setState({ activeView: null, projection: 'perspective', cameraCommand: null }),
)
afterEach(cleanup)

describe('ViewButtons', () => {
  it('muestra las cinco vistas, ninguna activa al arrancar', () => {
    render(<ViewButtons />)
    const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(names).toEqual(['Isométrica', 'Frontal', 'Lateral', 'Superior', 'Boca de pozo'])
    for (const b of screen.getAllByRole('button'))
      expect(b.getAttribute('aria-pressed')).toBe('false')
  })

  it('un clic va a la vista, la resalta y deja a las demás sin resaltar', () => {
    render(<ViewButtons />)
    fireEvent.click(screen.getByRole('button', { name: 'Lateral' }))
    expect(useViewerStore.getState().activeView).toBe('side')
    expect(screen.getByRole('button', { name: 'Lateral' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByRole('button', { name: 'Frontal' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Boca de pozo' }))
    expect(useViewerStore.getState().projection).toBe('perspective')
    expect(screen.getByRole('button', { name: 'Lateral' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('el título dice en qué proyección queda la vista', () => {
    render(<ViewButtons />)
    expect(screen.getByRole('button', { name: 'Superior' }).title).toMatch(/ortográfica/)
    expect(screen.getByRole('button', { name: 'Boca de pozo' }).title).toMatch(/perspectiva/)
  })
})
