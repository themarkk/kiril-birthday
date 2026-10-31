import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageToPixels, composePixels } from '../src/engine/art.js';

const chars = {
  bases: {
    normal: {
      w: 2, h: 2, bob: [0, 1, 1],
      frames: {
        down: [['SK', 'TP'], ['SK', 'TP'], ['SK', 'TP']],
        up: [['KK', 'TP'], ['KK', 'TP'], ['KK', 'TP']],
        left: [['S.', 'TO'], ['S.', 'TO'], ['S.', 'TO']],
      },
    },
  },
  hair: { top: { normal: { down: ['H.', '..'], up: ['HH', '..'], left: ['H.', '..'] } } },
  extras: {
    hat: { layer: 'over', pal: { r: '#ff0000' }, normal: { down: ['r.', '..'], up: ['..', '..'], left: ['..', '..'] } },
    cape: { layer: 'under', pal: { c: '#00ff00' }, normal: { down: ['.c', '..'], up: ['..', '..'], left: ['..', '..'] } },
  },
  people: {
    tester: { base: 'normal', skin: '#aaaaaa', hair: '#333333', hairStyle: 'top', top: '#ffffff', pants: '#0000ff', shoes: '#111111', extras: ['hat', 'cape'] },
  },
};

test('imageToPixels maps palette chars and transparency', () => {
  const px = imageToPixels({ w: 2, h: 1, pal: { a: '#123456' }, px: ['a.'] });
  assert.deepEqual(px, ['#123456', null]);
});

test('composer replaces symbols and draws hair then over-extras on top of base', () => {
  const c = composePixels(chars, 'tester', 'down', 0);
  assert.equal(c.w, 2);
  // (0,0): base S → hair H → hat r (over wins)
  assert.equal(c.pixels[0], '#ff0000');
  // (1,0): base K outline; cape is under so the base covers it
  assert.equal(c.pixels[1], '#1a1020');
  assert.equal(c.pixels[2], '#ffffff');
  assert.equal(c.pixels[3], '#0000ff');
});

test('bob shifts overlays down on walking frames', () => {
  const c = composePixels(chars, 'tester', 'down', 1);
  // hat moved to row 1: (0,1) is now red, (0,0) is base skin covered by nothing
  assert.equal(c.pixels[2], '#ff0000');
  assert.equal(c.pixels[0], '#aaaaaa');
});

test('right is the mirror of left', () => {
  const l = composePixels(chars, 'tester', 'left', 0);
  const r = composePixels(chars, 'tester', 'right', 0);
  assert.equal(l.pixels[0], r.pixels[1]);
  assert.equal(l.pixels[2], r.pixels[3]);
});

test('unknown person throws a clear error', () => {
  assert.throws(() => composePixels(chars, 'nessuno', 'down', 0), /nessuno/);
});
