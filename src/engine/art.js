// Pixel art dai JSON: griglie di caratteri + palette → canvas. Composer per personaggi e ritratti.

export const OUTLINE = '#1a1020';

const SYMBOLS = {
  S: 'skin', s: 'skinShade', H: 'hair', h: 'hairShade', T: 'top', t: 'topShade',
  P: 'pants', O: 'shoes', E: 'eyes',
};

function personColor(person, ch) {
  if (ch === 'K') return OUTLINE;
  if (ch === 'W') return '#ffffff';
  const key = SYMBOLS[ch];
  if (!key) return undefined;
  return person[key] || person[key.replace('Shade', '')] || undefined;
}

// Immagine {w,h,pal,px} → array lineare di colori (null = trasparente)
export function imageToPixels(img, resolve = () => undefined) {
  const out = new Array(img.w * img.h).fill(null);
  (img.px || []).forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.' || x >= img.w || y >= img.h) return;
      const c = img.pal?.[ch] ?? resolve(ch);
      if (c) out[y * img.w + x] = c;
    });
  });
  return out;
}

function stamp(target, w, h, rows, resolve, dy = 0) {
  if (!rows) return;
  rows.forEach((row, y) => {
    const ty = y + dy;
    if (ty < 0 || ty >= h) return;
    [...row].forEach((ch, x) => {
      if (ch === '.' || x >= w) return;
      const c = resolve(ch);
      if (c) target[ty * w + x] = c;
    });
  });
}

function mirror(pixels, w, h) {
  const out = new Array(pixels.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = pixels[y * w + (w - 1 - x)];
  return out;
}

// Una "parte" (capelli/extra) per base e direzione: { normal: { down: rows } } oppure { face: rows }
function partRows(part, baseName, dir) {
  const forBase = part?.[baseName];
  if (!forBase) return null;
  if (Array.isArray(forBase)) return forBase;
  return forBase[dir] || null;
}

export function composePixels(characters, personId, dir, frame) {
  const person = characters.people?.[personId];
  if (!person) throw new Error(`personaggio "${personId}" non trovato in characters.json`);
  const baseName = person.base || 'normal';
  const base = characters.bases?.[baseName];
  if (!base) throw new Error(`base "${baseName}" non trovata per "${personId}"`);
  const srcDir = dir === 'right' ? 'left' : dir;
  const { w, h } = base;
  const frames = base.frames?.[srcDir] || base.frames?.down || [];
  const rows = frames[frame] || frames[0];
  const dy = (base.bob || [0, 0, 0])[frame] || 0;
  const px = new Array(w * h).fill(null);
  const extras = (person.extras || []).map(id => ({ id, def: characters.extras?.[id] })).filter(e => e.def);
  const res = pal => ch => pal?.[ch] ?? person.colors?.[ch] ?? personColor(person, ch) ?? base.pal?.[ch];

  for (const e of extras) if (e.def.layer === 'under') stamp(px, w, h, partRows(e.def, baseName, srcDir), res(e.def.pal), dy);
  stamp(px, w, h, rows, res(base.pal), 0);
  if (person.hairStyle) stamp(px, w, h, partRows(characters.hair?.[person.hairStyle], baseName, srcDir), res(null), dy);
  for (const e of extras) if (e.def.layer !== 'under') stamp(px, w, h, partRows(e.def, baseName, srcDir), res(e.def.pal), dy);

  return { w, h, pixels: dir === 'right' ? mirror(px, w, h) : px };
}

export function composePortraitPixels(portraits, characters, id) {
  const p = portraits.people?.[id];
  if (!p) return null;
  const person = { ...(characters.people?.[p.from || id] || {}), ...p };
  const baseName = p.base || 'face';
  const base = portraits.bases?.[baseName];
  if (!base) return null;
  const { w, h } = base;
  const px = new Array(w * h).fill(null);
  const res = pal => ch => pal?.[ch] ?? person.colors?.[ch] ?? personColor(person, ch) ?? base.pal?.[ch];
  stamp(px, w, h, base.px, res(base.pal));
  const style = p.hairStyle || person.hairStyle;
  if (style) stamp(px, w, h, portraits.hair?.[style]?.face, res(null));
  for (const xid of p.extras || []) {
    const def = portraits.extras?.[xid];
    if (def) stamp(px, w, h, def.face, res(def.pal));
  }
  return { w, h, pixels: px };
}

function pixelsToCanvas({ w, h, pixels }) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const data = ctx.createImageData(w, h);
  pixels.forEach((col, i) => {
    if (!col) return;
    const n = parseInt(col.slice(1), 16);
    const full = col.length === 4
      ? [((n >> 8) & 15) * 17, ((n >> 4) & 15) * 17, (n & 15) * 17]
      : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    data.data.set([...full, 255], i * 4);
  });
  ctx.putImageData(data, 0, 0);
  return c;
}

