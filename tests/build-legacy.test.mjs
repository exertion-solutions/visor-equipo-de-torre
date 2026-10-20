import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = (...p) => readFileSync(path.join(root, ...p));
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const ORIGINAL_SHA256 = '5a40ef06dc12afc4a6c6aef6419188fd13e6c0a8f228336cc4bed4ab18d4b44b';

function build(...extra) {
  const out = path.join(mkdtempSync(path.join(tmpdir(), 'rig-legacy-')), 'index.html');
  const r = spawnSync(process.execPath, ['scripts/build-legacy.mjs', '--out', out, ...extra], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  return readFileSync(out);
}

test('el original en reference/legacy/ sigue inmutable', () => {
  assert.equal(sha256(read('reference', 'legacy', 'TACKER10_Digital_Rig_V2.html')), ORIGINAL_SHA256);
});

test('public/legacy es exactamente el build actual (sin edición manual)', () => {
  const out = path.join(mkdtempSync(path.join(tmpdir(), 'rig-legacy-')), 'index.html');
  const r = spawnSync(process.execPath, ['scripts/build-legacy.mjs', '--out', out], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(sha256(read('public', 'legacy', 'Digital_Rig_V2.html')), sha256(readFileSync(out)), 'public/legacy desactualizado');
  assert.equal(
    sha256(read('public', 'legacy', 'sk575-glb.js')),
    sha256(readFileSync(path.join(path.dirname(out), 'sk575-glb.js'))),
    'public/legacy/sk575-glb.js desactualizado',
  );
});

test('--standalone incrusta los GLB en el HTML (un solo archivo) y no escribe sk575-glb.js', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'rig-legacy-'));
  const r = spawnSync(process.execPath, ['scripts/build-legacy.mjs', '--out', path.join(dir, 'x.html'), '--standalone'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  const html = readFileSync(path.join(dir, 'x.html'), 'utf8');
  assert.match(html, /window\.__RIG_SK575_GLB=\{/);
  assert.match(html, /window\.__RIG_SK575_FILES=\[/);
  assert.deepEqual(readdirSync(dir), ['x.html']);
});

test('el build inyecta los hooks, el runtime y los datos DROPS validados', () => {
  const html = build().toString('utf8');
  assert.match(html, /runPre\(\{Ot:Ot/);
  assert.match(html, /runPost\(window\.__rig\)/);
  assert.match(html, /<script id="rig-ext">/);
  assert.match(html, /window\.__RIG_DROPS=/);
  const data = JSON.parse(read('src', 'data', 'qhse', 'rig10-drops.json'));
  assert.equal(data.points.length, 66);
  assert.ok(!html.includes('</script><script id="rig-ext">'), 'el bloque de extensión debe ir antes del bundle');
});

test('--only limita los módulos incluidos y siempre entra el runtime', () => {
  const html = build('--only', 'none').toString('utf8');
  assert.match(html, /\/\* 00-runtime\.js \*\//);
  assert.doesNotMatch(html, /\/\* 20-mast\.js \*\//);
});

test('los módulos legacy-ext son JavaScript válido', () => {
  const files = readdirSync(path.join(root, 'legacy-ext')).filter((f) => /^\d\d-.*\.js$/.test(f));
  assert.ok(files.length >= 5);
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', path.join('legacy-ext', f)], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('la capa DROPS no dibuja radios ni distancias inventadas', () => {
  const layer = read('legacy-ext', '50-drops-layer.js').toString('utf8');
  assert.doesNotMatch(layer, /RingGeometry|CircleGeometry/);
  assert.match(layer, /no define radios ni distancias/);
});

test('60-ui-controls: sin cartel de modo y con botón para ocultar las barras de opciones', () => {
  const html = build().toString('utf8');
  assert.match(html, /#v2-hud\{display:none!important\}/);
  assert.match(html, /opts-toggle/);
  assert.match(html, /body\.opts-hidden #cadbar/);
  assert.doesNotMatch(html, /body\.opts-hidden #cad-inspector/);
  assert.match(html, /#cad-inspector\.collapsed\{transform:translateX\(/);
  assert.match(html, /inspector-toggle/);
});

test('foto de referencia: el original la embebe 2 veces idénticas y el build deja una sola copia', () => {
  const uris = [...read('reference', 'legacy', 'TACKER10_Digital_Rig_V2.html').toString('utf8').matchAll(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/g)];
  assert.equal(uris.length, 2);
  assert.equal(uris[0][1], uris[1][1], 'las dos data-URI del original deben ser idénticas');

  const html = build().toString('utf8');
  const built = [...html.matchAll(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/g)];
  assert.equal(built.length, 1, 'debe quedar una sola data-URI JPEG');
  assert.equal(built[0][1], uris[0][1]);
  assert.match(html, /<img id="ref-thumb"[^>]* src="data:image\/jpeg;base64,/);
  assert.match(html, /<img id="ref-full" alt="Torre Equipo 10 de referencia">/);
  // el src se restituye al abrir el diálogo (60-ui-controls)
  assert.match(html, /refDialog\.showModal = \(\) =>/);
  assert.match(html, /refFull\.src = refThumb/);
});

test('modo embebido: se oculta el título propio del visor y standalone lo conserva', () => {
  const html = build().toString('utf8');
  assert.match(html, /html\.v2-embedded header \.title\{display:none!important\}/);
  assert.match(html, /classList\.add\('v2-embedded'\)/);
  // la regla depende de una clase que solo se agrega con ?embedded: el título del HTML sigue estando
  assert.match(html, /<div class="title"><h1>Equipo /);
  assert.match(html, /const smallWindow = window\.innerWidth < 1100/);
});

test('barra agrupada: 4 menús accesibles con los controles existentes movidos (no clonados)', () => {
  const html = build().toString('utf8');
  assert.match(html, /\/\* 65-toolbar-menus\.js \*\//);
  for (const id of ['vista', 'capas', 'medicion', 'exportar']) assert.match(html, new RegExp(`id: '${id}'`));
  for (const a of ['aria-haspopup', 'aria-expanded', 'aria-controls']) assert.match(html, new RegExp(`'${a}'`));
  assert.match(html, /Recomendado en modo/);
  const ext = read('legacy-ext', '65-toolbar-menus.js').toString('utf8');
  assert.doesNotMatch(ext, /cloneNode/, 'los controles se mueven, no se clonan');
  for (const id of ['views', 'c-ortho', 't-labels', 't-zones', 'c-drops', 't-explode', 'explode', 'c-wire', 'c-dims', 'c-measure', 'c-clear', 'c-cut', 'cut-pos', 'c-isolate', 'c-png', 'c-glb', 'c-info'])
    assert.ok(ext.includes(`'${id}'`), `falta ${id} en el reparto de menús`);
  // la barra vieja de 3 filas ya no se muestra y "Ocultar opciones" sigue ocultando la nueva
  assert.match(html, /#cadbar,header > \.group\{display:none!important\}/);
  assert.match(html, /body\.opts-hidden #v2-toolbar/);
});

test('despiece: la perilla arranca en 0 y se restituye el valor recordado en fase de captura', () => {
  const src = read('legacy-ext', '60-ui-controls.js').toString('utf8');
  assert.match(src, /DEFAULT_EXPLODE = 60/);
  assert.match(src, /setKnob\(0\)/);
  assert.match(src, /tExplode\.addEventListener\(\s*'click',[\s\S]*?true,\s*\)/, 'el listener debe ir en fase de captura');
});

test('sin <meta> vacíos en el <head> (visor generado ni index.html)', () => {
  for (const file of [['public', 'legacy', 'Digital_Rig_V2.html'], ['index.html']]) {
    const html = read(...file).toString('utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    assert.doesNotMatch(head, /<meta\s*\/?>/i, `${file.join('/')}: <meta> sin atributos`);
    assert.doesNotMatch(head, /<meta\b(?![^>]*\b(?:charset|name|content|property|http-equiv)=)[^>]*>/i, `${file.join('/')}: <meta> sin atributos útiles`);
  }
});
