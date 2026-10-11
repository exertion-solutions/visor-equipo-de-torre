// E2E (Playwright + Chrome instalado): el menú "Montaje" contiene la secuencia y el izamiento, sin paneles flotantes.
// Se omite si no hay Chrome (en CI ubuntu-latest sí lo hay).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright-core'

// public/ entero (como Pages): el V2 baja los GLB del SK-575 de ../models/tacker10/ con fetch
const dir = path.resolve('public')
const file = 'legacy/TACKER10_Digital_Rig_V2.html'
let server, browser, page, problems
let skip = false

before(async () => {
  server = http.createServer((req, res) => {
    const p = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname))
    if (!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory())
      return void res.writeHead(404).end()
    res.writeHead(200, {
      'content-type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream',
    })
    fs.createReadStream(p).pipe(res)
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    })
  } catch {
    skip = 'Chrome no disponible'
    return
  }
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  problems = []
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
  page.on('pageerror', (e) => problems.push(e.message))
  await page.goto(`http://127.0.0.1:${server.address().port}/${file}`)
  await page.waitForFunction(() => !!window.__tackerSeq && !!window.__tackerErect, null, {
    timeout: 30000,
  })
})

after(async () => {
  await browser?.close()
  server?.close()
})

test('la secuencia y el izamiento viven en el menú Montaje, sin paneles flotantes', async (t) => {
  if (skip) return t.skip(skip)
  const pos = await page.evaluate(() =>
    ['rig-seq', 'rig-erect'].map((id) => {
      const el = document.getElementById(id)
      return el && el.closest('#tm-pop-montaje') ? getComputedStyle(el).position : 'fuera-del-menu'
    }),
  )
  assert.deepEqual(pos, ['static', 'static'])
  assert.equal(await page.locator('#tm-pop-montaje').isHidden(), true, 'menú cerrado por defecto')
})

test('abrir el menú, elegir el paso 6 muestra el izamiento; "Todo" lo vuelve a ocultar', async (t) => {
  if (skip) return t.skip(skip)
  await page.click('#tm-btn-montaje')
  assert.equal(await page.locator('#tm-pop-montaje').isVisible(), true)
  await page.click('#sq-steps button:nth-child(6)')
  assert.equal(await page.locator('#rig-erect').isVisible(), true)
  assert.equal(await page.evaluate(() => window.__tackerSeq.current()), 6)
  await page.click('#sq-close')
  assert.equal(await page.locator('#rig-erect').isHidden(), true)
  assert.equal(await page.evaluate(() => window.__tackerSeq.current()), 0)
})

test('Reproducir cierra el menú y el izamiento avanza', async (t) => {
  if (skip) return t.skip(skip)
  await page.click('#sq-steps button:nth-child(6)')
  await page.click('#er-play')
  assert.equal(await page.locator('#tm-pop-montaje').isHidden(), true, 'el menú no tapa la escena')
  await page.waitForFunction(() => window.__tackerErect.progress() > 0.02, null, { timeout: 15000 })
  await page.evaluate(() => window.__tackerErect.pause())
})

test('sin errores de consola', async (t) => {
  if (skip) return t.skip(skip)
  assert.deepEqual(problems, [])
})
