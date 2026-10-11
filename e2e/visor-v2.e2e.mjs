// E2E del visor V2 con el modelo SK-575 (Chrome instalado + playwright-core, igual que scripts/snap.mjs).
//
//   npm run test:e2e                         → public/legacy/TACKER10_Digital_Rig_V2.html (copia de trabajo)
//   E2E_URL=https://…/TACKER10_Digital_Rig_V2.html npm run test:e2e   → el sitio publicado
//
// Una sola página para todas las pruebas (cargar el V2 con render por software tarda). `afterEach` deja el estado de
// partida aunque una prueba falle (sin fallas en cascada). Capturas en .tmp/e2e/. Se omite si no hay Chrome (en CI
// ubuntu-latest sí lo hay). No va en `npm test` (tarda minutos): corre en CI como paso aparte.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { after, afterEach, before, test } from 'node:test'
import { chromium } from 'playwright-core'

const root = path.resolve(import.meta.dirname, '..')
const html = path.join(root, 'public', 'legacy', 'TACKER10_Digital_Rig_V2.html')
const shots = path.join(root, '.tmp', 'e2e')
let browser, page, server, url
let ortho0 // proyección con la que arranca el V2 (hoy ortográfica)
let skip = false
const problemas = []

const vigilar = (p) => {
  p.on('console', (m) => m.type() === 'error' && problemas.push(m.text()))
  p.on('pageerror', (e) => problemas.push(e.message))
}
const abrir = async (viewport) => {
  const p = await browser.newPage({ viewport })
  vigilar(p)
  await p.goto(url, { waitUntil: 'load', timeout: 120_000 })
  await p.waitForFunction(() => window.__tackerSk575 && window.__tackerSk575.ready(), null, {
    timeout: 120_000,
  })
  await p.evaluate(() => window.__tackerSk575.ready())
  return p
}

before(async () => {
  url = process.env.E2E_URL
  if (!url) {
    // http local efímero: el V2 usa módulos y blobs que file:// no permite en headless
    server = http.createServer((req, res) =>
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(fs.readFileSync(html)),
    )
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    url = `http://127.0.0.1:${server.address().port}/`
  }
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    })
  } catch {
    skip = 'Chrome no disponible'
    return
  }
  page = await abrir({ width: 1440, height: 900 })
  ortho0 = await page.evaluate(() => !!window.__rig.view.ortho)
  fs.mkdirSync(shots, { recursive: true })
})

after(async () => {
  await browser?.close()
  server?.close()
})

// Estado de partida: sin Vista CAD, secuencia cerrada, mástil montado, sin despiece, bloque a 14 m, proyección inicial, modo explorar.
afterEach(async () => {
  if (skip || !page) return
  await page.evaluate((ortho0) => {
    const R = window.__rig
    window.__tackerVistaCad?.off()
    window.__tackerSeq?.close()
    window.__tackerErect?.pause()
    window.__tackerErect?.set(1)
    R.setExplode(0)
    const h = document.getElementById('hoist')
    if (h && Number(h.value) !== 14) {
      h.value = 14
      h.dispatchEvent(new Event('input'))
    }
    R.selectComponent(null)
    if (!!R.view.ortho !== ortho0) document.getElementById('c-ortho').click()
    const explorar = document.querySelector('#v2-modebar button[data-m="explore"]')
    if (explorar) explorar.click()
    else window.__tackerPresets.apply('explore')
  }, ortho0)
})

/** Fuerza un render y espera a que salga (dos rAF): la visibilidad SK se sincroniza en onBeforeRender. */
const cuadro = () =>
  page.evaluate(
    () =>
      new Promise((r) => {
        window.__rig.invalidate?.()
        requestAnimationFrame(() => requestAnimationFrame(r))
      }),
  )

const snap = (name) => page.screenshot({ path: path.join(shots, name + '.png') })

