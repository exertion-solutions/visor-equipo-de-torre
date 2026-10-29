// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RIG10_DIMENSION_VIEWS } from '@/scene/tools/dimensionViews'
import { toolLabels } from '@/scene/tools/toolLabelElements'
import { useToolsStore } from '@/stores/toolsStore'
import { ToolLabels } from './ToolLabels'

beforeEach(() => useToolsStore.setState({ dims: false, measure: false, points: [] }))
afterEach(cleanup)

describe('ToolLabels', () => {
  it('sin cotas ni medición completa no dibuja nada ni registra rótulos', () => {
    render(<ToolLabels />)
    expect(screen.queryByTestId('tool-labels')).toBeNull()
    expect(toolLabels().size).toBe(0)
  })

  it('con las cotas activadas muestra una por línea, con su valor y su nivel A/B/C', () => {
    useToolsStore.setState({ dims: true })
    render(<ToolLabels />)
    for (const d of RIG10_DIMENSION_VIEWS) {
      expect(screen.getByTestId(`tool-label-dim-${d.id}`).textContent).toBe(d.text)
    }
    expect(toolLabels().size).toBe(RIG10_DIMENSION_VIEWS.length)
    expect(screen.getByTestId('tool-label-dim-altura-mastil').textContent).toMatch(/· A$/)
  })

  it('la medición solo se rotula con dos puntos, siempre aproximada y del modelo', () => {
    useToolsStore.setState({ points: [[0, 0, 0]] })
    render(<ToolLabels />)
    expect(screen.queryByTestId('tool-label-measure')).toBeNull()
    act(() => useToolsStore.getState().addPoint([3, 0, 4]))
    expect(screen.getByTestId('tool-label-measure').textContent).toBe('≈ 5,00 m · modelo')
    act(() => useToolsStore.getState().addPoint([9, 9, 9]))
    expect(screen.queryByTestId('tool-label-measure')).toBeNull()
    expect(toolLabels().has('measure')).toBe(false)
  })

  it('al apagar las cotas se limpia el registro', () => {
    useToolsStore.setState({ dims: true })
    render(<ToolLabels />)
    act(() => useToolsStore.getState().toggleDims())
    expect(toolLabels().size).toBe(0)
  })
})
