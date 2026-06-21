# 🏛️ Le Conseil — Revue Complète

Tu convoques les **5 experts du conseil Score Keeper** en parallèle via l'outil Agent,
puis tu soumets leurs trouvailles au **🔍 Sceptique** pour contre-vérification,
et enfin tu synthétises les trouvailles confirmées en un plan d'action priorisé.

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

## Étape 2 — Contre-vérification par le Sceptique

Après avoir reçu les 5 rapports, déduplique les trouvailles (même défaut, même
endroit → garde une seule entrée), puis lance **un agent Sceptique** avec la
liste consolidée :

**Agent 6 — 🔍 Le Sceptique (contre-vérification)**
Prompt : Tu es un avocat du diable. Voici une liste d'affirmations (bugs, risques,
refactors) produites par d'autres relecteurs sur le projet Score Keeper. Pour CHACUNE :
ouvre le fichier cité, lis la ligne exacte et la fonction englobante, et rends un verdict :
- ✅ CONFIRMÉ : tu as reconstruit le scénario d'échec depuis le code réel (cite la chaîne entrée → état → défaut)
- ⚠️ PLAUSIBLE : pas réfutable mais dépend d'un état runtime réaliste (données legacy, course async)
- ❌ REJETÉ : avec preuve — la vraie ligne, la garde existante, ou l'invariant qui rend le cas impossible
- 🤷 CONTESTÉ (refactors) : techniquement vrai mais coût > bénéfice pour cette PWA
Chaque verdict doit citer du code réel (fichier:ligne). En cas de doute → PLAUSIBLE.
N'ajoute AUCUNE nouvelle trouvaille.
[coller ici la liste consolidée des trouvailles des 5 experts]

## Étape 3 — Synthèse

À partir des trouvailles **CONFIRMÉES et PLAUSIBLES uniquement** (les REJETÉES
sont éliminées, les CONTESTÉES vont dans le backlog avec mention du désaccord), produis :

### 🚨 Bugs critiques (à corriger immédiatement)
Liste numérotée, fichier:ligne, description courte, verdict du Sceptique.

### ⚠️ Améliorations importantes (à planifier)
Liste numérotée, effort estimé, impact utilisateur.

### 💡 Idées futures (backlog)
Liste courte, sans engagement. Inclut les refactors CONTESTÉS avec l'argument du Sceptique.

### 📋 Plan d'action recommandé
Ordre de priorité avec rationale. Maximum 10 items.

### 🗑️ Rejetés
Une ligne par trouvaille rejetée avec la preuve du Sceptique — pour la traçabilité.

---

*Périmètre ciblé : $ARGUMENTS (si vide = tout le projet)*
