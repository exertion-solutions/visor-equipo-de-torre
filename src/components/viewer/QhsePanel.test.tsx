// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RIG10_QHSE, ZONES_LEGEND_TITLE, ZONES_NOTICE } from '@/data/qhse/rig10-qhse'
import { useModeStore } from '@/stores/modeStore'
import { useToolsStore } from '@/stores/toolsStore'
import { QhsePanel } from './QhsePanel'

beforeEach(() => {
  useToolsStore.setState({ zones: false })
  useModeStore.setState({ mode: 'explore' })
})
afterEach(cleanup)

describe('QhsePanel', () => {
  it('sin zonas encendidas no se dibuja', () => {
    render(<QhsePanel />)
    expect(screen.queryByTestId('qhse-panel')).toBeNull()
  })

  it('con las zonas encendidas muestra la leyenda "SIN VALIDAR", el aviso y el estatus de cada zona', () => {
    useToolsStore.setState({ zones: true })
    render(<QhsePanel />)
    expect(screen.getByRole('heading', { name: ZONES_LEGEND_TITLE })).toBeTruthy()
    expect(ZONES_LEGEND_TITLE).toMatch(/SIN VALIDAR/)
    expect(screen.getByTestId('zones-notice').textContent).toBe(ZONES_NOTICE)
    for (const zone of RIG10_QHSE.zones) {
      const row = screen.getByTestId(`zone-${zone.id}`)
      expect(within(row).getByText(zone.title)).toBeTruthy()
      expect(row.textContent).toMatch(/Pendiente de validación/)
    }
    // Fuera de QHSE no hay controles orientativos.
    expect(screen.queryByTestId('qhse-controls')).toBeNull()
  })

  it('no muestra ninguna medida de las zonas (ni el radio ni las dimensiones)', () => {
    useToolsStore.setState({ zones: true })
    useModeStore.setState({ mode: 'qhse' })
    render(<QhsePanel />)
    // Solo la sección de zonas: la leyenda DROPS nombra "layout A2" y eso no es una medida de las zonas.
    const text = screen.getByRole('region', { name: 'Zonas ilustrativas' }).textContent ?? ''
    expect(text).not.toMatch(/\d+([.,]\d+)?\s*(m|metros|km|ft)\b/i)
    for (const zone of RIG10_QHSE.zones) {
      if (zone.shape?.type === 'circle') {
        expect(text).not.toContain(String(zone.shape.radiusM))
        expect(text).not.toContain(String(Math.round(zone.shape.radiusM)))
      }
    }
  })

  it('el modo QHSE enciende las zonas solo y muestra los controles orientativos como recomendación pendiente', () => {
    useModeStore.setState({ mode: 'qhse' })
    render(<QhsePanel />)
    const controls = screen.getByTestId('qhse-controls')
    expect(controls.textContent).toMatch(/Controles orientativos · verificar aplicabilidad/)
    for (const barrier of RIG10_QHSE.barriers) {
      const item = within(controls).getByTestId(`control-${barrier.id}`)
      expect(item.textContent).toContain(barrier.description!)
      expect(item.textContent).toMatch(/Pendiente de validación/)
      expect(item.textContent).not.toMatch(/Requisito/)
    }
  })

  it('al salir de QHSE las zonas se apagan solas (capa derivada)', () => {
    useModeStore.setState({ mode: 'qhse' })
    const { rerender } = render(<QhsePanel />)
    expect(screen.queryByTestId('qhse-panel')).not.toBeNull()
    useModeStore.setState({ mode: 'explore' })
    rerender(<QhsePanel />)
    expect(screen.queryByTestId('qhse-panel')).toBeNull()
  })
})
