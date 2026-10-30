import { beforeEach, describe, expect, it } from 'vitest'
import { initialCuts } from '@/lib/cut'
import { dropsVisible, measureHint, useToolsStore, zonesVisible } from './toolsStore'
import { useViewerStore } from './viewerStore'

const A = [1, 2, 3] as const
const B = [4, 5, 6] as const
const C = [7, 8, 9] as const

beforeEach(() =>
  useToolsStore.setState({
    dims: false,
    zones: false,
    drops: false,
    dropsSection: null,
    cuts: initialCuts(),
    hoistHeight: 14,
    hoistPlaying: false,
    explodeOn: false,
    explodeAmount: 0.6,
    exploded: false,
    measure: false,
    measureKind: 'distance',
    points: [],
  }),
)

describe('toolsStore', () => {
  it('arranca con todo apagado y sin puntos', () => {
    const s = useToolsStore.getState()
    expect([s.dims, s.measure, s.points]).toEqual([false, false, []])
  })

  it('alterna las cotas y el modo medir', () => {
    useToolsStore.getState().toggleDims()
    useToolsStore.getState().toggleMeasure()
    expect(useToolsStore.getState().dims).toBe(true)
    expect(useToolsStore.getState().measure).toBe(true)
    useToolsStore.getState().toggleMeasure()
    expect(useToolsStore.getState().measure).toBe(false)
  })

  it('con dos puntos, el siguiente clic empieza una medición nueva', () => {
    const { addPoint } = useToolsStore.getState()
    addPoint(A)
    addPoint(B)
    expect(useToolsStore.getState().points).toEqual([A, B])
    addPoint(C)
    expect(useToolsStore.getState().points).toEqual([C])
  })

  it('apagar el modo medir conserva la medición; borrar la limpia', () => {
    useToolsStore.getState().toggleMeasure()
    useToolsStore.getState().addPoint(A)
    useToolsStore.getState().addPoint(B)
    useToolsStore.getState().toggleMeasure()
    expect(useToolsStore.getState().points).toHaveLength(2)
    useToolsStore.getState().clearMeasure()
    expect(useToolsStore.getState().points).toEqual([])
  })
})

describe('measureHint', () => {
  it('guía cada paso y calla fuera del modo medir', () => {
    expect(measureHint(false, 2)).toBe('')
    expect(measureHint(true, 0)).toMatch(/dos superficies/)
    expect(measureHint(true, 1)).toMatch(/segundo punto/)
    expect(measureHint(true, 2)).toMatch(/aproximada/)
  })
})

describe('zonas ilustrativas', () => {
  it('arrancan apagadas y se alternan', () => {
    expect(useToolsStore.getState().zones).toBe(false)
    useToolsStore.getState().toggleZones()
    expect(useToolsStore.getState().zones).toBe(true)
    useToolsStore.getState().toggleZones()
    expect(useToolsStore.getState().zones).toBe(false)
  })

  it('las enciende el botón o el modo QHSE, y al salir de QHSE se apagan solas', () => {
    expect(zonesVisible(false, 'explore')).toBe(false)
    expect(zonesVisible(true, 'explore')).toBe(true)
    expect(zonesVisible(false, 'qhse')).toBe(true)
    expect(zonesVisible(false, 'operation')).toBe(false)
    expect(zonesVisible(false, 'training')).toBe(false)
  })
})

describe('capa DROPS', () => {
  it('arranca apagada, se alterna y al apagarla o encenderla cierra la sección abierta', () => {
    expect(useToolsStore.getState().drops).toBe(false)
    useToolsStore.getState().toggleDrops()
    expect(useToolsStore.getState().drops).toBe(true)
    useToolsStore.getState().openDropsSection('corona')
    expect(useToolsStore.getState().dropsSection).toBe('corona')
    useToolsStore.getState().toggleDrops()
    expect(useToolsStore.getState().drops).toBe(false)
    expect(useToolsStore.getState().dropsSection).toBeNull()
  })

  it('abrir una sección deselecciona el componente (comparten el costado del visor); cerrarla no toca la selección', () => {
    useViewerStore.setState({ selectedComponentId: 'sk575_bop' })
    useToolsStore.getState().openDropsSection('boca-pozo')
    expect(useViewerStore.getState().selectedComponentId).toBeNull()
    useViewerStore.setState({ selectedComponentId: 'sk575_bop' })
    useToolsStore.getState().openDropsSection(null)
    expect(useViewerStore.getState().selectedComponentId).toBe('sk575_bop')
    expect(useToolsStore.getState().dropsSection).toBeNull()
  })

  it('la enciende el botón o el modo QHSE (capa derivada)', () => {
    expect(dropsVisible(false, 'explore')).toBe(false)
    expect(dropsVisible(true, 'explore')).toBe(true)
    expect(dropsVisible(false, 'qhse')).toBe(true)
    expect(dropsVisible(false, 'training')).toBe(false)
  })
})

