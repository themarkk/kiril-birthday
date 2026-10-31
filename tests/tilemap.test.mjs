import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../src/world/tilemap.js';

const tiles = { tiles: { tree: { solid: true }, grass: { solid: false } } };

function map(rows, extra = {}) {
  return parseMap({ id: 't', rows, legend: { T: 'tree', '.': 'grass' }, ...extra }, tiles);
}

test('solidity from tiles, outside the map is solid', () => {
  const m = map(['T.T', '...']);
  assert.equal(m.w, 3);
  assert.equal(m.h, 2);
  assert.equal(m.isSolid(0, 0), true);
  assert.equal(m.isSolid(1, 0), false);
  assert.equal(m.isSolid(-1, 0), true);
  assert.equal(m.isSolid(3, 1), true);
  assert.equal(m.tileAt(1, 1), 'grass');
});

test('short row throws with the row number', () => {
  assert.throws(() => map(['T.T', '..']), /riga 1/);
});

test('unknown legend char throws with row and column', () => {
  assert.throws(() => map(['T.T', '.X.']), /riga 1.*colonna 1/);
});

test('legend pointing to a missing tile throws', () => {
  assert.throws(() => parseMap({ id: 't', rows: ['A'], legend: { A: 'lava' } }, tiles), /lava/);
});

test('warpAt and triggerAt find entries by position', () => {
  const m = map(['...', '...'], {
    warps: [{ x: 1, y: 0, to: 'house', tx: 2, ty: 3 }],
    triggers: [{ x: 2, y: 1, dialogue: 'objects', node: 'n' }],
  });
  assert.equal(m.warpAt(1, 0).to, 'house');
  assert.equal(m.warpAt(0, 0), undefined);
  assert.equal(m.triggerAt(2, 1).node, 'n');
});
