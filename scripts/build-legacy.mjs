// Genera el visor V2 de trabajo a partir de la BASE (reference/legacy/Digital_Rig_V2.base.html) + parches + módulos legacy-ext/.
//
//   node scripts/build-legacy.mjs                       → escribe public/legacy/Digital_Rig_V2.html
//   node scripts/build-legacy.mjs --out .tmp/x/index.html [--only 10-a.js,20-b.js]
//        → escribe SOLO ese archivo (para probar sin pisar la copia de trabajo).
//        --drops <json> usa otro JSON de datos DROPS (por defecto src/data/qhse/rig10-drops.json).
//        --only limita los módulos legacy-ext incluidos (siempre entra 00-runtime.js y el bloque de datos).
//        --standalone incrusta los GLB del SK-575 en el HTML (un solo archivo, ~5 MB) en vez de escribir sk575-glb.js.
//
// GLB del SK-575: el HTML servido (Pages, iframe de la app, `vite dev`) los baja con fetch desde
// ../models/rig10/sk575_*.glb (legacy-ext/84-modelo-sk575.js). Respaldo (file:// o fetch fallido, p. ej. el iframe
// sandbox contra un servidor sin CORS): `sk575-glb.js` junto al HTML, con los mismos GLB en base64. Un <script> clásico
// carga también por file://, así ABRIR_DIGITAL_RIG.cmd sigue funcionando sin servidor.
//
// Cada parche exige EXACTAMENTE 1 coincidencia: si la base cambia, el build falla en vez de corromper.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const original = path.join(root, 'reference', 'legacy', 'Digital_Rig_V2.base.html')
const extDir = path.join(root, 'legacy-ext')

const args = process.argv.slice(2)
const argValue = (flag) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}
const outArg = argValue('--out')
const dropsJson = argValue('--drops')
  ? path.resolve(root, argValue('--drops'))
  : path.join(root, 'src', 'data', 'qhse', 'rig10-drops.json')
const only = argValue('--only')?.split(',').filter(Boolean)
const standalone = args.includes('--standalone')
/** Respaldo base64 de los GLB del SK-575, junto al HTML (lo carga legacy-ext/84-modelo-sk575.js). */
const GLB_FALLBACK = 'sk575-glb.js'

/** Helpers del visor (minificados) → nombre legible, expuestos a los módulos en `onPre`. */
const PRE_API = {
  Ot: 'Ot', // registro { id: (group, materials) => void } de las funciones que construyen cada componente
  D: 'D', // (x,y,z) => Vector3
  ni: 'ni', // (t, offsetLateral=0, z=0) => Vector3 sobre el eje inclinado del mástil (t en unidades locales 0..31)
  le: 'le', // box:      (group, mat, w, h, d, x, y, z) => Mesh
  De: 'De', // cilindro: (group, mat, rTop, rBot, h, x, y, z, axis='y'|'x'|'z', segs=12, openEnded=false) => Mesh
  Ne: 'Ne', // tubo entre dos Vector3: (group, mat, p1, p2, radius=.05, segs=6) => Mesh
  vl: 'vl', // baranda: (group, mat, puntos[], altura=1)
  Wd: 'Wd', // reticulado del mástil: (group, mat, y0, y1, halfWidth, bays)
  Ml: 'Ml', // grupo local del mástil (inclinado y escalado): (parent) => Group
  ta: 'ta', // polilínea como tubos: (group, mat, puntos[], radius)
  pn: 'pn', // material PBR: (color, roughness=.6, metalness=.3, extra={}) => MeshStandardMaterial
  ir: 'ir', // activa castShadow/receiveShadow en un mesh
  gt: 'gt', // { bx, by, h, scale, a }: base, largo efectivo, escala local y ángulo del mástil
  Hn: 'Hn', // altura del aparejo (14 m)
  Zt: 'Zt', // posición del tambor del malacate
  mn: 'mn', // posición de la polea de corona
}

