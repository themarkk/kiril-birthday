// Box di dialogo stile handheld: testo che scorre, ritratto, nome, scelte. Overlay DOM sopra il canvas.

import { createRunner, resolvePuzzle } from './dialogue-runner.js';

const CPS = 40;
// Effetti che cambiano scena: si eseguono quando il dialogo si chiude.
const DEFERRED = new Set(['warp', 'accuse', 'ending', 'costume', 'fade']);

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function portraitNode(game, id) {
  const wrap = el('div', 'portrait');
  const src = id && game.art.portrait(id);
  if (src) {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    wrap.append(c);
  } else {
    wrap.textContent = (id || '?')[0].toUpperCase();
  }
  return wrap;
}

export class DialogueScene {
  constructor(game, dialogueId, { node, npc, object, onClose } = {}) {
    this.game = game;
    this.overlay = true;
    this.npc = npc;
    this.object = object;
    this.onClose = onClose;
    this.after = [];
    const story = game.data.story || {};
    const hooks = {};
    for (const [verb, fn] of Object.entries(game.hooks)) {
      hooks[verb] = DEFERRED.has(verb) ? args => this.after.push(() => fn(args)) : fn;
    }
    const source = typeof dialogueId === 'object' ? dialogueId : game.data.dialogues[dialogueId];
    this.runner = createRunner(source, game.state, {
      startNode: node,
      hooks,
      names: story.names || {},
      dialogues: game.data.dialogues,
    });
    this.colors = story.colors || {};
    this.box = el('div', 'box dialogue');
    this.portrait = el('div');
    this.name = el('div', 'name');
    this.text = el('div', 'text');
    this.more = el('div', 'more', '▼');
    const body = el('div', 'body');
    body.append(this.text);
    this.box.append(this.portrait, this.name, body, this.more);
    this.choicesBox = null;
    this.sel = 0;
  }

  enter() {
    this.game.ui.append(this.box);
    this.show();
  }

  exit() {
    this.box.remove();
    this.choicesBox?.remove();
  }

  resume() {
    this.show();
  }

  show() {
    const step = this.runner.current();
    if (!step) { this.close(); return; }
    this.step = step;
    const pNode = portraitNode(this.game, step.portrait);
    this.portrait.replaceWith(pNode);
    this.portrait = pNode;
    this.name.textContent = step.name || '';
    this.name.hidden = !step.name;
    this.name.style.setProperty('--name-bg', this.colors[step.who || step.portrait] || '');
    this.full = step.text;
    this.shown = 0;
    this.text.textContent = '';
    this.more.hidden = true;
    this.choicesBox?.remove();
    this.choicesBox = null;
    this.sel = 0;
  }

  typing() {
    return this.shown < this.full.length;
  }

  update(dt, input) {
    if (this.typing()) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.full.length, this.shown + dt * CPS);
      const now = Math.floor(this.shown);
      if (now !== before) {
        this.text.textContent = this.full.slice(0, now);
        if (now % 2 === 0 && this.full[now - 1] !== ' ') this.game.hooks.blip?.([this.step.who || this.step.portrait]);
      }
      if (input.pressed('ok') || input.pressed('back')) {
        this.shown = this.full.length;
        this.text.textContent = this.full;
      }
      if (!this.typing()) this.onTyped();
      return;
    }

    if (this.choicesBox) {
      const n = this.step.choices.length;
      if (input.pressed('up')) { this.sel = (this.sel + n - 1) % n; this.renderChoices(); this.game.hooks.sound?.(['cursor']); }
      if (input.pressed('down')) { this.sel = (this.sel + 1) % n; this.renderChoices(); this.game.hooks.sound?.(['cursor']); }
      if (input.pressed('back') && this.sel !== n - 1) { this.sel = n - 1; this.renderChoices(); return; }
      if (input.pressed('ok')) {
        this.game.hooks.sound?.(['select']);
        this.runner.choose(this.sel);
        this.show();
      }
      return;
    }

    if (input.pressed('ok')) {
      if (this.step.puzzle) { this.openPuzzle(this.step.puzzle); return; }
      this.runner.next();
      this.show();
    }
  }

  onTyped() {
    if (this.step.choices) {
      this.choicesBox = el('div', 'box choices');
      this.game.ui.append(this.choicesBox);
      this.renderChoices();
    } else {
      this.more.hidden = false;
    }
  }

  renderChoices() {
    this.choicesBox.replaceChildren(...this.step.choices.map((c, i) => el('div', i === this.sel ? 'sel' : '', c.text)));
  }

  openPuzzle(p) {
    const make = this.game.puzzles[p.id] || this.game.puzzles.debug;
    const onResult = win => {
      this.game.scenes.remove(scene);
      resolvePuzzle(this.runner, win);
      this.show();
    };
    const scene = make(this.game, onResult, p);
    this.box.hidden = true;
    const restore = scene.exit?.bind(scene);
    scene.exit = () => { restore?.(); this.box.hidden = false; };
    this.game.scenes.push(scene);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.game.scenes.remove(this);
    this.game.world?.refresh();
    this.game.save();
    for (const fn of this.after) fn();
    this.onClose?.();
  }

  draw() {}
}

// Enigma finto (finché quello vero non esiste): chiede "vinci/perdi".
export function debugPuzzle(game, onResult, p) {
  const box = el('div', 'box choices');
  let sel = 0;
  const opts = [`[${p.id}] Vinci`, `[${p.id}] Perdi`];
  const render = () => box.replaceChildren(...opts.map((t, i) => el('div', i === sel ? 'sel' : '', t)));
  return {
    overlay: true,
    enter() { game.ui.append(box); render(); },
    exit() { box.remove(); },
    update(dt, input) {
      if (input.pressed('up') || input.pressed('down')) { sel = 1 - sel; render(); }
      if (input.pressed('ok')) onResult(sel === 0);
    },
    draw() {},
  };
}
