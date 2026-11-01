import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSwing, stepSwing, pickAnchor, bombPos } from '../src/puzzles/swing.js';
import { composePixels } from '../src/engine/art.js';

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

test('a long rope reels in to 60 px', () => {
  const sc = { start: { x: 40, y: 130 }, roofs: [{ x: 0, y: 130, w: 100, h: 62 }], anchors: [{ x: 100, y: 45 }] };
  const s = createSwing(sc);
  for (let i = 0; i < 60; i++) stepSwing(s, sc, { web: true });
  assert.equal(s.rope.len, 60);
  assert.ok(Math.hypot(s.x - s.rope.x, s.y - s.rope.y) <= 60.5);
});

const data = JSON.parse(readFileSync('data/swing.json', 'utf8'));

function tryScreen(sc, wait) {
  const s = createSwing(sc);
  let lastX = s.x;
  for (let i = 0; i < 40 * 60; i++) {
    if (i / 60 < wait) {
      if (stepSwing(s, sc, {})) return false;
      continue;
    }
    let web;
    if (s.rope) {
      const past = s.x - s.rope.x > 0.3 * s.rope.len;
      web = !(past && (s.vy < 0 || s.onGround));
    } else {
      const a = pickAnchor(sc.anchors, s.x, s.y);
      web = Boolean(a && a.x > s.x);
    }
    const jump = s.onGround && s.x === lastX;
    lastX = s.x;
    const r = stepSwing(s, sc, { right: true, web, jump });
    if (r === 'exit') return true;
    if (r) return false;
  }
  return false;
}

function canFinish(sc) {
  for (let wait = 0; wait <= 3; wait += 0.25) if (tryScreen(sc, wait)) return true;
  return false;
}

test('five screens, roofs thick enough, both heroes complete', () => {
  assert.equal(data.screens.length, 5);
  for (const sc of data.screens) {
    assert.ok(sc.say);
    for (const r of sc.roofs || []) assert.ok(r.h >= 8);
  }
  assert.ok(data.screens[3].bombs?.length && data.screens[4].bombs?.length);
  for (const h of ['spiderman', 'kiril']) {
    for (const k of ['name', 'pitch', 'headline', 'article']) assert.ok(data.heroes[h][k]);
    assert.ok(data.heroes[h].fall.length >= 3);
  }
});

test('a simple bot can finish every screen', () => {
  data.screens.forEach((sc, i) => assert.ok(canFinish(sc), `schermata ${i + 1}`));
});

const chars = JSON.parse(readFileSync('data/art/characters.json', 'utf8'));

test('spiderman has a full mask, no hair, and all directions', () => {
  assert.equal(chars.people.spiderman.hairStyle, 'none');
  assert.ok(chars.people.spiderman.extras.includes('spiderman_suit'));
  for (const dir of ['down', 'up', 'left', 'right']) {
    assert.equal(composePixels(chars, 'spiderman', dir, 0).h, 24);
  }
});

test('the Switch sits under the TV and leaves the TV reachable', () => {
  const house = JSON.parse(readFileSync('data/maps/house.json', 'utf8'));
  assert.equal([...house.rows[4]][10], 'n');
  assert.equal(house.legend.n, 'switch');
  assert.equal([...house.rows[3]][10], '.');
  const sw = house.objects.find(o => o.id === 'switch');
  assert.deepEqual([sw.x, sw.y, sw.node], [10, 4, 'switch']);
  const objects = JSON.parse(readFileSync('data/dialogues/objects.json', 'utf8'));
  assert.equal(objects.nodes.switch.puzzle.id, 'swing');
  assert.equal(objects.nodes.tv.lines[0], 'La TV è spenta. Strano: Marco la lascia sempre accesa sui documentari di ingegneria.');
});
