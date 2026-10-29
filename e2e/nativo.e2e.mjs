// E2E del motor R3F nativo (Chrome instalado + playwright-core, igual que e2e/visor-v2.e2e.mjs).
//
//   npm run test:e2e                              → levanta el servidor de desarrollo de Vite (la sonda `window.__rigNativo` solo existe en desarrollo)
//   E2E_CHROME=/ruta/al/chrome npm run test:e2e   → otro Chrome o Chromium
//
// Cada prueba abre su propia página: cargar la escena con render por software tarda unos segundos, pero así ninguna
// depende del estado que dejó la anterior (cámara, selección, aislamiento). Lo que se lee sale del estado real de la
// cámara y del store, no de capturas. Se omite si no hay Chrome (en CI ubuntu-latest sí lo hay).
//
// Estas pruebas son el gate automatizado de las filas "Foco de cámara", "Aislamiento" y "Ortográfica / perspectiva"
// de docs/FEATURE_PARITY.md; no reemplazan una pasada humana en un dispositivo real.
import assert from 'node:assert/strict'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright-core'
import { createServer } from 'vite'

const root = path.resolve(import.meta.dirname, '..')
// Chrome instalado (channel 'chrome'); `E2E_CHROME=/ruta/al/ejecutable` permite usar otro Chrome o Chromium.
const LANZAR = {
  ...(process.env.E2E_CHROME ? { executablePath: process.env.E2E_CHROME } : { channel: 'chrome' }),
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
  ],
}
const MASTIL = 'sk575_mastil'
const LEJANO = 'sk575_piletas' // lejos del mástil en pantalla: un clic ahí no puede caer sobre el mástil
let browser, server, base
let skip = false
const problemas = []

before(async () => {
  try {
    browser = await chromium.launch(LANZAR)
  } catch {
    skip = 'Chrome no disponible'
    return
  }
  server = await createServer({
    root,
    logLevel: 'error',
    server: { host: '127.0.0.1', hmr: false },
  })
  await server.listen()
  base = server.resolvedUrls.local[0]
})

after(async () => {
  await browser?.close()
  await server?.close()
})

/** Página con el motor nativo cargado. Los errores de consola propios se juntan en `problemas`. */
const abrir = async (viewport = { width: 1280, height: 760 }) => {
  problemas.length = 0
  const page = await browser.newPage({ viewport })
  page.on('console', (m) => {
    // El visor V2 queda montado (oculto) en un iframe sandbox de origen opaco: el servidor de desarrollo no manda
    // cabeceras CORS y sus fetch de los GLB fallan (el V2 cae a su respaldo). No es del motor nativo.
    if (m.type() === 'error' && !/CORS|ERR_FAILED/.test(m.text())) problemas.push(m.text())
  })
  page.on('pageerror', (e) => problemas.push(e.message))
  await page.goto(`${base}?dev=1`, { waitUntil: 'load', timeout: 120_000 })
  await page.getByRole('button', { name: /R3F nativo/ }).click()
  await page.waitForFunction(() => window.__rigNativo?.estado().componentes.length > 0, null, {
    timeout: 120_000,
  })
  // La primera carga renderiza una ráfaga de cuadros (compilación de shaders por software, efectos al quedar quieta la
  // cámara). Se espera a que la escena esté quieta antes de interactuar: así un clic no compite con esa ráfaga.
  let previo = -1
  let iguales = 0
  for (let i = 0; i < 120 && iguales < 6; i++) {
    await page.waitForTimeout(250)
    const { cuadros } = await estado(page)
    iguales = cuadros === previo ? iguales + 1 : 0
    previo = cuadros
  }
  return page
}

/**
 * Una prueba con su propia página: se cierra siempre (aunque falle, para no dejar una escena renderizando que compita por
 * CPU con la siguiente) y, si la prueba pasó, no debe haber errores de consola del motor nativo.
 */
const prueba = (nombre, fn) =>
  test(nombre, async (t) => {
    if (skip) return t.skip(skip)
    const page = await abrir()
    try {
      await fn(page)
      assert.deepEqual([...problemas], [], 'errores de consola del motor nativo')
    } finally {
      await page.close()
    }
  })

const estado = (page) => page.evaluate(() => window.__rigNativo.estado())
const cajas = (page) => page.evaluate(() => window.__rigNativo.cajas())
const boton = (page, nombre) => page.getByRole('button', { name: nombre, exact: true })
const cerca = (a, b, eps = 1e-6) =>
  a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= eps)

/** Espera (hasta `ms`) a que el estado cumpla `pred`; si no, falla mostrando el último estado leído. */
const hasta = async (page, pred, ms = 30_000) => {
  const t0 = Date.now()
  let e
  while (Date.now() - t0 < ms) {
    e = await estado(page)
    if (pred(e)) return e
    await page.waitForTimeout(100)
  }
  assert.fail(
    `tiempo agotado; último estado: ${JSON.stringify({ camara: e.camara, tienda: e.tienda })}`,
  )
}

