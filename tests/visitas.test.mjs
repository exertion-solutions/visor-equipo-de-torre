// Contador de visitas (legacy-ext/89-visitas.js): cuenta una vez por sesión, no cuenta en local ni con DNT y falla en silencio.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const src = fs.readFileSync(path.join(root, 'legacy-ext', '89-visitas.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'TACKER10_Digital_Rig_V2.html'), 'utf8');

/** Corre el módulo con un entorno simulado y devuelve el elemento, las URL pedidas y el estado. */
async function correr({ conPadre = false, url = 'https://visor.ejemplo.com/legacy/', storage = new Map(), dnt = '0', respuesta, falla = false } = {}) {
  const u = new URL(url);
  const pedidos = [];
  const el = { hidden: true, textContent: '' };
  const bar = { appendChild: () => {} };
  let post;
  const mensajes = [];
  const oyentes = [];
  const win = {
    __rigExt: { onPost: (f) => (post = f) },
    addEventListener: (t, f) => oyentes.push([t, f]),
    parent: conPadre ? { postMessage: (m) => mensajes.push(m) } : null,
    sessionStorage: storage && {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, v),
    },
  };
  const doc = {
    getElementById: (id) => (id === 'cad-status' ? bar : null),
    createElement: () => el,
  };
  const fetchSim = async (pedido) => {
    pedidos.push(pedido);
    if (falla) throw new Error('red caída');
    return { ok: true, json: async () => respuesta ?? { value: 1234 } };
  };
  new Function('window', 'document', 'location', 'navigator', 'fetch', 'AbortController', 'setTimeout', 'clearTimeout', src)(
    win,
    doc,
    u,
    { doNotTrack: dnt },
    fetchSim,
    AbortController,
    setTimeout,
    clearTimeout,
  );
  post();
  await new Promise((r) => setTimeout(r, 10));
  return { el, pedidos, mensajes, oyentes, win, estado: win.__tackerVisitas.estado(), storage };
}

test('el módulo está en el HTML generado y usa solo el servicio declarado, sin claves', () => {
  assert.ok(html.includes('/* 89-visitas.js */'));
  assert.match(src, /abacus\.jasoncameron\.dev/);
  assert.ok(!/api[-_]?key|bearer|authorization|token\s*[:=]/i.test(src));
});

test('primera visita de la sesión: suma (hit), muestra el total y marca la sesión; la segunda solo lee', async () => {
  const storage = new Map();
  const a = await correr({ storage });
  assert.match(a.pedidos[0], /\/hit\/tacker10-digital-rig-exertion\/visitas$/);
  assert.equal(a.el.hidden, false);
  assert.equal(a.el.textContent, 'Visitas: ' + (1234).toLocaleString('es-AR'));
  assert.equal(a.estado, 'contada');
  const b = await correr({ storage });
  assert.match(b.pedidos[0], /\/get\//);
  assert.equal(b.estado, 'leída');
});

test('sin almacenamiento (iframe sandbox): cuenta por carga y no rompe', async () => {
  const r = await correr({ storage: null });
  assert.match(r.pedidos[0], /\/hit\//);
  assert.equal(r.estado, 'contada');
});

test('localhost y file:// no cuentan ni muestran', async () => {
  for (const url of ['http://localhost:5173/legacy/', 'http://127.0.0.1/x', 'file:///C:/visor/TACKER10.html']) {
    const r = await correr({ url });
    assert.equal(r.pedidos.length, 0, url);
    assert.equal(r.el.hidden, true, url);
  }
});

test('Do Not Track: solo lee, no suma', async () => {
  const r = await correr({ dnt: '1' });
  assert.match(r.pedidos[0], /\/get\//);
});

test('si el servicio falla o responde mal, el contador queda oculto', async () => {
  const caido = await correr({ falla: true });
  assert.equal(caido.el.hidden, true);
  assert.equal(caido.estado, 'error');
  const raro = await correr({ respuesta: { value: 'abc' } });
  assert.equal(raro.el.hidden, true);
});

test('embebido: publica el total al padre y lo reenvía ante tacker:ping', async () => {
  const r = await correr({ conPadre: true });
  assert.deepEqual(r.mensajes, [{ type: 'tacker:visitas', value: 1234 }]);
  const [, oyente] = r.oyentes.find(([t]) => t === 'message');
  oyente({ source: r.win.parent, data: { type: 'tacker:ping' } });
  assert.equal(r.mensajes.length, 2);
  oyente({ source: {}, data: { type: 'tacker:ping' } }); // de otro origen: se ignora
  assert.equal(r.mensajes.length, 2);
});

test('sin padre (página directa) no publica nada', async () => {
  const r = await correr();
  assert.deepEqual(r.mensajes, []);
});
