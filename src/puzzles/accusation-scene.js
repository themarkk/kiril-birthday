// Il tribunale di Su Nuraghe: scegli il colpevole, poi due prove dal taccuino.

import { el, portraitNode } from '../game/dialogue-scene.js';
import { judgeAccusation } from './accusation.js';

export class AccusationScene {
  constructor(game, onDone) {
    this.game = game;
    this.onDone = onDone;
    this.overlay = true;
    this.step = 'suspect';
    this.sel = 0;
    this.picked = new Set();
    this.box = el('div', 'box menu accusation');
    const story = game.data.story;
    this.suspects = story.suspects;
    this.names = story.names;
  }

  evidence() {
    const items = this.game.data.story.items;
    return [...this.game.state.items].filter(id => items[id]?.kind === 'evidence');
  }

  enter() {
    this.game.ui.append(this.box);
    this.render();
  }

  exit() {
    this.box.remove();
  }

  render() {
    const items = this.game.data.story.items;
    if (this.step === 'suspect') {
      const row = el('div', 'suspects');
      this.suspects.forEach((id, i) => {
        const card = el('div', `suspect${i === this.sel ? ' sel' : ''}`);
        card.append(portraitNode(this.game, id), el('div', '', this.names[id] || id));
        row.append(card);
      });
      this.box.replaceChildren(el('h2', '', 'Chi ha sabotato la festa?'), row, el('div', 'hint', '←→ scegli · Z accusa'));
      return;
    }
    const list = this.evidence();
    const rows = el('div', 'ev-list');
    list.forEach((id, i) => {
      const mark = this.picked.has(id) ? '◆ ' : '◇ ';
      rows.append(el('div', `sel-row${i === this.sel ? ' sel' : ''}`, mark + items[id].name));
    });
    const confirm = el('div', `sel-row confirm${this.sel === list.length ? ' sel' : ''}`, this.picked.size === 2 ? '▶ Presenta le prove' : `Scegli 2 prove (${this.picked.size}/2)`);
    rows.append(confirm);
    const cur = list[this.sel];
    this.box.replaceChildren(
      el('h2', '', `Accusi ${this.names[this.suspect] || this.suspect}. Con quali prove?`),
      rows,
      el('div', 'nb-desc', cur ? items[cur].desc : ''),
      el('div', 'hint', '↑↓ scorri · Z seleziona · X indietro'),
    );
  }

  update(dt, input) {
    const snd = n => this.game.hooks.sound?.([n]);
    if (this.step === 'suspect') {
      const n = this.suspects.length;
      if (input.pressed('left') || input.pressed('up')) { this.sel = (this.sel + n - 1) % n; snd('cursor'); this.render(); }
      if (input.pressed('right') || input.pressed('down')) { this.sel = (this.sel + 1) % n; snd('cursor'); this.render(); }
      if (input.pressed('ok')) {
        snd('select');
        this.suspect = this.suspects[this.sel];
        this.step = 'evidence';
        this.sel = 0;
        this.render();
      }
      return;
    }
    const list = this.evidence();
    const n = list.length + 1;
    if (input.pressed('back')) { this.step = 'suspect'; this.sel = this.suspects.indexOf(this.suspect); this.render(); return; }
    if (input.pressed('up')) { this.sel = (this.sel + n - 1) % n; snd('cursor'); this.render(); }
    if (input.pressed('down')) { this.sel = (this.sel + 1) % n; snd('cursor'); this.render(); }
    if (input.pressed('ok')) {
      if (this.sel < list.length) {
        const id = list[this.sel];
        if (this.picked.has(id)) this.picked.delete(id);
        else if (this.picked.size < 2) this.picked.add(id);
        snd('select');
        this.render();
      } else if (this.picked.size === 2 || (list.length < 2 && this.picked.size === list.length)) {
        const verdict = judgeAccusation(this.suspect, [...this.picked], this.game.data.story.accusation);
        this.game.scenes.remove(this);
        this.onDone(verdict, this.suspect);
      }
    }
  }

  draw() {}
}