/** Clic sobre un punto del componente que el raycast resuelve a ese mismo componente. */
const clic = async (page, id) => {
  const p = await page.evaluate((i) => window.__rigNativo.puntoClicable(i), id)
  assert.ok(p, `no hay un punto clicable para ${id}`)
  await page.mouse.click(p.x, p.y)
  return p
}

// Fórmulas del V2 (docs/legacy-audit-2026-09-25.md), enunciadas de nuevo acá como especificación independiente.
const distanciaFoco = (t) => Math.min(Math.max(Math.max(...t) * 1.35 + 3, 6), 70)
const altoFoco = (t) => Math.max(4, Math.max(t[1], t[0] * 0.75, t[2] * 0.75) * 1.4 + 2)
/** Mismo conjunto de ids, sin importar el orden (el registro de picking se reordena cuando React re-ejecuta los refs). */
const mismoConjunto = (a, b, msg) => assert.deepEqual([...a].sort(), [...b].sort(), msg)
const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

prueba(
  'el motor nativo arranca en perspectiva, con los componentes montados y los controles sin efecto hasta elegir uno',
  async (page) => {
    const e = await estado(page)
    assert.equal(e.camara.tipo, 'PerspectiveCamera')
    assert.ok(e.componentes.length >= 16, `componentes montados: ${e.componentes.length}`)
    assert.ok(e.componentes.includes(MASTIL) && e.componentes.includes(LEJANO))
    assert.deepEqual(e.visibles, e.componentes, 'al arrancar se dibuja todo')
    assert.equal(e.tienda.seleccionado, null)
    for (const n of ['Enfocar', 'Volver', 'Aislar selección'])
      assert.equal(await boton(page, n).isDisabled(), true, `${n} deshabilitado sin selección`)
    assert.equal(await boton(page, 'Ortográfica').getAttribute('aria-pressed'), 'false')
  },
)

prueba(
  'foco de cámara: encuadra el componente (distancia del V2), el segundo foco no pisa la vista y "Volver" la restaura',
  async (page) => {
    const inicial = (await estado(page)).camara
    await clic(page, MASTIL)
    await hasta(page, (e) => e.tienda.seleccionado === MASTIL)
    const { centro, tamano } = (await cajas(page))[MASTIL]
    await boton(page, 'Enfocar').click()
    // Se espera el estado final concreto (no "que nada cambie": con un cuadro lento la cámara puede seguir en su estado inicial).
    const foco = await hasta(
      page,
      (e) =>
        cerca(e.camara.objetivo, centro, 1e-3) &&
        Math.abs(distancia(e.camara.posicion, e.camara.objetivo) - distanciaFoco(tamano)) < 1e-3,
    )
    assert.equal(foco.tienda.puedeVolver, true)

    // Un segundo foco no reemplaza la vista guardada: "Volver" sigue llevando a la vista inicial.
    await boton(page, 'Enfocar').click()
    await page.waitForTimeout(500)
    await boton(page, 'Volver').click()
    const vuelta = await hasta(
      page,
      (e) =>
        cerca(e.camara.posicion, inicial.posicion, 1e-3) &&
        cerca(e.camara.objetivo, inicial.objetivo, 1e-3),
    )
    assert.equal(vuelta.tienda.puedeVolver, false)
  },
)

prueba(
  'aislamiento: deja solo el seleccionado, los ocultos no responden a hover ni a clic y restaurar devuelve el estado inicial',
  async (page) => {
    const antes = await estado(page)
    const lejano = await page.evaluate((i) => window.__rigNativo.puntoClicable(i), LEJANO)
    assert.ok(lejano, 'punto clicable del componente lejano, con todo visible')

    await clic(page, MASTIL)
    await hasta(page, (e) => e.tienda.seleccionado === MASTIL)
    await boton(page, 'Aislar selección').click()
    const aislado = await hasta(page, (e) => e.tienda.aislado)
    assert.deepEqual(aislado.visibles, [MASTIL], 'solo se dibuja el seleccionado')
    assert.equal(aislado.tienda.seleccionado, MASTIL, 'la selección se conserva')
    assert.equal(await boton(page, 'Aislar selección').getAttribute('aria-pressed'), 'true')

    // Hover y clic sobre un componente oculto: no deben llegarle (three lanza el raycast también contra los invisibles).
    await page.mouse.move(lejano.x, lejano.y)
    await page.waitForTimeout(400)
    assert.notEqual(await page.evaluate(() => document.body.style.cursor), 'pointer')
    assert.equal((await estado(page)).tienda.hover, null)
    await page.mouse.click(lejano.x, lejano.y)
    const tras = await hasta(page, (e) => e.tienda.seleccionado !== MASTIL)
    assert.equal(tras.tienda.seleccionado, null, 'el clic sobre un oculto no lo selecciona')
    assert.equal(
      await boton(page, 'Aislar selección').isDisabled(),
      false,
      'sigue habilitado para restaurar',
    )

    await boton(page, 'Aislar selección').click()
    const restaurado = await hasta(page, (e) => !e.tienda.aislado)
    mismoConjunto(restaurado.visibles, antes.visibles, 'restaurar devuelve lo que se dibujaba')
    assert.deepEqual(restaurado.tienda.ocultos, [])

    // El que estaba oculto vuelve a responder.
    await page.mouse.click(lejano.x, lejano.y)
    await hasta(page, (e) => e.tienda.seleccionado === LEJANO)
  },
)

