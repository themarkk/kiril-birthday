// Entità che si muove a griglia con un passo interpolato (giocatore, PNG, Bullone).

export const TILE = 16;
export const DIRS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

const WALK_TIME = 0.18;
const RUN_TIME = 0.1;

export class Entity {
  constructor({ id, person, x, y, dir = 'down' }) {
    this.id = id;
    this.person = person;
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.px = x * TILE;
    this.py = y * TILE;
    this.moving = false;
    this.t = 0;
    this.stepTime = WALK_TIME;
    this.steps = 0;
    this.from = [x, y];
  }

  place(x, y, dir = this.dir) {
    Object.assign(this, { x, y, dir, px: x * TILE, py: y * TILE, moving: false, t: 0 });
  }

  // isBlocked(x, y) → true se la cella non è percorribile. Ritorna true se il passo è partito.
  tryMove(dir, isBlocked, run = false) {
    if (this.moving) return false;
    this.dir = dir;
    const [dx, dy] = DIRS[dir];
    const nx = this.x + dx, ny = this.y + dy;
    if (isBlocked(nx, ny)) return false;
    this.from = [this.x, this.y];
    this.x = nx;
    this.y = ny;
    this.moving = true;
    this.t = 0;
    this.stepTime = run ? RUN_TIME : WALK_TIME;
    this.steps++;
    return true;
  }

  // Ritorna true nel frame in cui il passo si completa.
  update(dt) {
    if (!this.moving) return false;
    this.t += dt / this.stepTime;
    if (this.t >= 1) {
      this.moving = false;
      this.t = 0;
      this.px = this.x * TILE;
      this.py = this.y * TILE;
      return true;
    }
    const [fx, fy] = this.from;
    this.px = (fx + (this.x - fx) * this.t) * TILE;
    this.py = (fy + (this.y - fy) * this.t) * TILE;
    return false;
  }

  get frame() {
    if (!this.moving || this.t < 0.25 || this.t > 0.85) return 0;
    return this.steps % 2 ? 1 : 2;
  }

  facing() {
    const [dx, dy] = DIRS[this.dir];
    return [this.x + dx, this.y + dy];
  }

  faceTowards(other) {
    const dx = other.x - this.x, dy = other.y - this.y;
    if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? 'right' : 'left';
    else this.dir = dy > 0 ? 'down' : 'up';
  }
}
