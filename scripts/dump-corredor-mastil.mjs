// Perfil superior del equipo en el corredor del mástil (|z| < 1,0 m, x −19…−1,5 m): para cada columna de 0,1 m en X, la altura máxima
// de la geometría del V2 (muestreo de aristas de triángulos). Lo usa cad/izamiento.py para hallar la posición de transporte del mástil.
//   node scripts/dump-corredor-mastil.mjs [--out cad/data/v2_corredor_mastil.json]
/* global window */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'

const root = path.resolve(import.meta.dirname, '..')
const out = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'cad/data/v2_corredor_mastil.json'
const htmlPath = path.join(root, 'public', 'legacy', 'Digital_Rig_V2.html')
const server = http.createServer((req, res) => {
  const p = path.join(
    path.dirname(htmlPath),
    decodeURIComponent(new URL(req.url, 'http://x').pathname),
  )
  if (!p.startsWith(path.dirname(htmlPath)) || !fs.existsSync(p) || fs.statSync(p).isDirectory())
    return void res.writeHead(404).end()
  res.writeHead(200, {
    'content-type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript',
  })
  fs.createReadStream(p).pipe(res)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto(`http://127.0.0.1:${server.address().port}/${path.basename(htmlPath)}`, {
  waitUntil: 'load',
})
await page.waitForTimeout(5000)
const perfil = await page.evaluate(() => {
  const R = window.__rig
  const X0 = -19,
    X1 = -1.5,
    ZC = 1.0,
    DX = 0.1
  const n = Math.round((X1 - X0) / DX)
  const top = new Array(n).fill(0)
  const quien = new Array(n).fill('')
  const skip = new Set(['mastil', 'vientos', 'enganche', 'aparejo']) // el mástil no es obstáculo de sí mismo; vientos = cables
  R.scene.updateMatrixWorld(true)
  const v = (attr, i, m) => {
    const x = attr.getX(i),
      y = attr.getY(i),
      z = attr.getZ(i)
    const e = m.elements
    return [
      e[0] * x + e[4] * y + e[8] * z + e[12],
      e[1] * x + e[5] * y + e[9] * z + e[13],
      e[2] * x + e[6] * y + e[10] * z + e[14],
    ]
  }
  const mark = (p, id) => {
    if (Math.abs(p[2]) > ZC) return
    const c = Math.floor((p[0] - X0) / DX)
    if (c >= 0 && c < n && p[1] > top[c]) {
      top[c] = p[1]
      quien[c] = id
    }
  }
  for (const id of Object.keys(R.groups)) {
    if (skip.has(id)) continue
    R.groups[id].traverse((o) => {
      if (!o.isMesh || !o.visible || !o.geometry || !o.geometry.attributes.position) return
      if (o.name === 'malacate_steel') return // incluye el cable a la corona (se oculta al izar): no es obstáculo
      const pos = o.geometry.attributes.position
      const idx = o.geometry.index
      const cnt = idx ? idx.count : pos.count
      for (let t = 0; t + 2 < cnt; t += 3) {
        const ia = idx ? idx.getX(t) : t,
          ib = idx ? idx.getX(t + 1) : t + 1,
          ic = idx ? idx.getX(t + 2) : t + 2
        const tri = [
          v(pos, ia, o.matrixWorld),
          v(pos, ib, o.matrixWorld),
          v(pos, ic, o.matrixWorld),
        ]
        for (let e = 0; e < 3; e++) {
          const a = tri[e],
            b = tri[(e + 1) % 3]
          const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
          const k = Math.max(1, Math.ceil(len / 0.05))
          for (let s = 0; s <= k; s++) {
            const f = s / k
            mark([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f], id)
          }
        }
      }
    })
  }
  const r2 = (x) => Math.round(x * 100) / 100
  return {
    x0: X0,
    dx: DX,
    zc: ZC,
    top: top.map(r2),
    quien,
    pivote: { bx: R.mast.bx, by: R.mast.by, scale: R.mast.scale, a: R.mast.a },
  }
})
await browser.close()
server.close()
fs.mkdirSync(path.dirname(path.join(root, out)), { recursive: true })
fs.writeFileSync(path.join(root, out), JSON.stringify(perfil))
const max = Math.max(...perfil.top)
console.log(
  `perfil: ${perfil.top.length} columnas, altura máxima ${max} m en x=${(perfil.x0 + perfil.top.indexOf(max) * perfil.dx).toFixed(1)} (${perfil.quien[perfil.top.indexOf(max)]})`,
)
