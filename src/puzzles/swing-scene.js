// Minigioco della Switch: selezione del personaggio, cinque schermate a ragnatele, prima pagina del Daily Bugle.
// Il mondo sta sul canvas, i testi nell'overlay DOM. Non tocca lo stato di gioco.

import { el } from '../game/dialogue-scene.js';
import { W, H } from '../engine/screen.js';
import { STEP, createSwing, stepSwing, pickAnchor, bombPos } from './swing.js';

const HEROES = ['spiderman', 'kiril'];
const MAX_DT = 0.05;

function drawBackdrop() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  [['#1c2350', 0], ['#2c2a63', 50], ['#4a3273', 95], ['#7a3f78', 130]].forEach(([col, y]) => {
    ctx.fillStyle = col;
    ctx.fillRect(0, y, W, H - y);
  });
  for (let x = 0, i = 0; x < W; i++) {
    const w = 16 + ((i * 37) % 22);
    const top = 70 + ((i * 53) % 60);
    ctx.fillStyle = i % 2 ? '#241c44' : '#2b2150';
    ctx.fillRect(x, top, w, H - top);
    ctx.fillStyle = '#f2d98a';
    for (let wy = top + 4; wy < H; wy += 8) {
      for (let wx = x + 3; wx < x + w - 3; wx += 6) {
        if ((wx * 7 + wy * 13) % 5 === 0) ctx.fillRect(wx, wy, 2, 3);
      }
    }
    x += w;
  }
  return c;
}

function drawRope(ctx, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  ctx.fillStyle = '#fff8ec';
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
  }
}

export class SwingScene {
  constructor(game, onResult) {
    this.game = game;
    this.onResult = onResult;
    this.overlay = false;
    this.done = false;
    this.cfg = game.data.swing;
    this.phase = 'select';
    this.sel = 0;
    this.falls = 0;
    this.index = 0;
    this.acc = 0;
    this.time = 0;
    this.backdrop = drawBackdrop();
    this.ui = el('div', 'swing-ui');
  }

  enter() {
    this.game.ui.append(this.ui);
    this.game.hooks.music?.(['arcade']);
    this.renderSelect();
  }

  exit() {
    this.ui.remove();
    this.game.hooks.music?.([this.game.world.map.json.music || 'interior']);
  }

  finish(win) {
    if (this.done) return;
    this.done = true;
    setTimeout(() => this.onResult(win), 0);
  }

  debugSolve(win) { this.finish(win); }
  snd(n) { this.game.hooks.sound?.([n]); }
  get hero() { return this.cfg.heroes[HEROES[this.sel]]; }
  get screen() { return this.cfg.screens[this.index]; }

  renderSelect() {
    const names = HEROES.map((id, i) => {
      const n = el('div', `swing-name${i === this.sel ? ' sel' : ''}`, this.cfg.heroes[id].name);
      n.style.left = `${i * 50}%`;
      return n;
    });
    this.ui.replaceChildren(
      el('div', 'swing-title', 'SPIDER-MAN'),
      el('div', 'swing-sub', 'Scegli chi attraversa New York'),
      ...names,
      el('div', 'swing-pitch', this.hero.pitch),
      el('div', 'swing-hint', '←→ scegli · Z gioca · X spegni'),
    );
  }

  renderPlay(say) {
    const line = el('div', 'swing-say');
    line.append(el('b', '', `${this.index + 1}/${this.cfg.screens.length} `), say);
    this.ui.replaceChildren(line, el('div', 'swing-hint', '←→ muovi · ↑ salta · tieni Z ragnatela · X spegni'));
  }

  renderBugle() {
    const page = el('div', 'swing-bugle');
    const tally = this.falls === 1 ? '1 caduta' : `${this.falls} cadute`;
    const art = this.game.art.person(HEROES[this.sel]);
    const photo = document.createElement('canvas');
    photo.width = art.w;
    photo.height = art.h;
    photo.className = 'swing-photo';
    photo.getContext('2d').drawImage(art.frames.down[0], 0, 0);
    page.append(el('h2', '', 'DAILY BUGLE'), el('h3', '', this.hero.headline), photo, el('p', '', this.hero.article), el('p', '', `Danni accertati: ${tally}.`), el('div', 'swing-hint', 'Z spegni la console'));
    this.ui.replaceChildren(page);
  }