/** Espera a que `fn` (en la página) sea verdadera, forzando render: la visibilidad SK se sincroniza en onBeforeRender. */
const hasta = (fn, arg) =>
  page.waitForFunction(
    ([src, a]) => {
      window.__rig.invalidate?.()
      return new Function('a', `return (${src})(a)`)(a)
    },
    [fn.toString(), arg],
    { timeout: 20_000, polling: 100 },
  )

test('el equipo es el SK-575: 16 componentes integrados, nada procedural a la vista, ni Capa CAD', async (t) => {
  if (skip) return t.skip(skip)
  const r = await page.evaluate(() => {
    const R = window.__rig
    const sk = R.pickables.filter((m) => m.material?.name?.startsWith('sk575_'))
    const ids = new Set(sk.map((m) => m.material.name.split('_').slice(0, 2).join('_')))
    // piezas que 81-izamiento-mastil.js dibuja solo durante la animación (siguen procedurales a propósito)
    const ANIM = new Set([
      'pistones_izaje_dinamicos',
      'soporte_traslado',
      'piston_extension_2do_tramo',
      'vientos_dinamicos',
    ])
    const deAnimacion = (o) => {
      for (let p = o; p; p = p.parent) if (ANIM.has(p.name)) return true
      return false
    }
    let procVisibles = 0
    for (const G of Object.values(R.groups))
      G.traverse((o) => {
        const sk = o.material?.name?.startsWith('sk575_')
        if (o.isMesh && !sk && o.layers.mask === 1 && !deAnimacion(o)) procVisibles++
      })
    return {
      comps: ids.size,
      procVisibles,
      capaCad: !!window.__tackerCad || !!R.scene.getObjectByName('capa_cad'),
    }
  })
  assert.equal(r.comps, 16)
  assert.equal(r.procVisibles, 0)
  assert.equal(r.capaCad, false)
  await snap('01-equipo')
})

// Hallazgo 1 de la revisión: motor/cabina/enganche quedaban con 0 mallas visibles. Espera el fix en 84 (`sinPieza()` o no
// ocultar lo que no tiene reemplazo SK).
test('cada componente del árbol tiene al menos 1 malla visible o se declara sin pieza SK', async (t) => {
  if (skip) return t.skip(skip)
  const vacios = await page.evaluate(() => {
    const R = window.__rig
    const sin = new Set([...(window.__tackerSk575.sinPieza?.() ?? [])])
    const out = []
    for (const [id, G] of Object.entries(R.groups)) {
      if (sin.has(id)) continue
      let n = 0
      G.traverse((o) => {
        if (!o.isMesh || !(o.layers.mask & 1)) return
        for (let p = o; p && p !== G.parent; p = p.parent) if (!p.visible) return
        n++
      })
      if (!n) out.push(id)
    }
    return out
  })
  assert.deepEqual(vacios, [], `componentes sin nada que mostrar: ${vacios.join(', ')}`)
})

test('despiece: los componentes SK se separan y vuelven', async (t) => {
  if (skip) return t.skip(skip)
  const r = await page.evaluate(() => {
    const R = window.__rig
    const v = new R.three.Vector3()
    const n = R.groups.camion.getObjectByName('sk575_carrier_rojo')
    n.getWorldPosition(v)
    const x0 = v.x
    R.setExplode(1)
    R.scene.updateMatrixWorld(true)
    n.getWorldPosition(v)
    return { x0, x1: v.x }
  })
  assert.ok(Math.abs(r.x1 - r.x0) > 1, `carrier sin desplazar: ${r.x0} → ${r.x1}`)
  await snap('02-despiece')
})

test('selección: resalta las piezas SK del componente', async (t) => {
  if (skip) return t.skip(skip)
  const r = await page.evaluate(() => {
    const R = window.__rig
    const brillo = () =>
      R.materials.malacate
        .filter((m) => m.name.startsWith('sk575_cuadro'))
        .some((m) => m.emissive.r > 0)
    R.selectComponent('malacate')
    const on = brillo()
    R.selectComponent(null)
    return { on, off: brillo() }
  })
  assert.deepEqual(r, { on: true, off: false })
})

