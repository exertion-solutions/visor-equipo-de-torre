// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { RIG10_RIG, RIG10_SCENE } from '@/data/rigs/rig10'
import { useViewerStore } from '@/stores/viewerStore'
import { ComponentTree } from './ComponentTree'

const SCENE_IDS = RIG10_SCENE.map((m) => m.componentId)

beforeAll(() => {
  // Radix ScrollArea observa el tamaño; jsdom no trae ResizeObserver ni matchMedia.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})
beforeEach(() =>
  useViewerStore.setState({
    selectedComponentId: null,
    hoveredComponentId: null,
    hiddenComponentIds: [],
    isolationSnapshot: null,
  }),
)
afterEach(cleanup)

const item = (id: string) => screen.getByTestId(`tree-item-${id}`)
const nameOf = (id: string) => RIG10_RIG.components.find((c) => c.id === id)!.name

describe('ComponentTree', () => {
  it('lista los componentes de la escena agrupados por equipo, cada uno una sola vez', () => {
    render(<ComponentTree rig={RIG10_RIG} sceneIds={SCENE_IDS} />)
    const items = screen.getAllByTestId(/^tree-item-/)
    expect(items).toHaveLength(SCENE_IDS.length)
    expect(screen.getAllByRole('region').length).toBeGreaterThan(1)
    expect(within(item('sk575_bop')).getByText(nameOf('sk575_bop'))).toBeTruthy()
  })

  it('el nombre selecciona el componente y otro clic lo deselecciona', () => {
    render(<ComponentTree rig={RIG10_RIG} sceneIds={SCENE_IDS} />)
    const button = within(item('sk575_bop')).getByRole('button')
    fireEvent.click(button)
    expect(useViewerStore.getState().selectedComponentId).toBe('sk575_bop')
    expect(button.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button)
    expect(useViewerStore.getState().selectedComponentId).toBeNull()
  })

  it('la casilla oculta y vuelve a mostrar un componente', () => {
    render(<ComponentTree rig={RIG10_RIG} sceneIds={SCENE_IDS} />)
    const box = screen.getByLabelText(`Mostrar ${nameOf('sk575_bop')}`) as HTMLInputElement
    expect(box.checked).toBe(true)
    fireEvent.click(box)
    expect(useViewerStore.getState().hiddenComponentIds).toEqual(['sk575_bop'])
    expect(box.checked).toBe(false)
    fireEvent.click(box)
    expect(useViewerStore.getState().hiddenComponentIds).toEqual([])
  })

  it('ocultar el seleccionado lo deselecciona; elegir uno oculto lo muestra y lo selecciona', () => {
    render(<ComponentTree rig={RIG10_RIG} sceneIds={SCENE_IDS} />)
    fireEvent.click(within(item('sk575_bop')).getByRole('button'))
    fireEvent.click(screen.getByLabelText(`Mostrar ${nameOf('sk575_bop')}`))
    expect(useViewerStore.getState().selectedComponentId).toBeNull()
    fireEvent.click(within(item('sk575_bop')).getByRole('button'))
    expect(useViewerStore.getState().hiddenComponentIds).toEqual([])
    expect(useViewerStore.getState().selectedComponentId).toBe('sk575_bop')
  })

  it('la casilla del grupo oculta todo el grupo y queda indeterminada si hay solo algunos', () => {
    render(<ComponentTree rig={RIG10_RIG} sceneIds={SCENE_IDS} />)
    const group = screen
      .getAllByRole('region')
      .find((r) => within(r).queryByTestId('tree-item-sk575_bop'))!
    const groupBox = within(group).getAllByRole('checkbox')[0] as HTMLInputElement
    const ids = within(group)
      .getAllByTestId(/^tree-item-/)
      .map((li) => li.dataset.testid!.replace('tree-item-', ''))
    expect(ids.length).toBeGreaterThan(1)

    fireEvent.click(screen.getByLabelText(`Mostrar ${nameOf('sk575_bop')}`))
    expect(groupBox.indeterminate).toBe(true)
    fireEvent.click(groupBox) // con algunos ocultos, la casilla indeterminada pasa a "todos visibles"
    expect(useViewerStore.getState().hiddenComponentIds).toEqual([])
    fireEvent.click(groupBox)
    expect([...useViewerStore.getState().hiddenComponentIds].sort()).toEqual([...ids].sort())
    expect(groupBox.checked).toBe(false)
  })

  it('el botón pliega y despliega el panel', () => {
    render(<ComponentTree rig={RIG10_RIG} sceneIds={SCENE_IDS} />)
    fireEvent.click(screen.getByLabelText('Plegar panel de componentes'))
    expect(screen.queryByTestId('tree-item-sk575_bop')).toBeNull()
    fireEvent.click(screen.getByLabelText('Desplegar panel de componentes'))
    expect(screen.getByTestId('tree-item-sk575_bop')).toBeTruthy()
  })
})
