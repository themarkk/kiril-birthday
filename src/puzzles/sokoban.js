// Carciofi giganti da spingere sulle piastre (laboratorio di Elisa).

const V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// Il giocatore in `player` cammina verso `dir`; se davanti c'è un carciofo prova a spingerlo.
export function tryPush(grid, boxes, player, dir) {
  const [dx, dy] = V[dir];
  const fx = player.x + dx, fy = player.y + dy;
  const i = boxes.findIndex(b => b.x === fx && b.y === fy);
  if (i === -1) return { boxes, moved: false };
  const nx = fx + dx, ny = fy + dy;
  if (grid.isSolid(nx, ny) || boxes.some(b => b.x === nx && b.y === ny)) return { boxes, moved: false };
  const next = boxes.map((b, j) => (j === i ? { ...b, x: nx, y: ny } : b));
  return { boxes: next, moved: true, index: i };
}

export function allOnPlates(boxes, plates) {
  return plates.every(p => boxes.some(b => b.x === p.x && b.y === p.y));
}
