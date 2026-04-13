// Usage: node scripts/2-split.js <slug> <langueSource>
// Découpe le texte brut en chapitres et paragraphes

const fs = require('fs');
const path = require('path');
const config = require('./config');

const [,, slug, langueSource] = process.argv;

if (!slug || !langueSource) {
  console.error('❌ Usage: node scripts/2-split.js <slug> <langueSource>');
  process.exit(1);
}

if (!config.langues[langueSource]) {
  console.error(`❌ Langue source inconnue: ${langueSource}`);
  process.exit(1);
}

// Utiliser le texte nettoyé par Mistral s'il existe, sinon le texte brut
const cleanPath = path.join(config.tmpDir, slug, 'raw-clean.txt');
const inputPath = fs.existsSync(cleanPath) ? cleanPath : path.join(config.tmpDir, slug, 'raw.txt');
const outputPath = path.join(config.tmpDir, slug, 'split.json');

if (!fs.existsSync(inputPath)) {
  console.error(`❌ Fichier introuvable : ${inputPath}`);
  console.error('   Lancez d\'abord l\'étape 1 (extraction PDF)');
  process.exit(1);
}

console.log(`   Source : ${path.basename(inputPath)}`);
const texte = fs.readFileSync(inputPath, 'utf-8');

// ── Patterns de détection des chapitres ──────────────────────────────────────
//
// Chaque entrée :
//   re               : regex testée sur chaque ligne (sans les espaces en début/fin)
//   filter(m)        : filtre optionnel pour exclure les faux positifs
//   construireTitre  : fabrique le titre affiché dans l'app (ex: "Chapter IV")
//
// L'ordre est important : les patterns les plus spécifiques en premier.

const PATTERNS_CHAPITRES = [
  // "CHAPTER IV", "Chapter 4", "CHAPTER IV — The Title", "Chapter 4: Subtitle"
  {
    re: /^(CHAPTER|CHAPITRE|KAPITTEL|KAPITEL|CAPITOLO|CAP[IÍ]TULO)\s+([IVXLCDM]+|\d+)(?:\s*[:.\u2014\u2013\-]\s*(.+))?$/i,
    construireTitre: (m) => m[3] ? `${m[1]} ${m[2]} — ${m[3].trim()}` : `${m[1]} ${m[2]}`,
  },
  // "PART I", "Part One", "PARTIE I", "PARTE I"
  {
    re: /^(PART|PARTIE|PARTE|TEIL)\s+([IVXLCDM]+|\d+|\w+)(?:\s*[:.\u2014\u2013\-]\s*(.+))?$/i,
    construireTitre: (m) => m[3] ? `${m[1]} ${m[2]} — ${m[3].trim()}` : `${m[1]} ${m[2]}`,
  },
  // Russe : "Глава I", "ГЛАВА первая", "Часть первая", "Раздел 1"
  {
    re: /^(ГЛАВА|Глава|ЧАСТЬ|Часть|РАЗДЕЛ|Раздел)\s+(.+?)(?:\s*[\u2014\u2013]\s*(.+))?$/,
    construireTitre: (m) => m[3] ? `${m[1]} ${m[2]} — ${m[3].trim()}` : `${m[1]} ${m[2]}`,
  },
  // Chiffres romains seuls sur une ligne : I, II, III, IV, V... (jusqu'à LXXX)
  // On exclut les lignes d'un seul "I" isolé qui pourrait être un pronom anglais.
  {
    re: /^(I{2,3}|IV|VI{0,3}|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX|XXI{0,3}|XXIV|XXV|XXVI{0,3}|XXIX|XXX|XL|L|LI{0,3}|LX{0,3})$/,
    construireTitre: (m) => `Chapitre ${m[1]}`,
  },
  // Chiffre romain I seul, uniquement si précédé/suivi d'une ligne vide (contexte fiable)
  {
    re: /^I$/,
    construireTitre: () => 'Chapitre I',
  },
  // Chiffres arabes seuls sur une ligne : 1, 2, 3... (max 3 chiffres)
  {
    re: /^(\d{1,3})\.?$/,
    construireTitre: (m) => `Chapitre ${m[1]}`,
  },
];

// ── Détection des chapitres ────────────────────────────────────────────────────

/**
 * Découpe le texte en chapitres à partir des marqueurs de chapitre détectés.
 * Retourne un tableau de { id, titre, titreOriginal, texte }.
 * Si aucun marqueur trouvé → 1 seul chapitre avec tout le texte.
 */