describe('despiece', () => {
  it('arranca apagado, con la separación de arranque del V2 (60 %)', () => {
    const s = useToolsStore.getState()
    expect([s.explodeOn, s.explodeAmount, s.exploded]).toEqual([false, 0.6, false])
  })

  it('encenderlo apaga el modo medir; apagarlo no lo toca', () => {
    useToolsStore.getState().toggleMeasure()
    useToolsStore.getState().toggleExplode()
    expect(useToolsStore.getState().explodeOn).toBe(true)
    expect(useToolsStore.getState().measure).toBe(false)
    useToolsStore.getState().toggleExplode()
    expect(useToolsStore.getState().explodeOn).toBe(false)
  })

  it('no se puede medir con el equipo desarmado (ni mientras vuelve a armarse)', () => {
    useToolsStore.setState({ explodeOn: true })
    useToolsStore.getState().toggleMeasure()
    expect(useToolsStore.getState().measure).toBe(false)
    useToolsStore.setState({ explodeOn: false, exploded: true })
    useToolsStore.getState().toggleMeasure()
    expect(useToolsStore.getState().measure).toBe(false)
    useToolsStore.setState({ exploded: false })
    useToolsStore.getState().toggleMeasure()
    expect(useToolsStore.getState().measure).toBe(true)
  })

  it('la separación se acota y se recuerda con el despiece apagado', () => {
    useToolsStore.getState().setExplodeAmount(5)
    expect(useToolsStore.getState().explodeAmount).toBe(1)
    useToolsStore.getState().setExplodeAmount(0.3)
    useToolsStore.getState().toggleExplode()
    useToolsStore.getState().toggleExplode()
    expect(useToolsStore.getState().explodeAmount).toBe(0.3)
  })
})

describe('cortes de sección', () => {
  it('arrancan apagados en la posición inicial del V2 (X 0, Y 12, Z 0) y se encienden y apagan por eje', () => {
    const { cuts } = useToolsStore.getState()
    expect([cuts.x, cuts.y, cuts.z]).toEqual([
      { on: false, value: 0 },
      { on: false, value: 12 },
      { on: false, value: 0 },
    ])
    useToolsStore.getState().toggleCut('y')
    expect(useToolsStore.getState().cuts.y.on).toBe(true)
    expect(useToolsStore.getState().cuts.x.on).toBe(false)
    useToolsStore.getState().toggleCut('y')
    expect(useToolsStore.getState().cuts.y.on).toBe(false)
  })

  it('se combinan: cada eje es independiente', () => {
    useToolsStore.getState().toggleCut('x')
    useToolsStore.getState().toggleCut('z')
    const { cuts } = useToolsStore.getState()
    expect([cuts.x.on, cuts.y.on, cuts.z.on]).toEqual([true, false, true])
  })

  it('la posición se acota al rango de su eje y se recuerda con el corte apagado', () => {
    useToolsStore.getState().setCut('x', 99)
    expect(useToolsStore.getState().cuts.x.value).toBe(18)
    useToolsStore.getState().setCut('y', 0)
    expect(useToolsStore.getState().cuts.y.value).toBe(0.5)
    useToolsStore.getState().setCut('z', -4.4)
    useToolsStore.getState().toggleCut('z')
    useToolsStore.getState().toggleCut('z')
    expect(useToolsStore.getState().cuts.z.value).toBe(-4.4)
  })
})

describe('animación del aparejo', () => {
  it('arranca en reposo (14 m) y detenida', () => {
    const s = useToolsStore.getState()
    expect([s.hoistHeight, s.hoistPlaying]).toEqual([14, false])
  })

  it('animar rotula la animación como didáctica; volver a tocar la pausa', () => {
    useToolsStore.getState().toggleHoistPlay()
    expect(useToolsStore.getState().hoistPlaying).toBe(true)
    expect(useToolsStore.getState().notice).toMatch(/didáctica.*sin validar.*No es una simulación/)
    useToolsStore.getState().toggleHoistPlay()
    expect(useToolsStore.getState().hoistPlaying).toBe(false)
  })

  it('mover el deslizador pausa y fija la altura, acotada a 7–25 m', () => {
    useToolsStore.getState().toggleHoistPlay()
    useToolsStore.getState().setHoistHeight(40)
    expect(useToolsStore.getState().hoistHeight).toBe(25)
    expect(useToolsStore.getState().hoistPlaying).toBe(false)
    useToolsStore.getState().setHoistHeight(1)
    expect(useToolsStore.getState().hoistHeight).toBe(7)
  })

  it('la animación publica su altura sin pausarse', () => {
    useToolsStore.getState().toggleHoistPlay()
    useToolsStore.getState().syncHoist(15.25)
    expect(useToolsStore.getState().hoistHeight).toBe(15.25)
    expect(useToolsStore.getState().hoistPlaying).toBe(true)
  })

  it('con el equipo desarmado no se anima, y desarmar pausa la animación en marcha', () => {
    useToolsStore.setState({ exploded: true })
    useToolsStore.getState().toggleHoistPlay()
    expect(useToolsStore.getState().hoistPlaying).toBe(false)
    useToolsStore.setState({ exploded: false })
    useToolsStore.getState().toggleHoistPlay()
    useToolsStore.getState().toggleExplode()
    expect(useToolsStore.getState().hoistPlaying).toBe(false)
    useToolsStore.setState({ explodeOn: false })
  })
})