prueba(
  'proyección: alternar conserva posición y objetivo, el frustum es de 44 m con el aspecto del lienzo y el aspecto no queda viejo al redimensionar',
  async (page) => {
    const p0 = (await estado(page)).camara

    await boton(page, 'Ortográfica').click()
    const o = (await hasta(page, (e) => e.camara.tipo === 'OrthographicCamera')).camara
    assert.ok(cerca(o.posicion, p0.posicion), 'misma posición')
    assert.ok(cerca(o.objetivo, p0.objetivo), 'mismo objetivo')
    const alto = o.frustum.top - o.frustum.bottom
    assert.ok(Math.abs(alto - 44) < 1e-6, `alto del frustum = 44 m (${alto})`)
    const lienzo = (await estado(page)).lienzo
    assert.ok(
      Math.abs((o.frustum.right - o.frustum.left) / alto - lienzo.ancho / lienzo.alto) < 1e-6,
    )

    // Redimensionar con la ortográfica activa y volver: r3f solo actualiza la cámara activa, la de perspectiva queda vieja.
    await page.setViewportSize({ width: 900, height: 700 })
    await page.waitForTimeout(800)
    await boton(page, 'Ortográfica').click()
    const p1 = await hasta(page, (e) => e.camara.tipo === 'PerspectiveCamera')
    assert.ok(
      Math.abs(p1.camara.aspecto - p1.lienzo.ancho / p1.lienzo.alto) < 1e-6,
      'aspecto actualizado',
    )
    assert.ok(cerca(p1.camara.posicion, p0.posicion) && cerca(p1.camara.objetivo, p0.objetivo))

    // El picking funciona con la cámara ortográfica.
    await boton(page, 'Ortográfica').click()
    await hasta(page, (e) => e.camara.tipo === 'OrthographicCamera')
    await clic(page, MASTIL)
    await hasta(page, (e) => e.tienda.seleccionado === MASTIL)
  },
)

prueba(
  'foco en ortográfica: ajusta el alto del frustum al componente y "Volver" restaura proyección, alto y vista',
  async (page) => {
    await boton(page, 'Ortográfica').click()
    const previa = (await hasta(page, (e) => e.camara.tipo === 'OrthographicCamera')).camara
    await clic(page, MASTIL)
    await hasta(page, (e) => e.tienda.seleccionado === MASTIL)

    const { centro, tamano } = (await cajas(page))[MASTIL]
    await boton(page, 'Enfocar').click()
    const foco = (await hasta(page, (e) => cerca(e.camara.objetivo, centro, 1e-3))).camara
    assert.ok(
      Math.abs(foco.frustum.top - foco.frustum.bottom - altoFoco(tamano)) < 1e-6,
      `alto del frustum = fórmula del V2 sobre la caja (${foco.frustum.top - foco.frustum.bottom} vs ${altoFoco(tamano)})`,
    )
    assert.equal(foco.zoom, 1)

    // Cambiar de proyección con el foco activo; "Volver" restaura la proyección previa al foco.
    await boton(page, 'Ortográfica').click()
    await hasta(page, (e) => e.camara.tipo === 'PerspectiveCamera')
    await boton(page, 'Volver').click()
    const vuelta = await hasta(
      page,
      (e) =>
        e.camara.tipo === 'OrthographicCamera' &&
        cerca(e.camara.posicion, previa.posicion, 1e-3) &&
        cerca(e.camara.objetivo, previa.objetivo, 1e-3),
    )
    assert.ok(
      Math.abs(vuelta.camara.frustum.top - vuelta.camara.frustum.bottom - 44) < 1e-6,
      'alto 44 m restaurado',
    )
  },
)

prueba(
  'selección y ficha: cada componente visible se selecciona con un clic y muestra su ficha con nombre y nivel',
  async (page) => {
    const { componentes } = await estado(page)
    const ocluidos = []
    const nombres = new Set()
    for (const id of componentes) {
      const p = await page.evaluate((i) => window.__rigNativo.puntoClicable(i), id)
      if (!p) {
        ocluidos.push(id)
        continue
      }
      await page.mouse.click(p.x, p.y)
      await hasta(page, (e) => e.tienda.seleccionado === id)
      const ficha = page.getByTestId('component-card')
      await ficha.waitFor({ state: 'visible' })
      const nombre = (await ficha.getByRole('heading').first().textContent())?.trim()
      assert.ok(nombre, `la ficha de ${id} tiene nombre`)
      nombres.add(nombre)
      assert.match(
        await ficha.getByTestId('grade-badge').textContent(),
        /^[ABC] · (Confirmado|Parcial|Aproximado)$/,
        id,
      )
      assert.match(await ficha.textContent(), /no as-built/)
    }
    // Los que quedan tapados desde la vista inicial no se pueden elegir con el mouse: se informan, no se ignoran.
    console.log(
      `# sin punto clicable desde la vista inicial (${ocluidos.length}): ${ocluidos.join(', ') || 'ninguno'}`,
    )
    assert.ok(
      componentes.length - ocluidos.length >= 12,
      'la mayoría de los componentes se puede seleccionar',
    )
    assert.equal(
      nombres.size,
      componentes.length - ocluidos.length,
      'cada componente tiene su propia ficha',
    )
  },
)

