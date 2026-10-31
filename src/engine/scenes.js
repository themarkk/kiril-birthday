// Pila di scene: solo quella in cima riceve input; si disegnano dall'ultima scena "piena" in su.

export class SceneManager {
  constructor(input) {
    this.input = input;
    this.stack = [];
  }

  get top() {
    return this.stack[this.stack.length - 1];
  }

  push(scene) {
    this.input?.consume();
    this.stack.push(scene);
    scene.enter?.();
  }

  pop() {
    this.input?.consume();
    const s = this.stack.pop();
    s?.exit?.();
    this.top?.resume?.();
    return s;
  }

  replace(scene) {
    while (this.stack.length) this.stack.pop().exit?.();
    this.push(scene);
  }

  remove(scene) {
    const i = this.stack.indexOf(scene);
    if (i === -1) return;
    if (i === this.stack.length - 1) { this.pop(); return; }
    this.stack.splice(i, 1);
    scene.exit?.();
  }

  update(dt) {
    this.top?.update?.(dt, this.input);
    for (const s of this.stack) if (s !== this.top) s.background?.(dt);
  }

  draw(ctx) {
    let from = 0;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (!this.stack[i].overlay) { from = i; break; }
    }
    for (let i = from; i < this.stack.length; i++) this.stack[i].draw?.(ctx);
  }
}
