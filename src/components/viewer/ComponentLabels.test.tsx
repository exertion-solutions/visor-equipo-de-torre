// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RIG10_RIG, RIG10_SCENE } from '@/data/rigs/rig10'
import { labelElements } from '@/scene/labels/labelElements'
import { useViewerStore } from '@/stores/viewerStore'
import { ComponentLabels } from './ComponentLabels'

const SCENE_IDS = RIG10_SCENE.map((m) => m.componentId)

beforeEach(() => useViewerStore.setState({ labels: false, hiddenComponentIds: [] }))
afterEach(cleanup)

describe('ComponentLabels', () => {
  it('apagadas (como al arrancar) no dibuja nada ni registra etiquetas', () => {
    render(<ComponentLabels rig={RIG10_RIG} sceneIds={SCENE_IDS} />)
    expect(screen.queryByTestId('component-labels')).toBeNull()
    expect(labelElements().size).toBe(0)
  })

  it('activadas, una etiqueta por componente con su número y su nombre, registradas para el proyector', () => {
    useViewerStore.setState({ labels: true })
    render(<ComponentLabels rig={RIG10_RIG} sceneIds={SCENE_IDS} />)
    const pills = screen.getAllByTestId(/^label-/)
    expect(pills).toHaveLength(SCENE_IDS.length)
    expect(labelElements().size).toBe(SCENE_IDS.length)
    const bop = screen.getByTestId('label-sk575_bop')
    expect(
      within(bop).getByText(RIG10_RIG.components.find((c) => c.id === 'sk575_bop')!.name),
    ).toBeTruthy()
    // Numeradas de 1 a N sin repetir; arrancan ocultas hasta que el proyector las ubica.
    const numbers = pills.map((p) => Number(p.querySelector('b')?.textContent))
    expect(numbers.sort((a, b) => a - b)).toEqual(SCENE_IDS.map((_, i) => i + 1))
    for (const p of pills) expect(p.style.display).toBe('none')
  })

  it('un componente oculto pierde su etiqueta, y al apagarlas se limpia el registro', () => {
    useViewerStore.setState({ labels: true })
    render(<ComponentLabels rig={RIG10_RIG} sceneIds={SCENE_IDS} />)
    act(() => useViewerStore.getState().setComponentsVisible(['sk575_bop'], false))
    expect(screen.queryByTestId('label-sk575_bop')).toBeNull()
    expect(labelElements().has('sk575_bop')).toBe(false)
    act(() => useViewerStore.getState().toggleLabels())
    expect(labelElements().size).toBe(0)
  })

  it('no recibe clics ni entra en el árbol de accesibilidad', () => {
    useViewerStore.setState({ labels: true })
    render(<ComponentLabels rig={RIG10_RIG} sceneIds={SCENE_IDS} />)
    const layer = screen.getByTestId('component-labels')
    expect(layer.className).toMatch(/pointer-events-none/)
    expect(layer.getAttribute('aria-hidden')).toBe('true')
  })
})
