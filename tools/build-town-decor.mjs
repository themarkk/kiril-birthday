// Disegna le decorazioni di Santu Brugaru e le dispone sulla mappa.
// Uso: node tools/build-town-decor.mjs
// Scrive: immagini in data/art/objects.json, tile nuovi in data/art/tiles.json,
// e i campi decor/edges/ambient (più le righe degli alberi) in data/maps/town.json. Rilanciarlo è sicuro.
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const readJson = p => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const OUT = '#1a1020';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@$%^&*()_+-=[]{};:,<>/?|~';

// --- Mini-pittura su griglia ---------------------------------------------------------------

const hash = (x, y, s = 0) => {
  const v = Math.sin(x * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453;
  return v - Math.floor(v);
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (list, v) => list[clamp(Math.floor(v * list.length), 0, list.length - 1)];

function encode(w, h, g) {
  const pal = {}, chars = new Map();
  const px = g.map(row => row.map(col => {
    if (!col) return '.';
    if (!chars.has(col)) {
      const ch = ALPHABET[chars.size];
      if (!ch) throw new Error('troppi colori in uno sprite');
      chars.set(col, ch);
      pal[ch] = col;
    }
    return chars.get(col);
  }).join(''));
  return { w, h, pal, px };
}

function spr(w, h, paint, { outline = false } = {}) {
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  const c = {
    w, h, g,
    p(x, y, col) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = col; },
    rect(x, y, rw, rh, col) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) c.p(x + i, y + j, col); },
    ell(cx, cy, rx, ry, col) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) c.p(x, y, col);
      }
    },
    line(x0, y0, x1, y1, col, thick = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) c.rect(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, thick, thick, col);
    },
  };
  paint(c);
  if (outline) {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (g[y][x]) continue;
      if (g[y - 1]?.[x] || g[y + 1]?.[x] || g[y][x - 1] || g[y][x + 1]) add.push([x, y]);
    }
    for (const [x, y] of add) g[y][x] = OUT;
  }
  return encode(w, h, g);
}

// Chioma a grumi: l'ultimo grumo copre i precedenti, ciascuno ha la sua luce da in alto a sinistra.
function foliage(c, blobs, pal, seed = 1) {
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    let hit = null;
    for (const b of blobs) {
      const d = ((x - b.x) / b.rx) ** 2 + ((y - b.y) / b.ry) ** 2;
      if (d <= 1 + (hash(x, y, seed) - 0.5) * 0.3) hit = b;
    }
    if (!hit) continue;
    const nx = (x - hit.x) / hit.rx, ny = (y - hit.y) / hit.ry;
    const v = 0.5 - 0.3 * nx - 0.45 * ny + (hash(x >> 1, y >> 1, seed + 1) - 0.5) * 0.4;
    c.p(x, y, pick(pal, v));
  }
}

function trunk(c, pts, pal) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0, w0] = pts[i], [x1, y1, w1] = pts[i + 1];
    const n = Math.abs(y1 - y0) || 1;
    for (let k = 0; k <= n; k++) {
      const t = k / n, y = y0 + (y1 - y0) * t, x = x0 + (x1 - x0) * t, w = w0 + (w1 - w0) * t;
      for (let i2 = 0; i2 < w; i2++) {
        const u = i2 / Math.max(w - 1, 1);
        c.p(x - w / 2 + i2, y, pick(pal, 1 - u + (hash(i2, y, 5) - 0.5) * 0.3));
      }
    }
  }
}

const OLIVE = ['#3c5a42', '#567a4e', '#7d9c66', '#a9bd84'];
const PINE = ['#1d4a38', '#2f6a44', '#4b8c4e', '#7ab45c'];
const CYPRESS = ['#163c30', '#22543c', '#357048', '#528c52'];
const BARK = ['#3e2e2a', '#62483a', '#86684e'];
const BUSH = ['#28603c', '#3a804a', '#5aa055', '#84bf62'];
const STONE = ['#4a4442', '#6c6460', '#8f867c', '#b3a998', '#d2c8b4'];
const BASALT = ['#2f2b2d', '#453f3e', '#5e5552', '#7a6f66', '#96897a', '#b6a892'];
const ART = {};

// --- Alberi e piante ---

ART.tree_olive = spr(32, 38, c => {
  trunk(c, [[16, 37, 8], [15, 31, 5], [17, 25, 6], [14, 20, 4]], BARK);
  c.line(16, 26, 23, 19, BARK[1], 2);
  c.line(14, 27, 8, 21, BARK[1], 2);
  foliage(c, [
    { x: 8, y: 17, rx: 7, ry: 6 }, { x: 24, y: 17, rx: 7, ry: 6 }, { x: 16, y: 18, rx: 9, ry: 6 },
    { x: 11, y: 10, rx: 8, ry: 7 }, { x: 22, y: 10, rx: 7, ry: 6 }, { x: 16, y: 7, rx: 7, ry: 6 },
  ], OLIVE, 3);
}, { outline: true });

ART.tree_pine = spr(36, 46, c => {
  trunk(c, [[18, 45, 7], [18, 34, 5], [17, 22, 4], [19, 14, 3]], ['#4a2c26', '#7a4a34', '#a0694a']);
  c.line(17, 26, 9, 15, '#7a4a34', 2);
  c.line(19, 24, 27, 15, '#7a4a34', 2);
  foliage(c, [
    { x: 6, y: 15, rx: 6, ry: 4 }, { x: 30, y: 15, rx: 5, ry: 4 }, { x: 18, y: 15, rx: 13, ry: 5 },
    { x: 10, y: 10, rx: 8, ry: 5 }, { x: 25, y: 10, rx: 8, ry: 5 }, { x: 18, y: 7, rx: 9, ry: 5 },
  ], PINE, 7);
}, { outline: true });

ART.tree_cypress = spr(14, 42, c => {
  trunk(c, [[7, 41, 4], [7, 34, 3]], BARK);
  foliage(c, [{ x: 7, y: 25, rx: 5, ry: 12 }, { x: 7, y: 14, rx: 4, ry: 12 }, { x: 7, y: 6, rx: 2.5, ry: 6 }], CYPRESS, 11);
}, { outline: true });

ART.palm_big = spr(34, 46, c => {
  // Tronco curvo a anelli
  for (let y = 45; y > 14; y--) {
    const t = (45 - y) / 31, x = 14 + t * t * 6;
    for (let i = 0; i < 4; i++) c.p(x + i, y, y % 3 === 0 ? '#6a4428' : pick(['#d4a670', '#b2834f', '#86603a', '#6a4428'], i / 3.5));
  }
  const frond = (dx, dy, droop, col, tip) => {
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, x = 21 + dx * t, y = 13 + dy * t + droop * t * t;
      c.rect(x, y, t < 0.75 ? 2 : 1, t < 0.5 ? 2 : 1, t > 0.7 ? tip : col);
      if (i % 2 === 0 && i > 2) c.p(x, y + 2, col);
    }
  };
  frond(-16, -7, 14, '#2a6c3c', '#48a050');
  frond(13, -7, 14, '#2a6c3c', '#48a050');
  frond(-18, -2, 9, '#3a8a48', '#82c860');
  frond(13, -2, 10, '#3a8a48', '#82c860');
  frond(-9, -9, 4, '#48a050', '#a6dc78');
  frond(9, -10, 5, '#48a050', '#a6dc78');
  frond(-6, 2, 13, '#2a6c3c', '#48a050');
  frond(6, 2, 12, '#2a6c3c', '#48a050');
  c.rect(19, 13, 2, 3, '#6a3e22');
  c.rect(22, 13, 2, 3, '#6a3e22');
  c.rect(20, 15, 2, 2, '#8a5428');
}, { outline: true });

ART.bush = spr(16, 13, c => {
  foliage(c, [{ x: 4, y: 8, rx: 4, ry: 4 }, { x: 11, y: 8, rx: 4, ry: 4 }, { x: 8, y: 6, rx: 6, ry: 5 }], BUSH, 13);
}, { outline: true });

