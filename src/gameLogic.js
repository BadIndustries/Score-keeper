import { GAMES } from './games.config.js';

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
    ...(GAMES[gameId]?.scoreType === 'progress'
      ? { clocks: Array.from({ length: (GAMES[gameId].chapters || 10) * (GAMES[gameId].clocksPerChapter || 4) },
          () => ({ tries: 0, done: false })) }
      : {}),
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
  // Pas de plafond : tout l'historique est conservé (stats sur longue période).
  // Une partie ≈ 300 octets — le quota localStorage est surveillé par persist().
  return grp;
}

export function tmGetAllFields(G, exts = {}) {
  return [
    ...(G.scoreFields || []),
    ...(G.extensions || []).filter(e => e.scoreField && exts[e.key]).map(e => e.scoreField),
  ];
}

// Avec fields : ne somme que les champs actifs (évite les scores fantômes d'extensions désactivées).
// Un champ peut avoir `divideBy` : la valeur saisie est convertie en points
// par division entière (ex : gemmes de Mythologies, 3 gemmes = 1 faveur).
// Sans fields : somme toutes les clés (rétrocompatibilité).
export function computeTMTotal(scores, fields) {
  if (fields) return fields.reduce((s, f) => {
    const v = (scores?.[f.key]) || 0;
    return s + (f.divideBy ? Math.floor(v / f.divideBy) : v);
  }, 0);
  return Object.values(scores || {}).reduce((s, v) => s + (v || 0), 0);
}

// Le Barbu — calcule les points d'un contrat pour chaque joueur.
// counts : { [componentKey]: number[] } (un compteur par joueur).
// comp.per défini → points = compte × per (ex : −5 par pli).
// comp.per absent → le compte EST le nombre de points (ex : réussite, saisie libre).
export function computeContractScores(contract, counts, playerCount) {
  return Array.from({ length: playerCount }, (_, i) =>
    (contract?.components || []).reduce((sum, comp) => {
      const c = counts?.[comp.key]?.[i] || 0;
      return sum + (comp.per != null ? c * comp.per : c);
    }, 0)
  );
}

// Le Barbu — réussite : récompense par rang d'arrivée (+step par joueur battu).
// Index 0 = 1er (gagne le plus), dernier index = 0 point.
// Ex : reussiteRankRewards(4, 15) → [45, 30, 15, 0].
export function reussiteRankRewards(playerCount, step) {
  return Array.from({ length: playerCount }, (_, r) => (playerCount - 1 - r) * step);
}

// Rang « compétition » (1224) : les ex æquo partagent le même rang.
// Retourne l'index de médaille (0 = 1er) = nombre de joueurs strictement meilleurs.
export function medalRank(score, totals, winMode) {
  return (totals || []).filter(t => (winMode === 'lowest' ? t < score : t > score)).length;
}

// Take Time — état d'une campagne : horloges réussies, tentatives cumulées,
// index de l'horloge en cours (-1 si campagne terminée).
export function campaignStats(clocks) {
  const list = clocks || [];
  const done = list.filter(c => c?.done).length;
  const tries = list.reduce((s, c) => s + (c?.tries || 0), 0);
  const currentIndex = list.findIndex(c => !c?.done);
  return { done, total: list.length, tries, currentIndex };
}

// Archive une campagne coopérative terminée : victoire d'équipe (tous gagnants),
// rounds = total de tentatives (roundsLabel adapte l'affichage de l'historique).
export function recordCampaign(grp, gameId, ag) {
  if (!grp.pastGames) grp.pastGames = [];
  const { tries } = campaignStats(ag.clocks);
  grp.pastGames.unshift({
    gameId,
    coop: true,
    date: ag.startedAt,
    rounds: tries,
    roundsLabel: 'tentative',
    winner: ag.players.join(', '),
    winners: [...ag.players],
    scores: ag.players.map(name => ({ name, score: tries })),
  });
  return grp;
}

// Stats joueurs sur une liste de parties (déjà filtrée) : parties jouées,
// victoires, % — triées par victoires décroissantes.
export function computeHistoryStats(entries) {
  const players = {};
  (entries || []).forEach(pg => (pg.scores || []).forEach(s => {
    if (!players[s.name]) players[s.name] = { games: 0, wins: 0 };
    players[s.name].games++;
    if (pg.winners?.includes(s.name) || s.name === pg.winner) players[s.name].wins++;
  }));
  return Object.entries(players)
    .map(([name, st]) => ({ name, ...st, pct: Math.round(st.wins / st.games * 100) }))
    .sort((a, b) => b.wins - a.wins || b.pct - a.pct);
}

