// Usage: node scripts/validate-config.js <chemin-vers-config.json> [--force]
//   --force : autorise le remplacement d'un livre déjà présent dans l'application

const fs = require('fs');
const path = require('path');
const { langues, niveaux, pendingDir, dataDir } = require('./config');

const configPath = process.argv[2];
const forceFlag = process.argv.includes('--force');

if (!configPath) {
  console.error('❌ Usage: node scripts/validate-config.js <chemin-vers-config.json> [--force]');
  process.exit(1);
}

if (!fs.existsSync(configPath)) {
  console.error(`❌ Fichier introuvable : ${configPath}`);
  process.exit(1);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (err) {
  console.error(`❌ JSON invalide dans ${configPath} : ${err.message}`);
  process.exit(1);
}

const erreurs = [];

// Champs requis
const champsRequis = [
  'slug', 'titre', 'titreOriginal', 'auteur', 'auteurOriginal',
  'langueSource', 'langueCible', 'niveau', 'niveauNote',
  'gratuit', 'couvertureCouleur',
];
for (const champ of champsRequis) {
  if (config[champ] === undefined || config[champ] === null || config[champ] === '') {
    erreurs.push(`Champ requis manquant ou vide : "${champ}"`);
  }
}

// Validation langueSource
if (config.langueSource && !langues[config.langueSource]) {
  erreurs.push(
    `langueSource "${config.langueSource}" non supportée.\n   Langues disponibles : ${Object.keys(langues).join(', ')}`
  );
}

// Validation langueCible
if (config.langueCible && !langues[config.langueCible]) {
  erreurs.push(
    `langueCible "${config.langueCible}" non supportée.\n   Langues disponibles : ${Object.keys(langues).join(', ')}`
  );
}

// Validation langueSource ≠ langueCible
if (config.langueSource && config.langueCible && config.langueSource === config.langueCible) {
  erreurs.push(`langueSource et langueCible ne peuvent pas être identiques ("${config.langueSource}")`);
}

// Validation niveau
if (config.niveau && !niveaux.includes(config.niveau)) {
  erreurs.push(
    `niveau "${config.niveau}" invalide.\n   Niveaux valides : ${niveaux.join(', ')}`
  );
}

// Validation gratuit (boolean)
if (config.gratuit !== undefined && typeof config.gratuit !== 'boolean') {
  erreurs.push(`"gratuit" doit être un booléen (true ou false), reçu : ${JSON.stringify(config.gratuit)}`);
}

// Validation couvertureCouleur (hex color)
if (config.couvertureCouleur && !/^#[0-9a-fA-F]{6}$/.test(config.couvertureCouleur)) {
  erreurs.push(`"couvertureCouleur" doit être une couleur hex valide (ex: "#e8f4f8"), reçu : "${config.couvertureCouleur}"`);
}

// Validation slug : le PDF correspondant doit exister dans _source/pending/
if (config.slug) {
  // Slug: uniquement lettres minuscules, chiffres, tirets
  if (!/^[a-z0-9-]+$/.test(config.slug)) {
    erreurs.push(`"slug" ne doit contenir que des lettres minuscules, chiffres et tirets. Reçu : "${config.slug}"`);
  }

  // Le slug doit correspondre au nom du fichier JSON
  const nomFichierJson = path.basename(configPath, '.json');
  if (config.slug !== nomFichierJson) {
    erreurs.push(`"slug" ("${config.slug}") ne correspond pas au nom du fichier ("${nomFichierJson}.json")`);
  }

  // Le PDF correspondant doit exister
  const pdfPath = path.join(path.dirname(configPath), `${config.slug}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    erreurs.push(`PDF introuvable : "${pdfPath}"\n   Assurez-vous que "${config.slug}.pdf" est bien dans le même dossier que le JSON`);
  }

  // Vérifier si le livre existe déjà dans l'application
  const existingIndexPath = path.join(dataDir, config.slug, 'index.ts');
  if (fs.existsSync(existingIndexPath)) {
    if (!forceFlag && !config.forceRemplacer) {
      console.error(`\n⚠️  Le livre "${config.slug}" existe déjà dans l'application (data/${config.slug}/index.ts).`);
      console.error(`   Pour le remplacer par une nouvelle version, vous avez deux options :`);
      console.error(`   1. Ajoutez "forceRemplacer": true dans le fichier JSON de configuration`);
      console.error(`   2. Passez le flag --force à ce script`);
      console.error(`   3. Dans GitHub Actions, cochez "Force replace existing book" au lancement du workflow`);
      process.exit(3);
    } else {
      console.log(`   ⚠️  Remplacement autorisé (${config.forceRemplacer ? '"forceRemplacer": true' : '--force'}) : "${config.slug}" sera écrasé`);
    }
  }
}

// Résultat
if (erreurs.length > 0) {
  console.error(`\n❌ Configuration invalide : ${configPath}`);
  erreurs.forEach((e, i) => console.error(`   ${i + 1}. ${e}`));
  process.exit(1);
}

console.log(`✅ Configuration valide : ${config.slug}`);
console.log(`   "${config.titre}" (${config.auteur})`);
console.log(`   ${config.langueSource} → ${config.langueCible} · ${config.niveau}`);
