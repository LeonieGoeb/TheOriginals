// Usage: node scripts/1-ocr.js <slug>
// Extrait et nettoie le texte d'un PDF via Mistral OCR.
// Remplace 1-extract.sh + 1b-clean.js.

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const config = require('./config');
const { avecRetry } = require('./lib/retry');

const [,, slug] = process.argv;

if (!slug) {
  console.error('❌ Usage: node scripts/1-ocr.js <slug>');
  process.exit(1);
}

const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
if (!MISTRAL_KEY) {
  console.error('❌ MISTRAL_API_KEY manquante. Ajoute-la dans .env ou dans les secrets GitHub.');
  process.exit(1);
}

const pdfPath    = path.join(config.pendingDir, `${slug}.pdf`);
const outputPath = path.join(config.tmpDir, slug, 'raw-clean.txt');

if (!fs.existsSync(pdfPath)) {
  console.error(`❌ PDF introuvable : ${pdfPath}`);
  process.exit(1);
}

fs.mkdirSync(path.join(config.tmpDir, slug), { recursive: true });

// ── Conversion des marqueurs manuels ──────────────────────────────────────────
// Si le PDF contient des <<Titre>> ajoutés à la main, on les convertit
// en <<<CHAPITRE_Titre>>> reconnus par 2-split.js.

function convertirMarqueursManuels(texte) {
  return texte.replace(/<<([^>]+)>>/g, (_, titre) => `<<<CHAPITRE_${titre.trim()}>>>`);
}

// ── Appel Mistral OCR ──────────────────────────────────────────────────────────

async function main() {
  console.log(`📄 Lecture du PDF : ${pdfPath}`);
  const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');
  const tailleMo  = (Buffer.byteLength(pdfBase64, 'base64') / 1024 / 1024).toFixed(1);
  console.log(`   Taille : ${tailleMo} Mo`);

  console.log('🔍 OCR via Mistral...');

  const result = await avecRetry(async () => {
    const response = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_url',
          document_url: `data:application/pdf;base64,${pdfBase64}`,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const err  = new Error(`Mistral OCR HTTP ${response.status}: ${body.slice(0, 200)}`);
      err.status = response.status;
      throw err;
    }

    return response.json();
  }, { maxTentatives: 3, delaiInitial: 5000 });

  const pages = result.pages ?? [];
  console.log(`   ${pages.length} page(s) traitée(s)`);

  // Concatener le markdown de toutes les pages
  const texte = pages.map(p => p.markdown ?? '').join('\n\n');

  // Convertir les marqueurs manuels éventuels
  const texteConverti = convertirMarqueursManuels(texte);

  fs.writeFileSync(outputPath, texteConverti);
  console.log(`✅ Texte extrait → ${outputPath} (${texteConverti.length} caractères)`);
}

main().catch(err => {
  console.error('\n❌ Erreur fatale:', err.message);
  process.exit(1);
});