prueba('tooltip: el hover muestra el nombre del componente y desaparece al salir', async (page) => {
  const p = await page.evaluate((i) => window.__rigNativo.puntoClicable(i), MASTIL)
  assert.ok(p)
  await page.mouse.move(p.x, p.y)
  await hasta(page, (e) => e.tienda.hover === MASTIL)
  const tooltip = page.getByTestId('hover-tooltip')
  await tooltip.waitFor({ state: 'visible' })
  assert.ok((await tooltip.textContent())?.trim().length > 0, 'el tooltip tiene el nombre')
  // Al salir del lienzo (cabecera) el hover se limpia y el tooltip se va.
  await page.mouse.move(640, 15)
  await hasta(page, (e) => e.tienda.hover === null)
  await tooltip.waitFor({ state: 'detached' })
})

prueba('Esc deselecciona el componente y cierra la ficha', async (page) => {
  await clic(page, MASTIL)
  await hasta(page, (e) => e.tienda.seleccionado === MASTIL)
  await page.getByTestId('component-card').waitFor({ state: 'visible' })
  await page.keyboard.press('Escape')
  await hasta(page, (e) => e.tienda.seleccionado === null)
  await page.getByTestId('component-card').waitFor({ state: 'detached' })
})

prueba('árbol: elige un componente tapado y lo oculta y lo muestra de la escena', async (page) => {
  const BOP = 'sk575_bop' // desde la vista inicial queda tapado: solo se puede elegir desde el árbol
  assert.equal(
    await page.evaluate((i) => window.__rigNativo.puntoClicable(i), BOP),
    null,
    'precondición: el BOP no es clicable en la vista inicial',
  )
  const fila = page.getByTestId(`tree-item-${BOP}`)
  await fila.getByRole('button').click()
  await hasta(page, (e) => e.tienda.seleccionado === BOP)
  await page.getByTestId('component-card').waitFor({ state: 'visible' })

  // Ocultar el seleccionado desde el árbol: sale de la escena y de la selección.
  await fila.getByRole('checkbox').uncheck()
  let e = await hasta(page, (s) => s.tienda.ocultos.includes(BOP))
  assert.ok(!e.visibles.includes(BOP), 'el BOP oculto no se dibuja')
  assert.equal(e.tienda.seleccionado, null)

  // Elegir uno oculto lo muestra y lo selecciona.
  await fila.getByRole('button').click()
  e = await hasta(page, (s) => s.tienda.seleccionado === BOP && !s.tienda.ocultos.includes(BOP))
  assert.ok(e.visibles.includes(BOP), 'el BOP vuelve a dibujarse')

  // La casilla del grupo oculta todo el grupo y la escena lo refleja.
  const grupo = page.locator('section', { has: fila })
  const ids = await grupo
    .locator('[data-testid^="tree-item-"]')
    .evaluateAll((els) => els.map((el) => el.dataset.testid.replace('tree-item-', '')))
  assert.ok(ids.length > 1)
  await grupo.getByRole('checkbox').first().uncheck()
  e = await hasta(page, (s) => ids.every((id) => s.tienda.ocultos.includes(id)))
  assert.ok(
    ids.every((id) => !e.visibles.includes(id)),
    'todo el grupo oculto en la escena',
  )
  await grupo.getByRole('checkbox').first().check()
  e = await hasta(page, (s) => ids.every((id) => !s.tienda.ocultos.includes(id)))
  mismoConjunto(e.visibles, e.componentes, 'al mostrar el grupo vuelven a dibujarse todos')
})

// Proyección ortográfica enunciada de nuevo acá (independiente del proyector del motor): base de la cámara a partir de su
// posición y objetivo, con el eje Y arriba; `k` = píxeles por metro (alto del lienzo / alto del frustum).
const proyectarOrto = (camara, lienzo, p) => {
  const [px, py, pz] = camara.posicion
  const [tx, ty, tz] = camara.objetivo
  const unit = (v) => v.map((c) => c / Math.hypot(...v))
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const dir = unit([tx - px, ty - py, tz - pz])
  const derecha = unit(cross(dir, [0, 1, 0]))
  const arriba = cross(derecha, dir)
  const k = lienzo.alto / (camara.frustum.top - camara.frustum.bottom)
  const d = [p[0] - tx, p[1] - ty, p[2] - tz]
  return { x: lienzo.ancho / 2 + dot(d, derecha) * k, y: lienzo.alto / 2 - dot(d, arriba) * k }
}