test('aparejo: el bloque SK sigue al deslizador y vuelve a 14 m', async (t) => {
  if (skip) return t.skip(skip)
  // el handler de #hoist es sincrónico: no hace falta esperar
  const alto = (v) =>
    page.evaluate((v) => {
      const h = document.getElementById('hoist')
      h.value = v
      h.dispatchEvent(new Event('input'))
      const R = window.__rig
      R.scene.updateMatrixWorld(true)
      const p = new R.three.Vector3()
      R.groups.aparejo.getObjectByName('sk575_aparejo_amarillo').getWorldPosition(p)
      return p.y
    }, v)
  assert.ok(Math.abs((await alto(20)) - 20) < 0.05)
  await snap('03-aparejo-20m')
  assert.ok(Math.abs((await alto(14)) - 14) < 0.05)
})

test('izamiento: el 1.er tramo gira, el 2.º telescopa, cilindros SK solo montado, y el ciclo restaura la pose', async (t) => {
  if (skip) return t.skip(skip)
  const r = await page.evaluate(async () => {
    const R = window.__rig
    const E = window.__tackerErect
    const izaje = () => R.groups.mastil.getObjectByName('sk575_izaje_rojo')
    const pivote = R.groups.mastil.children.find((c) => c.name === 'mastil_pivote')
    const tramoSup = pivote.children.find((c) => c.name === 'mastil_tramo_superior')
    const tieneMastil = pivote.children.some((c) => c.name.startsWith('sk575_mastil_'))
    const sup = tramoSup.children.filter((c) => /^sk575_mastil_.*_sup$/.test(c.name))
    const primero = pivote.children.find(
      (c) => c.name.startsWith('sk575_mastil_') && !c.name.endsWith('_sup'),
    )
    const piezas = [...sup, primero].filter(Boolean)
    const pose = () => {
      R.scene.updateMatrixWorld(true)
      return piezas.map((o) => o.getWorldPosition(new R.three.Vector3()).toArray())
    }
    // la sincronización de visibilidad corre en onBeforeRender: con render por software un cuadro puede pasar el segundo
    const hasta = async (cond) => {
      for (let i = 0; i < 100 && !cond(); i++) {
        R.invalidate()
        await new Promise((res) => setTimeout(res, 100))
      }
      return cond()
    }
    const antes = pose()
    const rot0 = pivote.rotation.z
    E.set(0.35)
    const embutido = tramoSup.position.y < -1
    const izajeOculto = await hasta(() => !izaje().visible)
    const giro = Math.abs(pivote.rotation.z - rot0)
    E.set(1)
    const izajeVisible = await hasta(() => izaje().visible)
    const despues = pose()
    const desvio = Math.max(
      0,
      ...antes.flatMap((a, i) => a.map((v, k) => Math.abs(v - despues[i][k]))),
    )
    return {
      tieneMastil,
      nSup: sup.length,
      hayPrimero: !!primero,
      giro,
      izajeOculto,
      izajeVisible,
      embutido,
      desvio,
      rotFinal: Math.abs(pivote.rotation.z - rot0),
      supY: tramoSup.position.y,
    }
  })
  assert.ok(r.tieneMastil, 'el mástil SK no cuelga de mastil_pivote')
  assert.ok(r.nSup > 0, 'el 2.º tramo SK no cuelga de mastil_tramo_superior')
  assert.ok(r.hayPrimero, 'no hay pieza SK del 1.er tramo en mastil_pivote')
  assert.ok(r.giro > 0.3, `el pivote no giró: ${r.giro}`)
  assert.ok(r.izajeOculto, 'los cilindros SK siguen visibles con el mástil acostado')
  assert.ok(r.izajeVisible, 'los cilindros SK no vuelven con el mástil montado')
  assert.ok(r.embutido, 'el 2.º tramo no está embutido durante el izamiento')
  assert.ok(r.desvio < 1e-3, `las piezas SK del mástil no vuelven a su lugar: desvío ${r.desvio} m`)
  assert.ok(r.rotFinal < 1e-6, `el pivote no vuelve a su ángulo: ${r.rotFinal}`)
  assert.equal(r.supY, 0)
})

