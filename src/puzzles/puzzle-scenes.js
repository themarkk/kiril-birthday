// Schermate dei minigiochi: statue di Nicole, morra di Masia, picchiaduro di Leryn.
// Ogni scena chiama onResult(vinto) una volta sola. debugSolve() serve ai playtest automatici.

import { el, portraitNode } from '../game/dialogue-scene.js';
import { checkStatues } from './cipher.js';
import { MOVES, createRps } from './rps.js';
import { createComboMatch } from './combo.js';
import { SwingScene } from './swing-scene.js';

class PuzzleScene {
  constructor(game, onResult, cls) {
    this.game = game;
    this.onResult = onResult;
    this.overlay = true;
    this.done = false;
    this.box = el('div', `box menu puzzle ${cls}`);
  }
  enter() { this.game.ui.append(this.box); this.render(); }
  exit() { this.box.remove(); }
  finish(win, delay = 0) {
    if (this.done) return;
    this.done = true;
    setTimeout(() => this.onResult(win), delay);
  }
  debugSolve(win) { this.finish(win); }
  snd(n) { this.game.hooks.sound?.([n]); }
  draw() {}
}

function spriteCanvas(src, scale = 1) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  c.style.width = `calc(var(--s) * ${src.width * scale}px)`;
  c.style.imageRendering = 'pixelated';
  return c;
}

// ---------- Statue ----------
export class CipherScene extends PuzzleScene {
  constructor(game, onResult) {
    super(game, onResult, 'cipher');
    this.cfg = game.data.story.puzzles.cipher;
    this.slots = [null, null, null, null];
    this.sel = 0;
    this.msg = 'Scegli una statua per ogni piedistallo. Gli indovinelli sono sotto.';
  }

  render() {
    const row = el('div', 'pedestals');
    this.slots.forEach((g, i) => {
      const col = el('div', `pedestal${i === this.sel ? ' sel' : ''}`);
      const pic = el('div', 'statue-pic');
      if (g) pic.append(spriteCanvas(this.game.art.object(`statue_${g}`), 2));
      else pic.append(el('div', 'statue-empty', '?'));
      col.append(el('div', 'arrow', i === this.sel ? '▲' : ''), pic, el('div', 'statue-name', g ? this.cfg.names[g] : '—'), el('div', 'arrow', i === this.sel ? '▼' : ''), el('div', 'clue', `«${this.cfg.clues[i]}»`));
      row.append(col);
    });
    this.box.replaceChildren(el('h2', '', 'I piedistalli di Marco'), row, el('div', 'puzzle-msg', this.msg), el('div', 'hint', '←→ piedistallo · ↑↓ statua · Z conferma · X esci'));
  }

  update(dt, input) {
    if (this.done) return;
    const pool = this.cfg.pool;
    const cycle = d => {
      const cur = this.slots[this.sel];
      const i = cur ? pool.indexOf(cur) : (d > 0 ? -1 : 0);
      this.slots[this.sel] = pool[(i + d + pool.length) % pool.length];
      this.snd('cursor');
      this.render();
    };
    if (input.pressed('left')) { this.sel = (this.sel + 3) % 4; this.snd('cursor'); this.render(); }
    if (input.pressed('right')) { this.sel = (this.sel + 1) % 4; this.snd('cursor'); this.render(); }
    if (input.pressed('up')) cycle(1);
    if (input.pressed('down')) cycle(-1);
    if (input.pressed('back')) { this.finish(false); return; }
    if (input.pressed('ok')) {
      if (this.slots.some(s => !s)) { this.msg = 'Ogni piedistallo vuole la sua statua.'; this.render(); return; }
      if (checkStatues(this.slots, this.cfg.solution)) {
        this.msg = 'Le quattro statue brillano. Da qualche parte, un meccanismo fa click.';
        this.snd('solve');
        this.render();
        this.finish(true, 1200);
      } else {
        const right = this.slots.filter((s, i) => s === this.cfg.solution[i]).length;
        this.msg = `Niente. ${right === 0 ? 'Nessuna statua' : right === 1 ? 'Una statua sembra' : `${right} statue sembrano`} al posto giusto.`;
        this.snd('wrong');
        this.render();
      }
    }
  }
}

