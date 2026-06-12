# 🏛️ Le Conseil — Revue Complète

Tu convoque les **5 experts du conseil Score Keeper** en parallèle via l'outil Agent,
puis tu synthétises leurs rapports en un plan d'action priorisé.

## Étape 1 — Lancer les 5 experts en parallèle

Lance ces 5 agents simultanément (dans un seul message, 5 appels Agent) :

**Agent 1 — 🎲 L'Arbitre (règles des jeux)**
Prompt : Lis les fichiers `src/gameLogic.js`, `src/games.config.js` et `src/screens/GameApp.jsx`.
Vérifie que chaque jeu (Odin, Flip 7, Skyjo, Roi des Nains, Qwirkle, Terraforming Mars) respecte bien ses règles officielles.
Règles clés à vérifier : calcul des scores de manche, condition de fin de partie, identification du gagnant, cas des égalités, valeurs par défaut.
Rapport en moins de 300 mots, problèmes uniquement (ou "RAS" si tout est correct).

**Agent 2 — 🧪 Le QA (tests et cas limites)**
Prompt : Lis `src/gameLogic.test.js`, `src/gamesConfig.test.js`, `src/fingersBackBtn.test.js` et les fichiers source correspondants.
Identifie : (a) fonctions/branches non testées, (b) cas limites manquants dans les tests existants, (c) 3 tests prioritaires à écrire (avec code vitest complet).
Rapport en moins de 400 mots.

**Agent 3 — 📱 L'Ergonome (UX mobile)**
Prompt : Lis `src/screens/GameApp.jsx` et `src/screens/WhoStartsApp.jsx`.
Identifie les problèmes UX mobile : zones de tap trop petites, manque de retour visuel, flux de navigation confus, safe areas, confirmations manquantes pour actions destructives.
Classe par gravité (🔴/🟡/🟢). Rapport en moins de 300 mots.

**Agent 4 — ⚛️ L'Architecte (code React)**
Prompt : Lis tous les fichiers src/ (GameApp.jsx, gameLogic.js, storage.js, games.config.js, ui.jsx, App.jsx, WhoStartsApp.jsx).
Identifie : duplications de code, composants trop gros, patterns React incorrects, opportunités de généralisation via games.config.js.
Rapport en moins de 400 mots, liste les 5 refactors les plus importants avec effort estimé (XS/S/M/L).

**Agent 5 — 💾 Le Gardien (données)**
Prompt : Lis `src/storage.js`, `src/screens/GameApp.jsx` (sections persist/update/finDePartie/validerRound), `src/gameLogic.js`.
Identifie : risques de perte de données, états incohérents, manque de migrations, nettoyage incomplet de activeGame.
Rapport en moins de 300 mots, risques uniquement.

## Étape 2 — Synthèse

Après avoir reçu les 5 rapports, produis :

### 🚨 Bugs critiques (à corriger immédiatement)
Liste numérotée, fichier:ligne, description courte.

### ⚠️ Améliorations importantes (à planifier)
Liste numérotée, effort estimé, impact utilisateur.

### 💡 Idées futures (backlog)
Liste courte, sans engagement.

### 📋 Plan d'action recommandé
Ordre de priorité avec rationale. Maximum 10 items.

---

*Périmètre ciblé : $ARGUMENTS (si vide = tout le projet)*
