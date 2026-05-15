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
  try { const r = localStorage.getItem(KEY_GROUPS); if (r) return JSON.parse(r); } catch(e) {}
  return defaultGroups();
}

export function saveGroups(groups) {
  try { localStorage.setItem(KEY_GROUPS, JSON.stringify(groups)); } catch(e) {}
}

export function loadActiveGame(gameId) {
  try {
    const r = localStorage.getItem(GAMES[gameId].key);
    if (r) { const d = JSON.parse(r); return d.activeGame || null; }
  } catch(e) {}
  return null;
}

export function saveActiveGame(gameId, activeGame) {
  try { localStorage.setItem(GAMES[gameId].key, JSON.stringify({ activeGame })); } catch(e) {}
}

export function loadData(gameId) {
  return { groups: loadGroups(), activeGame: loadActiveGame(gameId) };
}