/** Clases de three (minificadas) que el visor no expone: se publican en `R.three` (post). */
const THREE_CLASSES = {
  Group: 'tn',
  Mesh: 'et',
  BoxGeometry: 'Ui',
  CylinderGeometry: 'pi',
  SphereGeometry: 'Lr',
  RingGeometry: 'Pr',
  CircleGeometry: 'Gs',
  TorusGeometry: 'Bn',
  MeshBasicMaterial: 'Zn',
  MeshStandardMaterial: 'os',
  LineBasicMaterial: 'Ni',
  Line: 'Vs',
  BufferGeometry: 'Nt',
  Vector3: 'R',
  Color: 'Be',
  Box3: 'On',
  Fog: 'Sr',
  HemisphereLight: 'Fr',
  DirectionalLight: 'Br',
  DoubleSide: 'sn',
  BackSide: 'cn',
  PMREMGenerator: 'dl',
}

const obj = (map) =>
  '{' +
  Object.entries(map)
    .map(([k, v]) => `${k}:${v}`)
    .join(',') +
  '}'

const patches = [
  {
    name: 'sombras PCF (PCFSoftShadowMap está deprecado)',
    find: 'ot.shadowMap.type=Mo;',
    replace: 'ot.shadowMap.type=1;',
  },
  {
    name: 'favicon inline',
    find: '<title>Equipo 10',
    replace:
      '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%276%27 fill=%27%230b0d12%27/%3E%3Cpath d=%27M16 4v24M10 28h12M12 10h8M13 16h6%27 stroke=%27%23f2b632%27 stroke-width=%272.5%27 stroke-linecap=%27round%27 fill=%27none%27/%3E%3C/svg%3E">\n<title>Equipo 10',
  },
  {
    name: 'tabla META de la capa de producto → window.__RIG_META',
    find: 'const MODE={',
    replace: 'window.__RIG_META=META;const MODE={',
  },
  {
    name: 'puente de modo (?embedded oculta la barra; setMode envuelto → evento rig:mode; rig:boot)',
    find: "mb.addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(b)setMode(b.dataset.m)});setMode('explore');",
    replace:
      "mb.addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(b)setMode(b.dataset.m)});setMode('explore');\n" +
      '    // Modo embebido (iframe de la app DIGITAL RIG): la app controla el modo por postMessage (legacy-ext/70-bridge.js) y se oculta la barra propia.\n' +
      "    if(new URLSearchParams(location.search).has('embedded'))mb.style.display='none';\n" +
      '    // `setMode` (barra interna Y postMessage) emite `rig:mode` DESPUÉS de terminar: 75-mode-presets.js aplica ahí los presets de capas.\n' +
      "    const __setMode0=setMode;setMode=function(m){__setMode0(m);try{document.dispatchEvent(new CustomEvent('rig:mode',{detail:m}))}catch(e){console.error(e)}};\n" +
      '    window.__rigMode={set:m=>{if(Object.prototype.hasOwnProperty.call(MODE,m))setMode(m)},get:()=>mode,list:Object.keys(MODE)};\n' +
      "    window.__rigBooted=true;document.dispatchEvent(new Event('rig:boot'));",
  },
  {
    name: 'hook PRE: antes de construir los componentes',
    find: 'var Jt={},jd={},Tn={},Dh=[],Vx=',
    replace: `window.__rigExt&&window.__rigExt.runPre(${obj(PRE_API)});var Jt={},jd={},Tn={},Dh=[],Vx=`,
  },
  {
    name: 'hook POST: window.__rig ampliado',
    find: 'window.__rig={groups:Jt,COMPONENTS:at,selectComponent:tr,setExplode:Fh,focusOn:ef,state:Me};',
    replace:
      `window.__rig={groups:Jt,COMPONENTS:at,selectComponent:tr,setExplode:Fh,focusOn:ef,state:Me,` +
      `scene:Ft,renderer:ot,camera:()=>wt,controls:()=>qt,pickables:Dh,materials:jd,centers:Tn,explodeOffsets:Vx,view:Pe,families:nr,` +
      `three:${obj(THREE_CLASSES)},mast:gt,hookHeight:Hn,invalidate:At,raycaster:Sl,stopCam:()=>{Ut=null}};` +
      `window.__rigExt&&window.__rigExt.runPost(window.__rig);`,
  },
]

