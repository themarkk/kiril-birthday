// Bordi morbidi fra terreni: l'erba che sfrangia sulla strada, la sabbia che invade i ciottoli.
// Regola nel JSON della mappa: { "on": [tile], "from": [tile], "prefix": "edge_grass", "variants": 2 }
// → immagini <prefix>_n/_s/_e/_w (con variante _n2...) e angoli <prefix>_nw/_ne/_sw/_se.

const SIDES = [['n', 0, -1], ['s', 0, 1], ['w', -1, 0], ['e', 1, 0]];
const CORNERS = [['nw', -1, -1, 'n', 'w'], ['ne', 1, -1, 'n', 'e'], ['sw', -1, 1, 's', 'w'], ['se', 1, 1, 's', 'e']];

export function computeEdges(rules, tileAt, w, h) {
  const out = [];
  for (const rule of rules || []) {
    const on = new Set(rule.on), from = new Set(rule.from);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!on.has(tileAt(x, y))) continue;
        const near = {};
        for (const [side, dx, dy] of SIDES) {
          near[side] = from.has(tileAt(x + dx, y + dy));
          if (!near[side]) continue;
          const variant = rule.variants > 1 ? (x * 3 + y * 5) % rule.variants : 0;
          out.push({ x, y, img: `${rule.prefix}_${side}${variant ? variant + 1 : ''}` });
        }
        for (const [corner, dx, dy, a, b] of CORNERS) {
          if (!near[a] && !near[b] && from.has(tileAt(x + dx, y + dy))) out.push({ x, y, img: `${rule.prefix}_${corner}` });
        }
      }
    }
  }
  return out;
}
