import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, serialize, deserialize, save, load, SAVE_KEY } from '../src/game/state.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: k => { delete data[k]; },
    data,
  };
}

const throwing = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
  removeItem() { throw new Error('blocked'); },
};

test('save key is kiril-bday-v1', () => {
  assert.equal(SAVE_KEY, 'kiril-bday-v1');
});

test('serialize/deserialize roundtrip keeps sets, counters and words', () => {
  const s = createState();
  s.flags.add('met_nicole');
  s.items.add('d20_glassa');
  s.counters.ducks = 3;
  s.words.nicole = 'RISATA';
  s.map = 'town'; s.x = 4; s.y = 9; s.dir = 'left';
  const back = deserialize(serialize(s));
  assert.ok(back.flags.has('met_nicole'));
  assert.ok(back.items.has('d20_glassa'));
  assert.equal(back.counters.ducks, 3);
  assert.equal(back.words.nicole, 'RISATA');
  assert.deepEqual([back.map, back.x, back.y, back.dir], ['town', 4, 9, 'left']);
});

test('save then load from storage', () => {
  const st = memoryStorage();
  const s = createState();
  s.flags.add('got_bullone');
  assert.equal(save(s, st), true);
  assert.ok(load(st).flags.has('got_bullone'));
});

test('load corrupted storage returns null', () => {
  assert.equal(load(memoryStorage({ [SAVE_KEY]: '{rotto' })), null);
});

test('load and save with throwing storage do not crash', () => {
  assert.equal(load(throwing), null);
  assert.equal(save(createState(), throwing), false);
});

test('missing storage is handled', () => {
  assert.equal(load(undefined), null);
  assert.equal(save(createState(), undefined), false);
});

test('unknown save version is rejected', () => {
  const raw = JSON.parse(serialize(createState()));
  raw.version = 2;
  assert.equal(deserialize(JSON.stringify(raw)), null);
});
