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

// ── Helpers ────────────────────────────────────────────────────────────────────

function tokenToTs(token, indent) {
  const type = token.type ? `'${token.type}'` : 'null';
  return `${indent}{ text: ${JSON.stringify(token.text)}, type: ${type} }`;
}

function camelCase(str) {
  return str.replace(/-([a-z0-9])/g, (_, l) => l.toUpperCase());
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
  titre: ${JSON.stringify(chapitre.titre)},
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

const bibPath = path.join(config.dataDir, 'bibliotheque.ts');

if (!fs.existsSync(bibPath)) {
  // Créer le fichier s'il n'existe pas
  const bibContent =
`import { Livre } from './types';
import ${camelCase(slug)} from './${slug}';

export const BIBLIOTHEQUE: Livre[] = [
  ${camelCase(slug)},
];
`;
  fs.writeFileSync(bibPath, bibContent);
  console.log(`   ✅ data/bibliotheque.ts créé`);
} else {
  let bibContent = fs.readFileSync(bibPath, 'utf-8');
  const importLine = `import ${camelCase(slug)} from './${slug}';`;
  const itemLine = `  ${camelCase(slug)},`;

  if (bibContent.includes(importLine)) {
    console.log(`   ℹ️  data/bibliotheque.ts : "${slug}" déjà présent, aucune modification`);
  } else {
    // Ajouter l'import avant la ligne "export const BIBLIOTHEQUE"
    bibContent = bibContent.replace(
      /(export const BIBLIOTHEQUE)/,
      `${importLine}\n\n$1`
    );
    // Ajouter le livre dans le tableau (avant le "];")
    bibContent = bibContent.replace(
      /\];\s*$/,
      `${itemLine}\n];`
    );
    fs.writeFileSync(bibPath, bibContent);
    console.log(`   ✅ data/bibliotheque.ts mis à jour`);
  }
}

console.log('\n✅ Génération terminée');
