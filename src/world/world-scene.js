// Il mondo: mappa, Kiril, PNG, oggetti, Bullone che segue, porte e trigger.

import { parseMap } from './tilemap.js';
import { Entity, TILE, DIRS } from './entity.js';
import { evaluate } from '../game/conditions.js';
import { W, H } from '../engine/screen.js';

const MOVE_KEYS = ['up', 'down', 'left', 'right'];

export class WorldScene {
  constructor(game) {
    this.game = game;
    this.maps = new Map();
    this.player = new Entity({ id: 'player', person: game.state.person, x: 0, y: 0 });
    this.follower = null;
    this.npcs = [];
    this.objects = [];
    this.time = 0;
    this.lastDir = null;
  }

  get state() {
    return this.game.state;
  }

  parsed(id) {
    if (!this.maps.has(id)) {
      const json = this.game.data.maps[id];
      if (!json) throw new Error(`mappa "${id}" non trovata`);
      this.maps.set(id, parseMap(json, this.game.art.tilesJson));
    }
    return this.maps.get(id);
  }

  loadMap(id, x, y, dir) {
    this.map = this.parsed(id);
    this.game.pushables?.reset(this);
    const spawn = this.map.json.spawn || { x: 1, y: 1, dir: 'down' };
    const px = x ?? spawn.x, py = y ?? spawn.y;
    this.player.place(px, py, dir || spawn.dir || 'down');
    Object.assign(this.state, { map: id, x: px, y: py, dir: this.player.dir });
    this.follower = null;
    this.refresh();
    if (this.follower) {
      const [dx, dy] = DIRS[this.player.dir];
      const fx = px - dx, fy = py - dy;
      this.follower.place(this.blocked(fx, fy, true) ? px : fx, this.blocked(fx, fy, true) ? py : fy, this.player.dir);
    }
    this.game.hooks.music?.([this.map.json.music || 'interior']);
    const on = this.map.json.onEnter;
    this.pendingEnter = on && evaluate(on.if, this.state) ? on : null;
  }

  // Rilegge condizioni di PNG e oggetti (dopo ogni dialogo): chi deve sparire sparisce.
  refresh() {
    const s = this.state;
    const old = new Map(this.npcs.map(n => [n.id, n]));
    this.npcs = (this.map.json.npcs || [])
      .filter(n => evaluate(n.if, s))
      .map(n => {
        const e = old.get(n.id) || new Entity({ id: n.id, person: n.person, x: n.x, y: n.y, dir: n.dir || 'down' });
        e.def = n;
        e.person = n.person;
        return e;
      });
    this.objects = (this.map.json.objects || []).filter(o => evaluate(o.if, s));
    this.player.person = s.person;
    if (s.flags.has('got_bullone') && !this.map.json.noFollower) {
      if (!this.follower) {
        this.follower = new Entity({ id: 'bullone', person: 'bullone', x: this.player.x, y: this.player.y, dir: this.player.dir });
      }
    } else {
      this.follower = null;
    }
  }

  npcAt(x, y) {
    return this.npcs.find(n => n.x === x && n.y === y);
  }

  objectAt(x, y) {
    return this.objects.find(o => o.x === x && o.y === y);
  }

  blocked(x, y, ignoreWarps = false) {
    if (this.map.isSolid(x, y)) return true;
    if (this.npcAt(x, y)) return true;
    const o = this.objectAt(x, y);
    if (o && o.solid !== false) return true;
    if (this.game.pushables?.at(x, y)) return true;
    if (!ignoreWarps) {
      const w = this.map.warpAt(x, y);
      if (w && !evaluate(w.if, this.state)) return true;
    }
    return false;
  }

  update(dt, input) {
    this.time += dt;
    this.state.playMs += dt * 1000;
    const p = this.player;
    const arrived = p.update(dt);
    this.follower?.update(dt);
    for (const n of this.npcs) n.update(dt);
    if (arrived) {
      this.state.x = p.x;
      this.state.y = p.y;
      if (this.onArrive()) return;
    }
    if (p.moving) return;
    if (this.pendingEnter) {
      const on = this.pendingEnter;
      this.pendingEnter = null;
      this.game.openDialogue?.(on.dialogue, { node: on.node });
      return;
    }

    if (input.pressed('ok')) { this.interact(); return; }
    if (input.pressed('notebook')) { this.game.openNotebook?.(); return; }
    if (input.pressed('hint')) { this.game.openHint?.(); return; }

    const dir = MOVE_KEYS.find(k => input.pressed(k)) || MOVE_KEYS.find(k => input.held(k));
    if (!dir) return;
    const [dx, dy] = DIRS[dir];
    const tx = p.x + dx, ty = p.y + dy;
    const warp = this.map.warpAt(tx, ty);
    if (warp && !evaluate(warp.if, this.state)) {
      p.dir = dir;
      if (warp.locked) {
        const [dlg, node] = warp.locked.split(':');
        this.game.openDialogue?.(dlg, { node });
      }
      return;
    }
    if (this.game.pushables?.tryPush(this, tx, ty, dir)) return;
    const prev = [p.x, p.y];
    if (p.tryMove(dir, (x, y) => this.blocked(x, y), input.held('run'))) {
      this.state.dir = dir;
      if (this.follower) {
        const f = this.follower;
        if (f.x !== prev[0] || f.y !== prev[1]) {
          const fdx = prev[0] - f.x, fdy = prev[1] - f.y;
          const fdir = Object.keys(DIRS).find(k => DIRS[k][0] === Math.sign(fdx) && DIRS[k][1] === Math.sign(fdy));
          if (fdir && Math.abs(fdx) + Math.abs(fdy) === 1) f.tryMove(fdir, () => false, input.held('run'));
          else f.place(prev[0], prev[1], dir);
          f.stepTime = p.stepTime;
        }
      }
    } else if (input.pressed(dir)) {
      this.game.hooks.sound?.(['bump']);
    }
  }

