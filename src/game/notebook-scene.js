// Taccuino (tasto I): parole di Marco, prove, oggetti, paperelle.

import { el } from './dialogue-scene.js';

export class NotebookScene {
  constructor(game) {
    this.game = game;
    this.overlay = true;
    this.sel = 0;
    this.box = el('div', 'box menu notebook');
  }

  entries() {
    const items = this.game.data.story.items || {};
    const owned = [...this.game.state.items].filter(id => items[id]);
    const ev = owned.filter(id => items[id].kind === 'evidence');
    const it = owned.filter(id => items[id].kind !== 'evidence');
    return [...ev.map(id => ({ id, group: 'Prove', ...items[id] })), ...it.map(id => ({ id, group: 'Oggetti', ...items[id] }))];
  }

  enter() {
    this.game.ui.append(this.box);
    this.render();
  }

  exit() {
    this.box.remove();
  }

  render() {
    const { state, data } = this.game;
    const words = data.story.words.map(k => state.words[k] || '· · ·');
    const list = this.entries();
    this.sel = Math.min(this.sel, Math.max(0, list.length - 1));
    const left = el('div', 'nb-list');
    let group = '';
    list.forEach((e, i) => {
      if (e.group !== group) { group = e.group; left.append(el('h3', '', group)); }
      left.append(el('div', `sel-row${i === this.sel ? ' sel' : ''}`, e.name));
    });
    if (!list.length) left.append(el('div', 'muted', 'Ancora niente. Parla con tutti.'));
    const right = el('div', 'nb-detail');
    const cur = list[this.sel];
    right.append(el('div', 'nb-desc', cur ? cur.desc : ''));
    const head = el('div', 'nb-head');
    head.append(el('h2', '', 'Taccuino'), el('div', 'nb-words', `Parole di Marco: ${words.join(' · ')}`));
    const ducks = state.counters.ducks || 0;
    const foot = el('div', 'nb-foot', `Paperelle di Moka: ${ducks}/${data.story.ducksTotal}   ·   Offese di oggi: ${state.counters.offended || 0}`);
    const body = el('div', 'nb-body');
    body.append(left, right);
    this.box.replaceChildren(head, body, foot, el('div', 'hint', '↑↓ scorri · X chiudi'));
    left.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  }

  update(dt, input) {
    const n = this.entries().length;
    if (input.pressed('back') || input.pressed('notebook')) { this.game.scenes.remove(this); return; }
    if (!n) return;
    if (input.pressed('up')) { this.sel = (this.sel + n - 1) % n; this.render(); this.game.hooks.sound?.(['cursor']); }
    if (input.pressed('down')) { this.sel = (this.sel + 1) % n; this.render(); this.game.hooks.sound?.(['cursor']); }
  }

  draw() {}
}
