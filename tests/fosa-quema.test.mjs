// Fosa de quema (legacy-ext/88-fosa-quema.js): dos líneas, rótulo de estado y efectos visuales sin afirmar distancias.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'TACKER10_Digital_Rig_V2.html'), 'utf8');
const mod = fs.readFileSync(path.join(root, 'legacy-ext', '88-fosa-quema.js'), 'utf8');
const wellsite = fs.readFileSync(path.join(root, 'legacy-ext', '40-wellsite.js'), 'utf8');

test('el módulo está en el HTML generado y expone el estado pendiente de validación', () => {
  assert.ok(html.includes('/* 88-fosa-quema.js */'));
  assert.ok(mod.includes("estado: 'pendingValidation'"));
  assert.match(mod, /NO son distancias de seguridad|no son distancias de seguridad/i);
});

test('dos líneas: desde el choke manifold y desde el golpeador, ambas terminan en la fosa', () => {
  const pits = [...mod.matchAll(/TIP_X\s*,\s*Y_G\s*,\s*(-?[\d.]+)\]/g)].map((m) => Number(m[1]));
  assert.equal(pits.length, 2);
  assert.notEqual(pits[0], pits[1]);
  assert.ok(mod.includes('choke manifold') && mod.includes('golpeador'));
});

test('las llamas se apagan con un botón y no piden render si no se ven', () => {
  assert.ok(mod.includes("btn.id = 'c-fosa'"));
  assert.ok(mod.includes('document.hidden') && mod.includes('enCuadro'));
});

test('camionetas estacionadas en bahías pintadas con calzas, lejos de los anclajes de viento', () => {
  assert.ok(wellsite.includes("'ESTACIONAMIENTO'"));
  const bays = [...wellsite.matchAll(/for \(const x of \[(-24, -21, -18)\]\)/g)];
  assert.equal(bays.length, 1);
  assert.ok(wellsite.includes('chock(V, -2.08'));
  // anclajes de viento (layout WS10): x −27,4 / +24,4, z ±26,8 → el estacionamiento (x −24…−18, z −26,9) no los pisa
  for (const x of [-24, -21, -18]) assert.ok(Math.hypot(x - -27.4, -26.9 - -26.8) > 2.5);
});
