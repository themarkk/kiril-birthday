import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickHint } from '../src/game/hints.js';
import { createState } from '../src/game/state.js';

const phases = [
  { if: '!a', lines: ['h1', 'h2', 'h3'] },
  { if: '', lines: ['h4', 'h5', 'h6'] },
];

test('first matching phase, level 0', () => {
  assert.deepEqual(pickHint(phases, createState()), { phaseIndex: 0, level: 0, line: 'h1' });
});

test('level comes from the counter and is capped at the last line', () => {
  const s = createState();
  s.counters.hint_0 = 1;
  assert.equal(pickHint(phases, s).line, 'h2');
  s.counters.hint_0 = 5;
  assert.equal(pickHint(phases, s).line, 'h3');
});

test('later phase when the earlier is done', () => {
  const s = createState();
  s.flags.add('a');
  assert.equal(pickHint(phases, s).phaseIndex, 1);
});

test('no phase matches returns null', () => {
  const s = createState();
  s.flags.add('a');
  assert.equal(pickHint([phases[0]], s), null);
});