// Hallazgos 2 (3d-perf #7 y código #2). Espera el fix en 84 (`sincronizarIzamiento`): cables del cuadro y de la llave atados
// a la visibilidad del mástil, y tiros SK atados al mástil y al avance del izamiento (no a la casilla del aparejo).
test('montaje paso 5: sin mástil no se ven cables colgando y los tiros siguen al izamiento', async (t) => {
  if (skip) return t.skip(skip)
  const visibles = () => {
    const R = window.__rig
    const ver = (o) => {
      if (!(o.layers.mask & 1)) return false
      for (let p = o; p; p = p.parent) if (!p.visible) return false
      return true
    }
    const por = (re) => {
      const out = []
      R.scene.traverse((o) => re.test(o.name) && out.push(ver(o)))
      return out
    }
    return {
      mastil: R.groups.mastil.visible,
      cables: por(/^sk575_(cuadro_cable|llave_cable)/),
      tiros: por(/^sk575_tiros_/),
    }
  }
  const leer = () => page.evaluate(`(${visibles})()`)
  await page.evaluate(() => window.__tackerSeq.go(5))
  await cuadro()
  const p5 = await leer()
  await snap('05-montaje-paso5')
  assert.equal(p5.mastil, false, 'el paso 5 no debería mostrar el mástil')
  assert.ok(p5.cables.length > 0, 'no se encontraron cables sk575_cuadro_cable*/sk575_llave_cable*')
  assert.ok(!p5.cables.some(Boolean), `cables visibles sin mástil: ${JSON.stringify(p5.cables)}`)
  // los tiros se apoyan en el piso de enganche: sin mástil no se ven, aunque los caballetes sí
  assert.ok(p5.tiros.length > 0, 'no se encontraron piezas sk575_tiros_*')
  assert.ok(!p5.tiros.some(Boolean), 'tiros visibles sin mástil')

  await page.evaluate(() => {
    window.__tackerSeq.close()
    window.__tackerErect.set(0.35)
  })
  await cuadro()
  const p035 = await leer()
  assert.ok(!p035.tiros.some(Boolean), 'con el mástil acostado los tiros SK no deberían verse')
  await page.evaluate(() => window.__tackerErect.set(1))
  await cuadro()
  const p1 = await leer()
  assert.ok(p1.tiros.every(Boolean), 'al terminar el izamiento los tiros vuelven')
})

test('DROPS: la capa se enciende con marcadores y sin errores de consola', async (t) => {
  if (skip) return t.skip(skip)
  const errores0 = problemas.length
  await page.evaluate(() => window.__tackerLayers.set('drops', true))
  await hasta(() => !!window.__rig.drops?.isActive())
  const r = await page.evaluate(() => ({
    capas: window.__tackerLayers.get(),
    marcadores: document.querySelectorAll('#drops-markers > *').length,
  }))
  await snap('06-drops')
  assert.ok(r.capas.includes('drops'), r.capas.join())
  assert.ok(r.marcadores > 0, 'sin marcadores DROPS')
  assert.deepEqual(problemas.slice(errores0), [])
})

test('Vista CAD: desde ortográfica pasa a perspectiva, noche y sin entorno; al apagar restaura', async (t) => {
  if (skip) return t.skip(skip)
  const estado = () =>
    page.evaluate(() => ({
      cam: window.__rig.camera().type,
      noche: !!window.__rig.view.night,
      entorno: window.__rig.scene.getObjectByName('locacion_entorno').visible,
    }))
  // R.camera() cambia de tipo recién en el cuadro siguiente al click
  const camara = (tipo) => hasta((t) => window.__rig.camera().type === t, tipo)
  await page.evaluate(() => window.__rig.view.ortho || document.getElementById('c-ortho').click())
  await camara('OrthographicCamera')
  const antes = await estado()
  assert.equal(antes.cam, 'OrthographicCamera')
  await page.evaluate(() => window.__tackerVistaCad.on())
  await camara('PerspectiveCamera')
  assert.deepEqual(await estado(), { cam: 'PerspectiveCamera', noche: true, entorno: false })
  await cuadro()
  await snap('04-vista-cad')
  await page.evaluate(() => window.__tackerVistaCad.off())
  await camara('OrthographicCamera')
  assert.deepEqual(await estado(), antes)
})

