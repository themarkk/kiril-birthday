import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, applyEffects } from '../src/game/conditions.js';
import { createState } from '../src/game/state.js';

function stateWith({ flags = [], counters = {}, items = [] } = {}) {
  const s = createState();
  flags.forEach(f => s.flags.add(f));
  Object.assign(s.counters, counters);
  items.forEach(i => s.items.add(i));
  return s;
}

test('empty or missing expression is true', () => {
  const s = stateWith();
  assert.equal(evaluate('', s), true);
  assert.equal(evaluate(undefined, s), true);
});

test('flags with not, and, or, parentheses', () => {
  const s = stateWith({ flags: ['a'] });
  assert.equal(evaluate('a', s), true);
  assert.equal(evaluate('!a', s), false);
  assert.equal(evaluate('a & !b', s), true);
  assert.equal(evaluate('(a | b) & !c', s), true);
  assert.equal(evaluate('b | !a', s), false);
});

test('counter comparisons, missing counter is 0', () => {
  const s = stateWith({ counters: { ducks: 7 } });
  assert.equal(evaluate('ducks>=7', s), true);
  assert.equal(evaluate('ducks<7', s), false);
  assert.equal(evaluate('offended==0', s), true);
  assert.equal(evaluate('ducks>=7 & offended<5', s), true);
});

test('has.item checks inventory', () => {
  const s = stateWith({ items: ['d20_glassa'] });
  assert.equal(evaluate('has.d20_glassa', s), true);
  assert.equal(evaluate('has.altro', s), false);
});

test('malformed expression is false without throwing', () => {
  const s = stateWith({ flags: ['a', 'b'] });
  assert.equal(evaluate('a & & b', s), false);
  assert.equal(evaluate('(a', s), false);
});

test('state effects are applied in order', () => {
  const s = stateWith({ counters: { ducks: 7 } });
  applyEffects(['set:x', 'inc:ducks', 'give:k', 'word:nicole:RISATA', 'take:k', 'unset:x'], s);
  assert.equal(s.counters.ducks, 8);
  assert.equal(s.items.has('k'), false);
  assert.equal(s.flags.has('x'), false);
  assert.equal(s.words.nicole, 'RISATA');
});

test('dec counter does not go below zero', () => {
  const s = stateWith();
  applyEffects(['dec:z'], s);
  assert.equal(s.counters.z, 0);
});

test('non-state verbs go to hooks with their args', () => {
  const s = stateWith();
  const calls = [];
  applyEffects(['warp:town:3:4:up', 'sound:door'], s, {
    warp: args => calls.push(['warp', args]),
    sound: args => calls.push(['sound', args]),
  });
  assert.deepEqual(calls, [['warp', ['town', '3', '4', 'up']], ['sound', ['door']]]);
});
