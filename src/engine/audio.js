// Chiptune sintetizzato con WebAudio: effetti, "voce" dei dialoghi e musiche da data/music.json.
// Niente file audio. M = muto (ricordato nel browser).

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

export function noteFreq(name) {
  const m = /^([A-G]#?)(\d)$/.exec(name);
  if (!m) return 0;
  const semis = NOTE[m[1]] + (Number(m[2]) + 1) * 12;
  return 440 * 2 ** ((semis - 69) / 12);
}

export function parseSeq(str) {
  return String(str || '').split(/\s+/).filter(t => t && t !== '|').map(tok => {
    const [n, d] = tok.split(':');
    return { f: n === 'R' ? 0 : noteFreq(n), beats: Number(d || 1) };
  });
}

const MUTE_KEY = 'kiril-bday-muted';

export function createAudio(tracks = {}) {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let current = null;
  let wanted = null;
  let timer = null;
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* storage bloccato */ }

  function ensure() {
    if (ctx) return true;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.22;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.5;
    musicGain.connect(master);
    return true;
  }

  function tone(freq, start, dur, { type = 'square', vol = 0.3, slide = 0, out = master } = {}) {
    if (!ctx || !freq) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, start + dur);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.008);
    g.gain.setValueAtTime(vol, start + Math.max(0.01, dur - 0.04));
    g.gain.linearRampToValueAtTime(0, start + dur);
    o.connect(g);
    g.connect(out);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  const seq = (notes, step = 0.07, opts) => {
    const t = ctx.currentTime;
    notes.forEach((n, i) => tone(noteFreq(n), t + i * step, step * 1.1, opts));
  };

  const SFX = {
    cursor: () => tone(880, ctx.currentTime, 0.03, { vol: 0.12 }),
    select: () => seq(['E5', 'A5'], 0.05, { vol: 0.18 }),
    bump: () => tone(110, ctx.currentTime, 0.06, { type: 'triangle', vol: 0.3 }),
    door: () => tone(220, ctx.currentTime, 0.15, { type: 'triangle', vol: 0.3, slide: -120 }),
    push: () => tone(90, ctx.currentTime, 0.12, { type: 'sawtooth', vol: 0.12, slide: -30 }),
    item: () => seq(['C5', 'E5', 'G5', 'C6'], 0.07, { vol: 0.2 }),
    solve: () => seq(['G4', 'C5', 'E5', 'G5', 'E5', 'G5', 'C6'], 0.08, { vol: 0.22 }),
    wrong: () => seq(['E4', 'C4', 'A3'], 0.12, { type: 'sawtooth', vol: 0.12 }),
  };

  function voicePitch(who) {
    let h = 0;
    for (const ch of String(who || 'x')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return 330 + (h % 9) * 45;
  }

  function stopMusic() {
    clearTimeout(timer);
    timer = null;
    current = null;
  }

  function playTrack(name) {
    const tr = tracks[name] || tracks.interior;
    if (!tr || !ctx) return;
    stopMusic();
    current = name;
    const beat = 60 / (tr.bpm || 110) / 2; // un'unità = una croma
    const lead = parseSeq(tr.lead);
    const bass = parseSeq(tr.bass);
    const total = lead.reduce((s, n) => s + n.beats, 0);
    const loop = () => {
      if (current !== name) return;
      const t0 = ctx.currentTime + 0.05;
      let t = t0;
      for (const n of lead) { tone(n.f, t, n.beats * beat * 0.92, { type: tr.wave || 'square', vol: 0.16, out: musicGain }); t += n.beats * beat; }
      t = t0;
      for (const n of bass) { tone(n.f, t, n.beats * beat * 0.95, { type: 'triangle', vol: 0.28, out: musicGain }); t += n.beats * beat; }
      timer = setTimeout(loop, total * beat * 1000 - 60);
    };
    loop();
  }

  return {
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (wanted && current !== wanted) playTrack(wanted);
    },
    sfx(name) {
      if (!ctx || muted) return;
      SFX[name]?.();
    },
    blip(who) {
      if (!ctx || muted) return;
      tone(voicePitch(who), ctx.currentTime, 0.035, { vol: 0.07 });
    },
    music(name) {
      wanted = name;
      if (!ctx || current === name) return;
      if (!name) { stopMusic(); return; }
      playTrack(name);
    },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* storage bloccato */ }
      if (master) master.gain.value = muted ? 0 : 0.22;
      return muted;
    },
  };
}
