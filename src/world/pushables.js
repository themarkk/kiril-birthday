// Carciofi spingibili nel mondo: posizione in memoria, reset all'uscita dalla stanza o su richiesta.

import { tryPush, allOnPlates } from '../puzzles/sokoban.js';
import { applyEffects } from '../game/conditions.js';
import { TILE } from './entity.js';

export function createPushables(game) {
  let mapId = null;
  let boxes = [];

  function sync(world) {
    if (world.map.id === mapId) return;
    mapId = world.map.id;
    const json = world.map.json;
    const solvedFlag = json.platesFlag && game.state.flags.has(json.platesFlag);
    const src = solvedFlag ? (json.plates || []).map((p, i) => ({ ...json.pushables[i], x: p.x, y: p.y })) : json.pushables || [];
    boxes = src.map(b => ({ ...b, px: b.x * TILE, py: b.y * TILE }));
  }

  const api = {
    at(x, y) {
      return boxes.some(b => b.x === x && b.y === y);
    },
    reset(world) {
      mapId = null;
      sync(world);
    },
    // Chiamato quando il giocatore prova a entrare in (tx,ty). True se ha spinto.
    tryPush(world, tx, ty, dir) {
      sync(world);
      if (!api.at(tx, ty)) return false;
      const json = world.map.json;
      if (json.platesFlag && game.state.flags.has(json.platesFlag)) return false;
      const grid = { isSolid: (x, y) => world.map.isSolid(x, y) || Boolean(world.npcAt(x, y)) || Boolean(world.objectAt(x, y)) };
      const p = world.player;
      const r = tryPush(grid, boxes, { x: p.x, y: p.y }, dir);
      p.dir = dir;
      if (!r.moved) { game.hooks.sound?.(['bump']); return true; }
      const moved = r.boxes[r.index];
      boxes = r.boxes.map((b, i) => (i === r.index ? { ...boxes[i], x: moved.x, y: moved.y } : b));
      p.tryMove(dir, () => false);
      game.hooks.sound?.(['push']);
      if (json.plates && allOnPlates(boxes, json.plates)) {
        applyEffects([`set:${json.platesFlag}`], game.state);
        game.save();
        if (json.platesDialogue) {
          const [d, n] = json.platesDialogue.split(':');
          setTimeout(() => game.openDialogue(d, { node: n }), 350);
        }
      }
      return true;
    },
    draw(ctx, world, cx, cy) {
      sync(world);
      const json = world.map.json;
      for (const pl of json.plates || []) {
        if (boxes.some(b => b.x === pl.x && b.y === pl.y)) ctx.drawImage(game.art.tile('plate_on'), pl.x * TILE - cx, pl.y * TILE - cy);
      }
    },
    // I carciofi si disegnano insieme agli altri sprite (ordinati per y).
    sprites(world, cx, cy, ctx) {
      sync(world);
      return boxes.map(b => {
        const tx = b.x * TILE, ty = b.y * TILE;
        b.px += Math.sign(tx - b.px) * Math.min(Math.abs(tx - b.px), 2);
        b.py += Math.sign(ty - b.py) * Math.min(Math.abs(ty - b.py), 2);
        return {
          y: b.py / TILE,
          draw: () => {
            const img = game.art.object(b.img);
            ctx.drawImage(img, Math.round(b.px - cx), Math.round(b.py - cy + TILE - img.height));
          },
        };
      });
    },
  };
  return api;
}