ART.bush_oleander = spr(16, 14, c => {
  foliage(c, [{ x: 4, y: 9, rx: 4, ry: 4 }, { x: 11, y: 9, rx: 4, ry: 4 }, { x: 8, y: 6, rx: 6, ry: 5 }], BUSH, 17);
  for (const [x, y] of [[3, 7], [6, 3], [10, 4], [12, 8], [8, 8], [5, 10], [10, 11]]) {
    c.rect(x, y, 2, 2, '#f06c9a');
    c.p(x, y, '#ffc0d4');
  }
}, { outline: true });

ART.prickly = spr(22, 24, c => {
  const pad = (x, y, rx, ry) => {
    c.ell(x, y, rx, ry, '#4f9458');
    c.ell(x - 1, y - 1, rx - 1.5, ry - 1.5, '#74b868');
    c.p(x - 1, y - 2, '#b6dc8e');
    for (let i = 0; i < 4; i++) c.p(x - rx / 2 + hash(i, y) * rx, y - ry / 2 + hash(y, i) * ry, '#f4f2d0');
  };
  pad(6, 11, 4, 5);
  pad(16, 10, 4, 5);
  pad(11, 16, 6, 7);
  for (const [x, y] of [[4, 5], [8, 6], [15, 4], [19, 5]]) { c.rect(x, y, 2, 2, '#e8603e'); c.p(x, y, '#f6a24a'); }
}, { outline: true });

ART.artichoke_plant = spr(14, 14, c => {
  foliage(c, [{ x: 3, y: 11, rx: 3.5, ry: 2.5 }, { x: 11, y: 11, rx: 3.5, ry: 2.5 }, { x: 7, y: 11, rx: 4, ry: 2.5 }], ['#3e7a62', '#569a78', '#80bc96'], 21);
  c.rect(6, 6, 2, 5, '#569a78');
  c.ell(7, 4, 3, 3.5, '#6a9a6a');
  for (const [x, y] of [[6, 2], [8, 3], [6, 5], [8, 5]]) c.p(x, y, '#9a6aa8');
  c.p(7, 1, '#b48ac0');
}, { outline: true });

// --- Nuraghe trilobato in basalto ---

ART.nuraghe_big = spr(112, 96, c => {
  const tower = (cx, top, bottom, hwTop, hwBottom, seed) => {
    let y = top;
    let row = 0;
    while (y < bottom) {
      const rh = 5 + Math.floor(hash(row, seed) * 4);
      const hw = hwTop + (hwBottom - hwTop) * ((y - top) / (bottom - top));
      let x = cx - hw + (row % 2 ? -3 : 0);
      let col = 0;
      while (x < cx + hw) {
        const bw = 8 + Math.floor(hash(row, col, seed) * 9);
        const tone = hash(col, row, seed + 2);
        for (let j = 0; j < rh; j++) for (let i = 0; i < bw; i++) {
          const px = x + i, py = y + j;
          const h = hwTop + (hwBottom - hwTop) * ((py - top) / (bottom - top));
          const u = (px - cx) / h;
          if (Math.abs(u) > 1 || py >= bottom) continue;
          const edge = j === rh - 1 || i === bw - 1;
          const light = 0.62 - 0.42 * u + (tone - 0.5) * 0.3 + (j === 0 ? 0.13 : 0) + (i === 0 ? 0.05 : 0) - (Math.abs(u) > 0.85 ? 0.1 : 0);
          c.p(px, py, edge ? BASALT[0] : pick(BASALT, light));
        }
        x += bw;
        col++;
      }
      y += rh;
      row++;
    }
  };
  tower(19, 48, 96, 15, 19, 5);
  tower(93, 50, 96, 15, 19, 8);
  tower(56, 62, 96, 44, 50, 12); // bastione
  tower(56, 6, 96, 25, 36, 3);   // torre centrale
  // Corona in cima alle torri
  const crown = (cx, y, hw) => {
    c.ell(cx, y, hw, 3, BASALT[1]);
    c.ell(cx, y - 1, hw - 2, 2, BASALT[0]);
    for (let x = cx - hw; x <= cx + hw; x += 5) c.rect(x, y + 1, 4, 2, pick(BASALT, 0.55 - 0.3 * (x - cx) / hw));
  };
  crown(56, 7, 26);
  crown(19, 49, 15);
  crown(93, 51, 15);
  // Muschio ed erba fra le pietre
  const moss = ['#587a44', '#76964e', '#96b45c'];
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(hash(i, 1, 40) * 112), y = Math.floor(hash(i, 2, 41) * 96);
    if (c.g[y][x] && c.g[y][x] !== BASALT[0] && hash(i, 3) > 0.35) {
      const n = 1 + Math.floor(hash(i, 4) * 4);
      for (let k = 0; k < n; k++) if (c.g[y]?.[x + k]) c.p(x + k, y, pick(moss, hash(k, i)));
    }
  }
  for (const [x, y, w] of [[33, 4, 7], [64, 3, 9], [8, 46, 6], [100, 48, 5]]) {
    for (let k = 0; k < w; k++) {
      const hgt = 1 + Math.floor(hash(k, x) * 3);
      c.rect(x + k, y - hgt + 1, 1, hgt, pick(moss, hash(k, y)));
    }
  }
  // Ingresso con architrave e finestrella di scarico
  c.rect(49, 78, 15, 18, OUT);
  c.rect(51, 80, 11, 16, '#120a16');
  c.rect(52, 82, 9, 14, '#0b060e');
  c.rect(46, 72, 21, 6, BASALT[4]);
  c.rect(46, 72, 21, 1, BASALT[5]);
  c.rect(46, 77, 21, 1, BASALT[0]);
  c.rect(46, 72, 1, 6, BASALT[0]);
  c.rect(66, 72, 1, 6, BASALT[0]);
  c.rect(53, 65, 7, 7, OUT);
  c.rect(54, 66, 5, 6, '#120a16');
  for (const [x, y] of [[44, 79], [66, 83], [44, 88], [66, 91]]) c.rect(x, y, 4, 4, BASALT[3]);
}, { outline: true });

// --- Muretti, oggetti del paese ---

const stoneCourse = (c, w, h, seed) => {
  for (let y = 0, row = 0; y < h; row++) {
    const rh = 3 + (hash(row, seed) > 0.5 ? 1 : 0);
    let x = row % 2 ? -2 : 0, col = 0;
    while (x < w) {
      const bw = 4 + Math.floor(hash(row, col, seed) * 4);
      const v = 0.3 + hash(col, row, seed + 1) * 0.6 + (row === 0 ? 0.15 : 0);
      c.rect(x, y + (16 - h), bw - 1, rh - 1, pick(STONE, v));
      c.rect(x, y + (16 - h), bw - 1, 1, pick(STONE, v + 0.2));
      c.rect(x + bw - 1, y + (16 - h), 1, rh, STONE[0]);
      c.rect(x, y + rh - 1 + (16 - h), bw, 1, STONE[0]);
      x += bw;
      col++;
    }
    y += rh;
  }
  for (let i = 0; i < 4; i++) c.p(hash(i, seed) * w, 16 - h + (hash(seed, i) > 0.6 ? 1 : 0), '#6f9a4c');
};
ART.muretto_a = spr(16, 16, c => stoneCourse(c, 16, 12, 2));
ART.muretto_b = spr(16, 16, c => stoneCourse(c, 16, 11, 9));

