import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../public/legacy/TACKER10_Digital_Rig_V2.html', import.meta.url), 'utf8');

test('TACKER10 HTML is self-contained (opens by double-click, no server or network)', () => {
  assert.doesNotMatch(html, /<script[^>]+\bsrc=/i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:/i);
  assert.doesNotMatch(html, /XMLHttpRequest|import\(/);
  // Única carga externa: los GLB del SK-575 de su propio sitio (fetch relativo, ver 84-modelo-sk575.js) con respaldo en el
  // sk575-glb.js de al lado (un <script> clásico: carga también por file://). Nada absoluto ni de otro origen.
  assert.deepEqual(
    [...html.matchAll(/\bfetch\(([^)]*)\)/g)].map((m) => m[1]),
    ["new URL('../models/tacker10/' + id + '.glb', location.href"],
  );
  assert.match(html, /s\.src = 'sk575-glb\.js'/);
  assert.doesNotMatch(html, /\bsrc\s*=\s*['"]https?:/);
});

test('TACKER10 HTML keeps its core controls and modes', () => {
  for (const id of ['t-explode', 't-labels', 't-zones', 'c-measure', 'c-cut', 'c-png', 'c-glb']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  for (const mode of ['explore', 'operation', 'qhse', 'training']) {
    assert.match(html, new RegExp(`data-m=["']${mode}["']`));
  }
});

test('TACKER10 HTML embeds the reference photo once (ref-full gets its src lazily)', () => {
  assert.equal((html.match(/data:image\/jpeg;base64,/g) ?? []).length, 1);
  assert.match(html, /id=["']ref-full["']/);
  assert.match(html, /id=["']ref-thumb["']/);
});

test('TACKER10 HTML does not use the deprecated PCFSoftShadowMap', () => {
  assert.match(html, /shadowMap\.type=1;/);
  assert.doesNotMatch(html, /shadowMap\.type=Mo;/);
});

test('TACKER10 HTML accepts the embedded-mode bridge from the host app', () => {
  assert.match(html, /has\('embedded'\)/);
  assert.match(html, /tacker:setMode/);
  assert.match(html, /e\.source\s*!==\s*window\.parent/);
  for (const t of ['tacker:ready', 'tacker:state', 'tacker:select', 'tacker:setView', 'tacker:setLayers']) {
    assert.ok(html.includes(t), t);
  }
});

test('double-click launcher opens the HTML directly', async () => {
  const cmd = await readFile(new URL('../ABRIR_TACKER10_DIGITAL_RIG.cmd', import.meta.url), 'utf8');
  assert.match(cmd, /TACKER10_Digital_Rig_V2\.html/);
  assert.match(cmd, /%~dp0/);
});
