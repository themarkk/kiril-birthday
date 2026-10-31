// Strumenti di prova: attivi solo con ?debug=1. F2 apre il pannello. window.dbg in console.

import { applyEffects } from './conditions.js';

export function setupDebug(game) {
  if (!new URLSearchParams(location.search).has('debug')) return;
  const { state, data } = game;
  const warp = (map, x, y, dir = 'down') => game.world.loadMap(map, x, y, dir);
  const set = f => game.state.flags.add(f);
  const give = id => applyEffects([`give:${id}`], game.state, game.hooks);
  const allWords = () => applyEffects([
    'word:nicole:RISATA', 'set:got_risata', 'word:leryn:BRONCIO', 'set:got_broncio', 'word:elisa:CORAGGIO', 'set:got_coraggio',
  ], game.state, {});
  const allEvidence = () => Object.entries(data.story.items).forEach(([id]) => give(id));
  window.dbg = { get state() { return game.state; }, warp, set, give, allWords, allEvidence, game };

  const panel = document.createElement('div');
  panel.className = 'debug-panel';
  panel.hidden = true;
  const btn = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = () => { fn(); game.world.refresh(); game.save(); };
    panel.append(b);
  };
  for (const id of Object.keys(data.maps)) btn(`→ ${id}`, () => warp(id));
  btn('Bullone + sabotaggio', () => { set('got_bullone'); set('sabotage_seen'); give('invito_strappato'); give('ciocca_capelli'); });
  btn('Tre parole', allWords);
  btn('Tutte le prove', allEvidence);
  btn('Paperelle 7', () => { game.state.counters.ducks = 7; });
  btn('Costume', () => { set('costume'); game.state.person = 'kiril_costume'; });
  btn('Vai all\'accusa', () => { set('got_bullone'); allWords(); allEvidence(); warp('nuraghe'); });
  btn('Finale ora', () => { set('accused_right'); game.hooks.ending([]); });
  btn('Cancella salvataggio', () => { localStorage.removeItem('kiril-bday-v1'); location.reload(); });
  document.body.append(panel);
  addEventListener('keydown', e => { if (e.code === 'F2') panel.hidden = !panel.hidden; });
  console.info('[debug] attivo: F2 pannello, window.dbg');
}