ART.well = spr(22, 26, c => {
  c.rect(4, 5, 2, 12, '#6a4428');
  c.rect(16, 5, 2, 12, '#6a4428');
  c.rect(9, 7, 4, 2, '#86603a');
  c.line(11, 8, 11, 13, '#c9bfae');
  c.rect(10, 13, 3, 3, '#8a5a32');
  for (let i = 0; i < 6; i++) c.line(1 + i, 6 - i, 20 - i, 6 - i, pick(['#c45e36', '#de7c4a', '#f2a674'], i / 5));
  c.ell(11, 18, 10, 3, '#4a4442');
  c.ell(11, 17.5, 7, 1.6, '#1a2a4c');
  for (let y = 18; y < 25; y++) for (let x = 1; x <= 21; x++) {
    if (((x - 11) / 10.5) ** 2 + ((y - 18) / 7) ** 2 > 1) continue;
    const brick = (x + (Math.floor((y - 18) / 2) % 2 ? 2 : 0)) % 4 === 0 || (y - 18) % 2 === 1;
    c.p(x, y, brick ? STONE[0] : pick(STONE, 0.75 - 0.5 * (x - 11) / 10 + hash(x >> 2, y >> 1) * 0.2));
  }
}, { outline: true });

ART.sheep = spr(16, 13, c => {
  c.rect(4, 10, 1, 3, '#3a2e2e');
  c.rect(11, 10, 1, 3, '#3a2e2e');
  foliage(c, [{ x: 8, y: 7, rx: 6, ry: 4.5 }, { x: 5, y: 5, rx: 3.5, ry: 3 }, { x: 10, y: 5, rx: 3.5, ry: 3 }], ['#b8b0a0', '#d8d2c4', '#f4f0e6', '#ffffff'], 31);
  c.rect(0, 4, 4, 5, '#3a2e2e');
  c.p(1, 5, '#ffffff');
  c.p(3, 3, '#3a2e2e');
  c.rect(1, 8, 2, 1, '#6a5656');
}, { outline: true });
ART.sheep_r = spr(16, 13, c => {
  const left = ART.sheep;
  left.px.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') c.p(15 - x, y, left.pal[ch]); }));
});

ART.cat = spr(13, 9, c => {
  c.ell(6, 5, 5, 3, '#e89a4a');
  c.ell(5, 4, 3, 1.5, '#f6bc72');
  for (const x of [4, 7, 9]) c.rect(x, 3, 1, 2, '#b86a2c');
  c.rect(0, 3, 4, 4, '#e89a4a');
  c.p(0, 2, '#e89a4a');
  c.p(3, 2, '#e89a4a');
  c.p(1, 5, OUT);
  c.p(3, 5, OUT);
  c.line(9, 7, 12, 6, '#b86a2c');
}, { outline: true });

ART.lamp_post = spr(10, 30, c => {
  c.rect(4, 8, 2, 20, '#3a3440');
  c.rect(4, 8, 1, 20, '#5a5262');
  c.rect(3, 27, 4, 3, '#3a3440');
  c.rect(2, 2, 6, 6, '#fff0b0');
  c.rect(3, 3, 2, 2, '#ffffff');
  c.rect(1, 1, 8, 1, '#3a3440');
  c.rect(3, 0, 4, 1, '#3a3440');
  c.rect(1, 8, 8, 1, '#3a3440');
  c.rect(1, 2, 1, 6, '#3a3440');
  c.rect(8, 2, 1, 6, '#3a3440');
}, { outline: true });

ART.chimney = spr(12, 24, c => {
  c.rect(2, 6, 8, 18, '#e0d6c4');
  c.rect(2, 6, 3, 18, '#f2ebdd');
  c.rect(8, 6, 2, 18, '#bcae98');
  for (const [x, y] of [[4, 10], [7, 14], [3, 18], [6, 20]]) c.rect(x, y, 2, 1, '#bcae98');
  c.rect(1, 3, 10, 3, '#c45e36');
  c.rect(1, 3, 10, 1, '#f2a674');
  c.rect(3, 0, 6, 3, '#702c26');
  c.rect(4, 0, 4, 1, '#26161c');
}, { outline: true });

ART.antenna = spr(14, 24, c => {
  c.rect(7, 3, 1, 21, '#4a4450');
  for (const [y, hw] of [[4, 6], [8, 5], [12, 4]]) c.rect(7 - hw, y, hw * 2 + 1, 1, '#6a6472');
}, { outline: true });

ART.flower_box_r = spr(14, 7, c => {
  c.rect(1, 3, 12, 4, '#a4522c');
  c.rect(1, 3, 12, 1, '#c8703c');
  foliage(c, [{ x: 4, y: 2, rx: 3.5, ry: 2 }, { x: 10, y: 2, rx: 3.5, ry: 2 }], BUSH, 41);
  for (const x of [2, 5, 8, 11]) { c.rect(x, 0, 2, 2, '#e8344a'); c.p(x, 0, '#ff8a8a'); }
});
ART.flower_box_p = spr(14, 7, c => {
  c.rect(1, 3, 12, 4, '#a4522c');
  c.rect(1, 3, 12, 1, '#c8703c');
  foliage(c, [{ x: 4, y: 2, rx: 3.5, ry: 2 }, { x: 10, y: 2, rx: 3.5, ry: 2 }], BUSH, 43);
  for (const x of [2, 5, 8, 11]) { c.rect(x, 0, 2, 2, '#f06cb0'); c.p(x, 0, '#ffc0e0'); }
});

ART.bougainvillea = spr(14, 42, c => {
  c.line(7, 41, 5, 14, '#6a4428', 2);
  foliage(c, [
    { x: 7, y: 36, rx: 5, ry: 5 }, { x: 5, y: 28, rx: 5, ry: 6 }, { x: 8, y: 20, rx: 5, ry: 6 },
    { x: 6, y: 12, rx: 6, ry: 5 }, { x: 8, y: 6, rx: 5, ry: 5 },
  ], ['#7a1e6a', '#ac2a84', '#d8409a', '#f27cc0'], 47);
  for (let i = 0; i < 12; i++) c.p(2 + hash(i, 1) * 10, 3 + hash(i, 2) * 36, '#3a804a');
});
ART.ivy = spr(14, 36, c => {
  foliage(c, [
    { x: 7, y: 31, rx: 6, ry: 5 }, { x: 4, y: 23, rx: 4, ry: 6 }, { x: 9, y: 19, rx: 4, ry: 5 },
    { x: 5, y: 11, rx: 4, ry: 5 }, { x: 9, y: 5, rx: 3, ry: 4 },
  ], ['#1e5a3a', '#2f7a48', '#4f9c54', '#7cc066'], 53);
});

ART.flowerbed = spr(16, 11, c => {
  c.ell(8, 7, 7.5, 3.5, '#5a3e2c');
  foliage(c, [{ x: 4, y: 5, rx: 3.5, ry: 2.5 }, { x: 11, y: 5, rx: 3.5, ry: 2.5 }, { x: 8, y: 6, rx: 4, ry: 2.5 }], BUSH, 59);
  for (const [x, y, col] of [[2, 3, '#ffd24a'], [5, 5, '#f06c9a'], [8, 3, '#ffffff'], [11, 5, '#e8344a'], [13, 3, '#b48aff'], [7, 7, '#ffd24a']]) {
    c.rect(x, y, 2, 2, col);
  }
}, { outline: true });

ART.barrel_out = spr(12, 16, c => {
  c.ell(6, 8, 5, 7.5, '#a86e3c');
  c.ell(4, 8, 2, 6, '#c8905a');
  for (const y of [3, 12]) c.rect(1, y, 10, 1, '#4a4450');
  c.ell(6, 2, 4, 1.5, '#7a4e2a');
}, { outline: true });