  startScreen(say) {
    this.s = createSwing(this.screen);
    this.acc = 0;
    this.game.input.consume();
    this.renderPlay(say);
  }

  update(dt, input) {
    if (this.done) return;
    this.time += dt;
    if (this.phase === 'select') this.updateSelect(input);
    else if (this.phase === 'play') this.updatePlay(dt, input);
    else if (input.pressed('ok') || input.pressed('back')) this.finish(true);
  }

  updateSelect(input) {
    if (input.pressed('left') || input.pressed('right')) {
      this.sel = 1 - this.sel;
      this.snd('cursor');
      this.renderSelect();
    }
    if (input.pressed('back')) { this.finish(false); return; }
    if (input.pressed('ok')) {
      this.snd('select');
      this.phase = 'play';
      this.startScreen(this.screen.say);
    }
  }

  updatePlay(dt, input) {
    if (input.pressed('back')) { this.finish(false); return; }
    const keys = { left: input.held('left'), right: input.held('right'), jump: input.held('up'), web: input.held('ok') };
    this.acc += Math.min(dt, MAX_DT);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      const hadRope = Boolean(this.s.rope);
      const result = stepSwing(this.s, this.screen, keys);
      if (!hadRope && this.s.rope) this.snd('cursor');
      if (result) { this.onEvent(result); return; }
    }
  }

  onEvent(result) {
    if (result === 'exit') {
      this.index++;
      if (this.index >= this.cfg.screens.length) {
        this.snd('solve');
        this.phase = 'bugle';
        this.game.input.consume();
        this.renderBugle();
        return;
      }
      this.snd('select');
      this.startScreen(this.screen.say);
      return;
    }
    this.snd('wrong');
    const line = this.hero.fall[this.falls % this.hero.fall.length];
    this.falls++;
    this.startScreen(line);
  }

  draw(ctx) {
    ctx.drawImage(this.backdrop, 0, 0);
    if (this.phase === 'select') this.drawSelect(ctx);
    else if (this.phase === 'play') this.drawPlay(ctx);
  }

  drawSelect(ctx) {
    HEROES.forEach((id, i) => {
      const art = this.game.art.person(id);
      const picked = i === this.sel;
      const frame = picked ? Math.floor(this.time * 6) % 3 : 0;
      const cx = i === 0 ? 64 : 192;
      if (picked) {
        ctx.fillStyle = 'rgba(242, 181, 68, .25)';
        ctx.fillRect(cx - 34, 48, 68, 72);
      }
      ctx.drawImage(art.frames.down[frame], cx - 24, 48, art.w * 3, art.h * 3);
    });
  }

  drawPlay(ctx) {
    const { s, screen } = this;
    const art = this.game.art;
    for (const r of screen.roofs || []) {
      ctx.fillStyle = '#7a4632';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#e0a868';
      ctx.fillRect(r.x, r.y, r.w, 2);
      ctx.fillStyle = '#5e3424';
      for (let y = r.y + 6; y < r.y + r.h; y += 8) ctx.fillRect(r.x, y, r.w, 1);
    }
    const target = s.rope ? null : pickAnchor(screen.anchors, s.x, s.y);
    for (const a of screen.anchors || []) {
      if (a === target) {
        ctx.fillStyle = '#f2b544';
        ctx.fillRect(a.x - 6, a.y - 6, 12, 12);
      }
      ctx.drawImage(art.object('swing_anchor'), a.x - 4, a.y - 4);
    }
    if (s.rope) drawRope(ctx, s.x, s.y - 14, s.rope.x, s.rope.y);
    for (const b of screen.bombs || []) {
      const p = bombPos(b, s.t);
      ctx.drawImage(art.object('swing_bomb'), Math.round(p.x - 5), Math.round(p.y - 5));
    }
    const sprite = art.person(HEROES[this.sel]);
    const walking = s.onGround && Math.abs(s.vx) > 0;
    const frame = walking ? Math.floor(s.t * 8) % 3 : s.onGround ? 0 : 1;
    ctx.drawImage(sprite.frames[s.facing > 0 ? 'right' : 'left'][frame], Math.round(s.x - sprite.w / 2), Math.round(s.y - sprite.h));
  }
}
