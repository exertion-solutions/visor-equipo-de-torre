// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDropsDataset } from '@/data/qhse/rig10-drops'
import { toolLabels } from '@/scene/tools/toolLabelElements'
import { useModeStore } from '@/stores/modeStore'
import { useToolsStore } from '@/stores/toolsStore'
import { useViewerStore } from '@/stores/viewerStore'
import { DropsMarkers } from './DropsMarkers'
import { DropsOfComponent } from './DropsOfComponent'
import { DropsPanel } from './DropsPanel'
import { QhsePanel } from './QhsePanel'

const dataset = getDropsDataset()

beforeEach(() => {
  useToolsStore.setState({ drops: false, dropsSection: null, zones: false })
  useModeStore.setState({ mode: 'explore' })
  useViewerStore.setState({ selectedComponentId: null })
})
afterEach(cleanup)

describe('DropsMarkers', () => {
  it('apagada no dibuja nada; encendida, un marcador por sección con su cantidad y la zona en palabras', () => {
    const { rerender } = render(<DropsMarkers />)
    expect(screen.queryByTestId('drops-markers')).toBeNull()
    expect(toolLabels().size).toBe(0)
    useToolsStore.setState({ drops: true })
    rerender(<DropsMarkers />)
    for (const s of dataset.sections) {
      const marker = screen.getByTestId(`drops-marker-${s.id}`)
      const n = dataset.points.filter((p) => p.sectionId === s.id).length
      expect(marker.textContent).toContain(
        `${n} · ${s.zone ? s.zone.toUpperCase() : 'SIN CLASIFICAR'}`,
      )
      expect(marker.getAttribute('aria-label')).toMatch(/Posición aproximada del modelo/)
    }
    expect(toolLabels().size).toBe(dataset.sections.length)
  })

  it('un clic abre la sección y otro la cierra', () => {
    useToolsStore.setState({ drops: true })
    render(<DropsMarkers />)
    const marker = screen.getByTestId('drops-marker-boca-pozo')
    fireEvent.click(marker)
    expect(useToolsStore.getState().dropsSection).toBe('boca-pozo')
    expect(marker.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(marker)
    expect(useToolsStore.getState().dropsSection).toBeNull()
  })

  it('el modo QHSE enciende la capa solo', () => {
    useModeStore.setState({ mode: 'qhse' })
    render(<DropsMarkers />)
    expect(screen.queryByTestId('drops-markers')).not.toBeNull()
  })
})

describe('DropsPanel', () => {
  it('sin sección abierta no se dibuja', () => {
    useToolsStore.setState({ drops: true })
    render(<DropsPanel />)
    expect(screen.queryByTestId('drops-panel')).toBeNull()
  })

  it('muestra los puntos de la sección con su texto, estatus, zona y fuente con página', () => {
    useToolsStore.setState({ drops: true, dropsSection: 'corona' })
    render(<DropsPanel />)
    const panel = screen.getByTestId('drops-panel')
    const points = dataset.points.filter((p) => p.sectionId === 'corona')
    expect(points.length).toBeGreaterThan(5)
    for (const p of points) {
      const card = within(panel).getByTestId(`drops-point-${p.id}`)
      expect(card.textContent).toContain(p.name)
      expect(card.textContent).toMatch(/Procedimiento/)
      expect(card.textContent).toMatch(new RegExp(`pág\\. ${p.basis.page}`))
      expect(within(card).getByTestId('zone-badge').textContent).toBe('ALTO')
    }
    expect(within(panel).getByTestId('drops-approx').textContent).toMatch(
      /aproximada \(modelo\), no as-built/,
    )
    expect(within(panel).getByRole('note').textContent).toBe(dataset.meta.disclaimer)
    expect(within(panel).getByTestId('drops-assumptions')).toBeTruthy()
  })

  it('una sección sin zona en el A2 se rotula SIN CLASIFICAR y no se le asigna una', () => {
    const sinZona = dataset.sections.find((s) => s.zone === null)!
    useToolsStore.setState({ drops: true, dropsSection: sinZona.id })
    render(<DropsPanel />)
    const badges = screen.getAllByTestId('zone-badge').map((b) => b.textContent)
    expect(new Set(badges)).toEqual(new Set(['SIN CLASIFICAR']))
  })

  it('no muestra radios ni distancias de las zonas (el A2 no los define)', () => {
    useToolsStore.setState({ drops: true, dropsSection: 'boca-pozo' })
    render(<DropsPanel />)
    const header = screen.getByTestId('drops-panel').querySelector('header')?.textContent ?? ''
    expect(header).not.toMatch(/\d+([.,]\d+)?\s*(m|metros|km)\b/i)
  })

  it('comparte el costado con la ficha: seleccionar un componente la oculta; el botón la cierra', () => {
    useToolsStore.setState({ drops: true, dropsSection: 'corona' })
    render(<DropsPanel />)
    expect(screen.queryByTestId('drops-panel')).not.toBeNull()
    act(() => useViewerStore.setState({ selectedComponentId: 'sk575_bop' }))
    expect(screen.queryByTestId('drops-panel')).toBeNull()
    act(() => useViewerStore.setState({ selectedComponentId: null }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel DROPS' }))
    expect(useToolsStore.getState().dropsSection).toBeNull()
  })
})

describe('DropsOfComponent', () => {
  it('sin la capa no muestra nada', () => {
    render(<DropsOfComponent componentId="sk575_mastil" />)
    expect(screen.queryByTestId('drops-of-component')).toBeNull()
  })

  it('con la capa, el mástil trae sus puntos y su zona más alta, con acceso a sus secciones', () => {
    useToolsStore.setState({ drops: true })
    render(<DropsOfComponent componentId="sk575_mastil" />)
    const block = screen.getByTestId('drops-of-component')
    expect(block.textContent).toMatch(/34 puntos/)
    expect(within(block).getByTestId('zone-badge').textContent).toBe('ALTO')
    fireEvent.click(within(block).getAllByRole('button')[0]!)
    expect(useToolsStore.getState().dropsSection).not.toBeNull()
  })

  it('un componente sin puntos asignados lo dice, en lugar de heredar los de otro', () => {
    useToolsStore.setState({ drops: true })
    render(<DropsOfComponent componentId="sk575_izaje" />)
    expect(screen.getByTestId('drops-of-component').textContent).toMatch(
      /no tiene puntos DROPS asignados/,
    )
  })
})

describe('leyenda DROPS en el panel QHSE', () => {
  it('muestra las zonas A2 con sus áreas, el aviso de que no define radios ni distancias y la nota de posición aproximada', () => {
    useToolsStore.setState({ drops: true })
    render(<QhsePanel />)
    const legend = screen.getByTestId('drops-legend')
    for (const z of dataset.zones) {
      expect(legend.textContent).toContain(z.label.replace('Riesgo ', ''))
      for (const area of z.areas) expect(legend.textContent).toContain(area)
    }
    expect(legend.textContent).toMatch(/SIN CLASIFICAR/)
    expect(screen.getByTestId('a2-notice').textContent).toMatch(
      /El A2 no define radios ni distancias.*no sustituye exclusiones aprobadas/,
    )
    expect(legend.textContent).toMatch(/Marcador punteado: posición aproximada del modelo/)
    // Solo DROPS: no aparece la leyenda de zonas ilustrativas.
    expect(screen.queryByRole('region', { name: 'Zonas ilustrativas' })).toBeNull()
  })

  it('con las dos capas muestra las dos leyendas', () => {
    useToolsStore.setState({ drops: true, zones: true })
    render(<QhsePanel />)
    expect(screen.queryByRole('region', { name: 'Zonas ilustrativas' })).not.toBeNull()
    expect(screen.queryByTestId('drops-legend')).not.toBeNull()
  })
})