ART.tavern_table = spr(30, 34, c => {
  c.rect(14, 8, 2, 24, '#ece4d4');
  for (let i = 0; i < 8; i++) {
    const hw = 3 + i * 1.7;
    for (let x = -hw; x <= hw; x++) c.p(15 + x, i + 1, Math.floor((x + 30) / 4) % 2 ? '#d8423a' : '#fbf6ec');
  }
  c.rect(1, 9, 28, 1, '#a8302a');
  c.rect(7, 24, 16, 2, '#f2ebdd');
  c.rect(7, 26, 16, 3, '#d8423a');
  c.rect(7, 26, 16, 1, '#a8302a');
  c.rect(9, 29, 2, 4, '#6a4428');
  c.rect(19, 29, 2, 4, '#6a4428');
  c.rect(10, 22, 2, 2, '#8a5428'); // bicchiere
  c.rect(18, 21, 3, 3, '#7c2a46'); // cannonau
  c.rect(1, 25, 4, 7, '#8a5a32');
  c.rect(1, 28, 4, 1, '#c8905a');
  c.rect(25, 25, 4, 7, '#8a5a32');
  c.rect(25, 28, 4, 1, '#c8905a');
}, { outline: true });

ART.mailbox = spr(10, 18, c => {
  c.rect(4, 8, 2, 10, '#6a4428');
  c.rect(1, 2, 8, 6, '#d8423a');
  c.rect(1, 2, 8, 1, '#f27a6a');
  c.rect(3, 4, 4, 1, OUT);
  c.rect(8, 0, 1, 3, '#f0c860');
}, { outline: true });

ART.poster = spr(10, 13, c => {
  c.rect(0, 0, 10, 13, '#3c2a6a');
  c.rect(1, 1, 8, 5, '#f06cb0');
  c.rect(2, 2, 6, 3, '#ffd24a');
  c.rect(3, 3, 1, 1, OUT);
  c.rect(6, 3, 1, 1, OUT);
  c.rect(1, 8, 8, 1, '#7ce0f0');
  c.rect(1, 10, 5, 1, '#fbf6ec');
});

ART.clothes_pole = spr(6, 26, c => {
  c.rect(2, 2, 2, 24, '#6a4428');
  c.rect(2, 2, 1, 24, '#86603a');
  c.rect(0, 2, 6, 1, '#6a4428');
}, { outline: true });

ART.laundry = spr(64, 22, c => {
  const sag = x => 2 + Math.sin(x / 64 * Math.PI) * 3;
  for (let x = 0; x < 64; x++) c.p(x, sag(x), '#e6e0d0');
  const cloth = (x, w, h, col, shade, pattern) => {
    const y = Math.round(sag(x + w / 2)) + 1;
    c.rect(x, y, w, h, col);
    c.rect(x + w - 2, y, 2, h, shade);
    c.rect(x, y + h, w, 1, shade);
    if (pattern) for (let j = 2; j < h; j += 3) c.rect(x, y + j, w - 2, 1, shade);
    c.rect(x + 1, y - 1, 1, 2, '#a86e3c');
    c.rect(x + w - 2, y - 1, 1, 2, '#a86e3c');
    return [x, y];
  };
  cloth(4, 11, 12, '#fbf6ec', '#d6ccbc');
  cloth(18, 9, 9, '#58a8e0', '#3a80b8', true);
  const [sx, sy] = cloth(30, 8, 6, '#f2c84b', '#c89e30'); // canottiera
  c.rect(sx + 1, sy + 6, 2, 6, '#3e6ea0');
  c.rect(sx + 5, sy + 6, 2, 6, '#3e6ea0');
  c.rect(sx, sy + 2, 8, 1, '#3e6ea0');
  cloth(42, 13, 14, '#f4a0b0', '#d0788a');
  cloth(57, 5, 7, '#ffffff', '#d6ccbc');
});

const PENNANTS = ['#e8344a', '#ffd24a', '#3fb0e8', '#fbf6ec', '#62c070', '#f06cb0'];
function bunting(w, depth) {
  return spr(w, depth + 9, c => {
    const sag = x => 1 + Math.sin(x / (w - 1) * Math.PI) * depth;
    for (let x = 0; x < w; x++) c.p(x, sag(x), '#4a3a30');
    for (let x = 5, i = 0; x < w - 6; x += 11, i++) {
      const y = Math.round(sag(x + 3)) + 1, col = PENNANTS[i % PENNANTS.length];
      for (let j = 0; j < 7; j++) {
        const half = 3.5 * (1 - j / 7);
        c.rect(x + 3.5 - half, y + j, Math.max(1, half * 2), 1, col);
      }
      c.rect(x, y, 7, 1, col);
    }
  });
}
ART.bunting_wide = bunting(145, 10);

ART.net_post = spr(4, 18, c => {
  c.rect(1, 1, 2, 17, '#e0e0d8');
  c.rect(1, 1, 1, 17, '#ffffff');
}, { outline: true });

ART.court_lines = spr(144, 80, c => {
  const line = '#f4f2ea';
  c.rect(0, 7, 2, 66, line);
  c.rect(142, 7, 2, 66, line);
  c.rect(36, 7, 1, 66, line);
  c.rect(107, 7, 1, 66, line);
  c.rect(36, 39, 72, 1, line);
  for (let i = 0; i < 80; i += 1) for (let j = 0; j < 144; j += 1) {
    if (hash(j >> 2, i >> 2, 71) > 0.93 && i > 8 && i < 71 && !c.g[i][j]) c.p(j, i, '#357a4f');
  }
});

ART.tennis_ball = spr(5, 5, c => {
  c.ell(2, 2, 2, 2, '#d8e84a');
  c.p(1, 1, '#f4ffa0');
});

ART.plaza_ring = spr(76, 58, c => {
  const cx = 37.5, cy = 28.5;
  for (let y = 0; y < 58; y++) for (let x = 0; x < 76; x++) {
    const d = Math.hypot((x - cx) / 37, (y - cy) / 28);
    const hole = Math.abs(x - cx) < 17 && Math.abs(y - cy) < 17;
    if (d > 1 || hole) continue;
    const ang = Math.atan2(y - cy, x - cx);
    const ring = Math.floor(d * 5);
    const seg = Math.floor(ang * (4 + ring * 3));
    const mortar = (d * 5) % 1 < 0.18 || ((ang * (4 + ring * 3)) % 1 + 1) % 1 < 0.14;
    if (mortar) c.p(x, y, '#a07a58');
    else c.p(x, y, pick(['#cba372', '#dcbc8c', '#ead2a8', '#f4e2c0'], 0.2 + hash(ring, seg, 77) * 0.8));
  }
});

// --- Spiaggia e mare ---

