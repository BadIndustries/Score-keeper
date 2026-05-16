export function makeActiveGame(gameId, groupId, players, limit) {
  return {
    groupId,
    players: [...players],
    limit,
    tour: 1,
    manche: 1,
    totals: players.map(() => 0),
    current: players.map(() => 0),
    ...(gameId === 'flip7' ? { flip7: players.map(() => false) } : {}),
    ...(gameId === 'skyjo' ? { doubled: players.map(() => false) } : {}),
    history: [],
    startedAt: new Date().toISOString(),
  };
}
