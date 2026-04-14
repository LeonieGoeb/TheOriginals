// Usage: node scripts/1b-segment.js <slug> <langueSource>
// Segmente les paragraphes Word en blocs de lecture sémantiques (~3-5 phrases)
// en utilisant Mistral pour regrouper intelligemment les paragraphes.
//
// Lit    : scripts/tmp/<slug>/chapters.json
// Produit: scripts/tmp/<slug>/split.json

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const config = require('./config');
const { avecRetry } = require('./lib/retry');

const [,, slug, langueSource] = process.argv;
if (!slug || !langueSource) {
  console.error('❌ Usage: node scripts/1b-segment.js <slug> <langueSource>');
  process.exit(1);
}

const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
if (!MISTRAL_KEY) {
  console.error('❌ MISTRAL_API_KEY manquante. Ajoute-la dans .env ou dans les secrets GitHub.');
  process.exit(1);
}

const chaptersPath = path.join(config.tmpDir, slug, 'chapters.json');
const outputPath   = path.join(config.tmpDir, slug, 'split.json');

if (!fs.existsSync(chaptersPath)) {
  console.error(`❌ Fichier introuvable : ${chaptersPath}`);
  console.error('   Lancez d\'abord l\'étape 1 (extraction docx)');
  process.exit(1);
}

// ── Reprise automatique ────────────────────────────────────────────────────────
// Si un split.json partiel existe, on le charge et on saute les chapitres déjà traités.
let resultExistant = [];
const chapitresDejaFaits = new Set();
if (fs.existsSync(outputPath)) {
  try {
    resultExistant = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    resultExistant.forEach(ch => chapitresDejaFaits.add(ch.id));
    console.log(`♻️  Reprise : ${chapitresDejaFaits.size} chapitre(s) déjà segmenté(s)`);
  } catch (e) { /* fichier corrompu, on repart de zéro */ }
}

// ── Appel Mistral ──────────────────────────────────────────────────────────────

async function segmenterChapitre(paragraphesWord) {
  // Fallback naïf si le chapitre est très court
  if (paragraphesWord.length <= 3) {
    return [paragraphesWord.join(' ')];
  }

  // Numéroter les paragraphes pour que Mistral puisse les référencer
  const numbered = paragraphesWord.map((p, i) => `[${i}] ${p}`).join('\n');

  const prompt = `You are processing a chapter of a literary text for a language learning app.
The chapter has been split into Word paragraph blocks (labeled [0], [1], [2]...).

Task: group consecutive blocks into semantic reading units of 3-5 sentences each.
Rules:
- Never split a sentence across groups.
- Keep dialogue exchanges (lines starting with — or -) together in one group.
- Respect natural scene or topic changes as group boundaries.
- Each group should be a coherent reading unit, not too short (>1 sentence) and not too long.

Return JSON: {"blocs": ["full text of group 1", "full text of group 2", ...]}
Each string = the concatenated text of the grouped blocks (joined with a single space).
Do NOT include the [N] labels in the output. Return ONLY valid JSON.

Chapter paragraphs:
${numbered}`;

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
    const content = json.choices[0].message.content;
    const parsed  = JSON.parse(content);

    const blocs = parsed.blocs;
    if (!Array.isArray(blocs) || blocs.length === 0) {
      throw new Error('Réponse Mistral invalide : "blocs" attendu');
    }
    return blocs.filter(b => b && b.trim().length > 0);

  }, { maxTentatives: 3, delaiInitial: 5000 });
}

// ── Fallback naïf : regroupe les paragraphes par lots de N ──────────────────
function segmenterNaif(paragraphes, tailleGroupe = 3) {
  const blocs = [];
  for (let i = 0; i < paragraphes.length; i += tailleGroupe) {
    blocs.push(paragraphes.slice(i, i + tailleGroupe).join(' '));
  }
  return blocs;
}

// ── Traitement ────────────────────────────────────────────────────────────────

async function main() {
  const { titreDoc, chapitres } = JSON.parse(fs.readFileSync(chaptersPath, 'utf-8'));

  console.log(`✂️  Segmentation sémantique via Mistral : "${titreDoc}"`);
  console.log(`   ${chapitres.length} chapitre(s) à traiter`);

  const result = [...resultExistant];
  let numChapitre = 0;

  for (let i = 0; i < chapitres.length; i++) {
    const ch = chapitres[i];

    // ID du chapitre : la préface garde chapitre-00 et ne consomme pas de numéro
    const prefaceCandidate = ch.titre === null && i === 0;
    let idChapitre;
    if (prefaceCandidate) {
      idChapitre = 'chapitre-00';
    } else {
      numChapitre++;
      idChapitre = `chapitre-${String(numChapitre).padStart(2, '0')}`;
    }
    const titre = ch.titre ?? 'Préface';

    if (chapitresDejaFaits.has(idChapitre)) {
      console.log(`   ⏭  ${idChapitre} "${titre}" (déjà segmenté)`);
      continue;
    }

    // Filtrer les paragraphes vides
    const paragraphesWord = ch.paragraphes.filter(p => p && p.trim().length > 5);

    if (paragraphesWord.length === 0) {
      console.log(`   ⚠️  ${idChapitre} "${titre}" — aucun paragraphe, ignoré`);
      continue;
    }

    console.log(`   📖 ${idChapitre} "${titre}" — ${paragraphesWord.length} paragraphes Word...`);

    let blocs;
    try {
      blocs = await segmenterChapitre(paragraphesWord);
      console.log(`      → ${blocs.length} blocs de lecture (via Mistral)`);
    } catch (err) {
      console.warn(`      ⚠️  Mistral échoué (${err.message}) — fallback naïf`);
      blocs = segmenterNaif(paragraphesWord);
      console.log(`      → ${blocs.length} blocs de lecture (fallback naïf)`);
    }

    const paragraphes = blocs.map((bloc, j) => ({
      id: `p${j + 1}`,
      [langueSource]: bloc,
    }));

    result.push({
      id: idChapitre,
      titre,
      titreOriginal: ch.titre ?? titre,
      paragraphes,
    });

    // Sauvegarde intermédiaire après chaque chapitre
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    // Délai poli entre chapitres pour respecter le rate limit Mistral
    if (i < chapitres.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const totalParas = result.reduce((s, ch) => s + ch.paragraphes.length, 0);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n✅ ${result.length} chapitres, ${totalParas} blocs de lecture → ${outputPath}`);
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err.message);
  process.exit(1);
});
