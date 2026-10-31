// Tastiera → azioni di gioco. "pressed" scatta una volta per pressione; consume() evita che un tasto
// tenuto premuto attraversi un cambio di scena (es. chiudere un dialogo e riaprirlo subito).

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'ok', Enter: 'ok', Space: 'ok',
  KeyX: 'back', Escape: 'back', Backspace: 'back',
  KeyI: 'notebook',
  KeyH: 'hint',
  ShiftLeft: 'run', ShiftRight: 'run',
  KeyM: 'mute',
  F2: 'debug',
};

const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Backspace', 'F2']);
const NEVER_BLOCK = new Set(['run']);

export class Input {
  constructor(target = globalThis.window) {
    this.down = new Set();      // codici fisicamente premuti
    this.blocked = new Set();   // codici da ignorare fino al rilascio
    this.justPressed = new Set(); // azioni premute in questo frame
    this.listeners = [];
    if (!target) return;
    const onDown = e => {
      if (PREVENT.has(e.code)) e.preventDefault?.();
      const action = KEYMAP[e.code];
      if (!action) return;
      if (e.repeat || this.down.has(e.code)) return;
      this.down.add(e.code);
      if (!this.blocked.has(e.code)) this.justPressed.add(action);
      this.onAnyKey?.();
    };
    const onUp = e => {
      this.down.delete(e.code);
      this.blocked.delete(e.code);
    };
    const onBlur = () => { this.down.clear(); this.blocked.clear(); this.justPressed.clear(); };
    target.addEventListener('keydown', onDown);
    target.addEventListener('keyup', onUp);
    target.addEventListener('blur', onBlur);
  }

  held(action) {
    for (const code of this.down) {
      if (KEYMAP[code] === action && (NEVER_BLOCK.has(action) || !this.blocked.has(code))) return true;
    }
    return false;
  }

  pressed(action) {
    return this.justPressed.has(action);
  }

  endFrame() {
    this.justPressed.clear();
  }

  consume() {
    this.justPressed.clear();
    for (const code of this.down) this.blocked.add(code);
  }
}
