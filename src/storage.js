import { KEY_GROUPS, GAMES, DEFAULT_LIMITS, genId } from './games.config.js';

export function defaultGroups() {
  return [{
    id: genId(),
    name: "Weekend",
    players: ["Véronique","Johan","Maxime","Florine","Amélie","Julien"],
    limits: { ...DEFAULT_LIMITS },
    pastGames: [],
  }];
}

export function loadGroups() {
  try {
    const r = localStorage.getItem(KEY_GROUPS);
    if (r) {
      const parsed = JSON.parse(r);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* données illisibles -> défauts */ }
  return defaultGroups();
}

// Laisse remonter l'exception (quota plein, mode privé) : c'est à l'appelant
// de décider quoi montrer à l'utilisateur.
export function saveGroups(groups) {
  localStorage.setItem(KEY_GROUPS, JSON.stringify(groups));
}

export function loadActiveGame(gameId) {
  try {
    const r = localStorage.getItem(GAMES[gameId].key);
    if (r) {
      const d = JSON.parse(r);
      if (d && typeof d === 'object' && d.activeGame && typeof d.activeGame === 'object') return d.activeGame;
    }
  } catch { /* données illisibles -> pas de partie en cours */ }
  return null;
}

export function saveActiveGame(gameId, activeGame) {
  localStorage.setItem(GAMES[gameId].key, JSON.stringify({ activeGame }));
}

export function loadData(gameId) {
  return { groups: loadGroups(), activeGame: loadActiveGame(gameId) };
}
