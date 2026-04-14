// Usage: node scripts/1b-clean.js <slug>
// Nettoie le texte brut extrait du PDF via Mistral AI :
//   - Réassemble les mots coupés en fin de ligne
//   - Rejoint les attributions de dialogue séparées ("—dijo." sur sa propre ligne)
//   - Supprime les espaces et sauts de ligne parasites dans les phrases
//   - Conserve les séparations de paragraphes

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { avecRetry } = require('./lib/retry');

const [,, slug] = process.argv;

if (!slug) {
  console.error('❌ Usage: node scripts/1b-clean.js <slug>');
  process.exit(1);
}

const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
if (!MISTRAL_KEY) {
  console.error('❌ MISTRAL_API_KEY manquante. Ajoute-la dans .env ou dans les secrets GitHub.');
  process.exit(1);
}

const inputPath  = path.join(config.tmpDir, slug, 'raw.txt');
const outputPath = path.join(config.tmpDir, slug, 'raw-clean.txt');

if (!fs.existsSync(inputPath)) {
  console.error(`❌ Fichier introuvable : ${inputPath}`);
  console.error('   Lancez d\'abord l\'étape 1 (extraction PDF)');
  process.exit(1);
}

const texte = fs.readFileSync(inputPath, 'utf-8');

// ── Conversion des marqueurs manuels ──────────────────────────────────────────
// Si le PDF contient des marqueurs <<Titre>> ajoutés manuellement,
// on les convertit immédiatement en <<<CHAPITRE_Titre>>> avant tout traitement.

function convertirMarqueursManuels(texte) {
  return texte.replace(/<<([^>]+)>>/g, (_, titre) => `<<<CHAPITRE_${titre.trim()}>>>`);
}

// ── Découpage en blocs ─────────────────────────────────────────────────────────
// On envoie ~1500 caractères par appel pour rester dans les limites du free tier
// tout en donnant assez de contexte à Mistral.

function splitEnBlocs(texte, tailleMax = 1500) {
  const paragraphes = texte.split(/\n{2,}/);
  const blocs = [];
  let courant = '';

  for (const para of paragraphes) {
    if (courant.length + para.length > tailleMax && courant.length > 0) {
      blocs.push(courant.trim());
      courant = para;
    } else {
      courant += (courant ? '\n\n' : '') + para;
    }
  }
  if (courant.trim()) blocs.push(courant.trim());
  return blocs;
}

// ── Appel Mistral ──────────────────────────────────────────────────────────────

const PROMPT_SYSTEME = `You are a text cleaning assistant. Your only job is to fix formatting issues in text extracted from PDF files. You must NEVER translate, summarize, rewrite or alter the content in any way. Return only the cleaned text.`;

const PROMPT_NETTOYAGE = `Clean this PDF-extracted literary text. Apply these rules:

FIXING:
1. Rejoin words broken across lines with a hyphen (e.g. "ca-\\nsa" → "casa")
2. Fix spurious spaces within words caused by PDF extraction
3. Join lines that are clearly part of the same sentence (no punctuation at end of line)

DIALOGUE:
4. Join dialogue attribution back to its dialogue line (e.g. "—Hola.\\n—dijo." → "—Hola —dijo.")
5. Group consecutive sentences spoken/narrated by the same character into one paragraph
6. Each change of speaker or narrator = new paragraph (blank line between)

REMOVING:
7. Remove ALL non-story content: page numbers, print markers (e.g. "T-La Ciudad de Vapor.indd 22 5/10/20 11:08"), running headers, publisher info, copyright notices, and any other editorial/technical metadata.

If there is no story text at all in the input, return exactly: [EMPTY]

Return ONLY the cleaned story text, nothing else.

Text:
`;

async function nettoyerBloc(bloc) {
  return avecRetry(async () => {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        temperature: 0,
        messages: [
          { role: 'system', content: PROMPT_SYSTEME },
          { role: 'user', content: PROMPT_NETTOYAGE + bloc },
        ],
      }),
    });

    if (!response.ok) {
      const err = new Error(`Mistral HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const json = await response.json();
    const contenu = json.choices[0].message.content.trim();
    if (contenu === '[EMPTY]' || contenu.startsWith('There is no')) return '';
    return contenu;
  }, {
    maxTentatives: 5,
    delaiInitial: 2000,
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const texteConverti = convertirMarqueursManuels(texte);

  // Séparer le texte sur les marqueurs de chapitre.
  // Les marqueurs ne sont JAMAIS envoyés à Mistral : on les isole, on nettoie
  // uniquement le contenu entre eux, puis on recolle.
  const parties = texteConverti.split(/(<<<CHAPITRE_[^>]+>>>)/);
  // parties = [avant_ch1, "<<<CHAPITRE_...>>>", contenu_ch1, "<<<CHAPITRE_...>>>", ...]

  // Compter le nombre total de blocs de contenu à traiter
  const contenuParties = parties.filter((_, i) => !parties[i].startsWith('<<<CHAPITRE_'));
  const totalBlocs = contenuParties.reduce((n, p) => n + splitEnBlocs(p.trim()).length, 0);
  console.log(`🧹 Nettoyage du texte via Mistral (${totalBlocs} blocs)...`);

  let blocsTraités = 0;
  const résultat = [];

  for (const partie of parties) {
    if (partie.startsWith('<<<CHAPITRE_')) {
      // Marqueur de chapitre : préservé tel quel, jamais envoyé à Mistral
      résultat.push(partie);
      continue;
    }

    const blocs = splitEnBlocs(partie.trim());
    for (const bloc of blocs) {
      process.stdout.write(`\r   ${++blocsTraités}/${totalBlocs} blocs traités`);
      const nettoyé = await nettoyerBloc(bloc);
      if (nettoyé) résultat.push(nettoyé);
      if (blocsTraités < totalBlocs) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }
  }

  const texteNettoyé = résultat.filter(b => b.length > 0).join('\n\n');
  fs.writeFileSync(outputPath, texteNettoyé);
  console.log(`\n✅ Texte nettoyé → ${outputPath}`);
}

main().catch(err => {
  console.error('\n❌ Erreur fatale:', err.message);
  process.exit(1);
});