/** Posición (en el lienzo) y visibilidad de cada etiqueta dibujada. */
const leerEtiquetas = (page) =>
  page.evaluate(() => {
    const capa = document.querySelector('[data-testid="component-labels"]')
    if (!capa) return null
    const o = capa.getBoundingClientRect()
    return [...capa.querySelectorAll('[data-testid^="label-"]')].map((el) => {
      const r = el.getBoundingClientRect()
      return {
        id: el.dataset.testid.replace('label-', ''),
        visible: getComputedStyle(el).display !== 'none',
        x: r.left + r.width / 2 - o.left,
        y: r.top + r.height / 2 - o.top,
      }
    })
  })

prueba(
  'etiquetas: aparecen sobre cada componente con su número, lo siguen al mover la cámara y se apagan',
  async (page) => {
    assert.equal(await leerEtiquetas(page), null, 'apagadas al arrancar: no hay capa de etiquetas')
    await boton(page, 'Ortográfica').click()
    await hasta(page, (e) => e.tienda.proyeccion === 'orthographic')
    await boton(page, 'Etiquetas').click()
    assert.equal(await boton(page, 'Etiquetas').getAttribute('aria-pressed'), 'true')

    // Cada etiqueta cae donde la proyección independiente pone el centro de la caja de su componente; las que están
    // claramente dentro de la pantalla se ven y las claramente fuera se ocultan.
    // Cámara, cajas y etiquetas se leen en una sola evaluación (sin un cuadro de por medio) y, si no cuadran porque la cámara
    // todavía se movía (con render por software un cuadro tarda más que el intervalo de lectura), se vuelve a leer.
    const verificar = async (nombre) => {
      let ultimo = ''
      for (let intento = 0; intento < 40; intento++) {
        await page.waitForTimeout(250)
        const { e, cajasEscena, etiquetas } = await page.evaluate(() => {
          const capa = document.querySelector('[data-testid="component-labels"]')
          const o = capa.getBoundingClientRect()
          return {
            e: window.__rigNativo.estado(),
            cajasEscena: window.__rigNativo.cajas(),
            etiquetas: [...capa.querySelectorAll('[data-testid^="label-"]')].map((el) => {
              const r = el.getBoundingClientRect()
              return {
                id: el.dataset.testid.replace('label-', ''),
                visible: getComputedStyle(el).display !== 'none',
                x: r.left + r.width / 2 - o.left,
                y: r.top + r.height / 2 - o.top,
              }
            }),
          }
        })
        const fallos = []
        let vistas = 0
        for (const et of etiquetas) {
          const esperado = proyectarOrto(e.camara, e.lienzo, cajasEscena[et.id].centro)
          const nx = (esperado.x - e.lienzo.ancho / 2) / (e.lienzo.ancho / 2)
          const ny = (esperado.y - e.lienzo.alto / 2) / (e.lienzo.alto / 2)
          const dentro = Math.max(Math.abs(nx), Math.abs(ny))
          if (dentro < 0.95) {
            if (!et.visible) fallos.push(`${et.id} se ve (está dentro de la pantalla)`)
            else if (Math.hypot(et.x - esperado.x, et.y - esperado.y) >= 3)
              fallos.push(
                `${et.id} en (${et.x.toFixed(1)}, ${et.y.toFixed(1)}), esperado (${esperado.x.toFixed(1)}, ${esperado.y.toFixed(1)})`,
              )
            else vistas++
          } else if (dentro > 1.25 && et.visible)
            fallos.push(`${et.id} se oculta (está fuera de pantalla)`)
        }
        if (etiquetas.length < 12)
          fallos.push(`hay ${etiquetas.length} etiquetas, se esperaban ≥ 12`)
        if (vistas < 8) fallos.push(`solo ${vistas} etiquetas visibles, se esperaban ≥ 8`)
        if (fallos.length === 0) return
        ultimo = fallos.join('; ')
      }
      assert.fail(`${nombre}: ${ultimo}`)
    }
    await verificar('vista inicial')

    // Al enfocar un componente la cámara se mueve: las etiquetas la siguen.
    await clic(page, MASTIL)
    await hasta(page, (e) => e.tienda.seleccionado === MASTIL)
    await boton(page, 'Enfocar').click()
    await hasta(page, (e) => e.tienda.puedeVolver)
    await verificar('tras enfocar')

    // Ocultar un componente desde el árbol le quita la etiqueta.
    const antes = (await leerEtiquetas(page)).length
    await page.getByTestId('tree-item-sk575_bop').getByRole('checkbox').uncheck()
    await hasta(page, (e) => e.tienda.ocultos.includes('sk575_bop'))
    const sin = await leerEtiquetas(page)
    assert.equal(sin.length, antes - 1)
    assert.ok(!sin.some((et) => et.id === 'sk575_bop'))

    // Apagadas, desaparece la capa.
    await boton(page, 'Etiquetas').click()
    assert.equal(await leerEtiquetas(page), null)
  },
)

