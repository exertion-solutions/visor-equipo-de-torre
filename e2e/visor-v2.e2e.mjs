// E2E del visor V2 con el modelo SK-575 (Chrome instalado + playwright-core, igual que scripts/snap.mjs).
//
//   npm run test:e2e                         → public/legacy/TACKER10_Digital_Rig_V2.html (copia de trabajo)
//   E2E_URL=https://…/TACKER10_Digital_Rig_V2.html npm run test:e2e   → el sitio publicado
//
// Una sola página para todas las pruebas (cargar el V2 con render por software tarda); cada prueba deja el estado como lo
// encontró. Capturas en .tmp/e2e/. No va en `npm test` (necesita Chrome y tarda minutos).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright-core'

const root = path.resolve(import.meta.dirname, '..')
const html = path.join(root, 'public', 'legacy', 'TACKER10_Digital_Rig_V2.html')
const shots = path.join(root, '.tmp', 'e2e')
let browser, page, server
const problemas = []

before(async () => {
  let url = process.env.E2E_URL
  if (!url) {
    // http local efímero: el V2 usa módulos y blobs que file:// no permite en headless
    server = http.createServer((req, res) =>
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(fs.readFileSync(html)),
    )
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    url = `http://127.0.0.1:${server.address().port}/`
  }
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('console', (m) => m.type() === 'error' && problemas.push(m.text()))
  page.on('pageerror', (e) => problemas.push(e.message))
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__tackerSk575 && window.__tackerSk575.ready(), null, {
    timeout: 120_000,
  })
  await page.evaluate(() => window.__tackerSk575.ready())
  fs.mkdirSync(shots, { recursive: true })
})

after(async () => {
  await browser?.close()
  server?.close()
})

const snap = (name) => page.screenshot({ path: path.join(shots, name + '.png') })

test('el equipo es el SK-575: 16 componentes integrados, procedural oculto salvo la casilla', async () => {
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
    for (const [id, G] of Object.entries(R.groups))
      G.traverse((o) => {
        const sk = o.material?.name?.startsWith('sk575_')
        if (id !== 'cabina' && o.isMesh && !sk && o.layers.mask === 1 && !deAnimacion(o))
          procVisibles++
      })
    return { comps: ids.size, procVisibles }
  })
  assert.equal(r.comps, 16)
  assert.equal(r.procVisibles, 0)
  await snap('01-equipo')
})

test('despiece: los componentes SK se separan y vuelven', async () => {
  const r = await page.evaluate(() => {
    const R = window.__rig
    const v = new R.three.Vector3()
    const n = R.groups.camion.getObjectByName('sk575_carrier_rojo')
    n.getWorldPosition(v)
    const x0 = v.x
    R.setExplode(1)
    R.scene.updateMatrixWorld(true)
    n.getWorldPosition(v)
    const x1 = v.x
    return { x0, x1 }
  })
  assert.ok(Math.abs(r.x1 - r.x0) > 1, `carrier sin desplazar: ${r.x0} → ${r.x1}`)
  await snap('02-despiece')
  await page.evaluate(() => window.__rig.setExplode(0))
})

test('selección: resalta las piezas SK del componente', async () => {
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

test('aparejo: el bloque SK sigue al deslizador y vuelve a 14 m', async () => {
  const alto = (v) =>
    page.evaluate(async (v) => {
      const h = document.getElementById('hoist')
      h.value = v
      h.dispatchEvent(new Event('input'))
      await new Promise((r) => setTimeout(r, 800))
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

test('izamiento: el 1.er tramo gira, el 2.º telescopa; cilindros SK y Capa CAD solo con el mástil montado', async () => {
  const r = await page.evaluate(async () => {
    const R = window.__rig
    const izaje = () => R.groups.mastil.getObjectByName('sk575_izaje_rojo')
    const pivote = R.groups.mastil.children.find((c) => c.name === 'mastil_pivote')
    const tieneMastil = pivote.children.some((c) => c.name.startsWith('sk575_mastil_'))
    // espera a que un cuadro aplique la sincronización (con render por software un cuadro puede pasar el segundo)
    const hasta = async (cond) => {
      for (let t = 0; t < 100 && !cond(); t++) {
        R.invalidate()
        await new Promise((r) => setTimeout(r, 100))
      }
      return cond()
    }
    const tramoSup = pivote.children.find((c) => c.name === 'mastil_tramo_superior')
    const telescopa = tramoSup.children.some(
      (c) => c.name.startsWith('sk575_mastil_') && c.name.endsWith('_sup'),
    )
    window.__tackerCad.on()
    window.__tackerErect.set(0.35)
    const capaOcultaDurante = await hasta(() => !R.scene.getObjectByName('capa_cad').visible)
    const embutido = tramoSup.position.y < -1
    const izajeOculto = await hasta(() => !izaje().visible)
    const giro = Math.abs(pivote.rotation.z)
    window.__tackerErect.set(1)
    const izajeVisible = await hasta(() => izaje().visible)
    const capaVuelve = await hasta(() => R.scene.getObjectByName('capa_cad').visible)
    window.__tackerCad.off()
    return {
      tieneMastil,
      giro,
      izajeOculto,
      izajeVisible,
      telescopa,
      embutido,
      capaOcultaDurante,
      capaVuelve,
    }
  })
  assert.ok(r.tieneMastil, 'el mástil SK no cuelga de mastil_pivote')
  assert.ok(r.giro > 0.3, `el pivote no giró: ${r.giro}`)
  assert.ok(r.izajeOculto, 'los cilindros SK siguen visibles con el mástil acostado')
  assert.ok(r.izajeVisible, 'los cilindros SK no vuelven con el mástil montado')
  assert.ok(r.telescopa, 'el 2.º tramo SK no cuelga de mastil_tramo_superior')
  assert.ok(r.embutido, 'el 2.º tramo no está embutido durante el izamiento')
  assert.ok(
    r.capaOcultaDurante && r.capaVuelve,
    'la Capa CAD no se oculta/restaura con el izamiento',
  )
})

test('Vista CAD: perspectiva, noche y sin entorno; al apagar restaura', async () => {
  const estado = () =>
    page.evaluate(() => ({
      cam: window.__rig.camera().type,
      noche: !!window.__rig.view.night,
      entorno: window.__rig.scene.getObjectByName('locacion_entorno').visible,
    }))
  const antes = await estado()
  await page.evaluate(() => window.__tackerVistaCad.on())
  assert.deepEqual(await estado(), { cam: 'PerspectiveCamera', noche: true, entorno: false })
  await page.waitForTimeout(500)
  await snap('04-vista-cad')
  await page.evaluate(() => window.__tackerVistaCad.off())
  assert.deepEqual(await estado(), antes)
})

test('modos: los cuatro presets aplican y operación aísla aparejo + malacate', async () => {
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

test('consola sin errores durante toda la sesión', () => {
  assert.deepEqual(problemas, [])
})
