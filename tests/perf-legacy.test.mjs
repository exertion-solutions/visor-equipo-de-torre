import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

function build() {
  const out = path.join(mkdtempSync(path.join(tmpdir(), 'rig-perf-')), 'index.html');
  const r = spawnSync(process.execPath, ['scripts/build-legacy.mjs', '--out', out], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return readFileSync(out, 'utf8');
}

test('80-perf: el build lo inyecta al final de los módulos, antes del bundle', () => {
  const html = build();
  const at = html.indexOf('/* 80-perf.js */');
  assert.ok(at > 0, 'falta 80-perf.js en el build');
  assert.ok(at > html.indexOf('/* 60-ui-controls.js */'), '80-perf debe correr después de los demás módulos');
  assert.ok(at < html.indexOf('Copyright 2010-2026 Three.js Authors'), 'el módulo va antes del bundle');
});

test('80-perf: sombras bajo demanda, tope de pixel ratio 1,5 y fusión solo de grupos estáticos', () => {
  const src = readFileSync(path.join(root, 'legacy-ext', '80-perf.js'), 'utf8');
  assert.match(src, /sm\.autoUpdate = false/);
  assert.match(src, /sm\.needsUpdate = true/);
  assert.match(src, /const PR_CAP = 1\.5/);
  assert.match(src, /const STATIC_MERGE = \['vientos'\]/);
  // la captura PNG conserva la resolución original (min(dpr, 2))
  assert.match(src, /PR_EXPORT_CAP = 2/);
  // nunca se fusionan los sub-grupos drops_* (la capa DROPS los localiza por userData.dropsId)
  assert.doesNotMatch(src, /STATIC_MERGE = \[[^\]]*(mastil|aparejo|enganche|camion)/);
});
