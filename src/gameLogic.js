const FLIP7_BONUS = 15;

export function makeActiveGame(gameId, groupId, players, limit) {
  return {
    groupId,
    players: [...players],
    limit,
    tour: 1,
    manche: 1,
    totals: players.map(() => 0),
    current: players.map(() => 0),
    ...(gameId === 'flip7' ? { flip7: players.map(() => false), flip7dbl: players.map(() => false) } : {}),
    ...(gameId === 'skyjo' ? { doubled: players.map(() => false) } : {}),
    history: [],
    startedAt: new Date().toISOString(),
  };
}

export function computeTourScores(gameId, current, flip7 = [], doubled = [], flip7dbl = []) {
  if (gameId === 'flip7') {
    return current.map((pts, i) => {
      const base = pts + (flip7[i] ? FLIP7_BONUS : 0);
      return flip7dbl[i] ? base * 2 : base;
    });
  }
  if (gameId === 'skyjo') {
    return current.map((pts, i) => doubled[i] && pts > 0 ? pts * 2 : pts);
  }
  return [...current];
}

export function isGameOver(totals, limit) {
  if (!totals || totals.length === 0) return false;
  return Math.max(...totals) >= limit;
}

export function getWinnerIndex(totals, winMode) {
  if (!totals || totals.length === 0) return -1;
  return winMode === 'lowest'
    ? totals.indexOf(Math.min(...totals))
    : totals.indexOf(Math.max(...totals));
}
