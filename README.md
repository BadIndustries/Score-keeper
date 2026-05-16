# Score Keeper

[![CI](https://github.com/BadIndustries/Score-keeper/actions/workflows/deploy.yml/badge.svg)](https://github.com/BadIndustries/Score-keeper/actions/workflows/deploy.yml)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

PWA de comptage de points pour jeux de société, optimisée mobile.
Installable sur iOS et Android, fonctionne hors-ligne.

**[▶ Ouvrir l'app](https://badindustries.github.io/Score-keeper/)**

## Fonctionnalités

- **Groupes** — sauvegarde des joueurs et paramètres par groupe, historique des parties
- **Partie rapide** — lancer une partie sans groupe enregistré
- **Doigt sur l'écran** — mini-jeu pour désigner qui commence (chaque joueur pose un doigt, un vainqueur est tiré au sort)
- **PWA** — installable depuis le navigateur, fonctionne sans connexion
- **Qui commence ?** — tirage au sort animé parmi les joueurs du groupe

## Jeux supportés

| Jeu | Emoji | Règle de victoire | Fin de partie |
|---|---|---|---|
| Odin | ⚔️ | Moins de points | Quand un joueur atteint la limite |
| Flip 7 | 🎴 | Plus de points | Premier à atteindre l'objectif |
| Skyjo | 🀄 | Moins de points | Quand un joueur atteint 100 pts |
| Roi des Nains | 👑 | Moins de points | Quand un joueur atteint la limite |
| Qwirkle | 🎯 | Plus de points | Bouton « Fin de partie » manuel |

### Particularités par jeu

- **Flip 7** : bouton Flip7 (+15 pts) et bouton ×2 par joueur à chaque manche
- **Skyjo** : bouton ×2 (double le score si positif)
- **Qwirkle** : bouton +12 (Qwirkle = ligne complète, pas de limite de points)
- **Odin** : victoire partagée si plusieurs joueurs terminent à égalité

## Développement local

```bash
npm install
npm run dev            # http://localhost:5173/Score-keeper/
npm test               # Vitest
npm run test:coverage  # couverture de code
npm run lint           # ESLint
npm run build          # build de production
```

## CI/CD

Chaque push sur `main` déclenche : **lint → test → build → deploy** (GitHub Pages).  
Les PR déclenchent : **lint → test → build** (sans déploiement).  
Un test ou lint en échec bloque le déploiement.

## Stack

- React 19 + Vite 8
- vite-plugin-pwa (Workbox) — cache offline, mise à jour automatique
- Vitest 3 + @vitest/coverage-v8
- ESLint 10 (flat config)
- GitHub Pages

## Licence

[MIT](LICENSE) © 2026 Badjojo
