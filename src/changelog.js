// Journal des versions — descriptions volontairement simples, pour tout utilisateur.
// Le plus récent en premier.
export const CHANGELOG = [
  {
    version: 'Le Barbu & À propos',
    date: 'Juin 2026',
    items: [
      'Nouveau jeu : Le Barbu ! Choisis un contrat, indique ce que chaque joueur a ramassé, et les points se calculent tout seuls.',
      'Le Barbu intègre une fiche de règles consultable à tout moment pendant la partie.',
      'Nouvelle page « À propos » avec un lien vers le code source et ce journal des versions.',
      'Une notification apparaît automatiquement quand une nouvelle version de l’app est disponible.',
    ],
  },
  {
    version: 'Harmonies',
    date: 'Juin 2026',
    items: [
      'Nouveau jeu : Harmonies, avec sa feuille de score (arbres, montagnes, rivière, champs, bâtiments, animaux).',
    ],
  },
  {
    version: 'Terraforming Mars affiné',
    date: 'Juin 2026',
    items: [
      'Comptage des points plus fiable : les totaux sont toujours recalculés correctement.',
      'Désactiver une extension n’affecte plus le score par erreur.',
      'Barre de progression cliquable pour revenir corriger une étape de la feuille de score.',
    ],
  },
  {
    version: 'Stabilité générale',
    date: 'Juin 2026',
    items: [
      'Amélioration globale de la fiabilité de la sauvegarde des parties.',
      'Le message « Sauvegardé » ne s’affiche plus que lorsque l’enregistrement a réellement réussi.',
      'Corrections d’affichage et de comptage dans plusieurs jeux (notamment les scores négatifs au Skyjo).',
    ],
  },
];
