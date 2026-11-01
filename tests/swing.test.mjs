import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSwing, stepSwing, pickAnchor, bombPos } from '../src/puzzles/swing.js';

const floor = { x: 0, y: 100, w: 256, h: 92 };

test('lands on a roof', () => {
  const sc = { start: { x: 50, y: 50 }, roofs: [floor] };
  const s = createSwing(sc);
  for (let i = 0; i < 120; i++) stepSwing(s, sc, {});
  assert.equal(s.y, 100);
  assert.equal(s.vy, 0);
  assert.equal(s.onGround, true);
});

test('falling off the screen returns fall', () => {
  const sc = { start: { x: 50, y: 50 } };
  const s = createSwing(sc);
  const r = Array.from({ length: 120 }, () => stepSwing(s, sc, {}));
  assert.ok(r.includes('fall'));
});

test('the right edge returns exit, the left edge blocks', () => {
  const sc = { start: { x: 250, y: 100 }, roofs: [floor] };
  const s = createSwing(sc);
  const r = Array.from({ length: 60 }, () => stepSwing(s, sc, { right: true }));
  assert.ok(r.includes('exit'));
  const l = createSwing({ start: { x: 8, y: 100 }, roofs: [floor] });
  for (let i = 0; i < 60; i++) stepSwing(l, { roofs: [floor] }, { left: true });
  assert.ok(l.x >= 5);
});

test('a wall stops the player', () => {
  const sc = { start: { x: 50, y: 100 }, roofs: [floor, { x: 100, y: 0, w: 20, h: 100 }] };
  const s = createSwing(sc);
  for (let i = 0; i < 120; i++) stepSwing(s, sc, { right: true });
  assert.ok(s.x <= 95);
});

test('jump works only from the ground', () => {
  const sc = { start: { x: 50, y: 100 }, roofs: [floor] };
  const s = createSwing(sc);
  stepSwing(s, sc, {});
  stepSwing(s, sc, { jump: true });
  assert.ok(s.vy < 0);
  const before = s.vy;
  stepSwing(s, sc, { jump: true });
  assert.ok(s.vy > before);
});

test('pickAnchor prefers ahead, ignores far and below', () => {
  assert.equal(pickAnchor([{ x: 40, y: 40 }, { x: 80, y: 40 }], 60, 100).x, 80);
  assert.equal(pickAnchor([{ x: 300, y: 40 }], 60, 100), null);
  assert.equal(pickAnchor([{ x: 60, y: 120 }], 60, 100), null);
});

test('the rope keeps its length and gives momentum', () => {
  const sc = { start: { x: 40, y: 80 }, anchors: [{ x: 90, y: 30 }] };
  const s = createSwing(sc);
  let maxVx = 0;
  for (let i = 0; i < 30; i++) {
    stepSwing(s, sc, { web: true });
    assert.ok(Math.hypot(s.x - s.rope.x, s.y - s.rope.y) <= s.rope.len + 0.5);
    maxVx = Math.max(maxVx, s.vx);
  }
  assert.ok(maxVx > 50);
  stepSwing(s, sc, {});
  assert.equal(s.rope, null);
});

test('touching a bomb returns hit', () => {
  const sc = { start: { x: 50, y: 100 }, roofs: [floor], bombs: [{ x: 50, y: 90, ax: 0, ay: 0, period: 2 }] };
  assert.equal(stepSwing(createSwing(sc), sc, {}), 'hit');
});

test('bombPos follows a sine', () => {
  const b = { x: 100, y: 50, ax: 20, ay: 0, period: 2 };
  assert.equal(bombPos(b, 0).x, 100);
  assert.ok(Math.abs(bombPos(b, 0.5).x - 120) < 1e-9);
});
