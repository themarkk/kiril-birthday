// Morra cinese "truccata" di Masia: gioca sempre ciò che batte la TUA mossa precedente.

export const MOVES = ['sasso', 'carta', 'forbice'];
const BEATS = { sasso: 'carta', carta: 'forbice', forbice: 'sasso' }; // chiave battuta dal valore

export function masiaMove(prevPlayer) {
  return prevPlayer ? BEATS[prevPlayer] : 'sasso';
}

export function outcome(player, masia) {
  if (player === masia) return 0;
  return BEATS[masia] === player ? 1 : -1;
}

export function createRps(target = 3) {
  let prev = null;
  const score = { p: 0, m: 0 };
  const history = [];
  return {
    history,
    play(move) {
      const masia = masiaMove(prev);
      const result = outcome(move, masia);
      if (result === 1) score.p++;
      if (result === -1) score.m++;
      prev = move;
      history.push({ move, masia, result });
      const over = score.p >= target || score.m >= target;
      return { masia, result, score: { ...score }, over, won: score.p >= target };
    },
  };
}
