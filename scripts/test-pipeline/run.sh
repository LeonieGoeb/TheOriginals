#!/usr/bin/env bash
# Test local du pipeline PDF → chapitres
#
# Usage:
#   bash scripts/test-pipeline/run.sh <slug> [options]
#
# Options:
#   --skip-extract   Utilise le raw.txt existant (évite de relancer pdfminer)
#   --skip-clean     Utilise le raw-clean.txt existant (évite l'appel Mistral)
#   --only-markers   Affiche seulement les marqueurs détectés dans raw.txt, sans appeler Mistral
#
# Exemples :
#   bash scripts/test-pipeline/run.sh la-ciudad-de-vapor
#   bash scripts/test-pipeline/run.sh la-ciudad-de-vapor --skip-clean
#   bash scripts/test-pipeline/run.sh la-ciudad-de-vapor --only-markers

set -euo pipefail

SLUG="${1:-}"
SKIP_EXTRACT=false
SKIP_CLEAN=false
ONLY_MARKERS=false

if [ -z "$SLUG" ]; then
  echo "❌ Usage: bash scripts/test-pipeline/run.sh <slug> [--skip-extract] [--skip-clean] [--only-markers]"
  exit 1
fi

for arg in "${@:2}"; do
  case "$arg" in
    --skip-extract) SKIP_EXTRACT=true ;;
    --skip-clean)   SKIP_CLEAN=true ;;
    --only-markers) ONLY_MARKERS=true ;;
  esac
done

TMP="scripts/tmp/$SLUG"
PDF="_source/pending/$SLUG.pdf"
CONFIG="_source/pending/$SLUG.json"
mkdir -p "$TMP"

# ── Lecture de la config ────────────────────────────────────────────────────
if [ ! -f "$CONFIG" ]; then
  echo "❌ Config introuvable : $CONFIG"
  exit 1
fi
LANGUE_SOURCE=$(node -e "console.log(require('./$CONFIG').langueSource)")
LANGUE_CIBLE=$(node  -e "console.log(require('./$CONFIG').langueCible)")
echo "📚 Livre   : $SLUG"
echo "   Langue source : $LANGUE_SOURCE  →  cible : $LANGUE_CIBLE"
echo ""

# ── Étape 0 : extraction PDF ────────────────────────────────────────────────
if [ "$SKIP_EXTRACT" = true ] && [ -f "$TMP/raw.txt" ]; then
  echo "⏭  Extraction ignorée (raw.txt existant)"
else
  if [ ! -f "$PDF" ]; then
    echo "❌ PDF introuvable : $PDF"
    exit 1
  fi
  echo "📄 Extraction du PDF avec pdfminer..."
  python3 - "$PDF" "$TMP/raw.txt" <<'PYEOF'
import sys
from pdfminer.high_level import extract_text
text = extract_text(sys.argv[1])
with open(sys.argv[2], 'w', encoding='utf-8') as f:
    f.write(text)
PYEOF
  CHARS=$(wc -c < "$TMP/raw.txt")
  LINES=$(wc -l < "$TMP/raw.txt")
  echo "   ✅ raw.txt : $LINES lignes, $CHARS caractères"
fi

echo ""

# ── Inspection des marqueurs dans raw.txt ───────────────────────────────────
echo "🔍 Marqueurs <<...>> dans raw.txt :"
MARKERS=$(grep -n "<<" "$TMP/raw.txt" 2>/dev/null || true)
if [ -z "$MARKERS" ]; then
  echo "   ⚠️  Aucun marqueur << trouvé dans raw.txt"
  echo "   → Vérifiez que le PDF contient bien vos marqueurs <<Chapitre X>>"
else
  echo "$MARKERS" | while IFS= read -r line; do
    echo "   $line"
  done
fi

echo ""

if [ "$ONLY_MARKERS" = true ]; then
  echo "✅ Mode --only-markers : arrêt ici."
  exit 0
fi

# ── Étape 1b : nettoyage Mistral ────────────────────────────────────────────
if [ "$SKIP_CLEAN" = true ]; then
  # Simuler uniquement la conversion des marqueurs manuels (sans Mistral)
  echo "⏭  Nettoyage Mistral ignoré — conversion des marqueurs <<>> uniquement"
  node -e "
    const fs = require('fs');
    let t = fs.readFileSync('$TMP/raw.txt', 'utf-8');
    t = t.replace(/<<([^>]+)>>/g, (_, titre) => '<<<CHAPITRE_' + titre.trim() + '>>>');
    fs.writeFileSync('$TMP/raw-clean.txt', t);
    console.log('   ✅ raw-clean.txt généré avec marqueurs convertis');
  "
else
  if [ -z "${MISTRAL_API_KEY:-}" ]; then
    if [ -f ".env" ]; then
      export $(grep -v '^#' .env | grep MISTRAL_API_KEY | xargs) 2>/dev/null || true
    fi
  fi
  if [ -z "${MISTRAL_API_KEY:-}" ]; then
    echo "⚠️  MISTRAL_API_KEY absente — conversion des marqueurs uniquement, sans nettoyage Mistral"
    node -e "
      const fs = require('fs');
      let t = fs.readFileSync('$TMP/raw.txt', 'utf-8');
      t = t.replace(/<<([^>]+)>>/g, (_, titre) => '<<<CHAPITRE_' + titre.trim() + '>>>');
      fs.writeFileSync('$TMP/raw-clean.txt', t);
    "
  else
    echo "🧹 Nettoyage Mistral..."
    node scripts/1b-clean.js "$SLUG"
  fi
fi

echo ""

# ── Inspection des marqueurs dans raw-clean.txt ─────────────────────────────
echo "🔍 Marqueurs <<<CHAPITRE_...>>> dans raw-clean.txt :"
CLEAN_MARKERS=$(grep -n "<<<CHAPITRE_" "$TMP/raw-clean.txt" 2>/dev/null || true)
if [ -z "$CLEAN_MARKERS" ]; then
  echo "   ⚠️  Aucun marqueur <<<CHAPITRE_>>> trouvé dans raw-clean.txt"
  echo "   → Mistral n'a pas converti vos <<Chapitre X>> — vérifiez le prompt"
else
  echo "$CLEAN_MARKERS" | while IFS= read -r line; do
    echo "   $line"
  done
fi

echo ""

# ── Étape 2 : découpage en chapitres ────────────────────────────────────────
echo "✂️  Découpage en chapitres..."
node scripts/2-split.js "$SLUG" "$LANGUE_SOURCE"

echo ""
echo "📊 Résumé du split.json :"
node -e "
const data = require('./$TMP/split.json');
data.forEach(ch => {
  const total = ch.paragraphes.length;
  const preview = (ch.paragraphes[0]?.['$LANGUE_SOURCE'] ?? '').slice(0, 80);
  console.log('   ' + ch.id + '  \"' + ch.titre + '\"  →  ' + total + ' paragraphe(s)');
  if (preview) console.log('      ' + preview + '...');
});
"
