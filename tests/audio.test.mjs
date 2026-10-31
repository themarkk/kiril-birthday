import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { noteFreq, parseSeq } from '../src/engine/audio.js';

test('A4 is 440 Hz and C5 is about 523 Hz', () => {
  assert.equal(Math.round(noteFreq('A4')), 440);
  assert.equal(Math.round(noteFreq('C5')), 523);
  assert.equal(noteFreq('nope'), 0);
});

test('every track parses and lead/bass have the same length', () => {
  const music = JSON.parse(readFileSync(new URL('../data/music.json', import.meta.url), 'utf8'));
  for (const [name, tr] of Object.entries(music)) {
    if (name.startsWith('_')) continue;
    const len = s => parseSeq(s).reduce((a, n) => a + n.beats, 0);
    const lead = parseSeq(tr.lead);
    assert.ok(lead.every(n => n.f > 0 || n.beats > 0), name);
    assert.ok(lead.filter(n => n.f === 0).length < lead.length, `${name}: tutte pause?`);
    assert.equal(len(tr.lead), len(tr.bass), `${name}: lead e bass di lunghezza diversa`);
  }
});
