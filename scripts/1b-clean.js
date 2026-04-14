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

// ── Protection des titres de chapitres ────────────────────────────────────────
// Transforme les titres potentiels en marqueurs AVANT l'envoi à Mistral,
// pour éviter que Mistral les confonde avec des numéros de page et les supprime.
// On se base sur le contexte : une ligne courte entourée de lignes vides.

function protégerChapitres(texte) {
  const lignes = texte.split('\n');
  const résultat = [];

  for (let i = 0; i < lignes.length; i++) {
    const ligneRaw = lignes[i];
    const ligne = ligneRaw.trim();
    const avant  = i > 0              ? lignes[i - 1].replace(/\f/g, '').trim() : '';
    const après  = i < lignes.length - 1 ? lignes[i + 1].replace(/\f/g, '').trim() : '';

    // Condition : ligne isolée (entourée de lignes vides)
    const isolée = avant === '' && après === '';

    if (isolée && ligne.length > 0) {
      // Exclure les numéros de page : ceux-ci apparaissent dans le raw.txt
      // à proximité des sauts de page (\f). On vérifie une fenêtre de 5 lignes.
      const fenêtre = lignes.slice(Math.max(0, i - 5), Math.min(lignes.length, i + 6)).join('');
      const prèsDePageBreak = fenêtre.includes('\f');

      // Les mots-clés explicites sont toujours des chapitres, même en bas de page
      const motCléExplicite = /^(CHAPTER|CHAPITRE|KAPITTEL|KAPITEL|CAPITOLO|CAP[IÍ]TULO|ГЛАВА|ЧАСТЬ)\s+/i.test(ligne);

      if (motCléExplicite) {
        résultat.push(`<<<CHAPITRE_${ligne}>>>`);
        continue;
      }

      if (!prèsDePageBreak) {
        // Chiffre arabe seul (1–99)
        if (/^\d{1,2}$/.test(ligne)) {
          résultat.push(`<<<CHAPITRE_Chapitre ${ligne}>>>`);
          continue;
        }
        // Chiffre romain seul (II à LXXX, I exclu car ambigu avec pronom anglais)
        if (/^(I{2,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX|XXI{0,3}|XXIV|XXV|XXVI{0,3}|XXIX|XXX|XL|L|LI{0,3}|LX{0,3})$/i.test(ligne)) {
          résultat.push(`<<<CHAPITRE_Chapitre ${ligne.toUpperCase()}>>>`);
          continue;
        }
      }
    }

    résultat.push(ligneRaw);
  }

  return résultat.join('\n');
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

CHAPTERS:
8. Lines that look like <<<CHAPITRE_...>>> are chapter markers. Preserve them EXACTLY as-is on their own line — do NOT modify, translate, or remove them.

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
  const texteProtégé = protégerChapitres(texte);
  const blocs = splitEnBlocs(texteProtégé);
  console.log(`🧹 Nettoyage du texte via Mistral (${blocs.length} blocs)...`);

  const blocsNettoyés = [];

  for (let i = 0; i < blocs.length; i++) {
    process.stdout.write(`\r   ${i + 1}/${blocs.length} blocs traités`);

    const nettoyé = await nettoyerBloc(blocs[i]);
    blocsNettoyés.push(nettoyé);
    // Respecter le rate limit du free tier (~1 req/s)
    if (i < blocs.length - 1) {
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  const texteNettoyé = blocsNettoyés.filter(b => b.length > 0).join('\n\n');
  fs.writeFileSync(outputPath, texteNettoyé);
  console.log(`\n✅ Texte nettoyé → ${outputPath}`);
}

main().catch(err => {
  console.error('\n❌ Erreur fatale:', err.message);
  process.exit(1);
});
