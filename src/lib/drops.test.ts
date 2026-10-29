import { describe, expect, it } from 'vitest'
import { RIG10_RIG } from '@/data/rigs/rig10'
import { DROPS_COMPONENT_IDS, getDropsDataset } from '@/data/qhse/rig10-drops'
import { DROPS_ANCHORS, DROPS_NATIVE_COMPONENTS } from '@/data/qhse/rig10-drops-native'
import {
  NO_ZONE_COLOR,
  ZONE_COLORS,
  buildSectionViews,
  highestZone,
  plural,
  pointsOf,
  zoneColor,
  zoneWord,
} from './drops'

const dataset = getDropsDataset()

describe('zonas del A2', () => {
  it('palabra y color de cada zona, y "SIN CLASIFICAR" cuando no hay', () => {
    expect(zoneWord('alto')).toBe('ALTO')
    expect(zoneWord('medio')).toBe('MEDIO')
    expect(zoneWord('bajo')).toBe('BAJO')
    expect(zoneWord(null)).toBe('SIN CLASIFICAR')
    expect(zoneColor('alto')).toBe('#EF4444')
    expect(zoneColor(null)).toBe(NO_ZONE_COLOR)
  })

  it('los colores coinciden con los del dataset', () => {
    for (const z of dataset.zones) expect(ZONE_COLORS[z.id], z.id).toBe(z.color)
  })

  it('plural', () => {
    expect(plural(1, 'punto', 'puntos')).toBe('1 punto')
    expect(plural(0, 'punto', 'puntos')).toBe('0 puntos')
    expect(plural(66, 'punto', 'puntos')).toBe('66 puntos')
  })
})

describe('secciones y anclajes', () => {
  it('cada sección del Libro tiene su anclaje, y ninguno queda bajo el terreno', () => {
    for (const s of dataset.sections) expect(DROPS_ANCHORS[s.id], s.id).toBeDefined()
    for (const [id, a] of Object.entries(DROPS_ANCHORS)) expect(a[1], id).toBeGreaterThan(0)
  })

  it('arma las 11 secciones en orden, con 66 puntos en total', () => {
    const views = buildSectionViews(dataset, DROPS_ANCHORS)
    expect(views).toHaveLength(11)
    expect(views.map((v) => v.section.order)).toEqual(
      [...views.map((v) => v.section.order)].sort((a, b) => a - b),
    )
    expect(views.reduce((n, v) => n + v.count, 0)).toBe(66)
  })

  it('el piso de enganche se ancla a la altura documentada del plano del mástil (20,629 m sobre el eje)', () => {
    const [x, y] = DROPS_ANCHORS['piso-enganche']
    // distancia desde la base del mástil (x = −1 m, y = 1,2192 m) a lo largo del eje
    expect(Math.hypot(x + 1, y - 1.2192)).toBeCloseTo(20.629, 3)
  })

  it('una sección sin ancla se descarta en lugar de inventar una posición', () => {
    expect(buildSectionViews(dataset, {})).toEqual([])
  })
})

describe('componentes del modelo nativo', () => {
  it('cada componente del mapeo existe en el equipo 10 y solo apunta a ids del dataset', () => {
    const ids = new Set(RIG10_RIG.components.map((c) => c.id))
    const known = new Set<string>(DROPS_COMPONENT_IDS)
    for (const [native, drops] of Object.entries(DROPS_NATIVE_COMPONENTS)) {
      expect(ids.has(native), native).toBe(true)
      for (const d of drops) expect(known.has(d), `${native} → ${d}`).toBe(true)
    }
  })

  it('ningún componente del dataset queda sin dueño en el modelo nativo (los 66 puntos son alcanzables)', () => {
    const owned = new Set(Object.values(DROPS_NATIVE_COMPONENTS).flat())
    for (const p of dataset.points) expect(owned.has(p.componentId), p.id).toBe(true)
  })

  it('pointsOf junta los puntos de los componentes dados y highestZone toma la zona más alta', () => {
    const mastil = pointsOf(dataset, DROPS_NATIVE_COMPONENTS.sk575_mastil ?? [])
    expect(mastil.length).toBe(23 + 11)
    expect(highestZone(mastil)).toBe('alto')
    expect(pointsOf(dataset, [])).toEqual([])
    expect(highestZone([])).toBeNull()
    // el piso de trabajo no figura en el A2: sin clasificar no cuenta como zona
    const sinZona = dataset.points.filter((p) => p.zone === null)
    expect(highestZone(sinZona)).toBeNull()
  })
})
