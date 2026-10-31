// Controlla che i JSON del gioco siano coerenti. Uso: node tools/validate-data.mjs
// Esce con codice 1 se trova errori; gli avvisi non bloccano.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/game/conditions.js';
import { FALLBACK_TILES } from '../src/engine/fallback-tiles.js';

const STATE_VERBS = new Set(['set', 'unset', 'inc', 'dec', 'give', 'take', 'word']);
const HOOK_VERBS = new Set(['warp', 'face', 'sound', 'music', 'costume', 'save', 'ending', 'accuse', 'fade', 'reset_lab', 'confetti']);

export async function loadProjectData(root = new URL('..', import.meta.url)) {
  const read = async (p, optional = false) => {
    try {
      return JSON.parse(await readFile(new URL(p, root), 'utf8'));
    } catch (e) {
      if (optional) return {};
      throw new Error(`${p}: ${e.message}`);
    }
  };
  const manifest = await read('data/manifest.json');
  const data = { manifest, art: {}, maps: {}, dialogues: {} };
  for (const a of manifest.art) data.art[a] = await read(`data/art/${a}.json`, true);
  for (const m of manifest.maps) data.maps[m] = await read(`data/maps/${m}.json`);
  for (const d of manifest.dialogues) data.dialogues[d] = await read(`data/dialogues/${d}.json`);
  for (const o of manifest.other) data[o] = await read(`data/${o}.json`, o === 'music');
  return data;
}

