import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkStatues } from '../src/puzzles/cipher.js';
import { masiaMove, outcome, createRps } from '../src/puzzles/rps.js';
import { judgeCombo, createComboMatch } from '../src/puzzles/combo.js';
import { tryPush, allOnPlates } from '../src/puzzles/sokoban.js';

test('statues: exact order only', () => {
  const sol = ['efesto', 'rea', 'orfeo', 'eros'];
  assert.equal(checkStatues([...sol], sol), true);
  assert.equal(checkStatues(['rea', 'efesto', 'orfeo', 'eros'], sol), false);
  assert.equal(checkStatues(['efesto', 'rea', 'orfeo'], sol), false);
});

test('masia plays what beats your previous move, sasso first', () => {
  assert.equal(masiaMove(null), 'sasso');
  assert.equal(masiaMove('sasso'), 'carta');
  assert.equal(masiaMove('carta'), 'forbice');
  assert.equal(masiaMove('forbice'), 'sasso');
  assert.equal(outcome('carta', 'sasso'), 1);
  assert.equal(outcome('sasso', 'carta'), -1);
  assert.equal(outcome('sasso', 'sasso'), 0);
});

test('reading the pattern beats masia 3-0', () => {
  const g = createRps();
  let prev = null;
  let r;
  for (let i = 0; i < 3; i++) {
    const his = masiaMove(prev);
    const mine = { sasso: 'carta', carta: 'forbice', forbice: 'sasso' }[his];
    r = g.play(mine);
    prev = mine;
  }
  assert.deepEqual(r.score, { p: 3, m: 0 });
  assert.equal(r.over, true);
  assert.equal(r.won, true);
});

test('repeating the same move loses to masia', () => {
  const g = createRps();
  let r;
  for (let i = 0; i < 6 && !r?.over; i++) r = g.play('sasso');
  assert.equal(r.won, false);
});

test('combo judge: ok, partial, wrong', () => {
  assert.equal(judgeCombo(['a', 'b'], ['a']), 'partial');
  assert.equal(judgeCombo(['a', 'b'], ['a', 'c']), 'wrong');
  assert.equal(judgeCombo(['a', 'b'], ['a', 'b']), 'ok');
});

test('combo match: best of three rounds', () => {
  const m = createComboMatch([['up'], ['down'], ['left']]);
  m.input('up'); // round 1 ok
  m.input('left'); // round 2 wrong
  m.input('left'); // round 3 ok
  assert.equal(m.state.wins, 2);
  assert.equal(m.state.over, true);
  assert.equal(m.state.won, true);
});

test('combo match: timeout loses the round', () => {
  const m = createComboMatch([['up', 'up'], ['down'], ['left']]);
  m.timeout();
  m.timeout();
  assert.equal(m.state.over, true);
  assert.equal(m.state.won, false);
});

const grid = rows => ({ isSolid: (x, y) => !rows[y] || rows[y][x] === undefined || rows[y][x] === '#' });

test('push into a wall or another box does not move', () => {
  const g = grid(['#####', '#...#', '#####']);
  assert.equal(tryPush(g, [{ x: 3, y: 1 }], { x: 2, y: 1 }, 'right').moved, false);
  assert.equal(tryPush(g, [{ x: 2, y: 1 }, { x: 3, y: 1 }], { x: 1, y: 1 }, 'right').moved, false);
  const ok = tryPush(g, [{ x: 2, y: 1 }], { x: 1, y: 1 }, 'right');
  assert.equal(ok.moved, true);
  assert.deepEqual(ok.boxes, [{ x: 3, y: 1 }]);
});

test('lab: stored solution solves the real level, and reset restores the start', () => {
  const lab = JSON.parse(readFileSync(new URL('../data/maps/lab.json', import.meta.url), 'utf8'));
  const tilesSolid = new Set(['wall_in', 'wall_in_window', 'void', 'set_panel']);
  const legend = lab.legend;
  const g = { isSolid: (x, y) => !lab.rows[y] || lab.rows[y][x] === undefined || tilesSolid.has(legend[lab.rows[y][x]]) || (lab.objects || []).some(o => o.x === x && o.y === y && o.solid !== false && !o.if) };
  const start = lab.pushables.map(p => ({ x: p.x, y: p.y }));
  let boxes = start.map(b => ({ ...b }));
  let p = { ...lab.labStart };
  const D = { U: 'up', D: 'down', L: 'left', R: 'right' };
  const V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const ch of lab.solution) {
    const dir = D[ch];
    const [dx, dy] = V[dir];
    const t = { x: p.x + dx, y: p.y + dy };
    if (boxes.some(b => b.x === t.x && b.y === t.y)) {
      const r = tryPush(g, boxes, p, dir);
      assert.ok(r.moved, `spinta bloccata al passo ${ch}`);
      boxes = r.boxes;
      p = t;
    } else if (!g.isSolid(t.x, t.y)) {
      p = t;
    } else {
      assert.fail(`passo nel muro: ${ch} da ${p.x},${p.y}`);
    }
  }
  assert.equal(allOnPlates(boxes, lab.plates), true);
  assert.deepEqual(lab.pushables.map(b => ({ x: b.x, y: b.y })), start);
});