ART.towel_a = spr(14, 22, c => {
  for (let y = 0; y < 22; y++) c.rect(0, y, 14, 1, Math.floor(y / 3) % 2 ? '#3fb0e8' : '#fbf6ec');
  for (let x = 0; x < 14; x += 2) c.p(x, 21, '#d6ccbc');
  c.rect(14, 2, 1, 20, '#b89860');
});
ART.towel_b = spr(14, 22, c => {
  for (let y = 0; y < 22; y++) c.rect(0, y, 14, 1, Math.floor(y / 3) % 2 ? '#f06c9a' : '#ffd24a');
  for (let x = 0; x < 14; x += 2) c.p(x, 21, '#d6ccbc');
  c.rect(14, 2, 1, 20, '#b89860');
});
ART.sandcastle = spr(20, 16, c => {
  const sand = ['#b89860', '#d6b87c', '#ecd49c', '#f8eabc'];
  const block = (x, y, w, h) => {
    for (let i = 0; i < w; i++) c.rect(x + i, y, 1, h, pick(sand, 1 - i / w));
    for (let i = 0; i < w; i += 2) c.p(x + i, y - 1, sand[2]);
  };
  block(1, 8, 18, 8);
  block(1, 4, 5, 6);
  block(14, 4, 5, 6);
  block(7, 2, 6, 8);
  c.rect(8, 11, 4, 5, '#8a6e44');
  c.rect(10, 0, 1, 3, '#6a4428');
  c.rect(11, 0, 3, 2, '#e8344a');
}, { outline: true });
ART.starfish = spr(9, 9, c => {
  c.line(4, 4, 4, 0, '#f0704a');
  c.line(4, 4, 0, 3, '#f0704a');
  c.line(4, 4, 8, 3, '#f0704a');
  c.line(4, 4, 1, 8, '#f0704a');
  c.line(4, 4, 7, 8, '#f0704a');
  c.rect(3, 3, 3, 3, '#ff9a6a');
  c.p(4, 4, '#ffd0a0');
});
ART.shell = spr(6, 5, c => {
  c.ell(3, 3, 2.5, 2, '#fbe8e0');
  c.line(3, 4, 1, 2, '#e0a890');
  c.line(3, 4, 5, 2, '#e0a890');
  c.p(3, 2, '#e0a890');
});
ART.driftwood = spr(26, 8, c => {
  c.line(1, 5, 23, 3, '#8a7056', 2);
  c.line(1, 5, 23, 3, '#a48a6e');
  c.line(16, 3, 22, 0, '#8a7056');
  c.line(6, 5, 3, 7, '#8a7056');
}, { outline: true });
ART.beach_ball = spr(10, 10, c => {
  c.ell(4.5, 4.5, 4.5, 4.5, '#fbf6ec');
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    if (!c.g[y][x]) continue;
    const a = Math.floor((Math.atan2(y - 4.5, x - 4.5) + Math.PI) / (Math.PI / 3));
    c.p(x, y, ['#e8344a', '#fbf6ec', '#3fb0e8', '#fbf6ec', '#ffd24a', '#fbf6ec'][a % 6]);
  }
  c.rect(2, 2, 2, 1, '#ffffff');
}, { outline: true });
ART.fish_basket = spr(16, 14, c => {
  c.rect(1, 5, 14, 9, '#a87c4a');
  for (let y = 5; y < 14; y++) for (let x = 1; x < 15; x++) if ((x + y) % 3 === 0) c.p(x, y, '#7a5630');
  c.rect(1, 5, 14, 1, '#c8a06a');
  c.rect(3, 3, 5, 2, '#a6c8d8');
  c.rect(8, 2, 5, 3, '#c4dce8');
  c.p(11, 3, OUT);
}, { outline: true });
ART.footprints = spr(16, 16, c => {
  for (const [x, y] of [[2, 3], [7, 9], [12, 4]]) {
    c.rect(x, y, 3, 2, '#c8ac74');
    c.rect(x + 3, y, 1, 1, '#c8ac74');
  }
});
ART.sea_rock = spr(30, 22, c => {
  c.ell(15, 19, 14, 2.5, '#e6f8ff');
  for (let y = 0; y < 19; y++) for (let x = 0; x < 30; x++) {
    const hw = 12 * Math.sqrt(1 - ((18 - y) / 19) ** 2 * 0.95) + Math.sin(y * 0.9) * 1.2;
    if (Math.abs(x - 15) > hw) continue;
    c.p(x, y, pick(BASALT.slice(1), 0.65 - 0.4 * (x - 15) / 12 - (18 - y) * -0.012 + (hash(x >> 2, y >> 1, 83) - 0.5) * 0.5));
  }
}, { outline: true });
ART.buoy = spr(8, 12, c => {
  c.rect(2, 3, 4, 7, '#e8344a');
  c.rect(2, 5, 4, 2, '#fbf6ec');
  c.rect(3, 0, 2, 3, '#4a4450');
  c.ell(4, 10, 3.5, 1, '#e6f8ff');
}, { outline: true });
ART.sailboat = spr(26, 28, c => {
  c.rect(12, 1, 1, 22, '#5a3a24');
  for (let y = 2; y < 21; y++) {
    c.rect(13, y, Math.floor((y - 1) * 0.55), 1, y > 14 ? '#e8344a' : '#fbf6ec');
    c.rect(12 - Math.floor((y - 2) * 0.35), y, Math.floor((y - 2) * 0.35), 1, '#f4f0e0');
  }
  for (let y = 22; y < 26; y++) c.rect(2 + (y - 22), y, 22 - (y - 22) * 2, 1, y === 22 ? '#fbf6ec' : '#3c5a8a');
  c.rect(4, 26, 18, 1, '#e6f8ff');
}, { outline: true });

// --- Superfici trasparenti: ombre, luci, erba, acqua ---

const SH = '#20103858', SH2 = '#20103830';
ART.shade_s = spr(16, 7, c => { c.rect(0, 0, 16, 4, SH); c.rect(0, 4, 16, 3, SH2); });
ART.shade_e = spr(6, 16, c => { c.rect(0, 0, 4, 16, SH); c.rect(4, 0, 2, 16, SH2); });
ART.shade_w = spr(6, 16, c => { c.rect(2, 0, 4, 16, SH); c.rect(0, 0, 2, 16, SH2); });
ART.shade_top = spr(16, 8, c => { for (let y = 0; y < 8; y++) c.rect(0, y, 16, 1, y < 3 ? SH : SH2); });
ART.shadow_big = spr(30, 11, c => c.ell(14.5, 5, 14.5, 5, '#20103850'));
ART.shadow_mid = spr(20, 8, c => c.ell(9.5, 3.5, 9.5, 3.5, '#20103850'));
ART.shadow_small = spr(14, 6, c => c.ell(6.5, 2.5, 6.5, 2.5, '#20103850'));
ART.wall_base = spr(16, 3, c => { c.rect(0, 0, 16, 1, '#3020301c'); c.rect(0, 1, 16, 2, '#30203040'); });
ART.roof_ridge = spr(16, 4, c => {
  c.rect(0, 0, 16, 3, '#a8502c');
  c.rect(0, 0, 16, 1, '#f6b888');
  for (let x = 3; x < 16; x += 4) c.rect(x, 0, 1, 3, '#702c26');
  c.rect(0, 3, 16, 1, '#50202050');
});
ART.tint_cool = spr(16, 16, c => c.rect(0, 0, 16, 16, '#4a3a7038'));
ART.tint_warm = spr(16, 16, c => c.rect(0, 0, 16, 16, '#f0b04028'));
ART.tint_dark = spr(16, 16, c => c.rect(0, 0, 16, 16, '#40183038'));
ART.tint_eave_cool = spr(16, 11, c => { c.rect(0, 0, 16, 11, '#4a3a7038'); });
ART.tint_eave_warm = spr(16, 11, c => { c.rect(0, 0, 16, 11, '#f0b04028'); });
ART.tint_eave_dark = spr(16, 11, c => { c.rect(0, 0, 16, 11, '#40183038'); });
ART.roof_wear = spr(16, 8, c => {
  for (const [x, y, col] of [[1, 1, '#50684040'], [5, 2, '#50684060'], [9, 4, '#40201050'], [12, 1, '#f8e0b050'], [3, 5, '#40201050']]) c.rect(x, y, 3, 2, col);
});