  // Ritorna true se l'arrivo ha avviato qualcosa (porta, trigger).
  onArrive() {
    const p = this.player;
    const w = this.map.warpAt(p.x, p.y);
    if (w && evaluate(w.if, this.state)) {
      this.game.hooks.sound?.(['door']);
      this.game.transition(() => {
        this.loadMap(w.to, w.tx, w.ty, w.dir);
        this.game.save();
      });
      return true;
    }
    const t = this.map.triggerAt(p.x, p.y);
    if (t && evaluate(t.if, this.state)) {
      this.game.openDialogue?.(t.dialogue, { node: t.node });
      return true;
    }
    return false;
  }

  interact() {
    const p = this.player;
    const [fx, fy] = p.facing();
    const npc = this.npcAt(fx, fy);
    if (npc) {
      npc.faceTowards(p);
      this.game.openDialogue?.(npc.def.dialogue, { node: npc.def.node, npc });
      return;
    }
    const o = this.objectAt(fx, fy);
    if (o?.dialogue) {
      this.game.openDialogue?.(o.dialogue, { node: o.node, object: o });
      return;
    }
    const f = this.follower;
    if (f && f.x === fx && f.y === fy) this.game.openHint?.();
  }

  camera() {
    const mw = this.map.w * TILE, mh = this.map.h * TILE;
    const cx = mw <= W ? (mw - W) / 2 : Math.min(Math.max(this.player.px + 8 - W / 2, 0), mw - W);
    const cy = mh <= H ? (mh - H) / 2 : Math.min(Math.max(this.player.py + 8 - H / 2, 0), mh - H);
    return [Math.round(cx), Math.round(cy)];
  }

  drawTiles(ctx, cx, cy, over) {
    const art = this.game.art;
    const tiles = art.tilesJson.tiles;
    const x0 = Math.max(0, Math.floor(cx / TILE)), y0 = Math.max(0, Math.floor(cy / TILE));
    const x1 = Math.min(this.map.w - 1, Math.floor((cx + W) / TILE)), y1 = Math.min(this.map.h - 1, Math.floor((cy + H) / TILE));
    const animFrame = Math.floor(this.time / 0.6);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const name = this.map.tileAt(x, y);
        if (Boolean(tiles[name]?.over) !== over) continue;
        const frames = art.tileFrames(name);
        ctx.drawImage(art.tile(name, frames > 1 ? (animFrame + x) % frames : 0), x * TILE - cx, y * TILE - cy);
      }
    }
  }

  drawPerson(ctx, e, cx, cy) {
    const spr = this.game.art.person(e.person);
    const img = spr.frames[e.dir]?.[e.frame] || spr.frames.down[0];
    ctx.drawImage(img, Math.round(e.px - cx + (TILE - img.width) / 2), Math.round(e.py - cy + TILE - img.height));
  }

  draw(ctx) {
    const [cx, cy] = this.camera();
    ctx.fillStyle = '#1a1020';
    ctx.fillRect(0, 0, W, H);
    this.drawTiles(ctx, cx, cy, false);
    this.game.pushables?.draw(ctx, this, cx, cy);
    const sprites = [];
    for (const o of this.objects) {
      if (!o.img) continue;
      sprites.push({ y: o.y, draw: () => {
        const img = this.game.art.object(o.img);
        ctx.drawImage(img, o.x * TILE - cx + (TILE - img.width) / 2, o.y * TILE - cy + TILE - img.height);
      } });
    }
    sprites.push(...(this.game.pushables?.sprites(this, cx, cy, ctx) || []));
    for (const n of this.npcs) sprites.push({ y: n.py / TILE, draw: () => this.drawPerson(ctx, n, cx, cy) });
    if (this.follower) sprites.push({ y: this.follower.py / TILE - 0.01, draw: () => this.drawPerson(ctx, this.follower, cx, cy) });
    sprites.push({ y: this.player.py / TILE, draw: () => this.drawPerson(ctx, this.player, cx, cy) });
    sprites.sort((a, b) => a.y - b.y).forEach(s => s.draw());
    this.drawTiles(ctx, cx, cy, true);
    this.game.decorate?.(ctx, this, cx, cy);
  }
}