const num = (n) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const estadoMedicion = (page) =>
  page.evaluate(() => {
    const e = window.__rigNativo.estado()
    return {
      ...e.herramientas,
      seleccionado: e.tienda.seleccionado,
    }
  })

prueba(
  'medición: dos clics sobre el modelo dan la distancia aproximada, el tercero reinicia y no selecciona',
  async (page) => {
    await boton(page, 'Medir').click()
    assert.equal(await boton(page, 'Medir').getAttribute('aria-pressed'), 'true')
    await page.getByTestId('measure-hint').waitFor({ state: 'visible' })
    assert.match(await page.getByTestId('measure-hint').textContent(), /dos superficies/)

    // Dos puntos de componentes distintos; el impacto esperado sale de un raycast propio de la sonda.
    const puntos = []
    for (const id of [MASTIL, LEJANO]) {
      const p = await page.evaluate((i) => window.__rigNativo.puntoClicable(i), id)
      assert.ok(p, `punto clicable de ${id}`)
      const esperado = await page.evaluate(([x, y]) => window.__rigNativo.impacto(x, y), [p.x, p.y])
      assert.equal(esperado.componente, id)
      await page.mouse.click(p.x, p.y)
      puntos.push(esperado.punto)
      await page.waitForFunction(
        (n) => window.__rigNativo.estado().herramientas.puntos.length === n,
        puntos.length,
        { timeout: 30_000 },
      )
    }
    let m = await estadoMedicion(page)
    assert.equal(m.seleccionado, null, 'midiendo, el clic no selecciona')
    assert.equal(m.puntos.length, 2)
    // El clic cae en píxeles enteros y la sonda lanza el rayo en el centro exacto: coinciden a menos de ~un píxel (≈ 6 cm
    // a esta escala), así que se tolera 0,25 m en cada punto.
    puntos.forEach((p, i) =>
      assert.ok(distancia(m.puntos[i], p) < 0.25, `punto ${i + 1} ≈ impacto del rayo`),
    )
    const medida = distancia(m.puntos[0], m.puntos[1])
    const esperado = distancia(puntos[0], puntos[1])
    assert.ok(esperado > 5, 'los dos puntos están lejos entre sí')
    assert.ok(Math.abs(medida - esperado) < 0.5, 'la distancia medida ≈ la del rayo propio')
    const rotulo = page.getByTestId('tool-label-measure')
    await rotulo.waitFor({ state: 'attached' })
    assert.equal(await rotulo.textContent(), `≈ ${num(medida)} m · modelo`)
    assert.match(await page.getByTestId('measure-hint').textContent(), /aproximada/)

    // Tercer clic: empieza una medición nueva (queda solo el punto nuevo, sin rótulo).
    const q = await page.evaluate((i) => window.__rigNativo.puntoClicable(i), 'sk575_carrier')
    assert.ok(q)
    await page.mouse.click(q.x, q.y)
    await page.waitForFunction(
      () => window.__rigNativo.estado().herramientas.puntos.length === 1,
      null,
      {
        timeout: 30_000,
      },
    )
    assert.equal(await page.getByTestId('tool-label-measure').count(), 0)

    // Borrar medición; y fuera del modo medir el clic vuelve a seleccionar.
    await boton(page, 'Borrar medición').click()
    m = await estadoMedicion(page)
    assert.equal(m.puntos.length, 0)
    await boton(page, 'Medir').click()
    await clic(page, MASTIL)
    await hasta(page, (e) => e.tienda.seleccionado === MASTIL)
  },
)

// Cotas enunciadas de nuevo acá, independientes de `rig10-dimensions.ts`: valor y nivel de la especificación de cada
// componente (tomados del folleto, planos y layout) y el punto medio de cada línea en el marco de escena.
const L = (3.5 * Math.PI) / 180
const COTAS = [
  [
    'altura-mastil',
    '31,71 m · Altura (104 ft) · A',
    [-1 + 15.855 * Math.sin(L), 1.2192 + 15.855 * Math.cos(L), -2.8],
  ],
  [
    'altura-piso',
    '3,606 m · Altura del piso (12 ft) · B · Fuente en conflicto',
    [2.6, 1.803, -2.8],
  ],
  ['largo-bastidor', '12,192 m · Bastidor (480") · B', [-2 - 6.096, 0.3, -2.8]],
  [
    'anclaje-lado-carrier',
    '27,4 ± 3 m · Anclajes desde el pozo · B · Fuente en conflicto',
    [-13.7, 0.15, -3.8],
  ],
  [
    'anclaje-lado-v',
    '24,4 ± 3 m · Anclajes desde el pozo · B · Fuente en conflicto',
    [12.2, 0.15, -3.8],
  ],
]

