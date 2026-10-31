// Finale: slide della festa, poi gli auguri di Marco e il regalo (decifrato solo con parole e colpevole giusti).

import { el } from './dialogue-scene.js';
import { evaluate } from './conditions.js';
import { buildPassphrase, decryptText } from './crypto.js';

export function pickEnding(endings, state) {
  return (endings || []).find(e => evaluate(e.if, state))?.id || 'messy';
}

export class EndingScene {
  constructor(game) {
    this.game = game;
    this.overlay = false;
    const e = game.data.ending;
    this.endingId = pickEnding(game.data.story.endings, game.state);
    this.slides = [...(e.common_start || []), ...(e.endings?.[this.endingId] || []), ...(e.common_end || [])];
    this.i = 0;
    this.root = el('div', 'ending');
    this.time = 0;
  }

  enter() {
    this.game.state.flags.add('game_over');
    this.game.state.flags.add(`ending_${this.endingId}`);
    this.game.save();
    this.game.hooks.music?.(['party']);
    this.game.ui.append(this.root);
    this.renderSlide();
  }

  exit() {
    this.root.remove();
  }

  sprites(ids) {
    const row = el('div', 'ending-people');
    for (const id of ids || []) {
      const spr = this.game.art.person(id);
      const src = spr.frames.down[0];
      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = src.height;
      c.getContext('2d').drawImage(src, 0, 0);
      c.style.setProperty('--h', src.height);
      row.append(c);
    }
    return row;
  }

  renderSlide() {
    const s = this.slides[this.i];
    const names = this.game.data.story.names;
    const card = el('div', 'ending-slide');
    card.append(this.sprites(s.people));
    if (s.speaker) card.append(el('div', 'ending-speaker', names[s.speaker] || s.speaker));
    card.append(el('p', 'ending-text', s.text), el('div', 'more', '▼'));
    this.root.replaceChildren(card);
  }

  async renderAuguri() {
    this.step = 'auguri';
    const a = this.game.data.ending.auguri;
    const card = el('div', 'ending-auguri');
    card.append(
      el('h1', '', a.title),
      el('p', 'auguri-text', a.text),
      el('p', 'auguri-sign', a.signature),
    );
    const slot = el('div', 'gift-slot', '…');
    card.append(slot);
    this.root.replaceChildren(card);
    this.game.hooks.confetti?.([]);
    const { state, data } = this.game;
    const url = await decryptText(data.secret, buildPassphrase(state.words, data.story.accusation.culprit, data.story.words));
    if (url) {
      const btn = el('a', 'gift-btn', a.button);
      btn.href = url;
      btn.target = '_blank';
      btn.rel = 'noopener';
      slot.replaceChildren(btn);
      this.giftButton = btn;
    } else {
      slot.replaceChildren(el('p', 'gift-locked', a.locked));
    }
  }

  update(dt, input) {
    this.time += dt;
    if (this.step === 'auguri') {
      if (input.pressed('ok') && this.giftButton) this.giftButton.click();
      return;
    }
    if (input.pressed('ok')) {
      this.game.hooks.sound?.(['select']);
      this.i++;
      if (this.i < this.slides.length) this.renderSlide();
      else this.renderAuguri();
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#1a1020';
    ctx.fillRect(0, 0, 256, 192);
  }
}
