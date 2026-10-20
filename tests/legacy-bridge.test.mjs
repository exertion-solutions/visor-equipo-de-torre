import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const ext = (f) => readFileSync(path.join(root, 'legacy-ext', f), 'utf8');

function build() {
  const out = path.join(mkdtempSync(path.join(tmpdir(), 'rig-bridge-')), 'index.html');
  const r = spawnSync(process.execPath, ['scripts/build-legacy.mjs', '--out', out], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return readFileSync(out, 'utf8');
}

test('el build expone META, el evento rig:mode y el arranque, e incluye puente, capas y presets', () => {
  const html = build();
  assert.match(html, /window\.__RIG_META=META;const MODE=\{/);
  assert.match(html, /new CustomEvent\('rig:mode'/);
  assert.match(html, /window\.__rigMode=\{/);
  assert.match(html, /document\.dispatchEvent\(new Event\('rig:boot'\)\)/);
  for (const f of ['10-layers.js', '70-bridge.js', '75-mode-presets.js']) assert.match(html, new RegExp(`/\\* ${f.replace('.', '\\.')} \\*/`));
  assert.match(html, /window\.__rigLayers = \{/);
  // orden de módulos: capas → drops → puente → presets
  const at = (f) => html.indexOf(`/* ${f} */`);
  assert.ok(at('10-layers.js') < at('50-drops-layer.js') && at('50-drops-layer.js') < at('70-bridge.js') && at('70-bridge.js') < at('75-mode-presets.js'));
});

test('70-bridge: contrato de mensajes rig:* con listas blancas y origen del padre', () => {
  const src = ext('70-bridge.js');
  for (const t of ['rig:ready', 'rig:state', 'rig:select', 'rig:setMode', 'rig:setView', 'rig:setLayers', 'rig:ping'])
    assert.ok(src.includes(`'${t}'`), t);
  assert.match(src, /e\.source !== window\.parent/);
  assert.match(src, /postMessage\(msg, '\*'\)/);
  assert.match(src, /'explore', 'operation', 'qhse', 'training'/);
  assert.match(src, /'iso', 'front', 'side', 'top', 'well'/);
});

/** Mini-DOM: botones con `classList` y un `click` que imita las restricciones del visor. */
function makeLayerEnv() {
  const state = { explode: 0, explodeTarget: 0 };
  const buttons = {};
  const mk = (id, onClick) => {
    const cls = new Set(['btn']);
    buttons[id] = {
      classList: { contains: (c) => cls.has(c), toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)) },
      getAttribute: () => null,
      click: () => onClick(buttons[id]),
    };
  };
  const flip = (b) => b.classList.toggle('on', !b.classList.contains('on'));
  for (const id of ['t-zones', 't-labels', 'c-wire', 'c-drops']) mk(id, flip);
  mk('c-dims', (b) => {
    if (state.explode > 0) return; // el visor se niega mientras haya despiece
    flip(b);
  });
  mk('t-explode', (b) => {
    flip(b);
    state.explodeTarget = b.classList.contains('on') ? 0.6 : 0;
  });
  const win = {
    __rig: {
      state,
      setExplode: (v) => {
        state.explode = v;
      },
    },
  };
  const ctx = vm.createContext({ window: win, document: { getElementById: (id) => buttons[id] || null }, console });
  vm.runInContext(ext('10-layers.js'), ctx);
  return { L: win.__rigLayers, state, buttons };
}

test('10-layers: get/set/apply con conjunto exacto e ids inválidos ignorados', () => {
  const { L } = makeLayerEnv();
  assert.deepEqual(Array.from(L.ids), ['zonas', 'cotas', 'etiquetas', 'malla', 'despiece', 'drops']);
  assert.deepEqual(Array.from(L.get()), []);
  assert.deepEqual(Array.from(L.apply(['drops', 'zonas', 'nope', 7])), ['zonas', 'drops']);
  assert.deepEqual(Array.from(L.set('malla', true)), ['zonas', 'malla', 'drops']);
  assert.deepEqual(Array.from(L.set('nope', true)), ['zonas', 'malla', 'drops']);
  assert.deepEqual(Array.from(L.apply([])), []);
});

test('10-layers: cotas + despiece se resuelve solo (desarma, cambia cotas, vuelve a armar)', () => {
  const { L, state } = makeLayerEnv();
  L.apply(['despiece']);
  state.explode = 0.4; // despiece en curso
  assert.deepEqual(Array.from(L.apply(['despiece', 'cotas'])), ['cotas', 'despiece']);
  state.explode = 0.4;
  assert.deepEqual(Array.from(L.set('cotas', false)), ['despiece']);
  state.explode = 0.4; // apagar despiece animado y encender cotas en el mismo apply
  assert.deepEqual(Array.from(L.apply(['cotas'])), ['cotas']);
  assert.equal(state.explodeTarget, 0);
});

test('75-mode-presets: cada modo define el conjunto completo de capas (sin datos nuevos)', () => {
  const src = ext('75-mode-presets.js');
  const listeners = {};
  const applied = [];
  const ctx = vm.createContext({
    window: { __rig: { state: {}, groups: {} }, __rigLayers: { apply: (l) => applied.push(Array.from(l)) } },
    document: {
      getElementById: () => null,
      querySelector: () => null,
      addEventListener: (t, fn) => (listeners[t] = fn),
    },
    console,
  });
  vm.runInContext(src, ctx);
  const P = ctx.window.__rigPresets;
  assert.deepEqual(Array.from(P.presets.explore.layers), []);
  assert.deepEqual(Array.from(P.presets.operation.layers), ['cotas']);
  assert.deepEqual(Array.from(P.presets.operation.isolate), ['aparejo', 'malacate']);
  assert.deepEqual(Array.from(P.presets.qhse.layers).sort(), ['drops', 'zonas']);
  assert.deepEqual(Array.from(P.presets.training.layers).sort(), ['despiece', 'etiquetas']);
  assert.equal(P.apply('hack'), false);
  listeners['rig:mode']({ detail: 'qhse' });
  assert.deepEqual(applied.at(-1), ['zonas', 'drops']);
});
