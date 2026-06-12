# Score Keeper — CLAUDE.md

## Règle permanente
**Toujours répondre en français.**

---

## Présentation du projet

PWA mobile-first de comptage de points pour jeux de société. React 19 + Vite 8 + vitest. Déployée sur GitHub Pages (`badindustries/score-keeper`, branche `main`).

**Jeux supportés** : Odin · Flip 7 · Skyjo · Roi des Nains · Qwirkle · Terraforming Mars

---

## Architecture

```
src/
  games.config.js      — configuration de chaque jeu (règles, couleurs, champs)
  gameLogic.js         — fonctions pures : makeActiveGame, computeTourScores,
                         isGameOver, getWinnerIndex, recordPastGame
  storage.js           — localStorage : loadData, saveGroups, saveActiveGame
  App.jsx              — routeur top-level (GameSelector → GameApp | WhoStartsApp)
  screens/
    GameApp.jsx        — écran principal jeu (1 200 lignes, gère tous les jeux)
    GameSelector.jsx   — sélecteur de jeu
    WhoStartsApp.jsx   — mini-app "doigts sur l'écran" pour désigner qui commence
  ui.jsx               — composants partagés (Btn, LimitCtrl, PlayerEditRow, GIcon)
  GameIcons.jsx        — icônes SVG inline
```

### Flux de données
```
localStorage ──loadData()──► useState(data)
                                  │
                           update(fn) = setData(prev => {
                             const next = fn(structuredClone(prev));
                             persist(next);   // saveGroups + saveActiveGame
                             return next;
                           })
```

**Important** : l'updater de `setData` est exécuté de façon **différée** par React.
Tout code devant s'exécuter APRÈS la mise à jour (ex: `setShowWin(true)`) doit
calculer sa valeur **avant** l'appel à `update()`, depuis `data` (état courant synchrone).

---

## Patterns clés

### Jeu feuille de score (Terraforming Mars)
- `G.scoreType === "sheet"` + `G.endOnDemand === true`
- L'activeGame doit avoir `tmScores[]` et `tmExtensions{}` initialisés
- Toujours utiliser `tmGetAllFields(G, exts)` pour la liste des champs actifs
- `computeTMTotal(scores)` pour recalculer le total d'un joueur

### Gestion de victoire
- `isGameOver(totals, limit)` : `Math.max(...totals) >= limit` — déclenche quand
  n'importe quel joueur atteint la limite (correct pour lowest ET highest win mode)
- `getWinnerIndex(totals, winMode)` : index du gagnant
- `recordPastGame(grp, gameId, ag, winMode)` : enregistre dans `grp.pastGames` (max 20)
  → le champ `pg.winners` est un tableau ; `pg.winner` est une chaîne (peut être "A, B" pour ex aequo)
  → pour les stats, toujours utiliser `pg.winners?.includes(name) || name === pg.winner`

### Multi-touch (WhoStartsApp)
- `fDebounceRef` (300ms) pour laisser le temps aux doigts successifs d'arriver
- Pendant le countdown (`fStateRef === "countdown"`), un nouveau doigt relance depuis 3
- `fLockedRef` = true pendant countdown et result (bloque de nouveaux départs)

---

## Pièges connus

| Piège | Détail |
|-------|--------|
| `update()` async | L'updater n'a pas encore tourné quand la ligne suivante s'exécute |
| `structuredClone` large | Clone tout `data` y compris pastGames — éviter pour les hot paths |
| espree/ESLint | `>` avant JSX tag parse error → entourer d'un ternaire ou de parens |
| Skyjo négatifs | Le ×2 s'applique aussi aux scores négatifs (`pts !== 0`, pas `pts > 0`) |
| Égalités stats | `pg.winner` = "Alice, Bob" — utiliser `pg.winners.includes()` |
| TM activeGame stale | Toujours garder `a.activeGame.tmScores ||= []` en garde |

---

## Commandes de conseil (`/project:*`)

Le projet dispose d'un **conseil de 6 experts** disponibles comme commandes Claude Code.
Cinq experts trouvent (chacun depuis un angle spécialisé), le sixième réfute.

| Commande | Expert | Rôle |
|----------|--------|------|
| `/project:council` | Conseil complet | 5 experts en parallèle → contre-vérif Sceptique → synthèse |
| `/project:arbitre` | 🎲 L'Arbitre | Vérifie la logique métier vs règles officielles des jeux |
| `/project:qa` | 🧪 Le QA | Chasse les cas limites, trous dans les tests |
| `/project:ergonome` | 📱 L'Ergonome | UX mobile, tactile, accessibilité, PWA |
| `/project:architecte` | ⚛️ L'Architecte | Patterns React, perf, maintenabilité |
| `/project:gardien` | 💾 Le Gardien | Persistance, migrations, cohérence des données |
| `/project:sceptique` | 🔍 Le Sceptique | Contre-vérifie les trouvailles des autres, réfute les faux positifs |

---

## CI/CD

GitHub Actions (`.github/workflows/deploy.yml`) :
1. **lint** — `eslint .`
2. **test** — `vitest run`
3. **build** — `vite build` + upload Pages artifact
4. **deploy** — GitHub Pages (sur push main uniquement)

Push via : `git push -u origin main-fix:main`
