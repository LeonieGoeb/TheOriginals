// Usage: node scripts/5-generate.js <chemin-config.json>
// Génère les fichiers TypeScript à partir des données annotées

const fs = require('fs');
const path = require('path');
const config = require('./config');

const configPath = process.argv[2];
if (!configPath) {
  console.error('❌ Usage: node scripts/5-generate.js <chemin-config.json>');
  process.exit(1);
}

if (!fs.existsSync(configPath)) {
  console.error(`❌ Fichier de config introuvable : ${configPath}`);
  process.exit(1);
}

const livreConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const {
  slug, titre, titreOriginal, auteur, auteurOriginal,
  langueSource, langueCible, niveau, niveauNote, gratuit,
  couvertureCouleur,
} = livreConfig;

const inputPath = path.join(config.tmpDir, slug, 'annotated.json');

if (!fs.existsSync(inputPath)) {
  console.error(`❌ Fichier introuvable : ${inputPath}`);
  console.error('   Lancez d\'abord l\'étape 4 (annotation)');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
const outputDir = path.join(config.dataDir, slug);
fs.mkdirSync(outputDir, { recursive: true });

console.log(`📦 Génération des fichiers TypeScript pour "${titre}"...`);

// ── Traduction des titres de chapitres structurels ────────────────────────────

const TITRES_STRUCTURELS = {
  // Français → cibles
  'préface':   { en: 'Preface',   de: 'Vorwort',   es: 'Prefacio',  ru: 'Предисловие' },
  'prologue':  { en: 'Prologue',  de: 'Prolog',     es: 'Prólogo',   ru: 'Пролог'      },
  'épilogue':  { en: 'Epilogue',  de: 'Epilog',     es: 'Epílogo',   ru: 'Эпилог'      },
  'introduction': { en: 'Introduction', de: 'Einleitung', es: 'Introducción', ru: 'Введение' },
  'conclusion': { en: 'Conclusion', de: 'Schluss',  es: 'Conclusión', ru: 'Заключение' },
  // Anglais → cibles
  'preface':   { fr: 'Préface',   de: 'Vorwort',   es: 'Prefacio',  ru: 'Предисловие' },
  'epilogue':  { fr: 'Épilogue',  de: 'Epilog',    es: 'Epílogo',   ru: 'Эпилог'      },
  // Espagnol → cibles
  'prefacio':  { fr: 'Préface',   en: 'Preface',   de: 'Vorwort',   ru: 'Предисловие' },
  'prólogo':   { fr: 'Prologue',  en: 'Prologue',  de: 'Prolog',    ru: 'Пролог'      },
  'epílogo':   { fr: 'Épilogue',  en: 'Epilogue',  de: 'Epilog',    ru: 'Эпилог'      },
  // Allemand → cibles
  'vorwort':   { fr: 'Préface',   en: 'Preface',   es: 'Prefacio',  ru: 'Предисловие' },
};

function traduireTitreChapitre(titre, langueCible) {
  if (!titre) return titre;
  const key = titre.trim().toLowerCase();
  const traductions = TITRES_STRUCTURELS[key];
  if (traductions && traductions[langueCible]) return traductions[langueCible];
  return titre;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function tokenToTs(token, indent) {
  const type = token.type ? `'${token.type}'` : 'null';
  return `${indent}{ text: ${JSON.stringify(token.text)}, type: ${type} }`;
}

function camelCase(str) {
  return str
    .replace(/-+([a-zA-Z0-9])/g, (_, l) => l.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

// ── Génération des fichiers chapitres ──────────────────────────────────────────

for (const chapitre of data) {
  const paragraphesTs = chapitre.paragraphes.map(para => {
    const tokensSource = (para[`tokens_${langueSource}`] || [])
      .map(t => tokenToTs(t, '          ')).join(',\n');
    const tokensCible = (para[`tokens_${langueCible}`] || [])
      .map(t => tokenToTs(t, '          ')).join(',\n');

    return `    {
      id: '${para.id}',
      textes: {
        ${langueSource}: [
${tokensSource},
        ],
        ${langueCible}: [
${tokensCible},
        ],
      },
    }`;
  }).join(',\n');

  const varName = camelCase(chapitre.id);
  const content =
`import { Chapitre } from '../types';

const ${varName}: Chapitre = {
  id: '${chapitre.id}',
  titre: ${JSON.stringify(traduireTitreChapitre(chapitre.titre, langueCible))},
  titreOriginal: ${JSON.stringify(chapitre.titreOriginal || chapitre.titre)},
  paragraphes: [
${paragraphesTs},
  ],
};

export default ${varName};
`;

  const outPath = path.join(outputDir, `${chapitre.id}.ts`);
  fs.writeFileSync(outPath, content);
  console.log(`   ✅ ${chapitre.id}.ts (${chapitre.paragraphes.length} paragraphes)`);
}

// ── Génération de index.ts ─────────────────────────────────────────────────────

const imports = data.map(ch =>
  `import ${camelCase(ch.id)} from './${ch.id}';`
).join('\n');
const chapArray = data.map(ch => `    ${camelCase(ch.id)}`).join(',\n');

const indexContent =
`import { Livre } from '../types';
${imports}

const ${camelCase(slug)}: Livre = {
  id: '${slug}',
  titre: ${JSON.stringify(titre)},
  titreOriginal: ${JSON.stringify(titreOriginal)},
  auteur: ${JSON.stringify(auteur)},
  auteurOriginal: ${JSON.stringify(auteurOriginal)},
  langueSource: '${langueSource}',
  langueCible: '${langueCible}',
  niveau: '${niveau}',
  niveauNote: ${JSON.stringify(niveauNote || '')},
  gratuit: ${gratuit},
  couvertureCouleur: ${JSON.stringify(couvertureCouleur || '#f5efe3')},
  chapitres: [
${chapArray},
  ],
};

export default ${camelCase(slug)};
`;

fs.writeFileSync(path.join(outputDir, 'index.ts'), indexContent);
console.log(`   ✅ index.ts`);

// ── Mise à jour de data/bibliotheque.ts ───────────────────────────────────────
// Approche robuste : on scanne data/ pour trouver tous les livres existants,
// puis on réécrit le fichier entièrement — pas de manipulation regex fragile.

const bibPath = path.join(config.dataDir, 'bibliotheque.ts');

// Livres existants = dossiers dans data/ qui ont un index.ts
const livresExistants = fs.readdirSync(config.dataDir)
  .filter(d => {
    const dPath = path.join(config.dataDir, d);
    return fs.statSync(dPath).isDirectory()
      && fs.existsSync(path.join(dPath, 'index.ts'));
  });

// S'assurer que le livre courant est dans la liste
if (!livresExistants.includes(slug)) {
  livresExistants.push(slug);
}

const bibImports = livresExistants
  .map(s => `import ${camelCase(s)} from './${s}';`)
  .join('\n');

const bibItems = livresExistants
  .map(s => `  ${camelCase(s)},`)
  .join('\n');

const bibContent =
`import { Livre } from './types';
${bibImports}

export const BIBLIOTHEQUE: Livre[] = [
${bibItems}
];
`;

fs.writeFileSync(bibPath, bibContent);
console.log(`   ✅ data/bibliotheque.ts réécrit (${livresExistants.length} livre(s))`);

// ── Génération des fichiers JSON pour le CDN ───────────────────────────────────

const jsonDir = path.join(config.dataDir, 'json');
fs.mkdirSync(jsonDir, { recursive: true });

// book.json : livre complet avec version = timestamp de génération (partagé avec catalog.json)
const VERSION = Date.now();
const livreJson = {
  id: slug,
  titre, titreOriginal, auteur, auteurOriginal,
  langueSource, langueCible,
  niveau, niveauNote,
  gratuit: gratuit ?? true,
  couvertureCouleur: couvertureCouleur ?? '#f5efe3',
  version: VERSION,
  chapitres: data.map(ch => ({
    id: ch.id,
    titre: traduireTitreChapitre(ch.titre, langueCible),
    titreOriginal: ch.titreOriginal || ch.titre,
    paragraphes: ch.paragraphes.map(para => ({
      id: para.id,
      textes: {
        [langueSource]: para[`tokens_${langueSource}`] || [],
        [langueCible]:  para[`tokens_${langueCible}`]  || [],
      },
    })),
  })),
};

const slugJsonDir = path.join(jsonDir, slug);
fs.mkdirSync(slugJsonDir, { recursive: true });
fs.writeFileSync(path.join(slugJsonDir, 'book.json'), JSON.stringify(livreJson, null, 2));
console.log(`   ✅ data/json/${slug}/book.json`);

// catalog.json : fusion avec les entrées existantes
const catalogPath = path.join(jsonDir, 'catalog.json');
let catalog = [];
if (fs.existsSync(catalogPath)) {
  try { catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8')); } catch {}
}

const { chapitres: _chapitres, ...livreInfo } = livreJson;
const idx = catalog.findIndex(l => l.id === slug);
if (idx >= 0) catalog[idx] = livreInfo;
else catalog.push(livreInfo);

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
console.log(`   ✅ data/json/catalog.json (${catalog.length} livre(s))`);

console.log('\n✅ Génération terminée');
