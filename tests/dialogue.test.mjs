import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, resolvePuzzle } from '../src/game/dialogue-runner.js';
import { createState } from '../src/game/state.js';

const dlg = {
  speaker: 'Nicole',
  portrait: 'nicole',
  entry: [{ if: 'met', goto: 'b' }, { goto: 'a' }],
  nodes: {
    a: {
      do: ['set:visto'],
      lines: ['Ciao!', { cond: 'x', text: 'Solo con x' }, { who: 'kiril', text: 'Ehi.' }],
      choices: [
        { text: 'Dammi la chiave', if: 'has.k', goto: 'b' },
        { text: 'Mi offendo.', do: ['inc:offended'], goto: 'b' },
      ],
    },
    b: { lines: ['Sei tornato.'], next: 'c' },
    c: { lines: ['Statue!'], puzzle: { id: 'cipher', win: 'w', lose: 'l' } },
    w: { lines: ['Vinto'] },
    l: { lines: ['Perso'] },
    broken: { lines: ['...'], next: 'nope' },
  },
};

test('entry picks the first matching branch', () => {
  const s = createState();
  assert.equal(createRunner(dlg, s).current().text, 'Ciao!');
  s.flags.add('met');
  assert.equal(createRunner(dlg, s).current().text, 'Sei tornato.');
});

test('node effects apply on entering the node', () => {
  const s = createState();
  createRunner(dlg, s);
  assert.ok(s.flags.has('visto'));
});

test('lines advance, cond lines are skipped, who sets the speaker', () => {
  const s = createState();
  const r = createRunner(dlg, s);
  assert.equal(r.current().name, 'Nicole');
  r.next();
  const step = r.current();
  assert.equal(step.text, 'Ehi.');
  assert.equal(step.who, 'kiril');
});

test('choices appear on the last line and are filtered by if', () => {
  const s = createState();
  const r = createRunner(dlg, s);
  r.next();
  const step = r.current();
  assert.deepEqual(step.choices.map(c => c.text), ['Mi offendo.']);
  r.choose(0);
  assert.equal(s.counters.offended, 1);
  assert.equal(r.current().text, 'Sei tornato.');
});

test('hidden choice becomes visible with the item', () => {
  const s = createState();
  s.items.add('k');
  const r = createRunner(dlg, s);
  r.next();
  assert.equal(r.current().choices.length, 2);
});

test('next jumps to the following node; puzzle is exposed and resolves', () => {
  const s = createState();
  s.flags.add('met');
  const r = createRunner(dlg, s);
  r.next();
  assert.equal(r.current().text, 'Statue!');
  assert.equal(r.current().puzzle.id, 'cipher');
  resolvePuzzle(r, true);
  assert.equal(r.current().text, 'Vinto');
  r.next();
  assert.equal(r.done, true);
  assert.equal(r.current(), null);
});

test('startNode overrides entry', () => {
  const r = createRunner(dlg, createState(), { startNode: 'l' });
  assert.equal(r.current().text, 'Perso');
});

test('missing node ends the dialogue with a warning, no throw', () => {
  const warn = console.warn;
  let warned = false;
  console.warn = () => { warned = true; };
  try {
    const r = createRunner(dlg, createState(), { startNode: 'broken' });
    r.next();
    assert.equal(r.done, true);
    assert.equal(warned, true);
  } finally {
    console.warn = warn;
  }
});

test('hooks receive non-state effects', () => {
  const calls = [];
  const d = { speaker: 'X', nodes: { a: { do: ['sound:item'], lines: ['ok'] } }, entry: [{ goto: 'a' }] };
  createRunner(d, createState(), { hooks: { sound: a => calls.push(a[0]) } });
  assert.deepEqual(calls, ['item']);
});
