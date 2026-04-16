// Usage: node scripts/1b-segment.js <slug> <langueSource>
// Segmente les paragraphes Word en blocs de lecture courts (1-2 phrases max).
// - Si un paragraphe est court (≤2 phrases estimées) → gardé tel quel
// - Si un paragraphe est long → Mistral le découpe en phrases individuelles
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

// Estime le nombre de phrases dans un texte (ponctuation de fin de phrase)
function compterPhrases(texte) {
  const fins = texte.match(/[.!?…»]+(\s|$)/g);
  return fins ? fins.length : 1;
}

// Découpe un paragraphe long en phrases individuelles via Mistral
async function decouperParagraphe(texte) {
  const prompt = `You are processing a paragraph from a literary text for a language learning app.

Task: split this paragraph into individual sentences. Each sentence becomes its own reading unit.
Rules:
- Never merge two sentences into one unit.
- A dialogue line starting with — or - is one unit.
- Keep punctuation attached to the sentence it belongs to.
- Return each sentence exactly as written, do not rephrase or summarize.

Return JSON: {"phrases": ["sentence 1", "sentence 2", ...]}
Return ONLY valid JSON.

Paragraph:
${texte}`;

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

    const phrases = parsed.phrases;
    if (!Array.isArray(phrases) || phrases.length === 0) {
      throw new Error('Réponse Mistral invalide : "phrases" attendu');
    }
    return phrases.filter(p => p && p.trim().length > 0);

  }, { maxTentatives: 3, delaiInitial: 5000 });
}

// Traite un chapitre : paragraphes courts → gardés tels quels, longs → découpés par Mistral
async function segmenterChapitre(paragraphesWord) {
  const SEUIL_PHRASES = 2; // au-delà de ce nombre de phrases → on découpe
  const blocs = [];

  for (const para of paragraphesWord) {
    const nbPhrases = compterPhrases(para);
    if (nbPhrases <= SEUIL_PHRASES) {
      // Paragraphe court : on le garde tel quel
      blocs.push(para);
    } else {
      // Paragraphe long : on demande à Mistral de le découper
      try {
        const phrases = await decouperParagraphe(para);
        blocs.push(...phrases);
      } catch (err) {
        // Fallback : garder le paragraphe entier plutôt que de perdre du contenu
        console.warn(`      ⚠️  Découpage échoué (${err.message}) — paragraphe gardé entier`);
        blocs.push(para);
      }
    }
  }

  return blocs;
}

// ── Traitement ────────────────────────────────────────────────────────────────

async function main() {
  const { titreDoc, chapitres } = JSON.parse(fs.readFileSync(chaptersPath, 'utf-8'));

  console.log(`✂️  Segmentation en phrases : "${titreDoc}"`);
  console.log(`   ${chapitres.length} chapitre(s) à traiter (paragraphes longs → découpés par Mistral)`);


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

    const blocs = await segmenterChapitre(paragraphesWord);
    console.log(`      → ${blocs.length} blocs de lecture`);

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
