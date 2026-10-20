/* global window */
// Auditoría dimensional del visor V2: mide objetos de la escena (caja envolvente en metros) y los compara con
// las cotas documentadas (technical-spec.js) y con el LAYOUT TKR-10 (cad/data/layout_tkr10.json, generado por cad/build.py).
//
//   node scripts/audit-dimensional.mjs [--out docs/audit-dimensional.md] [--strict]
//
// Marco del V2: +X hacia el mástil, carrier hacia −X, Z lateral. El layout (CAD) usa y = −z.
// "documentado" = cota rotulada en el plano; "medido" = tomado del vector del PDF (confianza C).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import http from 'node:http'
import { chromium } from 'playwright-core'

const root = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : null
const strict = args.includes('--strict')

const layout = JSON.parse(
  fs.readFileSync(path.join(root, 'cad', 'data', 'layout_tkr10.json'), 'utf8'),
)
const { RIG_10: spec } = await import(
  pathToFileURL(path.join(root, 'reference', 'v2-previo', 'src', 'technical-spec.js')).href
)

// ── servidor estático efímero para el HTML (usa blobs/módulos)
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

const NAMES = {
  acumulador: 'acumulador_5_botellas',
  bomba: 'bomba_triplex',
  pileta: 'pileta_ensayo',
  planchada: 'planchada_caballetes_pintura',
  camion: 'camion',
}
const measured = await page.evaluate((names) => {
  const R = window.__rig
  const T = R.three
  const r2 = (v) => Math.round(v * 100) / 100
  const res = {}
  for (const [k, n] of Object.entries(names)) {
    const o = R.groups[n] ?? R.scene.getObjectByName(n)
    if (!o) {
      res[k] = null
      continue
    }
    const b = new T.Box3().setFromObject(o)
    res[k] = { x: [r2(b.min.x), r2(b.max.x)], z: [r2(b.min.z), r2(b.max.z)] }
  }
  // anclajes de vientos: extensión de la malla de tensores
  const v = R.groups.vientos
  const bv = new T.Box3().setFromObject(v)
  res.vientos = { x: [r2(bv.min.x), r2(bv.max.x)], z: [r2(bv.min.z), r2(bv.max.z)] }
  return res
}, NAMES)
await browser.close()
server.close()

// ── comparaciones
const rows = []
const cmp = (item, what, got, want, tol, source, note = '') => {
  const d = got - want
  rows.push({ item, what, got, want, tol, ok: Math.abs(d) <= tol, source, note })
}
const L = (k) => layout[k] // [xmin, xmax, ymin, ymax] CAD
const zRange = (k) => [-L(k)[3], -L(k)[2]] // z = −y

const dim = (r) => [r[1] - r[0]]
for (const [k, name, src] of [
  ['acumulador', 'Acumulador', 'documentado'],
  ['bomba', 'Bomba triplex', 'documentado'],
]) {
  const m = measured[k]
  if (!m) {
    rows.push({
      item: name,
      what: 'existe en la escena',
      got: 'no',
      want: 'sí',
      tol: 0,
      ok: false,
      source: src,
    })
    continue
  }
  const want = L(k)
  cmp(name, 'largo (X)', dim(m.x)[0], want[1] - want[0], 0.3, src)
  cmp(name, 'ancho (Z)', dim(m.z)[0], want[3] - want[2], 0.3, src)
  cmp(name, 'X mín', m.x[0], want[0], 0.5, 'medido (C)')
  cmp(name, 'Z mín', m.z[0], zRange(k)[0], 0.5, 'medido (C)')
}
{
  const m = measured.pileta
  cmp(
    'Pileta',
    'X mín',
    m.x[0],
    L('pileta')[0],
    0.5,
    'medido (C)',
    'la caja incluye brida de succión y escalera',
  )
  cmp(
    'Pileta',
    'Z mín',
    m.z[0],
    zRange('pileta')[0],
    0.8,
    'medido (C)',
    'incluye golpeador/cubicador',
  )
}
{
  const m = measured.planchada
  cmp('Planchada', 'X mín', m.x[0], L('planchada')[0], 0.5, 'medido (C)')
  cmp('Planchada', 'X máx', m.x[1], L('planchada')[1], 0.5, 'medido (C)')
}
cmp(
  'Bomba–pileta',
  'separación en X',
  measured.pileta.x[0] - measured.bomba.x[1],
  5.0,
  0.7,
  'documentado',
  'cota rotulada 5 m; la caja de la pileta incluye la brida de succión (~0,6 m)',
)
cmp(
  'Acumulador',
  'distancia al eje del pozo (Z mín)',
  measured.acumulador.z[0],
  3.0,
  0.3,
  'documentado',
)
cmp(
  'Carrier',
  'extremo hacia la boca de pozo (X máx)',
  measured.camion.x[1],
  -1.3,
  0.5,
  'documentado (1,3 m)',
)
cmp(
  'Carrier',
  'largo del cuerpo',
  measured.camion.x[1] - measured.camion.x[0],
  spec.carrier.operatingLengthM,
  2.5,
  'documentado',
  'folleto: cuerpo 15,5 m; layout: envolvente 18 m (fuentes en conflicto, el V2 dibuja ~16 m)',
)
cmp(
  'Vientos',
  'anclaje a ±X',
  measured.vientos.x[1],
  spec.layout.anchorOffsetM,
  spec.layout.anchorToleranceM,
  'documentado',
  '25 ± 3 m (TKR-10) vs 20 m (folleto): fuente en conflicto',
)

// ── salida
const bad = rows.filter((r) => !r.ok)
const fmt = (v) => (typeof v === 'number' ? v.toFixed(2) : v)
const md = [
  '# Auditoría dimensional del visor V2',
  '',
  `Generada por \`scripts/audit-dimensional.mjs\` (${new Date().toISOString().slice(0, 10)}). Compara cajas envolventes del V2 (metros) con`,
  'las cotas documentadas y con el LAYOUT TKR-10 (`cad/data/layout_tkr10.json`, medido del vector del PDF). "documentado" = rotulado en el plano;',
  '"medido (C)" = tomado de la geometría del PDF, confianza C.',
  '',
  '| Elemento | Medida | V2 | Referencia | Tol. | Estado | Fuente | Nota |',
  '| --- | --- | ---: | ---: | ---: | --- | --- | --- |',
  ...rows.map(
    (r) =>
      `| ${r.item} | ${r.what} | ${fmt(r.got)} | ${fmt(r.want)} | ±${r.tol} | ${r.ok ? 'OK' : '**DESVÍO**'} | ${r.source} | ${r.note} |`,
  ),
  '',
  `Resultado: ${rows.length - bad.length}/${rows.length} dentro de tolerancia.`,
  '',
].join('\n')
console.log(md)
if (out) fs.writeFileSync(path.join(root, out), md)
process.exit(strict && bad.length ? 1 : 0)