prueba(
  'cotas: cada línea lleva el valor y el nivel A/B/C de su especificación, en su lugar, y se apagan',
  async (page) => {
    assert.equal(await page.getByTestId('tool-labels').count(), 0, 'apagadas al arrancar')
    await boton(page, 'Ortográfica').click()
    await hasta(page, (e) => e.tienda.proyeccion === 'orthographic')
    await boton(page, 'Cotas').click()
    assert.equal(await boton(page, 'Cotas').getAttribute('aria-pressed'), 'true')
    // Cámara y rótulos en una sola evaluación; si no cuadran porque la cámara aún se movía (render por software), se relee.
    let ultimo = ''
    let ok = false
    for (let intento = 0; intento < 40 && !ok; intento++) {
      await page.waitForTimeout(250)
      const { e, rotulos } = await page.evaluate(
        (ids) => {
          const o = document.querySelector('[data-testid="tool-labels"]').getBoundingClientRect()
          return {
            e: window.__rigNativo.estado(),
            rotulos: ids.map((id) => {
              const el = document.querySelector(`[data-testid="tool-label-dim-${id}"]`)
              const r = el.getBoundingClientRect()
              return {
                id,
                texto: el.textContent,
                visible: getComputedStyle(el).display !== 'none',
                x: r.left + r.width / 2 - o.left,
                y: r.top + r.height / 2 - o.top,
              }
            }),
          }
        },
        COTAS.map((c) => c[0]),
      )
      const fallos = []
      let visibles = 0
      for (const [id, texto, centro] of COTAS) {
        const r = rotulos.find((x) => x.id === id)
        if (r.texto !== texto) fallos.push(`${id}: texto "${r.texto}" ≠ "${texto}"`)
        const esperado = proyectarOrto(e.camara, e.lienzo, centro)
        const nx = (esperado.x - e.lienzo.ancho / 2) / (e.lienzo.ancho / 2)
        const ny = (esperado.y - e.lienzo.alto / 2) / (e.lienzo.alto / 2)
        const dentro = Math.max(Math.abs(nx), Math.abs(ny))
        if (dentro < 0.95) {
          if (!r.visible) fallos.push(`${id} se ve`)
          else if (Math.hypot(r.x - esperado.x, r.y - esperado.y) >= 3)
            fallos.push(
              `${id} en (${r.x.toFixed(1)}, ${r.y.toFixed(1)}), esperado (${esperado.x.toFixed(1)}, ${esperado.y.toFixed(1)})`,
            )
          else visibles++
        } else if (dentro > 1.25 && r.visible) fallos.push(`${id} fuera de pantalla se oculta`)
      }
      if (visibles < 2) fallos.push(`solo ${visibles} cotas a la vista, se esperaban ≥ 2`)
      ok = fallos.length === 0
      ultimo = fallos.join('; ')
    }
    assert.ok(ok, ultimo)

    await boton(page, 'Cotas').click()
    assert.equal(await page.getByTestId('tool-labels').count(), 0)
  },
)
// Cotas de las vistas del V2 (`na` y `Uh` de la base del legacy), enunciadas de nuevo acá como especificación independiente.
const VISTAS = [
  ['Isométrica', [40, 40, 42], [-2, 13, 0], true, 44],
  ['Frontal', [50, 15, 0], [-3, 15, 0], true, 44],
  ['Lateral', [-3, 15, 54], [-3, 15, 0], true, 44],
  ['Superior', [-2.5, 72, 0.02], [-2.5, 0, 0], true, 62],
  ['Boca de pozo', [6.5, 3.4, 5.5], [0, 2.4, 0], false, null],
]

prueba(
  'vistas estándar: cada una lleva la cámara a su preset con la proyección y la escala del legacy',
  async (page) => {
    // Se recorren fuera de orden y se vuelve a una ortográfica después de la perspectiva ("Boca de pozo").
    for (const nombre of ['Superior', 'Boca de pozo', 'Lateral', 'Frontal', 'Isométrica']) {
      const [, pos, tgt, orto, span] = VISTAS.find((v) => v[0] === nombre)
      await boton(page, nombre).click()
      const e = await hasta(
        page,
        (s) => cerca(s.camara.posicion, pos, 1e-3) && cerca(s.camara.objetivo, tgt, 1e-3),
      )
      assert.equal(e.camara.tipo, orto ? 'OrthographicCamera' : 'PerspectiveCamera', nombre)
      assert.equal(e.tienda.proyeccion, orto ? 'orthographic' : 'perspective', nombre)
      if (orto) {
        const f = e.camara.frustum
        assert.ok(Math.abs(f.top - f.bottom - span) < 1e-6, `${nombre}: alto del frustum ${span} m`)
        assert.equal(e.camara.zoom, 1, `${nombre}: zoom reiniciado`)
      }
      assert.equal(await boton(page, nombre).getAttribute('aria-pressed'), 'true', nombre)
      assert.equal(
        await page.locator('[data-testid="view-buttons"] [aria-pressed="true"]').count(),
        1,
        'una sola vista resaltada',
      )
    }
  },
)