// Patches por componente: scripts/patches/*.mjs (cada archivo exporta por defecto un array de {name, find, replace}). Se aplican
// después de los base, en orden alfabético. Cada uno exige EXACTAMENTE 1 coincidencia (igual que los base).
const patchesDir = path.join(root, 'scripts', 'patches')
if (fs.existsSync(patchesDir)) {
  for (const file of fs
    .readdirSync(patchesDir)
    .filter((n) => n.endsWith('.mjs'))
    .sort()) {
    const mod = await import(pathToFileURL(path.join(patchesDir, file)).href)
    patches.push(...mod.default)
  }
}

const BUNDLE_ANCHOR = '<script>\n(()=>{/**\n * @license\n * Copyright 2010-2026 Three.js Authors'

function readExtModules() {
  const all = fs
    .readdirSync(extDir)
    .filter((f) => /^\d\d-.*\.js$/.test(f))
    .sort()
  const runtime = all.filter((f) => f.startsWith('00-'))
  const rest = all.filter((f) => !f.startsWith('00-') && (!only || only.includes(f)))
  return [...runtime, ...rest]
}

/** JSON apto para incrustar en un <script>: `</`, `<!--` y U+2028/9 escapados para que ningún dato cierre ni altere el bloque. */
function safeJsonForScript(obj) {
  return JSON.stringify(obj)
    .replace(/<\//g, '<\\/')
    .replace(/<!--/g, '<\\!--')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}

/** Respaldo base64 de los GLB (lo llena build()); null si no hay GLB sk575_*. */
let glbB64 = null

function build() {
  // La base ya es genérica (sin marca, sin documentos internos ni foto del equipo real).
  let html = fs.readFileSync(original, 'utf8')

  for (const p of patches) {
    const n = html.split(p.find).length - 1
    if (n !== 1) throw new Error(`Parche "${p.name}": se esperaba 1 coincidencia y hay ${n}`)
    html = html.replace(p.find, () => p.replace)
  }

  const blocks = []
  const runtimeFile = '00-runtime.js'
  blocks.push(`/* ${runtimeFile} */\n` + fs.readFileSync(path.join(extDir, runtimeFile), 'utf8'))

  if (fs.existsSync(dropsJson)) {
    blocks.push(
      '/* datos DROPS (src/data/qhse/rig10-drops.json) */\nwindow.__RIG_DROPS=' +
        safeJsonForScript(JSON.parse(fs.readFileSync(dropsJson, 'utf8'))) +
        ';',
    )
  }
  const vpJson = path.join(root, 'src', 'data', 'viewpoints', 'rig10-viewpoints.json')
  if (fs.existsSync(vpJson)) {
    blocks.push(
      '/* viewpoints del recorrido en primera persona (src/data/viewpoints/rig10-viewpoints.json) */\nwindow.__RIG_VIEWPOINTS=' +
        safeJsonForScript(JSON.parse(fs.readFileSync(vpJson, 'utf8'))) +
        ';',
    )
  }
  const izJson = path.join(root, 'src', 'data', 'cad', 'izamiento.json')
  if (fs.existsSync(izJson)) {
    blocks.push(
      '/* datos del izamiento del mástil (src/data/cad/izamiento.json) */\nwindow.__RIG_IZAMIENTO=' +
        safeJsonForScript(JSON.parse(fs.readFileSync(izJson, 'utf8'))) +
        ';',
    )
  }
  // Cilindros de izaje y vientos del SK-575 (meta de cad/sk575/exportar.py): 81-izamiento-mastil.js anima esas piezas y
  // tiende los vientos dinámicos entre sus extremos, así la pose de la animación empalma con la final.
  const skMeta = (id) => {
    const f = path.join(root, 'public', 'models', 'rig10', id + '.meta.json')
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null
  }
  const izMeta = skMeta('sk575_izaje')
  const vientosMeta = skMeta('sk575_vientos')
  if (izMeta || vientosMeta) {
    blocks.push(
      '/* cilindros y vientos SK-575 (public/models/rig10/sk575_{izaje,vientos}.meta.json) */\nwindow.__RIG_SK575_META=' +
        safeJsonForScript({
          izaje: izMeta?.cilindros?.lista ?? [],
          vientos: vientosMeta?.cables ?? [],
        }) +
        ';',
    )
  }
  // Modelo SK-575 (legacy-ext/84-modelo-sk575.js): la lista de GLB + el decodificador meshopt de three (MIT, incrustado).
  // Los GLB van por fetch; el base64 queda como respaldo en sk575-glb.js (o dentro del HTML con --standalone).
  const modelsDir = path.join(root, 'public', 'models', 'rig10')
  const meshopt = path.join(
    root,
    'node_modules',
    'three',
    'examples',
    'jsm',
    'libs',
    'meshopt_decoder.module.js',
  )
  const glbs = fs.existsSync(modelsDir)
    ? fs
        .readdirSync(modelsDir)
        .filter((f) => /^sk575_[a-z_]+\.glb$/.test(f))
        .sort()
    : []
  if (glbs.length && !fs.existsSync(meshopt))
    throw new Error(
      `Hay ${glbs.length} GLB sk575_* pero falta el decodificador meshopt (${path.relative(root, meshopt)}): ` +
        'el V2 saldría sin el SK-575. Correr `npm ci`.',
    )
  if (glbs.length) {
    const dec = fs.readFileSync(meshopt, 'utf8')
    const exp = /^export \{ MeshoptDecoder \};?\s*$/m
    if (!exp.test(dec))
      throw new Error('meshopt_decoder.module.js cambió: no se encontró su export')
    blocks.push(
      '/* meshoptimizer (MIT, three/examples/jsm/libs/meshopt_decoder.module.js) */\n(()=>{' +
        dec.replace(exp, 'window.__MeshoptDecoder=MeshoptDecoder;') +
        '})();',
    )
    const map = Object.fromEntries(
      glbs.map((f) => [
        f.slice(0, -4),
        fs.readFileSync(path.join(modelsDir, f)).toString('base64'),
      ]),
    )
    blocks.push(
      '/* GLB del modelo SK-575 (public/models/rig10/sk575_*.glb) */\nwindow.__RIG_SK575_FILES=' +
        JSON.stringify(Object.keys(map)) +
        ';',
    )
    glbB64 = 'window.__RIG_SK575_GLB=' + safeJsonForScript(map) + ';'
    if (standalone) blocks.push('/* GLB en base64 (--standalone) */\n' + glbB64)
  }
  for (const f of readExtModules().filter((f) => f !== runtimeFile)) {
    blocks.push(`/* ${f} */\n` + fs.readFileSync(path.join(extDir, f), 'utf8'))
  }

  const ext = `<script id="rig-ext">\n${blocks.join('\n')}\n</script>\n`
  if (html.split(BUNDLE_ANCHOR).length - 1 !== 1)
    throw new Error('No se encontró el ancla del bundle')
  html = html.replace(BUNDLE_ANCHOR, () => ext + BUNDLE_ANCHOR)
  return html
}

const html = build()
const targets = outArg
  ? [path.resolve(root, outArg)]
  : [path.join(root, 'public', 'legacy', 'Digital_Rig_V2.html')]

for (const t of targets) {
  fs.mkdirSync(path.dirname(t), { recursive: true })
  fs.writeFileSync(t, html)
  console.log('escrito', path.relative(root, t), `(${(html.length / 1024).toFixed(0)} KB)`)
  if (glbB64 && !standalone) {
    const f = path.join(path.dirname(t), GLB_FALLBACK)
    fs.writeFileSync(
      f,
      '/* GLB del SK-575 en base64: respaldo de legacy-ext/84-modelo-sk575.js (file:// o fetch fallido).\n' +
        ' * GENERADO por scripts/build-legacy.mjs: no editar. */\n' +
        glbB64 +
        '\n',
    )
    console.log('escrito', path.relative(root, f), `(${(glbB64.length / 1024).toFixed(0)} KB)`)
  }
}
