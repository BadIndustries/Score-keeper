/**
 * Logique pure du Score Keeper — testable sans React.
 * App.jsx utilise ces fonctions pour le calcul des scores.
 */

export function computeTourScores(gameId, current, flip7State = [], doubledState = []) {
  if (gameId === 'flip7') {
    return current.map((pts, i) => pts + (flip7State[i] ? 15 : 0))
  }
  if (gameId === 'skyjo') {
    return current.map((pts, i) => (doubledState[i] && pts > 0 ? pts * 2 : pts))
  }
  return [...current]
}

export function isGameOver(totals, limit) {
  return Math.max(...totals) >= limit
}

export function getWinnerIndex(totals, winMode) {
  return winMode === 'lowest'
    ? totals.indexOf(Math.min(...totals))
    : totals.indexOf(Math.max(...totals))
}
