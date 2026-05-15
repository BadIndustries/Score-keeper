# Score Keeper

Compteur de points pour jeux de société — PWA installable.

**[▶ Ouvrir l'app](https://badindustries.github.io/Score-keeper/)**

## Jeux supportés

| Jeu | Règle de victoire | Fin de partie |
|---|---|---|
| Odin | Moins de points | Quand un joueur atteint la limite |
| Flip 7 | Plus de points | Premier à l'objectif |
| Skyjo | Moins de points | Quand un joueur atteint 100 pts |
| Roi des Nains | Moins de points | Quand un joueur atteint la limite |

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

Chaque push sur `main` : `lint → test → build → deploy` (GitHub Pages).
Les PR déclenchent `lint → test → build` (sans déploiement).
Un test ou lint en échec bloque le déploiement.

## Stack

- React 19 + Vite 8
- vite-plugin-pwa (Workbox)
- Vitest 3 + @vitest/coverage-v8
- GitHub Pages
