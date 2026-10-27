import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../public/legacy/Digital_Rig_V2.html', import.meta.url), 'utf8');

test('RIG10 HTML is self-contained (opens by double-click, no server or network)', () => {
  assert.doesNotMatch(html, /<script[^>]+\bsrc=/i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:/i);
  assert.doesNotMatch(html, /XMLHttpRequest|import\(/);
  // Cargas por red admitidas: (1) los GLB del SK-575 de su propio sitio (fetch relativo, ver 84-modelo-sk575.js) con respaldo en el
  // sk575-glb.js de al lado (un <script> clásico: carga también por file://); (2) el envío opcional de checklist/inducción (90-almacen.js) a una URL https que configura el usuario: sin URL no hay pedido.
  assert.deepEqual(
    [...html.matchAll(/\bfetch\(([^)]*)\)/g)].map((m) => m[1].split(',')[0]),
    ["new URL('../models/rig10/' + id + '.glb'", 'url'],
  );
  assert.match(html, /const url = webhookUrl\(\)\n\s+if \(!url\) return/);
  assert.doesNotMatch(html, /abacus\.jasoncameron\.dev/);
  assert.match(html, /s\.src = 'sk575-glb\.js'/);
  assert.doesNotMatch(html, /\bsrc\s*=\s*['"]https?:/);
});

test('RIG10 HTML keeps its core controls and modes', () => {
  for (const id of ['t-explode', 't-labels', 't-zones', 'c-measure', 'c-cut', 'c-png', 'c-glb']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  for (const mode of ['explore', 'operation', 'qhse', 'training']) {
    assert.match(html, new RegExp(`data-m=["']${mode}["']`));
  }
});

test('RIG10 HTML does not embed the photo of the real rig (ref-thumb kept empty for the bundle)', () => {
  assert.equal((html.match(/data:image\/jpeg;base64,/g) ?? []).length, 0);
  assert.match(html, /<img id="ref-thumb" class="cad-ref" alt="" hidden>/);
});

test('RIG10 HTML does not use the deprecated PCFSoftShadowMap', () => {
  assert.match(html, /shadowMap\.type=1;/);
  assert.doesNotMatch(html, /shadowMap\.type=Mo;/);
});

test('RIG10 HTML accepts the embedded-mode bridge from the host app', () => {
  assert.match(html, /has\('embedded'\)/);
  assert.match(html, /rig:setMode/);
  assert.match(html, /e\.source\s*!==\s*window\.parent/);
  for (const t of ['rig:ready', 'rig:state', 'rig:select', 'rig:setView', 'rig:setLayers']) {
    assert.ok(html.includes(t), t);
  }
});

test('double-click launcher opens the HTML directly', async () => {
  const cmd = await readFile(new URL('../ABRIR_DIGITAL_RIG.cmd', import.meta.url), 'utf8');
  assert.match(cmd, /Digital_Rig_V2\.html/);
  assert.match(cmd, /%~dp0/);
});
