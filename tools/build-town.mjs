// Genera data/maps/town.json (layout di Santu Brugaru). Uso: node build-town.mjs <project-root>
import { writeFileSync } from 'node:fs';
const root = process.argv[2];
const Wd = 48, Hd = 36;
const g = Array.from({ length: Hd }, () => Array(Wd).fill('.'));
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < Wd && y < Hd) g[y][x] = c; };
const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };

// erba variata
for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) if ((x * 7 + y * 13) % 11 === 0) g[y][x] = ',';
// prati fioriti
[[14, 11], [31, 17], [16, 24], [42, 9], [3, 18]].forEach(([x, y]) => { set(x, y, '*'); set(x + 1, y, '*'); set(x, y + 1, '*'); });

// bordi alberati
rect(0, 0, Wd - 1, 1, '#');
rect(0, 0, 1, 26, '#');
rect(Wd - 2, 0, Wd - 1, 26, '#');
// spiaggia e mare
rect(0, 27, Wd - 1, 30, ':');
rect(0, 31, Wd - 1, 31, '-');
rect(0, 32, Wd - 1, 35, '~');

// strade
rect(23, 7, 24, 27, '=');           // via principale nord-sud
rect(2, 18, 45, 19, '=');           // corso est-ovest
rect(4, 9, 43, 9, '=');             // via nord
rect(19, 11, 28, 16, '=');          // piazza
rect(7, 26, 31, 26, '=');           // via sud

// edificio: tetto 2 righe, gronda, 2 righe di muro (insegna sopra la porta)
function building(x, y, w, wall, win, sign, doorOff) {
  for (let r = 0; r < 2; r++) { set(x, y + r, '('); rect(x + 1, y + r, x + w - 2, y + r, '^'); set(x + w - 1, y + r, ')'); }
  set(x, y + 2, '['); rect(x + 1, y + 2, x + w - 2, y + 2, 'v'); set(x + w - 1, y + 2, ']');
  rect(x, y + 3, x + w - 1, y + 4, wall);
  set(x + 1, y + 3, win); set(x + w - 2, y + 3, win);
  set(x + 1, y + 4, win); set(x + w - 2, y + 4, win);
  if (sign) set(x + doorOff, y + 3, sign);
  set(x + doorOff, y + 4, 'D');
  return [x + doorOff, y + 4];
}
const doors = {
  library: building(4, 3, 8, 'W', 'w', 'L', 4),
  lab: building(35, 3, 8, 'O', 'q', 'A', 4),
  atelier: building(3, 11, 8, 'R', 'r', 'N', 4),
  arcade: building(37, 11, 8, 'W', 'w', 'J', 4),
  house: building(4, 21, 7, 'R', 'r', null, 3),
  tavern: building(27, 21, 8, 'O', 'q', 'M', 4),
};
// sentieri dalle porte alla strada
rect(8, 8, 8, 8, '='); rect(39, 8, 39, 8, '=');
rect(7, 16, 7, 17, '='); rect(41, 16, 41, 17, '=');
set(7, 26, '='); set(31, 26, '=');
// la casa ha la porta in basso (7,25) → via sud
// Su Nuraghe: blocco di pietra
rect(21, 2, 25, 2, 'S');
rect(20, 3, 26, 6, 'S');
set(23, 6, 'G');
set(21, 7, 'l'); set(26, 7, 'l');
// piazza: fontana, panchine, lampioni, vasi
set(23, 13, '1'); set(24, 13, '2'); set(23, 14, '3'); set(24, 14, '4');
set(20, 12, 'b'); set(27, 12, 'b');
set(19, 11, 'l'); set(28, 11, 'l'); set(19, 16, 'p'); set(28, 16, 'p');
set(21, 20, 's');                    // cartello turistico
// campetto di Masia
rect(37, 21, 45, 25, '_');
rect(37, 21, 45, 21, '|'); rect(37, 25, 45, 25, '|');
rect(41, 22, 41, 24, 'n');
// alberi, cactus, palme
[[14, 4], [15, 5], [30, 4], [31, 5], [13, 14], [33, 13], [34, 14], [14, 22], [18, 23], [35, 18 - 2], [44, 7], [2, 7]].forEach(([x, y]) => set(x, y, '#'));
rect(12, 20, 17, 20, 'c');
[[4, 27], [12, 27], [27, 27], [40, 27], [46, 27]].forEach(([x, y]) => set(x, y, 'Y'));
set(29, 7, 'o'); set(17, 8, 'o');
// recinzione del giardino di casa
rect(2, 25, 3, 25, 'f'); rect(11, 25, 12, 25, 'f');
// ombrelloni e molo
[[15, 28], [19, 28], [30, 28], [34, 28]].forEach(([x, y]) => set(x, y, 'u'));
rect(9, 30, 9, 33, 'k');
set(10, 33, 'B');

const legend = {
  '.': 'grass', ',': 'grass_alt', '*': 'flowers', '=': 'path', ':': 'sand', '~': 'water', '-': 'foam', k: 'pier',
  '#': 'tree', Y: 'palm', c: 'cactus', o: 'rock', f: 'fence', b: 'bench', l: 'lamp', s: 'sign', p: 'flowerpot',
  u: 'umbrella', B: 'boat', _: 'court', '|': 'court_line', n: 'net',
  1: 'fountain_tl', 2: 'fountain_tr', 3: 'fountain_bl', 4: 'fountain_br',
  '(': 'roof_l', '^': 'roof', ')': 'roof_r', '[': 'roof_eave_l', v: 'roof_eave', ']': 'roof_eave_r',
  W: 'wall_white', O: 'wall_ochre', R: 'wall_pink', w: 'window_white', q: 'window_ochre', r: 'window_pink',
  D: 'door', L: 'sign_book', J: 'sign_joystick', A: 'sign_artichoke', N: 'sign_needle', M: 'sign_mug',
  S: 'stone', G: 'stone_door',
};

const warps = [
  { x: doors.library[0], y: doors.library[1], to: 'library', tx: 5, ty: 8, dir: 'up' },
  { x: doors.lab[0], y: doors.lab[1], to: 'lab', tx: 5, ty: 9, dir: 'up' },
  { x: doors.atelier[0], y: doors.atelier[1], to: 'atelier', tx: 5, ty: 8, dir: 'up' },
  { x: doors.arcade[0], y: doors.arcade[1], to: 'arcade', tx: 5, ty: 8, dir: 'up' },
  { x: doors.house[0], y: doors.house[1], to: 'house', tx: 4, ty: 8, dir: 'up' },
  { x: doors.tavern[0], y: doors.tavern[1], to: 'tavern', tx: 5, ty: 8, dir: 'up' },
  { x: 23, y: 6, to: 'nuraghe', tx: 7, ty: 10, dir: 'up', if: 'got_risata & got_broncio & got_coraggio', locked: 'objects:nuraghe_locked' },
];

const json = {
  id: 'town', name: 'Santu Brugaru', music: 'town',
  spawn: { x: 7, y: 26, dir: 'down' },
  rows: g.map(r => r.join('')),
  legend,
  npcs: [], objects: [], warps, triggers: [],
};
writeFileSync(`${root}/data/maps/town.json`, JSON.stringify(json, null, 1).replace(/\n {2,}/g, ' ').replace(/\[\n /g, '[ '));
console.log(g.map(r => r.join('')).join('\n'));
console.log(JSON.stringify(doors));
