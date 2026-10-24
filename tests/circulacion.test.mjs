// Componente 10 (sistema de circulación): pileta de ensayo con golpeador (única pileta), textos del panel y ficha.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'legacy', 'Digital_Rig_V2.html'), 'utf8');
const wellsite = fs.readFileSync(path.join(root, 'legacy-ext', '40-wellsite.js'), 'utf8');
const meta = fs.readFileSync(path.join(root, 'legacy-ext', '44-meta-circulacion.js'), 'utf8');

/** Texto de `buildCirculacion` (de su declaración hasta el registro `Ot`). */
const start = wellsite.indexOf('  function buildCirculacion(g, api) {');
const end = wellsite.indexOf('PRE: registro de componentes');
const circ = wellsite.slice(start, end);

test('el componente 10 mantiene su nombre y su función menciona el golpeador (una sola pileta)', () => {
  assert.ok(html.includes(String.raw`name:"Sistema de circulaci\xF3n",family:"circulacion"`));
  const i = html.indexOf('at.circulacion.funcion="');
  assert.ok(i > 0);
  const funcion = html.slice(i + 'at.circulacion.funcion="'.length, html.indexOf('";', i));
  assert.ok(funcion.includes("'golpeador'"));
  assert.ok(funcion.includes('mismo equipo, no otro adicional'));
  assert.ok(!/acumulaci/i.test(funcion), 'no hay pileta de acumulación');
  assert.ok(!funcion.includes('"'), 'la cadena de función no debe romper las comillas dobles del bundle');
});

test('los peligros nuevos se rotulan "referencia, pendiente de validación" (nunca requisitos)', () => {
  for (const h of ['Gas o vapores en el golpeador', 'Rebalse de la pileta', 'Ingreso a espacio confinado', 'Proyección de fluido a presión en cañerías']) {
    const i = html.indexOf(h);
    assert.ok(i > 0, h);
    assert.ok(html.slice(i, i + 200).includes('(referencia, pendiente de validación)'), h);
  }
  // los peligros originales siguen y los controles orientativos no se tocaron
  assert.ok(html.includes(String.raw`"Rotura de l\xEDneas de alta presi\xF3n"`));
  assert.ok(html.includes('Barandas en pasarelas de tanques'));
});

test('la ficha: geometría SK-575 (C) y volúmenes 38 vs 40 m³ como fuente en conflicto', () => {
  assert.match(meta, /grade: 'C',\s*status: 'Fuente en conflicto'/);
  assert.ok(meta.includes('38 m³') && meta.includes('40 m³'), 'conflicto de volúmenes rotulado');
  assert.match(meta, /window\.__RIG_META/);
  assert.match(meta, /rig:boot/);
  assert.ok(html.includes('/* 44-meta-circulacion.js */'), 'el módulo debe estar en el HTML generado');
});

test('subconjuntos con nombre propio y mallas fusionadas por material (presupuesto de draw calls)', () => {
  for (const name of ['pileta_ensayo', 'golpeador']) assert.ok(circ.includes(`sub('${name}')`), name);
  const flushes = [...circ.matchAll(/\.flush\((\w+), m\.(\w+), '([^']+)'/g)].map((x) => x[3]);
  assert.deepEqual(
    flushes.sort(),
    [
      'PIL-1_luminarias',
      'PIL-2_barandas',
      'bomba_acero',
      'bomba_pintura',
      'circulacion_acero',
      'circulacion_mangueras',
      'circulacion_pintura',
      'golpeador_pintura',
      'pileta_ensayo_acero',
      'pileta_ensayo_pintura',
    ].sort(),
    'un mesh por material y subconjunto (línea base: 6 meshes → 8; +2 por la bomba desplazada a 5 m de la pileta según layout de locación)',
  );
});

test('no queda rastro de la pileta de acumulación (una sola pileta, con golpeador)', () => {
  assert.ok(!/PILETA_ACUM|pileta_acumulacion/.test(circ));
  assert.ok(!html.includes('pileta_acumulacion'));
});

test('los grupos DROPS PIL-1 y PIL-2 se conservan', () => {
  assert.match(circ, /'PIL-2',\s*'Libro DROPS p\.21: baranda en tintero soldado/);
  assert.match(circ, /'PIL-1',\s*'Libro DROPS p\.21: luminarias/);
  assert.ok(circ.includes("'PIL-2_barandas'") && circ.includes("'PIL-1_luminarias'"));
});

test('el golpeador reemplaza al desgasificador anterior (no se duplica el equipo)', () => {
  assert.equal([...circ.matchAll(/sub\('golpeador'\)/g)].length, 1);
  assert.ok(!/2\.6, -4\.5, 1\.5, zc - 2\.2/.test(circ), 'el gas buster anterior (x −4,5 · z zc−2,2) no debe quedar');
});

test('lo documentado se conserva: pileta 12 × 2,4 m, cubicador Ø1,3 × 2,4 m, bomba y ruteo de cañerías', () => {
  assert.match(circ, /tank\(PE, TX, zc, 12, 2\.4, 2\.0\)/);
  assert.match(circ, /PE\.cyl\(C\.BLUE_L, 0\.65, 0\.65, 2\.4, cbx, 1\.4, zc/);
  assert.match(circ, /P\.box\(C\.SKID, 6, 0\.22, 2\.4, -13, 0\.11, zc\)/); // patín de la bomba 6 × 2,4 m
  assert.match(circ, /\[-10\.65 \+ DX_BOMBA, 0\.9, zc\],\s*\[-9\.2, 0\.9, zc\],\s*\[-9\.2, 0\.5, zc\],\s*\[-9\.2, 0\.5, -12\.9\]/); // línea de matar
  assert.match(circ, /\[3\.0, 1\.25, -13\.5\]/); // llegada de la línea D a la pileta
});