// Filtre des parties passées par période glissante.
// period : "all" | "today" | "7d" | "30d" — now injectable pour les tests.
export function filterByPeriod(pastGames, period, now = new Date()) {
  if (!period || period === 'all') return pastGames || [];
  const start = new Date(now);
  if (period === 'today') start.setHours(0, 0, 0, 0);
  else if (period === '7d') start.setDate(start.getDate() - 7);
  else if (period === '30d') start.setDate(start.getDate() - 30);
  else return pastGames || [];
  return (pastGames || []).filter(pg => {
    const d = new Date(pg.date);
    return !isNaN(d) && d >= start;
  });
}

// Tous les noms de joueurs connus : groupes actuels + parties passées.
// Dédoublonnés (insensible à la casse, la première graphie rencontrée gagne),
// triés alphabétiquement (fr).
export function collectKnownPlayers(groups) {
  const byKey = new Map();
  (groups || []).forEach(grp => {
    (grp.players || []).forEach(p => {
      const n = (p || '').trim();
      if (n && !byKey.has(n.toLowerCase())) byKey.set(n.toLowerCase(), n);
    });
    (grp.pastGames || []).forEach(pg => (pg.scores || []).forEach(s => {
      const n = (s.name || '').trim();
      if (n && !byKey.has(n.toLowerCase())) byKey.set(n.toLowerCase(), n);
    }));
  });
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'fr'));
}

// Normalise/migre un activeGame chargé du localStorage : garantit que tous les
// tableaux attendus par le schéma du jeu existent (parties legacy ou corrompues).
// Retourne null si l'objet est inexploitable (pas de joueurs).
export function normalizeActiveGame(gameId, ag) {
  if (!ag || typeof ag !== 'object') return null;
  const G = GAMES[gameId];
  if (!G) return null;
  const players = Array.isArray(ag.players) ? ag.players : [];
  const n = players.length;
  if (n === 0) return null;
  const fill = (arr, def) => {
    const a = Array.isArray(arr) ? arr.slice(0, n) : [];
    while (a.length < n) a.push(def);
    return a;
  };
  ag.players = players;
  ag.totals = fill(ag.totals, 0);
  ag.current = fill(ag.current, 0);
  ag.history = Array.isArray(ag.history) ? ag.history : [];
  ag.tour = Number.isFinite(ag.tour) ? ag.tour : 1;
  ag.manche = Number.isFinite(ag.manche) ? ag.manche : 1;
  if (gameId === 'flip7') { ag.flip7 = fill(ag.flip7, false); ag.flip7dbl = fill(ag.flip7dbl, false); }
  if (gameId === 'skyjo') { ag.doubled = fill(ag.doubled, false); }
  if (G.scoreType === 'progress') {
    const total = (G.chapters || 10) * (G.clocksPerChapter || 4);
    const list = Array.isArray(ag.clocks) ? ag.clocks.slice(0, total) : [];
    while (list.length < total) list.push({ tries: 0, done: false });
    ag.clocks = list.map(c => ({ tries: Number.isFinite(c?.tries) ? c.tries : 0, done: !!c?.done }));
  }
  if (G.scoreType === 'sheet') {
    ag.tmExtensions = (ag.tmExtensions && typeof ag.tmExtensions === 'object') ? ag.tmExtensions : {};
    const fields = tmGetAllFields(G, ag.tmExtensions);
    if (!Array.isArray(ag.tmScores) || ag.tmScores.length !== n) {
      ag.tmScores = players.map(() => Object.fromEntries(fields.map(f => [f.key, f.default ?? 0])));
    }
  }
  return ag;
}

// Construit le snapshot du gagnant (figé avant que update() ne vide activeGame).
// totalsOverride : totaux déjà calculés (validerRound) ; sinon recalculés
// depuis les tmScores pour les jeux à feuille (cohérence garantie).
export function makeWinSnapshot(ag, G, gameId, totalsOverride) {
  const fields = G.scoreType === 'sheet' ? tmGetAllFields(G, ag.tmExtensions || {}) : null;
  const totals = totalsOverride
    ? [...totalsOverride]
    : (fields && ag.tmScores ? ag.tmScores.map(s => computeTMTotal(s, fields)) : [...ag.totals]);
  const best = G.winMode === 'lowest' ? Math.min(...totals) : Math.max(...totals);
  return {
    players: [...ag.players],
    totals,
    winners: ag.players.filter((_, i) => totals[i] === best),
    roundNum: ag.tour || ag.manche || 1,
    roundLabel: gameId === 'flip7' ? 'Tour' : gameId === 'barbu' ? 'Contrat' : 'Manche',
    groupId: ag.groupId,
    limit: ag.limit,
    tmExtensions: ag.tmExtensions || {},
  };
}
