// Mappe in JSON: righe di caratteri + legenda → griglia di nomi di tile.

import { computeEdges } from './terrain.js';

export function parseMap(json, tilesJson) {
  const id = json.id;
  const rows = json.rows || [];
  const h = rows.length;
  const w = h ? [...rows[0]].length : 0;
  const tiles = tilesJson.tiles;
  const grid = [];

  for (const [ch, name] of Object.entries(json.legend || {})) {
    if (!tiles[name]) throw new Error(`mappa ${id}: la legenda "${ch}" punta al tile "${name}" che non esiste`);
  }

  rows.forEach((row, r) => {
    const chars = [...row];
    if (chars.length !== w) throw new Error(`mappa ${id}: riga ${r} lunga ${chars.length}, attese ${w}`);
    chars.forEach((ch, c) => {
      const name = json.legend?.[ch];
      if (!name) throw new Error(`mappa ${id}: carattere "${ch}" alla riga ${r} colonna ${c} non è nella legenda`);
      grid.push(name);
    });
  });

  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const warps = json.warps || [];
  const triggers = json.triggers || [];
  const tileAt = (x, y) => (inside(x, y) ? grid[y * w + x] : null);
  // Decorazioni: { x, y, img, layer: 'ground' | 'sprite' | 'over', solid, dx, dy }
  const decor = json.decor || [];
  const solidDecor = new Set(decor.filter(d => d.solid).map(d => d.y * w + d.x));

  return {
    id,
    json,
    w,
    h,
    tileAt,
    decor: {
      ground: decor.filter(d => !d.layer || d.layer === 'ground'),
      sprite: decor.filter(d => d.layer === 'sprite'),
      over: decor.filter(d => d.layer === 'over'),
    },
    edges: computeEdges(json.edges, tileAt, w, h),
    isSolid: (x, y) => !inside(x, y) || Boolean(tiles[grid[y * w + x]].solid) || solidDecor.has(y * w + x),
    warpAt: (x, y) => warps.find(o => o.x === x && o.y === y),
    triggerAt: (x, y) => triggers.find(o => o.x === x && o.y === y),
  };
}
