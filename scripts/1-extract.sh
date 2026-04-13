#!/usr/bin/env bash
# Usage: bash scripts/1-extract.sh <chemin-pdf> <slug>
# Extrait le texte d'un PDF avec pdftotext (poppler)

set -euo pipefail

PDF_PATH="$1"
SLUG="$2"

if [ -z "$PDF_PATH" ] || [ -z "$SLUG" ]; then
  echo "❌ Usage: bash scripts/1-extract.sh <chemin-pdf> <slug>"
  exit 1
fi

if [ ! -f "$PDF_PATH" ]; then
  echo "❌ PDF introuvable : $PDF_PATH"
  exit 1
fi

# Vérifier que pdftotext est disponible
if ! command -v pdftotext &> /dev/null; then
  echo "❌ pdftotext non trouvé. Installer poppler-utils :"
  echo "   Ubuntu/Debian : sudo apt-get install poppler-utils"
  echo "   macOS         : brew install poppler"
  exit 1
fi

OUT_DIR="./scripts/tmp/$SLUG"
mkdir -p "$OUT_DIR"

OUT_FILE="$OUT_DIR/raw.txt"

echo "📄 Extraction du PDF : $PDF_PATH"
echo "   → $OUT_FILE"

# -layout : tente de préserver la mise en page
# -enc UTF-8 : encodage UTF-8
pdftotext -layout -enc UTF-8 "$PDF_PATH" "$OUT_FILE"

# Vérification
CHARS=$(wc -c < "$OUT_FILE")
LINES=$(wc -l < "$OUT_FILE")

echo "✅ Extraction terminée : $LINES lignes, $CHARS caractères"
