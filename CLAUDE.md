# Score Keeper — CLAUDE.md

## Règle permanente
**Toujours répondre en français.**

---

## Présentation du projet

PWA mobile-first de comptage de points pour jeux de société. React 19 + Vite 8 + vitest. Déployée sur GitHub Pages (`badindustries/score-keeper`, branche `main`).

**Jeux supportés** : Odin · Flip 7 · Skyjo · Roi des Nains · Qwirkle · Terraforming Mars · Harmonies · Barbu · Mythologies · Take Time (coop) · Visions · Les Papattes

---

## Architecture

```
src/
  games.config.js      — configuration de chaque jeu (règles, couleurs, champs)
  gameLogic.js         — fonctions pures : makeActiveGame, computeTourScores,
                         isGameOver, getWinnerIndex, recordPastGame
  storage.js           — localStorage : loadData, saveGroups, saveActiveGame
  App.jsx              — routeur top-level (GameSelector → GameApp | WhoStartsApp | HistoryApp)
  screens/
    GameApp.jsx        — orchestration jeu (~700 lignes : données, navigation, victoire, overlays)
    boards/
      ClassicBoard.jsx   — moteur « manches » (Odin, Flip 7, Skyjo, RdN, Qwirkle)
      SheetBoard.jsx     — moteur « feuille de score » wizard (TM, Harmonies) — tmStep local
      ContractsBoard.jsx — moteur « contrats » (Barbu) — contractDraft local
      ProgressBoard.jsx  — moteur « progression » coop (Take Time) — sans score
    GameSelector.jsx   — sélecteur de jeu
    HistoryApp.jsx     — écran plein Historique & stats (onglets Parties/Stats, filtres période+jeu+groupe)
    WhoStartsApp.jsx   — mini-app "doigts sur l'écran" pour désigner qui commence
  ui.jsx               — composants partagés (Btn, LimitCtrl, PlayerEditRow, GIcon, BottomSheet)
  usePressRepeat.js    — hook appui long (répétition 80ms après 400ms, cleanup au démontage)
  GameIcons.jsx        — icônes SVG inline
  changelog.js         — GÉNÉRÉ (scripts/gen-changelog.cjs) — journal des versions (À propos → Nouveautés)
  UpdatePrompt.jsx     — popup auto « nouvelle version » (vite-plugin-pwa, mode prompt)
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
- `computeTMTotal(scores, fields)` pour recalculer le total d'un joueur
- Modificateurs de champ (`computeTMTotal`) :
  - `divideBy: n` — points = division entière (gemmes de Mythologies, 3 → 1 Faveur)
  - `noPoints: true` — saisie sans points propres (facteur d'un autre champ)
  - `multiplyWith: "key"` — points = valeur × valeur du champ `key` (rêves de Visions : env × cat)

### Jeu à contrats (Barbu)
- `G.scoreType === "contracts"` + `G.endOnDemand === true` + `winMode: "highest"` (scores ≤ 0, le moins négatif gagne)
- `G.contracts[]` : chaque contrat a `components[]` ; un composant = `{ key, label, emoji, per?, max?, step? }`
- `per` défini → points = compte × per (ex : −5 par pli) ; `per` absent → le compte EST le nombre de points
- `computeContractScores(contract, counts, playerCount)` : fonction pure, somme tous les composants par joueur
- Composant `mode: "rank"` : classement à choix unique par valeur (`setRankValue`), barème via `rankRewardsFor(comp, playerCount)` :
  - `comp.rewards: [n,m,...]` — podium fixe explicite (ex Papattes `[3,2,1]` : seuls les 3 premiers marquent, les autres restent à 0 sans avertissement)
  - `comp.rankStep` — calculé pour TOUS les joueurs (`reussiteRankRewards(n, step)`, réussite du Barbu → `[45,30,15,0]`)
  - `comp.requireRank: true` (Barbu réussite) → init `null`, bordure rouge + "—" tant que non saisi ; sans ce flag (Papattes) → init `0`, jamais d'avertissement (rester à 0 est un résultat normal)
- Salade (Barbu) = un contrat à 5 composants (plis/cœurs/dames/barbu/derniers), parcouru en wizard comme les étapes TM
- Les Papattes = un seul contrat « Manche » à 3 composants : `restantes` (per:1, compteur classique), `proximite` (rank, rewards `[3,2,1]`), `ecart` (rank, rewards `[2]`) — fin automatique à 25 pts (`endOnDemand:false`, `validerContract` vérifie `isGameOver` comme `validerRound`)
- L'écran utilise un `contractDraft` local `{ key, step, counts }` ; à la validation : push dans `history` `{contract, scores}`, cumul dans `totals`, `tour/manche = history.length`
- `G.rulesIntro` (string) alimente l'intro de la fiche 📖 Règles, générique à tous les jeux à contrats

### Jeu coopératif à progression (Take Time)
- `G.scoreType === "progress"` + `G.coop: true` + `chapters`/`clocksPerChapter` dans la config
- `activeGame.clocks` : tableau de `{ tries, done }` (chapters × clocksPerChapter entrées), initialisé par `makeActiveGame`, garanti par `normalizeActiveGame`
- `campaignStats(clocks)` → `{ done, total, tries, currentIndex }` (currentIndex = première horloge non réussie, -1 si campagne finie)
- Boutons « Raté » (+1 tries) / « Réussie » (+1 tries, done=true) sur l'horloge courante ; tap sur une horloge réussie = la remettre en jeu
- `recordCampaign(grp, gameId, ag)` : archive coop — `winners` = toute l'équipe, `rounds` = total tentatives, `roundsLabel: "tentative"` (les historiques affichent `pg.roundsLabel||"tour"`)
- Pas de win screen classique : le board affiche son panneau 🎉 + bouton « Archiver la campagne »

### Gestion de victoire
- `isGameOver(totals, limit)` : `Math.max(...totals) >= limit` — déclenche quand
  n'importe quel joueur atteint la limite (correct pour lowest ET highest win mode)
- `getWinnerIndex(totals, winMode)` : index du gagnant
- `medalRank(score, totals, winMode)` : rang « compétition » (ex æquo = même médaille). À utiliser PARTOUT pour les médailles (jamais l'index de position)
- `makeWinSnapshot(ag, G, gameId, totalsOverride?)` : construit le snapshot du gagnant (figé AVANT que `update()` ne vide `activeGame`). `totalsOverride` pour validerRound ; sinon recalcule les totaux feuille. Évite la divergence validerRound/finDePartie
- `recordPastGame(grp, gameId, ag, winMode)` : enregistre dans `grp.pastGames` (sans plafond — historique complet pour les stats)
  → le champ `pg.winners` est un tableau ; `pg.winner` est une chaîne (peut être "A, B" pour ex aequo)
  → pour les stats, toujours utiliser `pg.winners?.includes(name) || name === pg.winner`

### Persistance & migration
- `normalizeActiveGame(gameId, ag)` (gameLogic) est appelé par `loadActiveGame` : garantit que tous les tableaux du schéma du jeu existent (parties legacy sans `doubled`/`flip7`/`tmScores` → plus de crash). Retourne `null` si inexploitable
- `persist` lève en cas de quota plein → `setSaveError(true)` affiche une bannière rouge (échec non silencieux)

### Badges latéraux (ClassicBoard)
- `G.sideBadges[]` dans games.config : `{ type:"toggle", field, emoji, label, activeLabel, activeColor, activeBg, activeBorder }` ou `{ type:"add", value, emoji, label }`
- `toggle` bascule `activeGame[field][i]` (le champ doit être initialisé par `makeActiveGame`/`normalizeActiveGame`) ; `add` appelle `adjustScore(i, value)`
- Plus aucune branche `gameId===` pour les badges — tout vient de la config

### Overlays (BottomSheet)
- `<BottomSheet title onClose maxHeight zIndex G headerExtra>` (ui.jsx) : backdrop, poignée, header + ✕
- Avec `G` : thème du jeu ; sans : thème neutre sombre (GameSelector)
- Le children gère son propre scroll (`{ overflowY:"auto", flex:1 }`)

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

### Journal des versions (changelog)
- `src/changelog.js` est **généré** par `scripts/gen-changelog.cjs` (lancé dans `npm run generate`, donc avant `dev`/`build`).
- Pour ajouter une entrée visible par l'utilisateur, mettre un trailer dans le message de commit :
  `Changelog: Description simple et orientée joueur`
  (plusieurs lignes `Changelog:` possibles par commit ; regroupées par date).
- Le socle curé (historique avant l'automatisation) vit dans le `SEED` du script.
- Le job `build` du workflow utilise `fetch-depth: 0` pour que `git log` voie tout l'historique.