function detecterChapitres(texte) {
  const lignes = texte.split('\n');
  const marqueurs = [];
  let pos = 0;

  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i].trim();
    const longueurLigne = lignes[i].length + 1; // +1 pour \n

    if (ligne.length > 0 && ligne.length < 80) { // Les titres sont courts
      for (const pattern of PATTERNS_CHAPITRES) {
        const m = ligne.match(pattern.re);
        if (m) {
          marqueurs.push({
            posHeader: pos,                        // début de la ligne de titre
            posContenu: pos + longueurLigne,       // début du contenu (après le titre)
            titre: pattern.construireTitre(m),
            titreOriginal: ligne,
          });
          break;
        }
      }
    }

    pos += longueurLigne;
  }

  if (marqueurs.length === 0) {
    // Aucun marqueur → tout le texte = 1 seul chapitre
    console.log('   ⚠️  Aucun marqueur de chapitre détecté → 1 seul chapitre');
    return [{
      id: 'chapitre-01',
      titre: 'Chapitre 1',
      titreOriginal: 'Chapter 1',
      texte: texte.trim(),
    }];
  }

  // Trier par position dans le texte
  marqueurs.sort((a, b) => a.posHeader - b.posHeader);

  // Dédupliquer : ignorer les marqueurs avec moins de 300 caractères de contenu
  // avant le suivant (évite les tables des matières ou listes de titres)
  const uniques = [marqueurs[0]];
  for (let i = 1; i < marqueurs.length; i++) {
    const contenuEntreDeux = marqueurs[i].posHeader - uniques[uniques.length - 1].posContenu;
    if (contenuEntreDeux > 300) {
      uniques.push(marqueurs[i]);
    }
  }

  // Construire les chapitres
  const chapitres = [];

  // S'il y a du contenu substantiel AVANT le premier marqueur (préface, dédicace...)
  if (uniques[0].posHeader > 500) {
    chapitres.push({
      id: 'chapitre-00',
      titre: 'Préface',
      titreOriginal: 'Preface',
      texte: texte.slice(0, uniques[0].posHeader).trim(),
    });
  }

  for (let i = 0; i < uniques.length; i++) {
    const debutContenu = uniques[i].posContenu;
    const finContenu = i + 1 < uniques.length ? uniques[i + 1].posHeader : texte.length;
    const num = String(chapitres.length + 1).padStart(2, '0');

    chapitres.push({
      id: `chapitre-${num}`,
      titre: uniques[i].titre,
      titreOriginal: uniques[i].titreOriginal,
      texte: texte.slice(debutContenu, finContenu).trim(),
    });
  }

  return chapitres;
}

// ── Nettoyage et découpage en blocs de texte ─────────────────────────────────

/**
 * Découpe un texte en blocs propres (séparés par une ligne vide).
 */
function decouper(texte) {
  return texte
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Réunir les coupures de mots en fin de ligne (ex: "hap-\npiness" → "happiness")
    .replace(/(\w)-\n(\w)/g, '$1$2')
    // Sauts de page → séparateur de blocs
    .replace(/\f/g, '\n\n')
    // Séparer par double saut de ligne
    .split(/\n{2,}/)
    .map(bloc => bloc.replace(/[ \t]+/g, ' ').trim())
    .filter(bloc => {
      if (bloc.length < 10) return false;
      if (/^\d+$/.test(bloc)) return false;
      if (/^[IVXLCDM]{1,8}$/.test(bloc)) return false;
      if (bloc.length < 50 && bloc === bloc.toUpperCase() && /[A-Z]/.test(bloc)) return false;
      return true;
    });
}

// ── Traitement ────────────────────────────────────────────────────────────────

console.log('✂️  Découpage en chapitres et phrases...');

const chapitres = detecterChapitres(texte);
console.log(`   ${chapitres.length} chapitre(s) détecté(s)`);

const result = chapitres
  .filter(ch => decouper(ch.texte).length > 0)
  .map(ch => {
    const paragraphes = decouper(ch.texte).map((bloc, i) => ({
      id: `p${i + 1}`,
      [langueSource]: bloc,
    }));

    console.log(`   ${ch.id} "${ch.titre}" : ${paragraphes.length} paragraphes`);

    return {
      id: ch.id,
      titre: ch.titre,
      titreOriginal: ch.titreOriginal,
      paragraphes,
    };
  });

const totalParas = result.reduce((sum, ch) => sum + ch.paragraphes.length, 0);

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`\n✅ ${result.length} chapitres, ${totalParas} paragraphes → ${outputPath}`);