// ---------- Morra cinese ----------
const ICON = { sasso: '✊', carta: '✋', forbice: '✌' };
const TAUNT_WIN = ['Pff. Fortuna.', 'Ok, questa te la concedo. Le altre no.', 'Mi sono distratto. Mi distraggo mai.'];
const TAUNT_LOSE = ['AHAH. Prevedibile.', 'Ti leggo come un libro. Un libro brutto.', 'Ancora. Dai. Fammi divertire.'];

export class RpsScene extends PuzzleScene {
  constructor(game, onResult) {
    super(game, onResult, 'rps');
    this.game_ = createRps(game.data.story.puzzles.rps.target);
    this.sel = 0;
    this.last = null;
  }

  render() {
    const h = this.game_.history;
    const score = h.reduce((s, r) => ({ p: s.p + (r.result === 1), m: s.m + (r.result === -1) }), { p: 0, m: 0 });
    const faces = el('div', 'versus');
    faces.append(portraitNode(this.game, 'kiril'), el('div', 'score', `${score.p} – ${score.m}`), portraitNode(this.game, 'masia'));
    const opts = el('div', 'rps-opts');
    MOVES.forEach((m, i) => opts.append(el('div', `rps-opt${i === this.sel ? ' sel' : ''}`, `${ICON[m]} ${m}`)));
    const hist = el('div', 'rps-history');
    h.slice(-4).forEach(r => hist.append(el('div', '', `Tu ${ICON[r.move]} ${r.move}  ·  Masia ${ICON[r.masia]} ${r.masia}  →  ${r.result === 1 ? 'punto tuo' : r.result === -1 ? 'punto suo' : 'pari'}`)));
    const say = this.last ? `Masia: «${this.last}»` : 'Masia: «Primo a tre. Mostra cosa sai fare, festeggiato.»';
    this.box.replaceChildren(el('h2', '', 'Morra cinese contro Masia'), faces, opts, el('div', 'puzzle-msg', say), hist, el('div', 'hint', '←→ scegli · Z gioca · X ritirati'));
  }

  update(dt, input) {
    if (this.done) return;
    if (input.pressed('left')) { this.sel = (this.sel + 2) % 3; this.snd('cursor'); this.render(); }
    if (input.pressed('right')) { this.sel = (this.sel + 1) % 3; this.snd('cursor'); this.render(); }
    if (input.pressed('back')) { this.finish(false); return; }
    if (input.pressed('ok')) {
      const r = this.game_.play(MOVES[this.sel]);
      const pool = r.result === 1 ? TAUNT_WIN : r.result === -1 ? TAUNT_LOSE : ['Pari. Che noia. Ancora.'];
      this.last = pool[this.game_.history.length % pool.length];
      this.snd(r.result === 1 ? 'select' : r.result === -1 ? 'wrong' : 'cursor');
      if (r.over) {
        this.last = r.won ? 'Non. È. Possibile.' : 'Tre a zero. Cioè, come è finita. Ho vinto io.';
        this.finish(r.won, 1300);
      }
      this.render();
    }
  }
}

// ---------- Picchiaduro ----------
const KEY_ICON = { up: '↑', down: '↓', left: '←', right: '→', ok: 'Z', back: 'X' };
const KEYS = ['up', 'down', 'left', 'right', 'ok', 'back'];

export class ComboScene extends PuzzleScene {
  constructor(game, onResult) {
    super(game, onResult, 'combo');
    this.cfg = game.data.story.puzzles.combo;
    this.match = createComboMatch(this.cfg.rounds);
    this.phase = 'show';
    this.t = 0;
    this.say = 'Leryn: «Round uno. Guarda e impara. Ma soprattutto guarda.»';
  }

