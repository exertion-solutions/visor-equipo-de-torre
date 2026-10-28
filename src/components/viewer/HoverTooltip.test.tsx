// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useViewerStore } from '@/stores/viewerStore'
import type { Rig } from '@/types'
import { HoverTooltip } from './HoverTooltip'

const rig = {
  id: 'R',
  name: 'R',
  service: 'Pulling',
  sources: [],
  equipment: [],
  components: [
    {
      id: 'bop',
      rigId: 'R',
      name: 'BOP de prueba',
      family: 'well-control',
      confidence: 'C',
      sourceIds: [],
      specifications: [],
    },
  ],
} as Rig

const mover = (x: number, y: number, pointerType = 'mouse') => {
  const e = new Event('pointermove') as Event & {
    clientX: number
    clientY: number
    pointerType: string
  }
  Object.assign(e, { clientX: x, clientY: y, pointerType })
  act(() => void window.dispatchEvent(e))
}

afterEach(() => {
  cleanup()
  useViewerStore.setState({ hoveredComponentId: null })
})

describe('HoverTooltip', () => {
  it('sin hover no dibuja nada', () => {
    render(<HoverTooltip rig={rig} />)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('con un componente bajo el puntero muestra su nombre; un id desconocido no muestra nada', () => {
    render(<HoverTooltip rig={rig} />)
    act(() => useViewerStore.getState().hoverComponent('bop'))
    expect(screen.getByRole('tooltip').textContent).toBe('BOP de prueba')
    act(() => useViewerStore.getState().hoverComponent('zzz'))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('sigue al puntero con el DOM, sin re-renderizar', () => {
    render(<HoverTooltip rig={rig} />)
    act(() => useViewerStore.getState().hoverComponent('bop'))
    mover(100, 50)
    expect(screen.getByRole('tooltip').style.transform).toBe('translate(114px, 66px)')
    mover(300, 220)
    expect(screen.getByRole('tooltip').style.transform).toBe('translate(314px, 236px)')
  })

  it('con el dedo (táctil) no se muestra', () => {
    render(<HoverTooltip rig={rig} />)
    act(() => useViewerStore.getState().hoverComponent('bop'))
    mover(10, 10, 'touch')
    // Oculto con display:none: el rol solo se encuentra con `hidden: true`.
    expect(screen.getByRole('tooltip', { hidden: true }).style.display).toBe('none')
    expect(screen.queryByRole('tooltip')).toBeNull()
    mover(10, 10, 'mouse')
    expect(screen.getByRole('tooltip').style.display).toBe('')
  })

  it('no captura el puntero (no tapa el lienzo)', () => {
    render(<HoverTooltip rig={rig} />)
    act(() => useViewerStore.getState().hoverComponent('bop'))
    expect(screen.getByRole('tooltip').className).toContain('pointer-events-none')
  })
})
