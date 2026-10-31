// Avvio: carica i dati, prepara schermo/input/scene, collega gli effetti dei JSON e fa girare il loop.

import { loadAll, showBootError } from './engine/loader.js';
import { setupScreen } from './engine/screen.js';
import { Input } from './engine/input.js';
import { SceneManager } from './engine/scenes.js';
import { ArtCache } from './engine/art.js';
import { FALLBACK_TILES } from './engine/fallback-tiles.js';
import { WorldScene } from './world/world-scene.js';
import { createState, save, load, clearSave } from './game/state.js';
import { evaluate, applyEffects } from './game/conditions.js';
import { DialogueScene, debugPuzzle } from './game/dialogue-scene.js';
import { NotebookScene } from './game/notebook-scene.js';
import { EndingScene } from './game/ending-scene.js';
import { TitleScene } from './game/title-scene.js';
import { pickHint } from './game/hints.js';
import { setupDebug } from './game/debug.js';
import { AccusationScene } from './puzzles/accusation-scene.js';
import { createPushables } from './world/pushables.js';
import { registerPuzzles } from './puzzles/puzzle-scenes.js';
import { createAudio } from './engine/audio.js';

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
  const story = data.story;
  const audio = createAudio(data.music || {});

  const saved = load();
  const game = {
    data, art, input, scenes, ui, screen,
    state: saved || createState(),
    hooks: {},
    puzzles: { debug: debugPuzzle },
    busy: false,
    save() { return game.state.flags.has('started') ? save(game.state) : false; },
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

  const onWorld = () => scenes.top === game.world && !game.busy;

  // Dopo ogni dialogo: eventi automatici (Permalosometro, paperelle...).
  function afterDialogue() {
    if (scenes.top !== game.world) return;
    const ev = (story.autoEvents || []).find(e => evaluate(e.if, game.state));
    if (ev) setTimeout(() => onWorld() && game.openDialogue(ev.dialogue, { node: ev.node }), 150);
  }

  game.openDialogue = (id, opts = {}) => {
    if (typeof id === 'string' && !data.dialogues[id]) { console.warn(`[dialogo] "${id}" non esiste`); return; }
    scenes.push(new DialogueScene(game, id, { ...opts, onClose: () => { opts.onClose?.(); afterDialogue(); } }));
  };

  game.openNotebook = () => scenes.push(new NotebookScene(game));

  game.openHint = () => {
    const h = pickHint(story.hints, game.state);
    if (!h) return;
    const key = `hint_${h.phaseIndex}`;
    const who = story.hints[h.phaseIndex].who || 'bullone';
    const prefix = who === 'bullone' ? ['BZZT. Analisi in corso...', 'BZZT. Ricalcolo...', 'BZZT. Modalità "spiegone" attivata.'][h.level] : '';
    const lines = [prefix, h.line].filter(Boolean).map(text => ({ who, text }));
    game.state.counters[key] = (game.state.counters[key] || 0) + 1;
    game.openDialogue({ speaker: 'Bullone', portrait: who, entry: [{ goto: 'h' }], nodes: { h: { lines } } });
  };

  Object.assign(game.hooks, {
    gave: ([id]) => { game.toast(`Ottenuto: ${story.items[id]?.name || id}`); game.hooks.sound?.(['item']); },
    warp: ([map, x, y, dir]) => game.transition(() => { game.world.loadMap(map, Number(x), Number(y), dir); game.save(); }),
    face: ([npcId, dir]) => { const n = game.world.npcs.find(e => e.id === npcId); if (n) n.dir = dir; },
    costume: ([mode]) => { game.state.person = mode === 'off' ? 'kiril' : 'kiril_costume'; game.world.refresh(); },
    save: () => game.save(),
    fade: () => game.transition(() => {}),
    accuse: () => scenes.push(new AccusationScene(game, (verdict, suspect) => {
      if (verdict === 'correct') game.openDialogue('davi', { node: 'confess' });
      else if (verdict === 'weak_evidence') game.openDialogue('davi', { node: 'weak' });
      else {
        applyEffects(['inc:wrong_accusations'], game.state);
        game.openDialogue(suspect, { node: 'accused' });
      }
    })),
    ending: () => game.transition(() => scenes.replace(new EndingScene(game))),
    reset_lab: () => game.pushables?.reset(game.world),
    sound: ([name]) => audio.sfx(name),
    blip: ([who]) => audio.blip(who),
    music: ([name]) => audio.music(name),
    unlockAudio: () => audio.unlock(),
    confetti: () => {
      const box = Object.assign(document.createElement('div'), { className: 'confetti' });
      const colors = ['#d6453d', '#f2b544', '#2f6fb0', '#3d8f3d', '#d13f9b', '#fff8ec'];
      for (let i = 0; i < 70; i++) {
        const c = document.createElement('i');
        c.style.left = `${Math.random() * 100}%`;
        c.style.background = colors[i % colors.length];
        c.style.animationDelay = `${Math.random() * 3}s`;
        c.style.animationDuration = `${3 + Math.random() * 3}s`;
        c.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
        box.append(c);
      }
      ui.append(box);
    },
  });
  input.onAnyKey = () => audio.unlock();

  game.pushables = createPushables(game);
  registerPuzzles(game);
  game.world = new WorldScene(game);
  scenes.push(game.world);

  const start = story.start;
  function newGame() {
    clearSave();
    game.state = createState();
    game.state.flags.add('started');
    game.world.loadMap(start.map, start.x, start.y, start.dir);
    game.save();
    setTimeout(() => game.openDialogue(start.dialogue, { node: start.node }), 400);
  }
  function continueGame() {
    const s = game.state;
    if (s.flags.has('game_over')) { scenes.replace(new EndingScene(game)); return; }
    game.world.loadMap(s.map, s.x, s.y, s.dir);
  }

  if (saved) game.world.loadMap(saved.map, saved.x, saved.y, saved.dir);
  else game.world.loadMap('town', 23, 15, 'down');
  scenes.push(new TitleScene(game, { hasSave: Boolean(saved?.flags.has('started')), onContinue: continueGame, onNew: newGame }));
  setupDebug(game);

  let last = performance.now();
  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (input.pressed('mute')) game.toast(audio.toggleMute() ? 'Audio spento (M)' : 'Audio acceso (M)');
    if (!game.busy) scenes.update(dt);
    scenes.draw(screen.ctx);
    input.endFrame();
  }
  let lastRaf = 0;
  function frame(now) {
    lastRaf = performance.now();
    step(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // In debug il gioco avanza anche a scheda nascosta (per i playtest automatici).
  if (new URLSearchParams(location.search).has('debug')) {
    setInterval(() => { if (performance.now() - lastRaf > 100) step(performance.now()); }, 16);
  }
}

boot();
