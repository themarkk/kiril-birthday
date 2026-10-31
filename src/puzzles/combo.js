// Picchiaduro di Leryn: memorizza la combo, rifalla. Al meglio dei tre round.

export function judgeCombo(expected, given) {
  for (let i = 0; i < given.length; i++) if (given[i] !== expected[i]) return 'wrong';
  return given.length === expected.length ? 'ok' : 'partial';
}

export function createComboMatch(rounds) {
  const need = Math.floor(rounds.length / 2) + 1;
  const state = { round: 0, given: [], wins: 0, losses: 0, over: false, won: false, last: null };
  const endRound = win => {
    if (win) state.wins++;
    else state.losses++;
    state.last = win ? 'ok' : 'wrong';
    state.round++;
    state.given = [];
    if (state.wins >= need || state.losses >= need || state.round >= rounds.length) {
      state.over = true;
      state.won = state.wins >= need;
    }
  };
  return {
    state,
    rounds,
    current: () => rounds[state.round],
    input(key) {
      if (state.over) return state;
      state.given.push(key);
      const verdict = judgeCombo(rounds[state.round], state.given);
      if (verdict !== 'partial') endRound(verdict === 'ok');
      else state.last = 'partial';
      return state;
    },
    timeout() {
      if (!state.over) endRound(false);
      return state;
    },
  };
}