export function validate(data) {
  const errors = [];
  const warnings = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
  const tiles = { ...FALLBACK_TILES, ...(data.art?.tiles?.tiles || {}) };
  const people = data.art?.characters?.people || {};
  const hasPeopleArt = Object.keys(people).length > 0;
  const objectsArt = data.art?.objects?.objects || {};
  const items = data.story?.items || {};
  const flagsSet = new Set();
  const flagsRead = new Map();

  const checkCond = (where, expr) => {
    if (!expr) return;
    try {
      parse(String(expr));
    } catch {
      err(where, `condizione non valida "${expr}"`);
      return;
    }
    for (const id of String(expr).match(/[A-Za-z_][\w.]*/g) || []) {
      if (!id.startsWith('has.')) flagsRead.set(id, where);
    }
  };

  const nodeExists = (file, target) => {
    const [f, n] = target.includes(':') ? target.split(':') : [file, target];
    return Boolean(data.dialogues[f]?.nodes?.[n]);
  };
  const checkTarget = (where, file, target) => {
    if (target && !nodeExists(file, target)) err(where, `nodo "${target}" inesistente`);
  };
  const checkEffects = (where, effects) => {
    for (const eff of effects || []) {
      const [verb, ...args] = String(eff).split(':');
      if (!STATE_VERBS.has(verb) && !HOOK_VERBS.has(verb)) err(where, `effetto sconosciuto "${eff}"`);
      if ((verb === 'give' || verb === 'take') && !items[args[0]]) err(where, `oggetto "${args[0]}" non definito in story.items`);
      if (verb === 'set' || verb === 'inc') flagsSet.add(args[0]);
      if (verb === 'warp' && !data.maps[args[0]]) err(where, `warp verso mappa "${args[0]}" inesistente`);
    }
  };
  const checkDialogueRef = (where, dialogue, node) => {
    if (!dialogue) return;
    if (!data.dialogues[dialogue]) { err(where, `dialogo "${dialogue}" inesistente`); return; }
    if (node) checkTarget(where, dialogue, node);
  };

  // Mappe
  for (const [id, m] of Object.entries(data.maps)) {
    const where = `maps/${id}`;
    const w = m.rows?.[0] ? [...m.rows[0]].length : 0;
    (m.rows || []).forEach((row, r) => {
      if ([...row].length !== w) err(where, `riga ${r} lunga ${[...row].length}, attese ${w}`);
      [...row].forEach((ch, c) => { if (!m.legend?.[ch]) err(where, `carattere "${ch}" (riga ${r}, colonna ${c}) non in legenda`); });
    });
    for (const [ch, t] of Object.entries(m.legend || {})) if (!tiles[t]) err(where, `legenda "${ch}" → tile "${t}" inesistente`);
    const solidAt = (map, x, y) => {
      const row = map.rows?.[y];
      if (!row || x < 0 || x >= [...row].length) return true;
      return Boolean(tiles[map.legend[[...row][x]]]?.solid);
    };
    for (const n of m.npcs || []) {
      checkDialogueRef(`${where} npc ${n.id}`, n.dialogue, n.node);
      checkCond(`${where} npc ${n.id}`, n.if);
      if (hasPeopleArt && !people[n.person]) err(`${where} npc ${n.id}`, `persona "${n.person}" non in characters.json`);
    }
    for (const o of m.objects || []) {
      checkDialogueRef(`${where} oggetto ${o.id}`, o.dialogue, o.node);
      checkCond(`${where} oggetto ${o.id}`, o.if);
      if (o.img && !objectsArt[o.img]) warn(`${where} oggetto ${o.id}`, `immagine "${o.img}" non in objects.json`);
    }
    for (const t of m.triggers || []) {
      checkDialogueRef(`${where} trigger ${t.x},${t.y}`, t.dialogue, t.node);
      checkCond(`${where} trigger`, t.if);
    }
    for (const wp of m.warps || []) {
      const ww = `${where} warp ${wp.x},${wp.y}`;
      checkCond(ww, wp.if);
      const target = data.maps[wp.to];
      if (!target) { err(ww, `mappa "${wp.to}" inesistente`); continue; }
      if (solidAt(target, wp.tx, wp.ty)) err(ww, `arrivo ${wp.to} ${wp.tx},${wp.ty} su un tile solido o fuori mappa`);
      if (wp.locked) {
        const [d, n] = wp.locked.split(':');
        checkDialogueRef(ww, d, n);
      }
    }
    if (m.platesFlag) flagsSet.add(m.platesFlag);
    if (m.onEnter) { checkDialogueRef(`${where} onEnter`, m.onEnter.dialogue, m.onEnter.node); checkCond(`${where} onEnter`, m.onEnter.if); }
  }

  // Dialoghi
  for (const [file, d] of Object.entries(data.dialogues)) {
    for (const e of d.entry || []) { checkCond(`dialogues/${file} entry`, e.if); checkTarget(`dialogues/${file} entry`, file, e.goto); }
    for (const [nid, n] of Object.entries(d.nodes || {})) {
      const where = `dialogues/${file}#${nid}`;
      checkEffects(where, n.do);
      checkTarget(where, file, n.next);
      for (const b of n.branch || []) { checkCond(where, b.if); checkTarget(where, file, b.goto); }
      for (const l of n.lines || []) if (typeof l === 'object') checkCond(where, l.cond);
      for (const c of n.choices || []) { checkCond(where, c.if); checkEffects(where, c.do); checkTarget(where, file, c.goto); }
      if (n.puzzle) { checkTarget(where, file, n.puzzle.win); checkTarget(where, file, n.puzzle.lose); }
    }
  }

  // Vicoli ciechi: un menu da cui nessuna strada porta alla fine del dialogo blocca il giocatore.
  const key = (file, target) => (target.includes(':') ? target.replace(':', '#') : `${file}#${target}`);
  const canEnd = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    for (const [file, d] of Object.entries(data.dialogues)) {
      for (const [nid, n] of Object.entries(d.nodes || {})) {
        const k = `${file}#${nid}`;
        if (canEnd.has(k)) continue;
        const ok = t => !t || canEnd.has(key(file, t));
        let ends;
        if (n.choices) ends = n.choices.some(c => ok(c.goto));
        else if (n.puzzle) ends = ok(n.puzzle.lose); // chi vuole uscire non deve essere costretto a vincere
        else ends = (n.branch || []).some(b => ok(b.goto)) || ok(n.next);
        if (ends) { canEnd.add(k); grew = true; }
      }
    }
  }
  for (const [file, d] of Object.entries(data.dialogues)) {
    for (const [nid, n] of Object.entries(d.nodes || {})) {
      if (n.choices && !canEnd.has(`${file}#${nid}`)) {
        err(`dialogues/${file}#${nid}`, 'nessuna scelta permette di chiudere il dialogo: aggiungi un\'uscita (es. {"text":"Ciao."})');
      }
    }
  }

  // Storia
  const s = data.story || {};
  if (s.start) {
    if (!data.maps[s.start.map]) err('story.start', `mappa "${s.start.map}" inesistente`);
    checkDialogueRef('story.start', s.start.dialogue, s.start.node);
  }
  (s.hints || []).forEach((h, i) => checkCond(`story.hints[${i}]`, h.if));
  (s.autoEvents || []).forEach((e, i) => { checkCond(`story.autoEvents[${i}]`, e.if); checkDialogueRef(`story.autoEvents[${i}]`, e.dialogue, e.node); });
  (s.endings || []).forEach((e, i) => checkCond(`story.endings[${i}]`, e.if));
  for (const id of s.accusation?.validEvidence || []) if (!items[id]) err('story.accusation', `prova "${id}" non definita`);

  for (const [flag, where] of flagsRead) {
    if (!flagsSet.has(flag) && !/^\d+$/.test(flag) && !['costume', 'accused_right', 'game_over', 'started', 'wrong_accusations', 'ducks'].includes(flag)) {
      warn(where, `"${flag}" viene letto ma mai impostato`);
    }
  }
  return { errors, warnings };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { errors, warnings } = validate(await loadProjectData());
  for (const w of warnings) console.log(`avviso  ${w}`);
  for (const e of errors) console.log(`ERRORE  ${e}`);
  console.log(errors.length ? `\n${errors.length} errori, ${warnings.length} avvisi` : `OK — 0 errori, ${warnings.length} avvisi`);
  process.exit(errors.length ? 1 : 0);
}
