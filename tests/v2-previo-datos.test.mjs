import assert from 'node:assert/strict';
import test from 'node:test';

const expectedComponents = [
  'mastil', 'subestructura', 'malacate', 'aparejo', 'motor', 'cabina',
  'bop', 'llave', 'caballetes', 'circulacion', 'vientos', 'enganche', 'camion',
];

test('V2 preserves the complete component contract', async () => {
  const { COMPONENT_IDS } = await import('../reference/v2-previo/src/asset-manifest.js');
  assert.deepEqual(COMPONENT_IDS, expectedComponents);
  assert.equal(new Set(COMPONENT_IDS).size, COMPONENT_IDS.length);
});

test('pilot assets are declared as optional GLB replacements', async () => {
  const { ASSET_MANIFEST } = await import('../reference/v2-previo/src/asset-manifest.js');
  assert.deepEqual(Object.keys(ASSET_MANIFEST), ['mastil', 'malacate', 'camion']);

  for (const [id, asset] of Object.entries(ASSET_MANIFEST)) {
    assert.equal(asset.componentId, id);
    assert.match(asset.url, /^\.\/assets\/models\/.+\.glb$/);
    assert.equal(asset.enabled, false);
  }
});

test('the real-equipment reference drives a physical color palette', async () => {
  const { EQUIPMENT_PALETTE } = await import('../reference/v2-previo/src/asset-manifest.js');
  assert.equal(EQUIPMENT_PALETTE.subestructura.main, '#A72A32');
  assert.equal(EQUIPMENT_PALETTE.subestructura.accent, '#F2B632');
  assert.equal(EQUIPMENT_PALETTE.bop.main, '#3E7896');
  assert.equal(EQUIPMENT_PALETTE.mastil.main, '#C8C2AE');
});

test('documented Equipo 10 dimensions are encoded as the model source of truth', async () => {
  const { RIG_10 } = await import('../reference/v2-previo/src/technical-spec.js');
  assert.equal(RIG_10.mast.heightM, 31.6992);
  assert.equal(RIG_10.mast.model, 'Service King SK104-330');
  assert.equal(RIG_10.carrier.axles, 5);
  assert.equal(RIG_10.carrier.model, 'Service King SK-575');
  assert.equal(RIG_10.carrier.operatingLengthM, 18);
  assert.deepEqual(RIG_10.workFloor.sizeM, [2.6, 3.3]);
  assert.equal(RIG_10.hoisting.lines, 6);
  assert.equal(RIG_10.hoisting.linksCapacityT, 150);
  assert.equal(RIG_10.hoisting.elevatorCapacityT, 100);
  assert.deepEqual(RIG_10.hoisting.blockTravelM, [7, 25]);
  assert.equal(RIG_10.bop.accumulatorBottles, 5);
  assert.equal(RIG_10.layout.anchorOffsetM, 25);
});


