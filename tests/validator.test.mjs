import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, loadProjectData } from '../tools/validate-data.mjs';

function fixture() {
  return {
    story: { items: { k: { name: 'K', kind: 'item' } }, hints: [], autoEvents: [], endings: [], start: { map: 'm', dialogue: 'd', node: 'a' } },
    art: { tiles: { tiles: {} }, characters: { people: { p: {} } }, objects: { objects: {} } },
    maps: {
      m: {
        id: 'm', rows: ['..', '..'], legend: { '.': 'grass' },
        npcs: [{ id: 'n', x: 0, y: 0, person: 'p', dialogue: 'd' }], warps: [], objects: [], triggers: [],
      },
    },
    dialogues: {
      d: { speaker: 'D', entry: [{ goto: 'a' }], nodes: { a: { lines: ['x'], do: ['give:k'], next: 'b' }, b: { lines: ['y'] } } },
    },
  };
}

test('a clean fixture has no errors', () => {
  const r = validate(fixture());
  assert.deepEqual(r.errors, []);
});

test('goto to a missing node is reported with its name', () => {
  const f = fixture();
  f.dialogues.d.nodes.b.next = 'nope';
  assert.ok(validate(f).errors.some(e => e.includes('nope')));
});

test('give of an unknown item is reported', () => {
  const f = fixture();
  f.dialogues.d.nodes.a.do = ['give:mistero'];
  assert.ok(validate(f).errors.some(e => e.includes('mistero')));
});

test('broken condition is reported', () => {
  const f = fixture();
  f.dialogues.d.nodes.a.choices = [{ text: 't', if: 'a & & b', goto: 'b' }];
  assert.ok(validate(f).errors.some(e => e.includes('a & & b')));
});

test('warp to missing map or onto a solid tile is reported', () => {
  const f = fixture();
  f.maps.m.warps = [{ x: 0, y: 0, to: 'boh', tx: 0, ty: 0 }];
  assert.ok(validate(f).errors.some(e => e.includes('boh')));
});

test('npc dialogue that does not exist is reported', () => {
  const f = fixture();
  f.maps.m.npcs[0].dialogue = 'fantasma';
  assert.ok(validate(f).errors.some(e => e.includes('fantasma')));
});

test('cross-file goto is checked in the other file', () => {
  const f = fixture();
  f.dialogues.d.nodes.b.next = 'd:a';
  assert.deepEqual(validate(f).errors, []);
  f.dialogues.d.nodes.b.next = 'd:zzz';
  assert.ok(validate(f).errors.some(e => e.includes('d:zzz')));
});

test('the real project data validates without errors', async () => {
  const r = validate(await loadProjectData());
  assert.deepEqual(r.errors, []);
});

test('a menu whose choices all loop back (no way to close the dialogue) is reported', () => {
  const f = fixture();
  f.dialogues.d.nodes.b = { lines: ['menu'], choices: [{ text: 'ancora', goto: 'c' }] };
  f.dialogues.d.nodes.c = { lines: ['...'], next: 'b' };
  assert.ok(validate(f).errors.some(e => e.includes('d#b') && e.includes('chiudere')));
});

test('a menu with one exit choice is fine', () => {
  const f = fixture();
  f.dialogues.d.nodes.b = { lines: ['menu'], choices: [{ text: 'ancora', goto: 'c' }, { text: 'ciao' }] };
  f.dialogues.d.nodes.c = { lines: ['...'], next: 'b' };
  assert.deepEqual(validate(f).errors, []);
});
