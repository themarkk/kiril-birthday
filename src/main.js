// Avvio: carica i dati, prepara schermo/input/scene e fa girare il loop.

import { loadAll, showBootError } from './engine/loader.js';
import { setupScreen } from './engine/screen.js';
import { Input } from './engine/input.js';
import { SceneManager } from './engine/scenes.js';
import { ArtCache } from './engine/art.js';
import { FALLBACK_TILES } from './engine/fallback-tiles.js';
import { WorldScene } from './world/world-scene.js';
import { createState, save, load } from './game/state.js';
import { DialogueScene, debugPuzzle } from './game/dialogue-scene.js';

async function boot() {
  let data;
  try {
    data = await loadAll('./data/manifest.json');
  } catch (e) {
    console.error(e);
    showBootError(e.message);
    return;
  }

  const screen = setupScreen();
  const input = new Input(window);
  const scenes = new SceneManager(input);
  const ui = document.getElementById('ui');
  const art = new ArtCache(data.art, FALLBACK_TILES);
  const fadeEl = Object.assign(document.createElement('div'), { className: 'fade' });
  ui.append(fadeEl);

  const game = {
    data, art, input, scenes, ui, screen,
    state: load() || createState(),
    hooks: {},
    puzzles: {},
    busy: false,
    save() { return save(game.state); },
    transition(fn) {
      if (game.busy) return;
      game.busy = true;
      fadeEl.classList.add('on');
      setTimeout(() => {
        try { fn(); } finally {
          input.consume();
          fadeEl.classList.remove('on');
          setTimeout(() => { game.busy = false; }, 250);
        }
      }, 250);
    },
    toast(text) {
      const t = Object.assign(document.createElement('div'), { className: 'box toast', textContent: text });
      ui.append(t);
      setTimeout(() => t.remove(), 2500);
    },
  };
  window.__game = game;

  const items = () => data.story?.items || {};
  game.openDialogue = (id, opts = {}) => {
    if (!data.dialogues[id]) { console.warn(`[dialogo] "${id}" non esiste`); return; }
    scenes.push(new DialogueScene(game, id, opts));
  };
  game.puzzles.debug = debugPuzzle;
  Object.assign(game.hooks, {
    gave: ([id]) => { game.toast(`Ottenuto: ${items()[id]?.name || id}`); game.hooks.sound?.(['item']); },
    warp: ([map, x, y, dir]) => game.transition(() => { game.world.loadMap(map, Number(x), Number(y), dir); game.save(); }),
    face: ([npcId, dir]) => { const n = game.world.npcs.find(e => e.id === npcId); if (n) n.dir = dir; },
    costume: ([mode]) => { game.state.person = mode === 'off' ? 'kiril' : 'kiril_costume'; game.world.refresh(); },
    save: () => game.save(),
    fade: () => game.transition(() => {}),
  });

  game.world = new WorldScene(game);
  const s = game.state;
  const start = data.story?.start || { map: 'town' };
  if (s.x || s.y) game.world.loadMap(s.map, s.x, s.y, s.dir);
  else game.world.loadMap(start.map, start.x, start.y, start.dir);
  scenes.push(game.world);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!game.busy) scenes.update(dt);
    else game.world.background?.(dt);
    scenes.draw(screen.ctx);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