function grassBlob(w, h, col, seed) {
  return spr(w, h, c => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = ((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2 + (hash(x >> 1, y >> 1, seed) - 0.5) * 0.5;
      if (d < 0.55 || (d < 1 && (x + y) % 2 === 0)) c.p(x, y, col);
    }
  });
}
ART.lawn_dark = grassBlob(72, 44, '#62a646', 91);
ART.lawn_light = grassBlob(60, 36, '#7bbc50', 93);
ART.worn = spr(16, 16, c => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot((x - 7.5) / 8, (y - 7.5) / 6) + (hash(x, y, 95) - 0.5) * 0.7;
    if (d < 0.7 && hash(x, y, 97) > 0.35) c.p(x, y, hash(x, y, 96) > 0.6 ? '#a8b064' : '#8cb058');
  }
});
ART.tuft = spr(7, 5, c => {
  for (const [x, h] of [[1, 3], [2, 4], [3, 2], [4, 4], [5, 3]]) c.rect(x, 5 - h, 1, h, x % 2 ? '#4e9440' : '#8ed05e');
});
ART.clover = spr(9, 6, c => {
  for (const [x, y] of [[1, 3], [4, 1], [6, 4]]) { c.rect(x, y, 2, 2, '#4e9c44'); c.p(x, y, '#9ad868'); }
});
ART.daisies = spr(11, 9, c => {
  for (const [x, y] of [[2, 2], [7, 1], [5, 6], [9, 6]]) {
    for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c.p(x + a, y + b, '#ffffff');
    c.p(x, y, '#ffd24a');
  }
});
ART.poppies = spr(11, 10, c => {
  for (const [x, y] of [[2, 2], [7, 1], [5, 5], [9, 6]]) {
    c.rect(x, y + 2, 1, 3, '#3f8a3e');
    c.rect(x - 1, y, 3, 2, '#e8344a');
    c.p(x - 1, y, '#ff7a7a');
    c.p(x, y + 1, '#40101a');
  }
});
ART.lavender = spr(11, 10, c => {
  for (const [x, h] of [[1, 5], [3, 7], [5, 8], [7, 6], [9, 5]]) {
    c.rect(x, 10 - h, 1, h, '#4e8a52');
    c.rect(x, 10 - h, 1, 3, x % 4 === 1 ? '#9a7ad8' : '#b89af0');
  }
});
ART.pebbles = spr(9, 5, c => {
  for (const [x, y, col] of [[1, 2, '#a99f90'], [4, 0, '#c9bfae'], [6, 3, '#8f8578']]) { c.rect(x, y, 2, 2, col); c.p(x, y, '#e0d8c8'); }
});
ART.wet_sand = spr(16, 8, c => {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) {
    if (y > 3 || (x + y) % 2 === 0) c.p(x, y, '#8a643838');
  }
});
ART.water_shallow = spr(16, 16, c => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (y > 8 && (x + y) % 2 === 0 && y > 12) continue;
    c.p(x, y, '#4fe0d04c');
  }
});
ART.water_shallow_foam = spr(16, 9, c => c.rect(0, 0, 16, 9, '#4fe0d040'));
ART.water_mid = spr(16, 16, c => c.rect(0, 0, 16, 16, '#1a50a02a'));
ART.water_deep = spr(16, 16, c => c.rect(0, 0, 16, 16, '#123a8850'));

// --- Bordi del terreno ---

function fringe(side, variant, base, shade, light, rim) {
  return spr(16, 16, c => {
    for (let t = 0; t < 16; t++) {
      // Profondità irregolare, ma uguale agli estremi perché i pezzi si uniscano.
      const end = t === 0 || t === 15;
      const depth = end ? 2 : 2 + Math.floor(hash(t >> (variant ? 0 : 1), variant, 101) * 3.2);
      const set = (d, col) => {
        const pos = { n: [t, d], s: [t, 15 - d], w: [d, t], e: [15 - d, t] }[side];
        c.p(pos[0], pos[1], col);
      };
      for (let d = 0; d < depth; d++) set(d, hash(t, d, 103 + variant) > 0.8 ? light : base);
      set(depth - 1, shade);
      if (rim) set(depth, rim);
    }
  });
}
function corner(which, base, shade, rim) {
  return spr(16, 16, c => {
    const flipX = which.includes('e'), flipY = which.includes('s');
    const put = (x, y, col) => c.p(flipX ? 15 - x : x, flipY ? 15 - y : y, col);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      const d = x + y;
      if (d < 3) put(x, y, base);
      else if (d === 3) put(x, y, shade);
      else if (d === 4 && rim) put(x, y, rim);
    }
  });
}
function edgeSet(prefix, base, shade, light, rim) {
  for (const side of ['n', 's', 'e', 'w']) {
    ART[`${prefix}_${side}`] = fringe(side, 0, base, shade, light, rim);
    ART[`${prefix}_${side}2`] = fringe(side, 1, base, shade, light, rim);
  }
  for (const k of ['nw', 'ne', 'sw', 'se']) ART[`${prefix}_${k}`] = corner(k, base, shade, rim);
}
edgeSet('edge_grass', '#6fb24a', '#5c9f44', '#8ec85a', '#20103828');
edgeSet('edge_sand', '#ecd49c', '#dcbf84', '#f6e6b8', '#20103820');

// --- Scrittura delle immagini ---------------------------------------------------------------

const objects = readJson('data/art/objects.json');
Object.assign(objects.objects, ART);
writeFileSync(new URL('data/art/objects.json', root),
  `{"objects":{\n${Object.entries(objects.objects).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n')}\n}}\n`);

// --- Tile nuovi: varianti di alberi, erba e sabbia che bloccano, rete vista di lato -----------

const tilesJson = readJson('data/art/tiles.json');
const T = tilesJson.tiles;
const recolor = (img, map) => ({ ...img, pal: { ...img.pal, ...map } });
if (!T.tree_green) {
  const base = T.tree.img;
  T.tree_green = { solid: true, img: recolor(base, { c: '#8fbb68', d: '#6c9f58', e: '#b0d07c', g: '#4a8450', i: '#34664a', h: '#2c2e38', n: '#6c8a50' }) };
  T.tree_deep = { solid: true, img: recolor(base, { c: '#5f9f6c', d: '#46845a', e: '#84bf7e', g: '#2f6c52', i: '#215040', h: '#1e2c30', n: '#567a46' }) };
  T.grass_solid = { solid: true, img: T.grass.img };
  T.sand_solid = { solid: true, img: T.sand.img };
  T.net_side = {
    solid: true,
    img: {
      w: 16, h: 16,
      pal: { ...T.court.img.pal, d: '#f4f2ea', e: '#c8cabe', f: '#2e6a48' },
      px: T.court.img.px.map((row, y) => [...row].map((ch, x) => {
        if (x === 7) return 'd';
        if (x === 8 || x === 9) return y % 3 === 0 ? 'e' : (x === 8 ? 'f' : 'd');
        return ch;
      }).join('')),
    },
  };
}
writeFileSync(new URL('data/art/tiles.json', root),
  `{"tiles":{\n${Object.entries(T).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n')}\n}}\n`);

// --- Composizione sulla mappa ---------------------------------------------------------------

const town = readJson('data/maps/town.json');
const rows = town.rows.map(r => [...r]);
const legend = town.legend;
const size = name => ART[name] || objects.objects[name];

Object.assign(legend, { S: 'grass_solid', Y: 'sand_solid', n: 'net_side', T: 'tree_green', U: 'tree_deep' });

// Gli alberi singoli diventano alberi alti: la casella resta bloccata dal tronco.
for (const [x, y] of [[14, 4], [15, 5], [30, 4], [31, 5], [13, 14], [33, 13], [34, 14], [14, 22], [18, 23], [35, 16]]) {
  if (rows[y][x] === '#') rows[y][x] = '.';
}
// Bordo del bosco variato.
rows.forEach((r, y) => r.forEach((ch, x) => {
  if (ch !== '#') return;
  const v = hash(x, y, 201);
  if (v < 0.4) r[x] = 'T';
  else if (v < 0.72) r[x] = 'U';
}));

const tileName = (x, y) => legend[rows[y]?.[x]] ?? null;
const isGrass = (x, y) => ['grass', 'grass_alt'].includes(tileName(x, y));
const decor = [];
const solidCells = new Set();

function put(img, x, y, opts = {}) {
  const { w, h } = size(img);
  const { layer, solid, ax = 'c', ay = 'b', dx = 0, dy = 0, sortY } = opts;
  const baseX = Math.floor((16 - w) / 2);
  const d = { x, y, img };
  if (layer && layer !== 'ground') d.layer = layer;
  if (solid) { d.solid = true; solidCells.add(`${x},${y}`); }
  const ox = (ax === 'l' ? -baseX : ax === 'r' ? 16 - w - baseX : 0) + dx;
  const oy = (ay === 't' ? h - 16 : 0) + dy;
  if (ox) d.dx = ox;
  if (oy) d.dy = oy;
  if (sortY !== undefined) d.sortY = sortY;
  decor.push(d);
}
const tall = (img, x, y, shadow, dy = 2) => {
  put(shadow, x, y, { dy });
  put(img, x, y, { layer: 'sprite', solid: true });
};

