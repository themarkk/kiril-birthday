// Esecutore puro dei dialoghi JSON: nodi, righe condizionali, scelte, effetti, enigmi.

import { evaluate, applyEffects } from './conditions.js';

const capitalize = s => (s ? s[0].toUpperCase() + s.slice(1) : '');

export function createRunner(dialogue, state, { startNode, hooks = {}, names = {}, dialogues = {} } = {}) {
  let nodes = dialogue.nodes || {};
  const r = { done: false, nodeId: null, lines: [], i: 0 };

  // "nodo" resta nel file corrente; "file:nodo" salta in un altro file di dialogo.
  function enter(target) {
    let id = target;
    if (typeof target === 'string' && target.includes(':')) {
      const [file, nodeName] = target.split(':');
      if (!dialogues[file]) {
        console.warn(`[dialogo] file "${file}" inesistente: dialogo chiuso`);
        r.done = true;
        return;
      }
      dialogue = dialogues[file];
      nodes = dialogue.nodes || {};
      id = nodeName;
    }
    const node = nodes[id];
    if (!node) {
      console.warn(`[dialogo ${dialogue.speaker || '?'}] nodo "${id}" inesistente: dialogo chiuso`);
      r.done = true;
      return;
    }
    r.nodeId = id;
    // Le righe si scelgono con lo stato di arrivo; gli effetti del nodo valgono da qui in poi.
    r.lines = (node.lines || []).filter(l => typeof l === 'string' || evaluate(l.cond, state));
    applyEffects(node.do, state, hooks);
    r.i = 0;
    if (!r.lines.length && !node.choices && !node.puzzle) finish(node);
  }

  function finish(node) {
    const b = (node.branch || []).find(x => evaluate(x.if, state));
    if (b) enter(b.goto);
    else if (node.next) enter(node.next);
    else r.done = true;
  }

  function visibleChoices(node) {
    return (node.choices || [])
      .map((c, index) => ({ ...c, index }))
      .filter(c => evaluate(c.if, state));
  }

  r.current = () => {
    if (r.done) return null;
    const node = nodes[r.nodeId];
    const raw = r.lines[r.i] ?? '';
    const line = typeof raw === 'string' ? { text: raw } : raw;
    const who = line.who || dialogue.who || null;
    const step = {
      who,
      name: who ? (names[who] || capitalize(who)) : dialogue.speaker,
      portrait: who || dialogue.portrait,
      text: line.text ?? '',
      fx: line.fx || null,
      node: r.nodeId,
    };
    const last = r.i >= r.lines.length - 1;
    if (last) {
      const ch = visibleChoices(node);
      if (ch.length) step.choices = ch.map((c, i) => ({ text: c.text, index: i }));
      if (node.puzzle) step.puzzle = node.puzzle;
    }
    return step;
  };

  r.next = () => {
    if (r.done) return;
    const node = nodes[r.nodeId];
    if (r.i < r.lines.length - 1) { r.i++; return; }
    if (visibleChoices(node).length || node.puzzle) return;
    finish(node);
  };

  r.choose = index => {
    if (r.done) return;
    const c = visibleChoices(nodes[r.nodeId])[index];
    if (!c) return;
    applyEffects(c.do, state, hooks);
    if (c.goto) enter(c.goto);
    else r.done = true;
  };

  r.goto = id => enter(id);

  const first = startNode || (dialogue.entry || []).find(e => evaluate(e.if, state))?.goto || Object.keys(nodes)[0];
  enter(first);
  return r;
}

export function resolvePuzzle(runner, win) {
  const step = runner.current();
  if (!step?.puzzle) return;
  runner.goto(win ? step.puzzle.win : step.puzzle.lose);
}