// Hallazgo 3: con Vista CAD encendida, un cambio a QHSE se perdía al apagarla (capas → []). Espera el fix en 85.
test('modo QHSE y Vista CAD: al apagarla quedan las capas del modo (en ambos órdenes)', async (t) => {
  if (skip) return t.skip(skip)
  const modo = (m) =>
    page.evaluate((m) => document.querySelector(`#v2-modebar button[data-m="${m}"]`).click(), m)
  const capas = () => page.evaluate(() => window.__tackerLayers.get())
  const delModo = (c) => c.includes('zonas') && c.includes('drops')

  await modo('qhse')
  await page.evaluate(() => window.__tackerVistaCad.on())
  await page.evaluate(() => window.__tackerVistaCad.off())
  const a = await capas()
  assert.ok(delModo(a), `QHSE → Vista CAD on/off: ${a.join()}`)

  await modo('explore')
  await page.evaluate(() => window.__tackerVistaCad.on())
  await modo('qhse')
  await page.evaluate(() => window.__tackerVistaCad.off())
  const b = await capas()
  assert.ok(delModo(b), `Vista CAD on → QHSE → off: ${b.join()}`)
})

test('modos: los cuatro presets aplican y operación aísla aparejo + malacate', async (t) => {
  if (skip) return t.skip(skip)
  const r = await page.evaluate(() => {
    const P = window.__tackerPresets
    const G = window.__rig.groups
    const out = {}
    for (const m of ['operation', 'qhse', 'training', 'explore']) {
      out[m] = { ok: P.apply(m), carrier: G.camion.visible, aparejo: G.aparejo.visible }
      if (m === 'qhse') out.qhseCapas = window.__tackerLayers.get()
    }
    return out
  })
  for (const m of ['operation', 'qhse', 'training', 'explore']) assert.ok(r[m].ok, m)
  assert.deepEqual(
    { carrier: r.operation.carrier, aparejo: r.operation.aparejo },
    { carrier: false, aparejo: true },
  )
  assert.ok(r.qhseCapas.includes('zonas') && r.qhseCapas.includes('drops'), r.qhseCapas.join())
  assert.equal(r.explore.carrier, true)
})

test('móvil 390×844: la tarjeta del SK-575 no tapa la barra de modos', async (t) => {
  if (skip) return t.skip(skip)
  // misma página redimensionada: una segunda carga del V2 con render por software no llega a 'load' a tiempo
  await page.setViewportSize({ width: 390, height: 844 })
  try {
    await cuadro()
    const r = await page.evaluate(() => {
      const caja = (id) => {
        const el = document.getElementById(id)
        if (!el) return null
        const b = el.getBoundingClientRect()
        return b.width && b.height ? { l: b.left, t: b.top, r: b.right, b: b.bottom } : null
      }
      return { card: caja('sk575-card'), barra: caja('v2-modebar') }
    })
    await snap('07-movil')
    const { card, barra } = r
    const tapa =
      !!card &&
      !!barra &&
      card.l < barra.r &&
      barra.l < card.r &&
      card.t < barra.b &&
      barra.t < card.b
    assert.ok(
      !tapa,
      `superposición: tarjeta ${JSON.stringify(card)} / barra ${JSON.stringify(barra)}`,
    )
  } finally {
    await page.setViewportSize({ width: 1440, height: 900 })
  }
})

test('consola sin errores durante toda la sesión', (t) => {
  if (skip) return t.skip(skip)
  assert.deepEqual(problemas, [])
})