export function compileImage(img) {
  return pixelsToCanvas({ w: img.w, h: img.h, pixels: imageToPixels(img) });
}

// Colori di riserva finché l'arte vera non c'è: il gioco resta giocabile.
const FALLBACK = {
  grass: '#6fb04a', grass_alt: '#67a845', flowers: '#7cba52', path: '#d8c49a', sand: '#efd9a0',
  water: '#3f8fd0', foam: '#8cc4ec', pier: '#9a6a3c', court: '#4f9a5a', court_line: '#dfe8d6',
  door: '#6b3e22', stone_door: '#2a2230', mat: '#a0522d', plate: '#9a9a8a', plate_on: '#f2c84b',
  stage: '#b07a48', chair: '#8a5a32', floor_wood: '#c08a55', floor_tile: '#e6eef4', carpet: '#b8423c',
};

function fallbackCanvas(name, solid) {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d');
  let col = FALLBACK[name];
  if (!col) {
    let hsh = 0;
    for (const ch of name) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    col = `hsl(${hsh % 360} 35% ${solid ? 38 : 62}%)`;
  }
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(15, 0, 1, 16);
  return c;
}

export class ArtCache {
  constructor(art, fallbackTiles = {}) {
    this.art = art;
    this.tilesJson = { tiles: { ...fallbackTiles, ...(art.tiles?.tiles || {}) } };
    this.cache = new Map();
  }

  get(key, make) {
    if (!this.cache.has(key)) this.cache.set(key, make());
    return this.cache.get(key);
  }

  tile(name, frame = 0) {
    const def = this.tilesJson.tiles[name];
    return this.get(`t:${name}:${frame}`, () => {
      const img = def?.frames ? def.frames[frame % def.frames.length] : def?.img;
      return img ? compileImage(img) : fallbackCanvas(name, def?.solid);
    });
  }

  tileFrames(name) {
    return this.tilesJson.tiles[name]?.frames?.length || 1;
  }

  person(id) {
    return this.get(`p:${id}`, () => {
      const chars = this.art.characters;
      const out = { w: 16, h: 24, frames: {} };
      for (const dir of ['down', 'up', 'left', 'right']) {
        out.frames[dir] = [0, 1, 2].map(f => {
          try {
            const c = composePixels(chars, id, dir, f);
            out.w = c.w; out.h = c.h;
            return pixelsToCanvas(c);
          } catch {
            return fallbackPerson(id);
          }
        });
      }
      return out;
    });
  }

  object(name) {
    return this.get(`o:${name}`, () => {
      const img = this.art.objects?.objects?.[name];
      return img ? compileImage(img) : fallbackCanvas(name, true);
    });
  }

  portrait(id) {
    return this.get(`f:${id}`, () => {
      try {
        const px = composePortraitPixels(this.art.portraits || {}, this.art.characters || {}, id);
        return px ? pixelsToCanvas(px) : null;
      } catch {
        return null;
      }
    });
  }
}

function fallbackPerson(id) {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 24;
  const ctx = c.getContext('2d');
  let hsh = 0;
  for (const ch of id) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(3, 9, 10, 15);
  ctx.fillRect(4, 1, 8, 9);
  ctx.fillStyle = `hsl(${hsh % 360} 60% 55%)`;
  ctx.fillRect(4, 10, 8, 10);
  ctx.fillStyle = '#f0c8a8';
  ctx.fillRect(5, 2, 6, 7);
  return c;
}
