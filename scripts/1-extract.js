// Usage: node scripts/1-extract.js <slug>
// Extrait les chapitres d'un fichier .docx en utilisant les styles Word.
// Heading1 = titre du livre, Heading2/3 = titres de chapitres, Normal = texte.
// Produit : scripts/tmp/<slug>/chapters.json

const mammoth = require('mammoth');
const fs      = require('fs');
const path    = require('path');
const config  = require('./config');

const [,, slug] = process.argv;
if (!slug) {
  console.error('❌ Usage: node scripts/1-extract.js <slug>');
  process.exit(1);
}

const docxPath   = path.join(config.pendingDir, `${slug}.docx`);
const outputPath = path.join(config.tmpDir, slug, 'chapters.json');

if (!fs.existsSync(docxPath)) {
  console.error(`❌ Fichier introuvable : ${docxPath}`);
  process.exit(1);
}

fs.mkdirSync(path.join(config.tmpDir, slug), { recursive: true });

async function main() {
  console.log(`📖 Extraction du docx : ${docxPath}`);

  // Convertir en HTML en preservant les styles de titres
  const result = await mammoth.convertToHtml({ path: docxPath }, {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
    ],
  });

  // Parser le HTML pour extraire la structure
  const html = result.value;
  const chapitres = [];
  let titreDoc    = '';
  let chapCourant = null;

  // Découper le HTML en blocs (balises ouvrantes comme séparateurs)
  const blocs = html.split(/(?=<h[123]>|<p>)/);

  for (const bloc of blocs) {
    if (!bloc.trim()) continue;

    const h1 = bloc.match(/^<h1>(.*?)<\/h1>/s);
    const h2 = bloc.match(/^<h2>(.*?)<\/h2>/s);
    const h3 = bloc.match(/^<h3>(.*?)<\/h3>/s);
    const p  = bloc.match(/^<p>(.*?)<\/p>/s);

    const nettoyerHtml = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

    // Paragraphe qui ne contient qu'un chiffre romain ou arabe → marqueur de chapitre
    // Accepte aussi les formes avec ponctuation finale : "IX.", "3.", "II ."
    const estMarqueur = t => {
      const clean = t.replace(/[.\s]+$/, '').trim();
      return (clean.length > 0 && /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i.test(clean))
        || /^\d{1,3}$/.test(clean);
    };

    if (h1) {
      const texte = nettoyerHtml(h1[1]);
      if (estMarqueur(texte)) {
        // H1 mal stylé qui est en réalité un marqueur de chapitre
        if (chapCourant && chapCourant.paragraphes.length > 0) chapitres.push(chapCourant);
        chapCourant = { titre: texte, paragraphes: [] };
      } else {
        titreDoc = texte;
      }
    } else if (h2 || h3) {
      // Nouveau chapitre
      if (chapCourant && chapCourant.paragraphes.length > 0) {
        chapitres.push(chapCourant);
      }
      chapCourant = {
        titre: nettoyerHtml((h2 || h3)[1]),
        paragraphes: [],
      };
    } else if (p) {
      const texte = nettoyerHtml(p[1]);
      if (!texte) continue;

      if (estMarqueur(texte)) {
        // Paragraphe normal qui est en réalité un marqueur de chapitre
        if (chapCourant && chapCourant.paragraphes.length > 0) chapitres.push(chapCourant);
        chapCourant = { titre: texte, paragraphes: [] };
        continue;
      }

      if (!chapCourant) {
        // Texte avant le premier chapitre (sous-titre, dédicace…)
        chapCourant = { titre: null, paragraphes: [] };
      }
      chapCourant.paragraphes.push(texte);
    }
  }

  // Ajouter le dernier chapitre
  if (chapCourant && chapCourant.paragraphes.length > 0) {
    chapitres.push(chapCourant);
  }

  // Supprimer le premier chapitre s'il est une préface ou n'a pas de titre,
  // uniquement s'il reste d'autres chapitres après (évite de tout supprimer)
  const TITRES_PREFACE = /^(pr[eé]face|prefacio|pr[oó]logo|prologue|prolog|introduction|avant-propos|foreword|avertissement|note de l['']auteur|note d['']introduction)$/i;
  if (chapitres.length > 1) {
    const premierTitre = chapitres[0].titre;
    if (premierTitre === null || TITRES_PREFACE.test(premierTitre.trim())) {
      chapitres.shift();
      console.log(`   ⚠ Premier chapitre ignoré (préface/intro/null)`);
    }
  }

  console.log(`   Titre du document : "${titreDoc}"`);
  console.log(`   ${chapitres.length} chapitre(s) extrait(s) :`);
  chapitres.forEach((ch, i) => {
    console.log(`   ${i + 1}. "${ch.titre ?? '(intro)'}" — ${ch.paragraphes.length} paragraphe(s) Word`);
  });

  const output = { titreDoc, chapitres };
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`✅ chapters.json → ${outputPath}`);
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err.message);
  process.exit(1);
});