  render() {
    const s = this.match.state;
    const combo = this.match.current() || [];
    const showing = this.phase === 'show';
    const keys = el('div', 'combo-keys');
    combo.forEach((k, i) => {
      const typed = s.given[i];
      const txt = showing ? KEY_ICON[k] : typed ? KEY_ICON[typed] : '·';
      keys.append(el('div', `combo-key${typed ? ' typed' : ''}`, txt));
    });
    const dots = el('div', 'combo-dots', `Round ${Math.min(s.round + 1, this.cfg.rounds.length)}/${this.cfg.rounds.length}   ·   Tu ${'●'.repeat(s.wins)}${'○'.repeat(2 - Math.min(2, s.wins))}   Leryn ${'●'.repeat(s.losses)}${'○'.repeat(2 - Math.min(2, s.losses))}`);
    const total = showing ? this.cfg.showMs : this.cfg.inputMs;
    const bar = el('div', 'combo-bar');
    const fill = el('div', 'combo-fill');
    fill.style.width = `${Math.max(0, 100 - (this.t * 1000 / total) * 100)}%`;
    bar.append(fill);
    this.fill = fill;
    const label = showing ? 'MEMORIZZA!' : this.phase === 'input' ? 'RIFALLA!' : '';
    this.box.replaceChildren(el('h2', '', 'PUGNI DI FERRO SARDI 3'), dots, el('div', 'combo-label', label), keys, bar, el('div', 'puzzle-msg', this.say), el('div', 'hint', 'Frecce, Z e X per la combo'));
  }

  update(dt, input) {
    if (this.done) return;
    this.t += dt;
    const s = this.match.state;
    if (this.phase === 'show') {
      if (this.t * 1000 >= this.cfg.showMs) { this.phase = 'input'; this.t = 0; this.render(); }
      else if (this.fill) this.fill.style.width = `${100 - (this.t * 1000 / this.cfg.showMs) * 100}%`;
      return;
    }
    if (this.phase === 'pause') {
      if (this.t > 1.1) {
        if (s.over) {
          this.say = s.won ? 'Leryn: «...porc*. Ok. GG.»' : 'Leryn: «Scarso. Ma scarso con impegno.»';
          this.render();
          this.finish(s.won, 1100);
          return;
        }
        this.phase = 'show';
        this.t = 0;
        this.say = ['Leryn: «Round due. Più difficile. Per te.»', 'Leryn: «Ultimo. Niente pressione. Tanta pressione.»'][s.round - 1] || '';
        this.render();
      }
      return;
    }
    // input
    const roundBefore = s.round;
    for (const k of KEYS) {
      if (input.pressed(k)) {
        this.match.input(k);
        this.snd('cursor');
        break;
      }
    }
    if (s.round === roundBefore && this.t * 1000 >= this.cfg.inputMs) this.match.timeout();
    if (s.round !== roundBefore) {
      this.phase = 'pause';
      this.t = 0;
      this.say = s.last === 'ok' ? 'COMBO! Leryn incassa e sbuffa.' : 'Sbagliato. Leryn ti mette al tappeto senza nemmeno guardare.';
      this.snd(s.last === 'ok' ? 'solve' : 'wrong');
      this.render();
      return;
    }
    if (this.fill) this.fill.style.width = `${Math.max(0, 100 - (this.t * 1000 / this.cfg.inputMs) * 100)}%`;
    if (input.pressed('up') || input.pressed('down') || input.pressed('left') || input.pressed('right') || input.pressed('ok') || input.pressed('back')) this.render();
  }
}

export function registerPuzzles(game) {
  game.puzzles.cipher = (g, onResult) => new CipherScene(g, onResult);
  game.puzzles.rps = (g, onResult) => new RpsScene(g, onResult);
  game.puzzles.combo = (g, onResult) => new ComboScene(g, onResult);
  game.puzzles.swing = (g, onResult) => new SwingScene(g, onResult);
}
