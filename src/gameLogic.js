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
    return current.map((pts, i) => doubled[i] && pts !== 0 ? pts * 2 : pts);
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

export function recordPastGame(grp, gameId, ag, winMode) {
  if (!grp.pastGames) grp.pastGames = [];
  const winnerIdx = getWinnerIndex(ag.totals, winMode);
  const bestScore = winMode === 'lowest' ? Math.min(...ag.totals) : Math.max(...ag.totals);
  const winners = ag.players.filter((_, i) => ag.totals[i] === bestScore);
  grp.pastGames.unshift({
    gameId,
    date: ag.startedAt,
    rounds: ag.tour || ag.manche,
    winner: winners.length > 1 ? winners.join(', ') : ag.players[winnerIdx],
    winners,
    scores: ag.players.map((name, i) => ({ name, score: ag.totals[i] })),
  });
  if (grp.pastGames.length > 20) grp.pastGames = grp.pastGames.slice(0, 20);
  return grp;
}

export function tmGetAllFields(G, exts = {}) {
  return [
    ...(G.scoreFields || []),
    ...(G.extensions || []).filter(e => e.scoreField && exts[e.key]).map(e => e.scoreField),
  ];
}

// Avec fields : ne somme que les champs actifs (évite les scores fantômes d'extensions désactivées).
// Sans fields : somme toutes les clés (rétrocompatibilité).
export function computeTMTotal(scores, fields) {
  if (fields) return fields.reduce((s, f) => s + ((scores?.[f.key]) || 0), 0);
  return Object.values(scores || {}).reduce((s, v) => s + (v || 0), 0);
}