// Macchie di prato, solo dove è tutto erba.
const lawnSpots = [
  ['lawn_dark', 14, 7], ['lawn_light', 32, 7], ['lawn_dark', 15, 14], ['lawn_light', 13, 11], ['lawn_dark', 32, 15],
  ['lawn_light', 33, 11], ['lawn_dark', 16, 23], ['lawn_light', 20, 23], ['lawn_dark', 44, 18 - 1], ['lawn_light', 5, 18 - 1],
  ['lawn_dark', 30, 3], ['lawn_light', 16, 3], ['lawn_dark', 41, 9 - 1], ['lawn_light', 6, 9 - 1], ['lawn_dark', 34, 20], ['lawn_light', 8, 20],
];
for (const [img, x, y] of lawnSpots) {
  const { w, h } = size(img);
  const x0 = Math.floor((x * 16 + 8 - w / 2) / 16), x1 = Math.floor((x * 16 + 8 + w / 2 - 1) / 16);
  const y0 = Math.floor((y * 16 + 16 - h) / 16);
  let free = true;
  for (let cy = y0; cy <= y; cy++) for (let cx = x0; cx <= x1; cx++) if (!isGrass(cx, cy)) free = false;
  if (free) put(img, x, y);
}

// Sentieri battuti nell'erba.
for (let x = 26; x <= 36; x++) if (isGrass(x, 20) && hash(x, 20, 3) > 0.15) put('worn', x, 20, { dy: Math.floor(hash(x, 1) * 5) - 2 });
for (let x = 32; x <= 36; x++) if (isGrass(x, 26)) put('worn', x, 26, { dy: -2 });
for (let y = 10; y <= 13; y++) if (isGrass(12, y)) put('worn', 12, y, { dx: Math.floor(hash(y, 7) * 5) - 2 });

// Ombra del bosco sul bordo.
for (let x = 2; x <= 45; x++) if (!['grass_solid', 'roof', 'roof_l', 'roof_r'].includes(tileName(x, 2))) put('shade_top', x, 2, { ay: 't' });
for (let y = 2; y <= 26; y++) {
  put('shade_e', 2, y, { ax: 'l' });
  put('shade_w', 45, y, { ax: 'r' });
}

// Case: colmo, usura, tinta del tetto, base del muro, ombre.
const buildings = [
  { x: 4, y: 3, w: 8, tint: 'cool', box: 'r', climb: ['bougainvillea', 11, 'r'] },        // biblioteca
  { x: 35, y: 3, w: 8, tint: 'warm', box: 'p', climb: ['ivy', 35, 'l'] },                  // laboratorio
  { x: 3, y: 11, w: 8, tint: 'warm', box: 'p', climb: ['ivy', 10, 'r'] },                  // atelier
  { x: 37, y: 11, w: 8, tint: 'dark', box: 'r', climb: null },                             // sala giochi
  { x: 4, y: 21, w: 7, tint: null, box: 'r', climb: ['bougainvillea', 4, 'l'] },           // casa
  { x: 27, y: 21, w: 8, tint: 'dark', box: 'p', climb: ['bougainvillea', 34, 'r'] },       // taverna
];
for (const b of buildings) {
  for (let cx = b.x; cx < b.x + b.w; cx++) {
    if (b.tint) {
      put(`tint_${b.tint}`, cx, b.y);
      put(`tint_${b.tint}`, cx, b.y + 1);
      put(`tint_eave_${b.tint}`, cx, b.y + 2, { ay: 't' });
    }
    put('roof_ridge', cx, b.y, { ay: 't' });
    if (hash(cx, b.y, 301) > 0.55) put('roof_wear', cx, b.y + (hash(cx, 2, 303) > 0.5 ? 1 : 0), { ay: 't', dy: Math.floor(hash(cx, 3) * 6) });
    put('wall_base', cx, b.y + 4);
    put('shade_s', cx, b.y + 5, { ay: 't' });
  }
  for (let r = 1; r <= 4; r++) put('shade_e', b.x + b.w, b.y + r, { ax: 'l' });
  put(`flower_box_${b.box}`, b.x + 1, b.y + 3, { dy: -1 });
  put(`flower_box_${b.box}`, b.x + b.w - 2, b.y + 3, { dy: -1 });
  if (b.climb) put(b.climb[0], b.climb[1], b.y + 4, { ax: b.climb[2] });
}
put('chimney', 9, 3, { layer: 'sprite' });
put('chimney', 37, 3, { layer: 'sprite' });
put('chimney', 5, 11, { layer: 'sprite' });
put('antenna', 42, 11, { layer: 'sprite' });
put('chimney', 6, 21, { layer: 'sprite' });
put('chimney', 33, 21, { layer: 'sprite' });
put('poster', 39, 15, { dy: -2 });

// Nuraghe: copre il blocco di pietra, che ora sotto è solo erba invalicabile.
put('nuraghe_big', 23, 6, { layer: 'sprite', sortY: 5.9 });
put('shade_s', 19, 6 + 1, { ay: 't', dy: -2 });
for (let x = 20; x <= 26; x++) if (x !== 23 && x !== 24) put('shadow_small', x, 6, { dy: 5 });
put('bush', 19, 6, { layer: 'sprite', solid: true });
put('bush_oleander', 27, 6, { layer: 'sprite', solid: true });
put('prickly', 19, 5, { layer: 'sprite', solid: true });
put('prickly', 27, 3, { layer: 'sprite', solid: true });

// Alberi alti: uliveto a ovest, pini a nord, cipressi lungo il corso.
tall('tree_olive', 14, 4, 'shadow_big');
tall('tree_pine', 16, 7, 'shadow_big');
tall('tree_olive', 31, 5, 'shadow_big');
tall('tree_pine', 33, 3, 'shadow_big');
tall('tree_olive', 13, 14, 'shadow_big');
tall('tree_olive', 16, 13, 'shadow_big');
tall('tree_olive', 34, 14, 'shadow_big');
tall('tree_cypress', 35, 16, 'shadow_small');
tall('tree_olive', 14, 22, 'shadow_big');
tall('tree_pine', 18, 23, 'shadow_big');
tall('tree_cypress', 20, 22, 'shadow_small');
tall('tree_cypress', 20, 25, 'shadow_small');
tall('tree_cypress', 26, 20 - 2, 'shadow_small');
tall('tree_cypress', 21, 8 + 2 - 2, 'shadow_small');
tall('prickly', 34, 8, 'shadow_mid');
tall('prickly', 12, 8, 'shadow_mid');

// Cespugli che smussano gli angoli della piazza e il bordo.
for (const [x, y, img] of [[18, 11, 'bush'], [29, 11, 'bush_oleander'], [18, 16, 'bush_oleander'], [29, 16, 'bush']]) {
  put('shadow_small', x, y, { dy: 3 });
  put(img, x, y, { layer: 'sprite', solid: true });
}
for (const [x, y] of [[14, 2], [16, 2], [29, 2], [32, 2], [2, 9 - 1], [2, 10], [2, 17], [45, 8], [45, 10], [45, 17], [2, 20], [2, 23]]) {
  put(hash(x, y, 7) > 0.5 ? 'bush' : 'bush_oleander', x, y, { layer: 'sprite', solid: true });
}

// Muretti a secco: chiudono uliveto e pascolo senza tagliare nessuna strada.
for (let x = 11; x <= 17; x++) put(x % 2 ? 'muretto_a' : 'muretto_b', x, 17, { layer: 'sprite', solid: true });
for (let x = 30; x <= 35; x++) put(x % 2 ? 'muretto_a' : 'muretto_b', x, 12, { layer: 'sprite', solid: true });
for (let x = 13; x <= 15; x++) put(x % 2 ? 'muretto_a' : 'muretto_b', x, 25, { layer: 'sprite', solid: true });

