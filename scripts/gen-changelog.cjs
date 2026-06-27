// Génère src/changelog.js.
// - SEED : l'historique curé (rédigé à la main) servant de socle.
// - Auto : tout commit portant un ou plusieurs trailers « Changelog: ... »
//   est repris automatiquement, groupé par date (le plus récent en premier).
// Lancé via `npm run generate` (donc avant `npm run dev` et `npm run build`).
const fs = require('fs');
const { execSync } = require('child_process');

// ── Socle curé (avant la génération automatique) ──────────────────────────
const SEED = [
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

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function frDate(iso) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ── Blocs auto à partir des trailers « Changelog: » des commits ───────────
function autoBlocks() {
  let raw;
  try {
    raw = execSync('git log --no-merges --pretty=format:%cI%x1f%B%x1e', { encoding: 'utf8' });
  } catch {
    return []; // pas de git (ou clone superficiel sans historique) → socle seul
  }
  const byDay = new Map(); // 'YYYY-MM-DD' -> { iso, items: [] }
  for (const c of raw.split('\x1e').map(s => s.trim()).filter(Boolean)) {
    const sep = c.indexOf('\x1f');
    if (sep < 0) continue;
    const iso = c.slice(0, sep).trim();
    const body = c.slice(sep + 1);
    for (const line of body.split('\n')) {
      const m = line.match(/^\s*Changelog:\s*(.+?)\s*$/i);
      if (!m) continue;
      const day = iso.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, { iso, items: [] });
      const entry = byDay.get(day);
      if (!entry.items.includes(m[1])) entry.items.push(m[1]);
    }
  }
  return [...byDay.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map(day => ({ version: frDate(byDay.get(day).iso), date: '', items: byDay.get(day).items }));
}

const CHANGELOG = [...autoBlocks(), ...SEED];

const out = `// ⚠️ Fichier généré automatiquement par scripts/gen-changelog.cjs — ne pas éditer à la main.
// Socle curé dans le script ; nouvelles entrées via les trailers « Changelog: » des commits.
export const CHANGELOG = ${JSON.stringify(CHANGELOG, null, 2)};
`;
fs.writeFileSync('src/changelog.js', out);
console.log(`Changelog -> ${CHANGELOG.length} bloc(s) ✓`);
