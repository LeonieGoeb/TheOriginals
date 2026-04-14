#!/usr/bin/env bash
# Test local du pipeline docx → chapitres segmentés
#
# Usage:
#   bash scripts/test-pipeline/run.sh <slug> [options]
#
# Options:
#   --skip-extract   Utilise le chapters.json existant (évite de relancer mammoth)
#   --skip-config    Utilise le config JSON existant (évite l'appel Mistral)
#   --skip-segment   Utilise le split.json existant (évite l'appel Mistral de segmentation)
#
# Exemples :
#   bash scripts/test-pipeline/run.sh la-ciudad-de-vapor
#   bash scripts/test-pipeline/run.sh la-ciudad-de-vapor --skip-extract
#   bash scripts/test-pipeline/run.sh la-ciudad-de-vapor --skip-extract --skip-config

set -euo pipefail

FILENAME="${1:-}"
SKIP_EXTRACT=false
SKIP_CONFIG=false
SKIP_SEGMENT=false

if [ -z "$FILENAME" ]; then
  echo "❌ Usage: bash scripts/test-pipeline/run.sh <slug[--lang]> [--skip-extract] [--skip-config] [--skip-segment]"
  exit 1
fi

for arg in "${@:2}"; do
  case "$arg" in
    --skip-extract) SKIP_EXTRACT=true ;;
    --skip-config)  SKIP_CONFIG=true ;;
    --skip-segment) SKIP_SEGMENT=true ;;
  esac
done

# Extraire la langue cible depuis le suffixe --<lang> (ex: my-book--de → de)
# Le suffixe est normalisé en tiret simple dans le slug (my-book--de → my-book-de)
# pour garantir l'unicité : my-book (fr) et my-book-de (de) coexistent sans conflit.
if [[ "$FILENAME" =~ --([a-z]{2})$ ]]; then
  LANGUE_CIBLE="${BASH_REMATCH[1]}"
  BASE="${FILENAME%--${LANGUE_CIBLE}}"
  SLUG="${BASE}-${LANGUE_CIBLE}"
else
  LANGUE_CIBLE="fr"
  SLUG="$FILENAME"
fi

TMP="scripts/tmp/$SLUG"
DOCX="_source/pending/$SLUG.docx"
CONFIG="_source/pending/$SLUG.json"
mkdir -p "$TMP"

echo "📚 Livre : $SLUG  (langue cible : $LANGUE_CIBLE)"
echo ""

# ── Charger MISTRAL_API_KEY depuis .env si absent ───────────────────────────
if [ -z "${MISTRAL_API_KEY:-}" ] && [ -f ".env" ]; then
  export $(grep -v '^#' .env | grep MISTRAL_API_KEY | xargs) 2>/dev/null || true
fi

# ── Étape 1 : extraction docx → chapters.json ───────────────────────────────
if [ "$SKIP_EXTRACT" = true ] && [ -f "$TMP/chapters.json" ]; then
  echo "⏭  Extraction ignorée (chapters.json existant)"
else
  if [ ! -f "$DOCX" ]; then
    echo "❌ Docx introuvable : $DOCX"
    exit 1
  fi
  echo "📖 Extraction du docx via mammoth..."
  node scripts/1-extract.js "$SLUG"
fi

echo ""

# Afficher un résumé du chapters.json
echo "📊 Résumé du chapters.json :"
node -e "
const data = require('./$TMP/chapters.json');
console.log('   Titre : \"' + data.titreDoc + '\"');
console.log('   ' + data.chapitres.length + ' chapitre(s) :');
data.chapitres.forEach((ch, i) => {
  console.log('   ' + (i+1) + '. \"' + (ch.titre ?? '(intro)') + '\" — ' + ch.paragraphes.length + ' paragraphe(s) Word');
});
"

echo ""

# ── Étape 2 : génération du config JSON ─────────────────────────────────────
if [ "$SKIP_CONFIG" = true ] && [ -f "$CONFIG" ]; then
  echo "⏭  Config ignorée (fichier existant)"
  LANGUE_SOURCE=$(node -e "console.log(require('./$CONFIG').langueSource)")
  LANGUE_CIBLE=$(node  -e "console.log(require('./$CONFIG').langueCible)")
  echo "   Langue source : $LANGUE_SOURCE  →  cible : $LANGUE_CIBLE"
else
  if [ -z "${MISTRAL_API_KEY:-}" ]; then
    echo "❌ MISTRAL_API_KEY manquante — impossible de générer la config"
    exit 1
  fi
  echo "🤖 Génération du config JSON via Mistral..."
  node scripts/2-config.js "$SLUG" "$LANGUE_CIBLE"
  LANGUE_SOURCE=$(node -e "console.log(require('./$CONFIG').langueSource)")
  LANGUE_CIBLE=$(node  -e "console.log(require('./$CONFIG').langueCible)")
fi

echo ""

# ── Étape 1b : segmentation sémantique ──────────────────────────────────────
if [ "$SKIP_SEGMENT" = true ] && [ -f "$TMP/split.json" ]; then
  echo "⏭  Segmentation ignorée (split.json existant)"
else
  if [ -z "${MISTRAL_API_KEY:-}" ]; then
    echo "❌ MISTRAL_API_KEY manquante — impossible de segmenter"
    exit 1
  fi
  echo "✂️  Segmentation sémantique via Mistral..."
  node scripts/1b-segment.js "$SLUG" "$LANGUE_SOURCE"
fi

echo ""

# ── Résumé du split.json ─────────────────────────────────────────────────────
echo "📊 Résumé du split.json :"
node -e "
const data = require('./$TMP/split.json');
data.forEach(ch => {
  const total   = ch.paragraphes.length;
  const preview = (ch.paragraphes[0]?.['$LANGUE_SOURCE'] ?? '').slice(0, 80);
  console.log('   ' + ch.id + '  \"' + ch.titre + '\"  →  ' + total + ' bloc(s)');
  if (preview) console.log('      ' + preview + '...');
});
const totalParas = data.reduce((s, ch) => s + ch.paragraphes.length, 0);
console.log('');
console.log('   Total : ' + data.length + ' chapitres, ' + totalParas + ' blocs de lecture');
"
