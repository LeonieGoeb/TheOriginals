// Usage: node scripts/2-config.js <slug>
// Génère automatiquement le fichier de config JSON à partir du chapters.json extrait.
// Utilise Mistral pour détecter la langue, l'auteur et le niveau CECRL.
// Produit : _source/pending/<slug>.json

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const config = require('./config');
const { avecRetry } = require('./lib/retry');

const [,, slug] = process.argv;
if (!slug) {
  console.error('❌ Usage: node scripts/2-config.js <slug>');
  process.exit(1);
}

const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
if (!MISTRAL_KEY) {
  console.error('❌ MISTRAL_API_KEY manquante. Ajoute-la dans .env ou dans les secrets GitHub.');
  process.exit(1);
}

const chaptersPath = path.join(config.tmpDir, slug, 'chapters.json');
const outputPath   = path.join(config.pendingDir, `${slug}.json`);

if (!fs.existsSync(chaptersPath)) {
  console.error(`❌ Fichier introuvable : ${chaptersPath}`);
  console.error('   Lancez d\'abord l\'étape 1 (extraction docx)');
  process.exit(1);
}

// Idempotent : on ne régénère pas si le fichier existe déjà
if (fs.existsSync(outputPath)) {
  console.log(`ℹ️  Config existante conservée : ${outputPath}`);
  const existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  console.log(`   "${existing.titre}" (${existing.auteur}) · ${existing.langueSource} → ${existing.langueCible} · ${existing.niveau}`);
  process.exit(0);
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

// Couleurs de couverture déterministes basées sur le slug
const COULEURS_COUVERTURE = [
  '#8B4513', '#2F4F4F', '#4B0082', '#8B0000',
  '#006400', '#191970', '#800000', '#5C4033',
  '#1C3A5E', '#3D2B1F',
];

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

  const prompt = `You are analyzing a literary text to extract metadata for a language learning app.

Document title: "${titreDoc}"
Text sample (~1200 characters):
"""
${echantillon}
"""

Return a JSON object with these fields:
- "auteur": the author's name in French display form (e.g., "Carlos Ruiz Zafón", "Léon Tolstoï", "Oscar Wilde")
- "auteurOriginal": the author's name in the original language/form (same as auteur if no transliteration needed)
- "langueSource": ISO 639-1 code of the TEXT language (e.g., "es", "ru", "en", "de", "fr", "it", "pt")
- "niveau": CEFR level of this text for a language learner (A1, A2, B1, B2, C1, or C2)
- "niveauNote": one short sentence in French explaining the level choice (vocabulary, syntax complexity)

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

  // Validation langue source
  const languesDispos = require('./config/langues');
  if (!languesDispos[langueSource]) {
    console.error(`❌ Langue source détectée "${langueSource}" non supportée.`);
    console.error(`   Langues disponibles : ${Object.keys(languesDispos).join(', ')}`);
    process.exit(1);
  }

  console.log(`   Auteur      : ${auteur}`);
  console.log(`   Langue      : ${langueSource}`);
  console.log(`   Niveau CECRL: ${detected.niveau}`);

  // Couleur déterministe basée sur le slug
  const idx = slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % COULEURS_COUVERTURE.length;
  const couvertureCouleur = COULEURS_COUVERTURE[idx];

  const livreConfig = {
    slug,
    titre:            titreDoc,
    titreOriginal:    titreDoc,
    auteur:           auteur,
    auteurOriginal:   detected.auteurOriginal || auteur,
    langueSource,
    langueCible:      'fr',
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
