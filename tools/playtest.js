// Aiutante per i playtest automatici dal browser: await import('/tools/playtest.js') → window.T
// Preme tasti veri (eventi tastiera), avanza i dialoghi e sceglie le risposte per sottostringa.

const sleep = ms => new Promise(r => setTimeout(r, ms));
const g = () => window.__game;

async function key(code, hold = 40) {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  await sleep(hold);
  window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
  await sleep(40);
}

const topName = () => { const n = g().scenes.top?.constructor?.name; return !n || n === 'Object' ? 'puzzle' : n; };

// Avanza finché si torna al mondo. choices: testi (sottostringhe) da scegliere nell'ordine; 'win'/'lose' per i puzzle finti.
async function talk(choices = [], max = 120) {
  const log = [];
  for (let i = 0; i < max; i++) {
    await sleep(50);
    const top = g().scenes.top;
    const name = topName();
    if (name === 'WorldScene') {
      if (!g().busy) return log;
      continue;
    }
    if (name === 'DialogueScene') {
      if (top.typing()) { await key('KeyZ'); continue; }
      if (top.choicesBox) {
        const want = choices.shift();
        const idx = want ? top.step.choices.findIndex(c => c.text.includes(want)) : 0;
        if (idx < 0) { log.push(`!! scelta "${want}" non trovata tra: ${top.step.choices.map(c => c.text).join(' | ')}`); return log; }
        log.push(`> ${top.step.choices[idx].text}`);
        top.sel = idx;
        await key('KeyZ');
        continue;
      }
      log.push(`${top.step.name || ''}: ${top.step.text.slice(0, 60)}`);
      await key('KeyZ');
      continue;
    }
    if (top?.debugSolve) { const want = choices.shift(); log.push(`[${name} ${want}]`); top.debugSolve(want !== 'lose'); continue; }
    if (name === 'puzzle') {
      const want = choices.shift();
      log.push(`[puzzle ${want}]`);
      if (want === 'lose') await key('ArrowDown');
      await key('KeyZ');
      continue;
    }
    return log.concat(`(scena: ${name})`);
  }
  return log.concat('!! troppi passi');
}

async function talkTo(map, x, y, dir, choices) {
  g().world.loadMap(map, x, y, dir);
  await sleep(80);
  await key('KeyZ');
  return talk(choices);
}

window.T = { sleep, key, talk, talkTo, top: topName };
