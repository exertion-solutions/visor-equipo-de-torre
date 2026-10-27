// Sitio publicado: modo sin conexión (PWA), tarjeta para compartir, chunk de three diferido y URL de envío del deploy.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const leer = (p) => fs.readFileSync(path.join(root, p), 'utf8')

test('sw.js precarga exactamente los GLB sk575_* que existen en public/models/rig10', () => {
  const sw = leer('public/sw.js')
  const lista = JSON.parse(
    '[' + sw.match(/const MODELOS = \[([\s\S]*?)\]/)[1].replace(/'/g, '"').replace(/,\s*$/, '') + ']',
  )
  const archivos = fs
    .readdirSync(path.join(root, 'public/models/rig10'))
    .filter((f) => /^sk575_.*\.glb$/.test(f))
    .map((f) => f.slice(6, -4))
    .sort()
  assert.deepEqual([...lista].sort(), archivos)
  assert.match(sw, /url\.origin !== self\.location\.origin/, 'solo el mismo origen')
  assert.match(sw, /req\.method !== 'GET'/)
})

test('manifest e íconos de la PWA', () => {
  const m = JSON.parse(leer('public/manifest.webmanifest'))
  assert.equal(m.start_url, './')
  assert.equal(m.display, 'standalone')
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(root, 'public', i.src)), i.src)
  const html = leer('index.html')
  assert.match(html, /rel="manifest"/)
  assert.match(leer('src/main.tsx'), /serviceWorker\.register\(`\$\{import\.meta\.env\.BASE_URL\}sw\.js`\)/)
})

test('tarjeta Open Graph con imagen absoluta de 1200×630 que existe', () => {
  const html = leer('index.html')
  for (const p of ['og:title', 'og:description', 'og:image', 'og:url'])
    assert.match(html, new RegExp(`property="${p}"`), p)
  assert.match(html, /name="twitter:card"\s+content="summary_large_image"/)
  const img = html.match(/property="og:image"\s+content="([^"]+)"/)[1]
  assert.match(img, /^https:\/\//)
  assert.ok(fs.existsSync(path.join(root, 'public', path.basename(img))))
})

test('three.js no entra en el arranque: React y zustand van en su propio chunk', () => {
  const cfg = leer('vite.config.ts')
  assert.match(cfg, /name: 'react'[\s\S]*zustand[\s\S]*priority: 20/)
  assert.match(cfg, /name: 'three'[\s\S]*priority: 10/)
})

test('URL de envío del sitio: placeholder único en el visor y paso del deploy', () => {
  const html = leer('public/legacy/Digital_Rig_V2.html')
  assert.equal(html.split('%%RIG_WEBHOOK_URL%%').length - 1, 1)
  assert.match(leer('.github/workflows/deploy-pages.yml'), /node scripts\/inject-webhook\.mjs dist\/legacy\/Digital_Rig_V2\.html/)
})

test('sin contador de visitas de terceros', () => {
  assert.doesNotMatch(leer('public/legacy/Digital_Rig_V2.html'), /abacus|rig:visitas/)
  assert.ok(!fs.existsSync(path.join(root, 'legacy-ext/89-visitas.js')))
})
