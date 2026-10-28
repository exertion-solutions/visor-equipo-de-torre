// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { RIG10_RIG, RIG10_SCENE } from '@/data/rigs/rig10'
import type { Rig } from '@/types'
import { ComponentCard } from './ComponentCard'

beforeAll(() => {
  // Radix ScrollArea observa el tamaño; jsdom no trae ResizeObserver.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})
afterEach(cleanup)

const rig: Rig = {
  id: 'RIG-T',
  name: 'Equipo de prueba',
  service: 'Pulling',
  sources: [
    { id: 's1', kind: 'brochure', title: 'Folleto de prueba', verified: true },
    { id: 's2', kind: 'estimate', title: 'Estimación de prueba', verified: false },
  ],
  equipment: [],
  components: [
    {
      id: 'c1',
      rigId: 'RIG-T',
      name: 'Mástil de prueba',
      family: 'mast',
      confidence: 'B',
      sourceIds: ['s1', 's2'],
      scope: 'Geometría esquemática, sin detalle de la corona.',
      specifications: [
        { key: 'h', label: 'Altura', value: 31.71, unit: 'm', confidence: 'A', sourceId: 's1' },
        {
          key: 'p',
          label: 'Piso',
          value: 20.6,
          unit: 'm',
          confidence: 'B',
          sourceId: 's1',
          conflicts: [{ sourceId: 's2', value: 18.5, note: 'estimación previa' }],
        },
        { key: 'o', label: 'Con aparejo', value: true, confidence: 'C', sourceId: 's2' },
      ],
    },
    {
      id: 'c2',
      rigId: 'RIG-T',
      name: 'Componente sin datos',
      family: 'auxiliary',
      confidence: 'C',
      sourceIds: [],
      specifications: [],
    },
  ],
}

describe('ComponentCard', () => {
  it('sin componente (null) o con un id que no existe no dibuja nada', () => {
    const { container, rerender } = render(
      <ComponentCard rig={rig} componentId={null} onClose={() => {}} />,
    )
    expect(container.innerHTML).toBe('')
    rerender(<ComponentCard rig={rig} componentId="zzz" onClose={() => {}} />)
    expect(container.innerHTML).toBe('')
  })

  it('muestra nombre, nivel de confianza con su etiqueta y el alcance de la geometría', () => {
    render(<ComponentCard rig={rig} componentId="c1" onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Mástil de prueba' })).toBeTruthy()
    expect(screen.getByTestId('grade-badge').textContent).toBe('B · Parcial')
    expect(screen.getByLabelText('Alcance de la geometría').textContent).toContain(
      'sin detalle de la corona',
    )
  })

  it('cada especificación muestra su valor formateado, su nivel y el título de su fuente', () => {
    render(<ComponentCard rig={rig} componentId="c1" onClose={() => {}} />)
    const specs = screen.getAllByTestId('spec')
    expect(specs).toHaveLength(3)
    expect(within(specs[0]!).getByText('31,71 m')).toBeTruthy()
    expect(within(specs[0]!).getByText('Folleto de prueba')).toBeTruthy()
    expect(within(specs[2]!).getByText('Sí')).toBeTruthy()
  })

  it('una fuente sin contrastar se rotula, y una contrastada no', () => {
    render(<ComponentCard rig={rig} componentId="c1" onClose={() => {}} />)
    const specs = screen.getAllByTestId('spec')
    expect(within(specs[2]!).getByText(/sin contrastar/)).toBeTruthy()
    expect(within(specs[0]!).queryByText(/sin contrastar/)).toBeNull()
  })

  it('las fuentes en conflicto se rotulan y se listan todas, sin elegir una', () => {
    render(<ComponentCard rig={rig} componentId="c1" onClose={() => {}} />)
    const conflicto = screen.getByRole('note')
    expect(conflicto.textContent).toContain('Fuente en conflicto')
    expect(conflicto.textContent).toContain('Estimación de prueba')
    expect(conflicto.textContent).toContain('18,5')
    expect(conflicto.textContent).toContain('estimación previa')
    // Solo la especificación con conflicto lo muestra.
    expect(screen.getAllByRole('note')).toHaveLength(1)
  })

  it('lista las fuentes del componente con su tipo', () => {
    render(<ComponentCard rig={rig} componentId="c1" onClose={() => {}} />)
    const fuentes = screen.getByLabelText('Fuentes')
    expect(fuentes.textContent).toContain('Folleto de prueba')
    expect(fuentes.textContent).toContain('Folleto')
    expect(fuentes.textContent).toContain('Estimación')
  })

  it('un componente sin datos ni fuentes muestra solo nombre, nivel y el aviso de no as-built', () => {
    render(<ComponentCard rig={rig} componentId="c2" onClose={() => {}} />)
    expect(screen.getByTestId('grade-badge').textContent).toBe('C · Aproximado')
    expect(screen.queryByLabelText('Especificaciones')).toBeNull()
    expect(screen.queryByLabelText('Fuentes')).toBeNull()
    expect(screen.getByTestId('component-card').textContent).toContain('no as-built')
  })

  it('el botón de cerrar llama a onClose', () => {
    const onClose = vi.fn()
    render(<ComponentCard rig={rig} componentId="c1" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ComponentCard con los datos reales del equipo 10', () => {
  const ids = RIG10_SCENE.map((m) => m.componentId)

  it.each(ids)('%s: nombre, nivel A/B/C y pie de "no as-built"', (id) => {
    render(<ComponentCard rig={RIG10_RIG} componentId={id} onClose={() => {}} />)
    const componente = RIG10_RIG.components.find((c) => c.id === id)!
    expect(screen.getByRole('heading', { name: componente.name })).toBeTruthy()
    expect(screen.getByTestId('grade-badge').textContent).toMatch(
      /^[ABC] · (Confirmado|Parcial|Aproximado)$/,
    )
    expect(screen.getByTestId('component-card').textContent).toContain('no as-built')
    cleanup()
  })

  it('toda especificación con fuentes en conflicto las rotula', () => {
    const conConflicto = RIG10_RIG.components.filter((c) =>
      c.specifications.some((s) => s.conflicts?.length),
    )
    expect(conConflicto.length).toBeGreaterThan(0)
    for (const c of conConflicto) {
      render(<ComponentCard rig={RIG10_RIG} componentId={c.id} onClose={() => {}} />)
      const esperados = c.specifications.filter((s) => s.conflicts?.length).length
      expect(screen.getAllByRole('note'), c.id).toHaveLength(esperados)
      expect(screen.getAllByText('Fuente en conflicto')).toHaveLength(esperados)
      cleanup()
    }
  })

  it('no publica rutas ni nombres de archivos de documentos internos (solo el título de la fuente)', () => {
    for (const id of ids) {
      render(<ComponentCard rig={RIG10_RIG} componentId={id} onClose={() => {}} />)
      const texto = screen.getByTestId('component-card').textContent ?? ''
      expect(texto, id).not.toMatch(/docs\/fuentes|\.pdf|\.xlsx|\.dwg/i)
      cleanup()
    }
  })
})