// Pecore, pozzo, gatto, panni stesi.
put('shadow_small', 31, 10, { dy: 3 });
put('sheep', 31, 10, { layer: 'sprite', solid: true });
put('shadow_small', 34, 11, { dy: 3 });
put('sheep_r', 34, 11, { layer: 'sprite', solid: true });
put('shadow_small', 36, 9 + 1, { dy: 3 });
put('sheep', 36, 10, { layer: 'sprite', solid: true });
put('shadow_mid', 16, 11, { dy: 3 });
put('well', 16, 11, { layer: 'sprite', solid: true });
put('cat', 13, 24);
put('clothes_pole', 9, 16, { layer: 'sprite', solid: true });
put('clothes_pole', 13, 16, { layer: 'sprite', solid: true, dx: -2 });
put('laundry', 11, 16, { layer: 'over', dx: 0, dy: -8 });

// Aiuole e orti.
for (const [x, y] of [[5, 8], [6, 8], [10, 8], [11, 8], [36, 8], [37, 8], [41, 8], [42, 8], [4, 16], [10, 16 - 0], [38, 16], [44, 16], [2, 24], [3, 24], [11, 24], [12, 24]]) {
  put('flowerbed', x, y);
}
for (const y of [4, 5, 6]) for (const x of [44, 45]) put('artichoke_plant', x, y, { layer: 'sprite', solid: true });
put('mailbox', 5, 26, { layer: 'sprite', solid: true });

// Taverna: tavolini all'aperto e botti.
put('shadow_big', 33, 26, { dy: 2 });
put('tavern_table', 33, 26, { layer: 'sprite', solid: true });
put('shadow_big', 36, 26, { dy: 2 });
put('tavern_table', 36, 26, { layer: 'sprite', solid: true });
put('barrel_out', 26, 24, { layer: 'sprite', solid: true });
put('barrel_out', 26, 25, { layer: 'sprite', solid: true });

// Piazza: selciato a cerchi attorno alla fontana, bandierine da festa, lampioni.
put('plaza_ring', 23, 15, { dx: 8, dy: -4 });
put('bunting_wide', 23, 11, { layer: 'over', dx: 8, dy: -10 });
for (const [x, y] of [[21, 17], [26, 17], [10, 10], [37, 10], [9, 20], [33, 20], [18, 8], [29, 8]]) {
  if (!solidCells.has(`${x},${y}`)) {
    put('shadow_small', x, y, { dy: 3 });
    put('lamp_post', x, y, { layer: 'sprite', solid: true });
  }
}

// Campo: linee, pali della rete, palla.
put('court_lines', 41, 25);
put('net_post', 41, 21, { layer: 'sprite' });
put('net_post', 41, 24, { layer: 'sprite', dy: 4 });
put('tennis_ball', 43, 22);
put('tennis_ball', 38, 24);

// Spiaggia.
for (const [x, y] of [[4, 27], [12, 27], [27, 27], [40, 27], [46, 27]]) {
  put('shadow_big', x, y, { dy: 3 });
  put('palm_big', x, y, { layer: 'sprite' });
}
put('palm_big', 42, 28, { layer: 'sprite', solid: true });
put('palm_big', 6, 28, { layer: 'sprite', solid: true });
for (let x = 0; x < 48; x++) if (tileName(x, 30) === 'sand') put('wet_sand', x, 30);
for (const [img, x, y] of [
  ['towel_a', 16, 29], ['towel_b', 20, 29], ['towel_b', 31, 29], ['towel_a', 35, 29],
  ['starfish', 22, 30], ['starfish', 38, 28], ['shell', 13, 30], ['shell', 26, 30], ['shell', 44, 29], ['shell', 3, 29],
  ['driftwood', 43, 30], ['footprints', 11, 29], ['footprints', 12, 28], ['footprints', 13, 29], ['footprints', 14, 30],
]) put(img, x, y);
put('sandcastle', 25, 29, { layer: 'sprite', solid: true });
put('beach_ball', 28, 29, { layer: 'sprite', solid: true });
put('fish_basket', 8, 30, { layer: 'sprite', solid: true });
put('fish_basket', 10, 30, { layer: 'sprite', solid: true });

// Mare: acqua turchese a riva, sempre più scura al largo, scogli e boe.
for (let x = 0; x < 48; x++) {
  put('water_shallow_foam', x, 31);
  put('water_shallow', x, 32);
  put('water_mid', x, 34);
  put('water_deep', x, 35);
}
put('shade_e', 10, 32, { ax: 'l' });
put('sea_rock', 38, 33, { layer: 'sprite' });
put('sea_rock', 44, 34, { layer: 'sprite' });
put('sea_rock', 2, 34, { layer: 'sprite' });
put('buoy', 16, 33);
put('buoy', 30, 34);

// Ciuffi e fiori sparsi per ultimi, solo sull'erba libera.
const taken = new Set(decor.filter(d => d.layer).map(d => `${d.x},${d.y}`));
for (let y = 2; y <= 26; y++) for (let x = 2; x <= 45; x++) {
  if (!isGrass(x, y) || taken.has(`${x},${y}`)) continue;
  const v = hash(x, y, 401);
  const img = v < 0.1 ? 'tuft' : v < 0.15 ? 'clover' : v < 0.19 ? 'daisies' : v < 0.22 ? 'poppies' : v < 0.245 ? 'lavender' : v < 0.265 ? 'pebbles' : null;
  if (img) put(img, x, y, { dx: Math.floor(hash(x, y, 403) * 7) - 3, dy: -Math.floor(hash(x, y, 405) * 6) });
}

const grassy = ['grass', 'grass_alt', 'flowers', 'grass_solid', 'tree', 'tree_green', 'tree_deep', 'rock', 'cactus'];
const edges = [
  { on: ['path'], from: grassy, prefix: 'edge_grass', variants: 2 },
  { on: ['sand'], from: grassy, prefix: 'edge_grass', variants: 2 },
  { on: ['path'], from: ['sand', 'sand_solid'], prefix: 'edge_sand', variants: 2 },
];

const ambient = [
  { type: 'fountain', x: 384, y: 218 },
  { type: 'smoke', x: 152, y: 42 },
  { type: 'smoke', x: 104, y: 346 },
  { type: 'smoke', x: 536, y: 346 },
  { type: 'butterfly', x: 232, y: 172, color: '#ffd24a' },
  { type: 'butterfly', x: 512, y: 280, color: '#fff4d4' },
  { type: 'butterfly', x: 264, y: 392, color: '#f49ad0' },
  { type: 'butterfly', x: 80, y: 148, color: '#9ad0ff' },
  { type: 'gull', y: 470, speed: 16, phase: 0 },
  { type: 'gull', y: 495, speed: 12, phase: 400 },
  { type: 'gull', y: 440, speed: 20, phase: 700 },
  { type: 'sparkle', x: 0, y: 510, w: 768, h: 66, n: 70 },
  { type: 'sail', img: 'sailboat', y: 530, speed: 3, phase: 160, span: 880 },
];

// Le decorazioni vanno una per riga: il file resta leggibile e confrontabile.
town.rows = rows.map(r => r.join(''));
delete town.decor;
delete town.edges;
delete town.ambient;
const list = items => `[\n${items.map(i => `  ${JSON.stringify(i)}`).join(',\n')}\n ]`;
const base = JSON.stringify(town, null, 1).replace(/\n}\s*$/, '');
writeFileSync(new URL('data/maps/town.json', root),
  `${base},\n "edges": ${list(edges)},\n "ambient": ${list(ambient)},\n "decor": ${list(decor)}\n}\n`);

console.log(`${Object.keys(ART).length} immagini, ${decor.length} decorazioni`);
