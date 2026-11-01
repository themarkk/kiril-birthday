import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseMap } from '../src/world/tilemap.js';
import { computeEdges } from '../src/world/terrain.js';
import { validate } from '../tools/validate-data.mjs';

const readJson = async p => JSON.parse(await readFile(new URL(`../${p}`, import.meta.url), 'utf8'));
const tiles = { tiles: { grass: {}, path: {}, wall: { solid: true } } };

test('solid decor blocks its cell, non-solid decor does not', () => {
  const m = parseMap({
    id: 't', rows: ['..', '..'], legend: { '.': 'grass' },
    decor: [{ x: 0, y: 0, img: 'a', solid: true }, { x: 1, y: 0, img: 'b' }, { x: 0, y: 1, img: 'c', layer: 'over' }],
  }, tiles);
  assert.equal(m.isSolid(0, 0), true);
  assert.equal(m.isSolid(1, 0), false);
  assert.equal(m.decor.ground.length, 2);
  assert.equal(m.decor.over.length, 1);
});

test('edges: grass bites into path on the touching sides, corner only when sides are free', () => {
  const rows = ['g..', '.pp', '.pp'].map(r => r.replace(/g/g, '.'));
  const grid = rows.map(r => [...r].map(c => (c === 'p' ? 'path' : 'grass')));
  const tileAt = (x, y) => grid[y]?.[x] ?? null;
  const edges = computeEdges([{ on: ['path'], from: ['grass'], prefix: 'e' }], tileAt, 3, 3);
  const at = (x, y) => edges.filter(e => e.x === x && e.y === y).map(e => e.img).sort();
  assert.deepEqual(at(1, 1), ['e_n', 'e_w']);
  assert.deepEqual(at(2, 2), []);
  assert.deepEqual(at(2, 1), ['e_n']);
});

test('edges: an inner corner gets the corner image', () => {
  const rows = ['.pp', 'ppp'];
  const tileAt = (x, y) => (rows[y]?.[x] === 'p' ? 'path' : rows[y]?.[x] === '.' ? 'grass' : null);
  const edges = computeEdges([{ on: ['path'], from: ['grass'], prefix: 'e' }], tileAt, 3, 2);
  assert.ok(edges.some(e => e.x === 1 && e.y === 1 && e.img === 'e_nw'));
});

test('validator rejects solid decor on a door and unknown decor images', () => {
  const data = {
    art: { tiles: { tiles: { grass: {} } }, objects: { objects: { a: {} } } },
    maps: { t: { rows: ['..'], legend: { '.': 'grass' }, warps: [{ x: 1, y: 0, to: 't', tx: 0, ty: 0 }], decor: [{ x: 1, y: 0, img: 'a', solid: true }, { x: 0, y: 0, img: 'nope' }] } },
    dialogues: {}, story: {},
  };
  const { errors } = validate(data);
  assert.ok(errors.some(e => /serve al gioco/.test(e)));
  assert.ok(errors.some(e => /nope/.test(e)));
});

test('in town every door, person and object is still reachable from the start', async () => {
  const json = await readJson('data/maps/town.json');
  const tilesJson = await readJson('data/art/tiles.json');
  const m = parseMap(json, tilesJson);
  const seen = new Set();
  const todo = [[json.spawn.x, json.spawn.y]];
  // Le persone e gli oggetti restano ostacoli; porte e trigger si attraversano.
  const blockers = new Set([...json.npcs, ...json.objects.filter(o => o.solid !== false)].map(o => `${o.x},${o.y}`));
  while (todo.length) {
    const [x, y] = todo.pop();
    const k = `${x},${y}`;
    if (seen.has(k) || m.isSolid(x, y) || blockers.has(k)) continue;
    seen.add(k);
    todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  const touchable = o => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${o.x + dx},${o.y + dy}`));
  for (const w of json.warps) assert.ok(seen.has(`${w.x},${w.y}`) || touchable(w), `porta ${w.to} irraggiungibile`);
  for (const n of json.npcs) assert.ok(touchable(n), `${n.id} irraggiungibile`);
  for (const o of json.objects) assert.ok(touchable(o), `${o.id} irraggiungibile`);
});
