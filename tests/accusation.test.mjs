import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { judgeAccusation } from '../src/puzzles/accusation.js';

const story = JSON.parse(readFileSync(new URL('../data/story.json', import.meta.url), 'utf8'));
const rules = story.accusation;

test('story rules name davi with the three valid proofs', () => {
  assert.equal(rules.culprit, 'davi');
  assert.equal(rules.need, 2);
  assert.deepEqual([...rules.validEvidence].sort(), ['d20_glassa', 'stoffa_mantello', 'testimone_leryn']);
});

test('right suspect with two valid proofs is correct', () => {
  assert.equal(judgeAccusation('davi', ['stoffa_mantello', 'd20_glassa'], rules), 'correct');
});

test('right suspect with one fake proof is weak', () => {
  assert.equal(judgeAccusation('davi', ['d20_glassa', 'volantino_complotto'], rules), 'weak_evidence');
});

test('wrong suspect is wrong whatever the proofs', () => {
  assert.equal(judgeAccusation('masia', ['stoffa_mantello', 'd20_glassa'], rules), 'wrong_suspect');
  assert.equal(judgeAccusation('bea', [], rules), 'wrong_suspect');
});

test('the same proof twice does not count twice', () => {
  assert.equal(judgeAccusation('davi', ['d20_glassa', 'd20_glassa'], rules), 'weak_evidence');
});
