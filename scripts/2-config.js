// Usage: node scripts/2-config.js <slug> [langueCible]
// Génère automatiquement le fichier de config JSON à partir du chapters.json extrait.
// Utilise Mistral pour détecter la langue source, l'auteur et le niveau CECRL.
// langueCible : optionnel, défaut "fr" (ex: "de", "en", "es"…)
// Produit : _source/pending/<slug>.json

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const config = require('./config');
const { avecRetry } = require('./lib/retry');

const [,, slug, langueCibleArg] = process.argv;
if (!slug) {
  console.error('❌ Usage: node scripts/2-config.js <slug> [langueCible]');
  process.exit(1);
}

const langueCible  = langueCibleArg || 'fr';
const chaptersPath = path.join(config.tmpDir, slug, 'chapters.json');
const outputPath   = path.join(config.pendingDir, `${slug}.json`);

if (!fs.existsSync(chaptersPath)) {
  console.error(`❌ Fichier introuvable : ${chaptersPath}`);
  console.error('   Lancez d\'abord l\'étape 1 (extraction docx)');
  process.exit(1);
}

// Idempotent : on ne régénère pas si le fichier existe déjà (pas besoin de la clé)
if (fs.existsSync(outputPath)) {
  console.log(`ℹ️  Config existante conservée : ${outputPath}`);
  const existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  console.log(`   "${existing.titre}" (${existing.auteur}) · ${existing.langueSource} → ${existing.langueCible} · ${existing.niveau}`);
  process.exit(0);
}

const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
if (!MISTRAL_KEY) {
  console.error('❌ MISTRAL_API_KEY manquante. Ajoute-la dans .env ou dans les secrets GitHub.');
  process.exit(1);
}

async function appelMistral(prompt) {
  return avecRetry(async () => {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const err  = new Error(`Mistral HTTP ${response.status}: ${body.slice(0, 200)}`);
      err.status = response.status;
      throw err;
    }
    const json = await response.json();
    return json.choices[0].message.content;
  }, { maxTentatives: 3, delaiInitial: 5000 });
}

// Couleurs de couverture par niveau CECRL — du plus clair (A1) au plus sombre (C2)
// Le slug sert à départager les livres d'un même niveau (variation d'indice).
const COULEURS_PAR_NIVEAU = {
  A1: ['#A8D5A2', '#B5D5C5', '#A8C5B5'],
  A2: ['#89B4CC', '#7FAEC8', '#9DC4D8'],
  B1: ['#A599C2', '#9B8FBF', '#B0A8CC'],
  B2: ['#C9A87C', '#C4A882', '#BFA070'],
  C1: ['#8B7355', '#7A6548', '#9A8060'],
  C2: ['#5C4033', '#4A3020', '#6A4A3A'],
};

async function main() {
  const { titreDoc, chapitres } = JSON.parse(fs.readFileSync(chaptersPath, 'utf-8'));

  // Extraire un échantillon de texte (premiers ~1200 caractères du premier chapitre)
  const echantillon = chapitres
    .slice(0, 2)
    .flatMap(ch => ch.paragraphes)
    .join(' ')
    .slice(0, 1200);

  console.log(`🤖 Analyse du document via Mistral...`);
  console.log(`   Titre détecté dans le docx : "${titreDoc}"`);

  const languesNoms = {
    fr: 'French', en: 'English', de: 'German', es: 'Spanish',
    ru: 'Russian', it: 'Italian', pt: 'Portuguese', nl: 'Dutch',
    zh: 'Chinese', ja: 'Japanese',
  };
  const langueCibleNom = languesNoms[langueCible] ?? langueCible;

  const prompt = `You are analyzing a literary text to extract metadata for a language learning app.

Document title (may be empty or unreliable): "${titreDoc}"
Text sample (~1200 characters):
"""
${echantillon}
"""

The translation language (langueCible) is: ${langueCibleNom} (${langueCible})

Return a JSON object with these fields:
- "titre": the book title translated into ${langueCibleNom} (e.g., if langueCible is French: "Maître et Serviteur"; if English: "Master and Man")
- "titreOriginal": the book title in the original language (e.g., "Хозяин и работник", "The Picture of Dorian Gray")
- "auteur": the author's name in standard display form (e.g., "Carlos Ruiz Zafón", "Leo Tolstoy", "Oscar Wilde")
- "auteurOriginal": the author's name in the original language/script (e.g., "Лев Николаевич Толстой")
- "langueSource": ISO 639-1 code of the TEXT language (e.g., "es", "ru", "en", "de", "fr", "it", "pt")
- "niveau": CEFR level of this text for a language learner (A1, A2, B1, B2, C1, or C2)
- "niveauNote": one short sentence IN ENGLISH explaining the level choice (vocabulary, syntax complexity)

Return ONLY valid JSON, no markdown, no extra text.`;

  const responseText = await appelMistral(prompt);
  let detected;
  try {
    detected = JSON.parse(responseText);
  } catch (e) {
    console.error('❌ Réponse Mistral non parseable :', responseText);
    process.exit(1);
  }

  const langueSource = detected.langueSource || 'en';
  const auteur       = detected.auteur || '';
  const titre        = detected.titre || titreDoc || slug;
  const titreOriginal = detected.titreOriginal || titreDoc || slug;

  // Validation langue source
  const languesDispos = require('./config/langues');
  if (!languesDispos[langueSource]) {
    console.error(`❌ Langue source détectée "${langueSource}" non supportée.`);
    console.error(`   Langues disponibles : ${Object.keys(languesDispos).join(', ')}`);
    process.exit(1);
  }

  console.log(`   Titre       : ${titre}`);
  console.log(`   Titre orig. : ${titreOriginal}`);
  console.log(`   Auteur      : ${auteur}`);
  console.log(`   Langue      : ${langueSource}`);
  console.log(`   Niveau CECRL: ${detected.niveau}`);

  // Couleur basée sur le niveau CECRL, le slug départage les livres d'un même niveau
  const palette = COULEURS_PAR_NIVEAU[detected.niveau] ?? COULEURS_PAR_NIVEAU['B2'];
  const idx = slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % palette.length;
  const couvertureCouleur = palette[idx];

  const livreConfig = {
    slug,
    titre,
    titreOriginal,
    auteur:           auteur,
    auteurOriginal:   detected.auteurOriginal || auteur,
    langueSource,
    langueCible,
    niveau:           detected.niveau   || 'B2',
    niveauNote:       detected.niveauNote || '',
    gratuit:          true,
    couvertureCouleur,
  };

  fs.mkdirSync(config.pendingDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(livreConfig, null, 2));
  console.log(`✅ Config générée → ${outputPath}`);
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err.message);
  process.exit(1);
});
