// Usage: node scripts/3-translate.js <slug> <langueSource> <langueCible>
// Traduit les paragraphes phrase par phrase via DeepL, avec reprise automatique sur rate limit

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const config = require('./config');
const Checkpoint = require('./lib/checkpoint');
const { avecRetry, ErreurQuotaMensuel } = require('./lib/retry');
const langues = require('./config/langues');

const [,, slug, langueSource, langueCible] = process.argv;

if (!slug || !langueSource || !langueCible) {
  console.error('❌ Usage: node scripts/3-translate.js <slug> <langueSource> <langueCible>');
  process.exit(1);
}

if (!langues[langueSource]) {
  console.error(`❌ Langue source inconnue: ${langueSource}`);
  console.error(`   Langues disponibles: ${Object.keys(langues).join(', ')}`);
  process.exit(1);
}
if (!langues[langueCible]) {
  console.error(`❌ Langue cible inconnue: ${langueCible}`);
  process.exit(1);
}

const DEEPL_KEY = process.env.DEEPL_API_KEY?.trim();
if (!DEEPL_KEY) {
  console.error('❌ DEEPL_API_KEY manquante. Ajoute-la dans .env ou dans les secrets GitHub.');
  process.exit(1);
}

// Endpoint selon le type de clé : les clés gratuites finissent par ":fx"
const estCleGratuite = DEEPL_KEY.endsWith(':fx');
const DEEPL_ENDPOINT = estCleGratuite
  ? 'https://api-free.deepl.com/v2/translate'
  : 'https://api.deepl.com/v2/translate';
console.log(`   Clé : ...${DEEPL_KEY.slice(-6)} (${estCleGratuite ? 'gratuit' : 'payant'})`);

const deeplSource = langues[langueSource].deeplCode;
const deeplCible  = langues[langueCible].deeplCode;

const inputPath  = path.join(config.tmpDir, slug, 'split.json');
const outputPath = path.join(config.tmpDir, slug, 'translated.json');
const checkpoint = new Checkpoint(slug, 'translate');

if (!fs.existsSync(inputPath)) {
  console.error(`❌ Fichier introuvable : ${inputPath}`);
  console.error('   Lancez d\'abord l\'étape 2 (split)');
  process.exit(1);
}

// Charger les données depuis split.json, puis tenter une reprise depuis translated.json.
// La reprise n'est valide que si le texte source de chaque paragraphe est identique ;
// sinon le split.json a changé (nouvelle segmentation) et on repart de zéro.
let data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
if (fs.existsSync(outputPath)) {
  const cache = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  const extraireTextes = (chapitres) =>
    chapitres.flatMap(ch => ch.paragraphes.map(p => p[langueSource] ?? '')).join('\x00');
  if (extraireTextes(data) === extraireTextes(cache)) {
    data = cache;
    console.log('♻️  Reprise depuis la sauvegarde existante');
  } else {
    console.log('⚠️  Texte source modifié — nouvelle traduction complète');
  }
}

// ── Appel DeepL ────────────────────────────────────────────────────────────────

async function traduire(texte) {
  return avecRetry(async () => {
    const response = await fetch(DEEPL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: texte,
        source_lang: deeplSource,
        target_lang: deeplCible,
        formality: 'prefer_more',
      }).toString(),
    });

    if (!response.ok) {
      const err = new Error(`DeepL HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const json = await response.json();
    return json.translations[0].text;
  }, {
    maxTentatives: 10,
    delaiInitial: 5000,
    onRateLimit: () => {
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log('   💾 Progression sauvegardée');
    },
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const paras  = data.flatMap(ch => ch.paragraphes);
  const total  = paras.length;
  let traduits = paras.filter(p => p[langueCible]).length;

  console.log(`🌍 Traduction ${langueSource.toUpperCase()} → ${langueCible.toUpperCase()} (DeepL)`);
  console.log(`   Endpoint : ${DEEPL_ENDPOINT}`);
  console.log(`   ${traduits}/${total} phrases déjà traduites`);

  for (const chapitre of data) {
    for (const para of chapitre.paragraphes) {
      if (para[langueCible]) continue;

      para[langueCible] = await traduire(para[langueSource]);
      traduits++;
      process.stdout.write(`\r   ${traduits}/${total} phrases traduites`);

      if (traduits % 5 === 0) {
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      }

      await new Promise(r => setTimeout(r, 300));
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  checkpoint.terminer();
  console.log(`\n✅ Traduction terminée → ${outputPath}`);
}

main().catch(err => {
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  if (err instanceof ErreurQuotaMensuel) {
    const traduits = data.flatMap(ch => ch.paragraphes).filter(p => p[langueCible]).length;
    const total    = data.flatMap(ch => ch.paragraphes).length;
    console.error('\n\n💾 Quota mensuel DeepL épuisé.');
    console.error(`   Progression sauvegardée : ${traduits}/${total} phrases traduites.`);
    console.error('\n📅 Le quota DeepL se réinitialise le 1er de chaque mois.');
    console.error('   Relancez le pipeline GitHub Actions le mois prochain — il reprendra là où il s\'est arrêté.\n');
    process.exit(2);
  }

  console.error('\n❌ Erreur fatale:', err.message);
  process.exit(1);
});
