// Schermata del titolo: Continua / Nuova partita.

import { el } from './dialogue-scene.js';

export class TitleScene {
  constructor(game, { hasSave, onContinue, onNew }) {
    this.game = game;
    this.overlay = true;
    this.options = hasSave ? ['Continua', 'Nuova partita'] : ['Inizia'];
    this.actions = hasSave ? [onContinue, onNew] : [onNew];
    this.sel = 0;
    this.confirmNew = false;
    this.root = el('div', 'title');
  }

  enter() {
    this.game.ui.append(this.root);
    this.render();
  }

  exit() {
    this.root.remove();
  }

  render() {
    const menu = el('div', 'title-menu');
    this.options.forEach((o, i) => menu.append(el('div', `sel-row${i === this.sel ? ' sel' : ''}`, o)));
    const warn = this.confirmNew ? el('div', 'title-warn', 'Ricominciare cancella i progressi. Premi Z di nuovo per confermare.') : '';
    this.root.replaceChildren(
      el('div', 'title-small', 'Santu Brugaru presenta'),
      el('h1', 'title-logo', 'IL COMPLEANNO\nDI KIRIL'),
      el('div', 'title-sub', 'Un giallo in un paese che non sa pronunciare il tuo nome'),
      menu,
      warn,
      el('div', 'title-keys', 'Frecce: muoviti · Z: parla/conferma · X: annulla · I: taccuino · H: aiuto · M: muto'),
    );
  }

  update(dt, input) {
    const n = this.options.length;
    if (input.pressed('up')) { this.sel = (this.sel + n - 1) % n; this.confirmNew = false; this.render(); }
    if (input.pressed('down')) { this.sel = (this.sel + 1) % n; this.confirmNew = false; this.render(); }
    if (input.pressed('ok')) {
      this.game.hooks.unlockAudio?.([]);
      const isNewOverSave = this.options.length === 2 && this.sel === 1;
      if (isNewOverSave && !this.confirmNew) { this.confirmNew = true; this.render(); return; }
      this.game.scenes.remove(this);
      this.actions[this.sel]();
    }
  }

  draw() {}
}
