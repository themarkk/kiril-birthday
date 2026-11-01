// Fisica del minigioco a ragnatele: passo fisso, corda a pendolo, tetti solidi. x,y sono il centro dei piedi.

export const STEP = 1 / 60;

const GRAVITY = 300;
const WALK = 64;
const JUMP = 145;
const AIR = 90;
const PUMP = 110;
const RANGE = 110;
const MIN_ROPE = 24;
const TARGET_ROPE = 60;
const REEL = 120;
const MAX_SPEED = 190;
const HALF_W = 5;
const BODY_H = 22;
const BOMB_R = 5;
const RIGHT_EDGE = 256;
const FALL_Y = 216;

export function createSwing(screen) {
  return { x: screen.start.x, y: screen.start.y, vx: 0, vy: 0, onGround: false, rope: null, t: 0, facing: 1 };
}

export function pickAnchor(anchors = [], x, y) {
  let best = null;
  let bestScore = Infinity;
  for (const a of anchors) {
    const d = Math.hypot(a.x - x, a.y - y);
    if (d > RANGE || a.y >= y - 8) continue;
    const score = d - 0.5 * (a.x - x);
    if (score < bestScore) { best = a; bestScore = score; }
  }
  return best;
}

export function bombPos(bomb, t) {
  const k = Math.sin((2 * Math.PI * t) / bomb.period);
  return { x: bomb.x + bomb.ax * k, y: bomb.y + bomb.ay * k };
}

function overlaps(s, r) {
  return s.x + HALF_W > r.x && s.x - HALF_W < r.x + r.w && s.y > r.y && s.y - BODY_H < r.y + r.h;
}

function moveX(s, dx, roofs) {
  s.x += dx;
  for (const r of roofs) {
    if (!overlaps(s, r)) continue;
    s.x = dx > 0 ? r.x - HALF_W : r.x + r.w + HALF_W;
    s.vx = 0;
  }
}

function moveY(s, dy, roofs) {
  s.y += dy;
  for (const r of roofs) {
    if (!overlaps(s, r)) continue;
    if (dy > 0) { s.y = r.y; s.onGround = true; } else s.y = r.y + r.h + BODY_H;
    s.vy = 0;
  }
}

function hitsBomb(s, screen) {
  return (screen.bombs || []).some(b => {
    const p = bombPos(b, s.t);
    const cx = Math.max(s.x - HALF_W, Math.min(p.x, s.x + HALF_W));
    const cy = Math.max(s.y - BODY_H, Math.min(p.y, s.y));
    return Math.hypot(p.x - cx, p.y - cy) < BOMB_R;
  });
}

export function stepSwing(s, screen, keys) {
  const roofs = screen.roofs || [];
  s.t += STEP;

  if (!keys.web) s.rope = null;
  else if (!s.rope) {
    const a = pickAnchor(screen.anchors, s.x, s.y);
    if (a) s.rope = { x: a.x, y: a.y, len: Math.max(MIN_ROPE, Math.hypot(a.x - s.x, a.y - s.y)) };
  }

  if (s.rope && s.rope.len > TARGET_ROPE) s.rope.len = Math.max(TARGET_ROPE, s.rope.len - REEL * STEP);

  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (dir) s.facing = dir;
  const dist = s.rope ? Math.hypot(s.x - s.rope.x, s.y - s.rope.y) : 0;
  if (s.onGround) {
    s.vx = dir * WALK;
    if (keys.jump) s.vy = -JUMP;
  } else if (s.rope && dist >= s.rope.len - 1) {
    s.vx += dir * PUMP * STEP * ((s.y - s.rope.y) / dist);
    s.vy -= dir * PUMP * STEP * ((s.x - s.rope.x) / dist);
  } else {
    s.vx += dir * AIR * STEP;
  }
  s.vy += GRAVITY * STEP;

  const speed = Math.hypot(s.vx, s.vy);
  if (speed > MAX_SPEED) { s.vx *= MAX_SPEED / speed; s.vy *= MAX_SPEED / speed; }

  let nx = s.x + s.vx * STEP;
  let ny = s.y + s.vy * STEP;
  if (s.rope) {
    const dx = nx - s.rope.x;
    const dy = ny - s.rope.y;
    const d = Math.hypot(dx, dy);
    if (d > s.rope.len) {
      const ux = dx / d;
      const uy = dy / d;
      const out = s.vx * ux + s.vy * uy;
      if (out > 0) { s.vx -= out * ux; s.vy -= out * uy; }
      nx = s.rope.x + ux * s.rope.len;
      ny = s.rope.y + uy * s.rope.len;
    }
  }

  s.onGround = false;
  moveX(s, nx - s.x, roofs);
  moveY(s, ny - s.y, roofs);
  if (s.x < HALF_W) { s.x = HALF_W; s.vx = Math.max(0, s.vx); }

  if (hitsBomb(s, screen)) return 'hit';
  if (s.x > RIGHT_EDGE) return 'exit';
  if (s.y > FALL_Y) return 'fall';
  return null;
}