prueba('vistas estándar: ir a una vista descarta el "Volver" de un foco previo', async (page) => {
  await clic(page, MASTIL)
  await hasta(page, (e) => e.tienda.seleccionado === MASTIL)
  await boton(page, 'Enfocar').click()
  await hasta(page, (e) => e.tienda.puedeVolver)
  await boton(page, 'Frontal').click()
  const e = await hasta(
    page,
    (s) => cerca(s.camara.posicion, [50, 15, 0], 1e-3) && !s.tienda.puedeVolver,
  )
  assert.equal(e.tienda.puedeVolver, false)
  assert.ok(await boton(page, 'Volver').isDisabled(), '"Volver" queda deshabilitado')
})

// Zonas ilustrativas enunciadas de nuevo acá (no se importan del dataset): del V2, círculo de 1,1 × 31,71 m en el pie del
// mástil, franja de la línea de cable y círculo bajo la carga suspendida, en metros sobre el terreno (X, Z).
const ZONAS = [
  ['zona-envolvente-mastil', [-1, 0], [69.762, 69.762]],
  ['zona-cable-tension', [-2.415, 0], [6.69, 2.6]],
  ['zona-carga-suspendida', [0, 0], [4.8, 4.8]],
]

prueba(
  'zonas QHSE: ilustrativas y sin validar, con su leyenda; las enciende el botón o el modo QHSE y se apagan al salir',
  async (page) => {
    const zonas = () => page.evaluate(() => window.__rigNativo.zonas())
    assert.deepEqual(await zonas(), [], 'apagadas al arrancar')
    assert.equal(await page.getByTestId('qhse-panel').count(), 0)

    // Botón: aparecen las tres zonas, en su lugar y con su tamaño, y la leyenda con el aviso.
    await boton(page, 'Zonas').click()
    assert.equal(await boton(page, 'Zonas').getAttribute('aria-pressed'), 'true')
    await page.getByTestId('qhse-panel').waitFor({ state: 'visible' })
    await page.waitForFunction(() => window.__rigNativo.zonas().length === 3, null, {
      timeout: 30_000,
    })
    for (const [id, [cx, cz], [ax, az]] of ZONAS) {
      const z = (await zonas()).find((x) => x.id === id)
      assert.ok(z, id)
      assert.ok(
        Math.abs(z.centro[0] - cx) < 0.05 && Math.abs(z.centro[2] - cz) < 0.05,
        `${id}: centro`,
      )
      assert.ok(
        Math.abs(z.tamano[0] - ax) < 0.1 && Math.abs(z.tamano[2] - az) < 0.1,
        `${id}: tamaño`,
      )
      assert.ok(z.centro[1] < 0.2 && z.tamano[1] < 0.2, `${id}: apoyada sobre el terreno`)
      assert.ok(z.transparente && z.opacidad < 0.3, `${id}: relleno traslúcido (no tapa la escena)`)
    }
    const panel = page.getByTestId('qhse-panel')
    assert.match(await panel.textContent(), /ZONAS ILUSTRATIVAS — SIN VALIDAR/)
    assert.match(await panel.textContent(), /no sustituyen exclusiones aprobadas/)
    assert.equal(
      await panel.getByText('Pendiente de validación').count(),
      3,
      'estatus de cada zona',
    )
    assert.doesNotMatch(await panel.textContent(), /\d+([.,]\d+)?\s*m\b/, 'no muestra medidas')
    assert.equal(
      await page.getByTestId('qhse-controls').count(),
      0,
      'fuera de QHSE no hay controles',
    )

    // Apagar a mano.
    await boton(page, 'Zonas').click()
    assert.deepEqual(await zonas(), [])
    assert.equal(await page.getByTestId('qhse-panel').count(), 0)

    // Modo QHSE: las enciende solo, con los controles orientativos como recomendación pendiente; el botón queda fijo.
    await page.getByRole('button', { name: 'QHSE', exact: true }).first().click()
    await page.waitForFunction(() => window.__rigNativo.zonas().length === 3, null, {
      timeout: 30_000,
    })
    const controles = page.getByTestId('qhse-controls')
    await controles.waitFor({ state: 'visible' })
    assert.match(await controles.textContent(), /Controles orientativos · verificar aplicabilidad/)
    assert.equal(await controles.getByText(/^Se recomienda/).count(), 4)
    assert.doesNotMatch(await controles.textContent(), /Requisito/)
    assert.ok(await boton(page, 'Zonas').isDisabled(), 'en QHSE el botón no las apaga')

    // Al volver a EXPLORE se apagan solas (capa derivada) y la escena queda como al arrancar.
    await page.getByRole('button', { name: 'EXPLORE', exact: true }).first().click()
    await page.waitForFunction(() => window.__rigNativo.zonas().length === 0, null, {
      timeout: 30_000,
    })
    assert.equal(await page.getByTestId('qhse-panel').count(), 0)
    assert.ok(await boton(page, 'Zonas').isEnabled())
  },
)
