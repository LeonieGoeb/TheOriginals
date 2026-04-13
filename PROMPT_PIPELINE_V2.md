# PROMPT_PIPELINE_V2.md — Pipeline automatisé universel

> Lis CONTEXTE.md en premier.
> Ce prompt remplace PROMPT_PIPELINE.md.
> Tu vas construire un pipeline robuste, universel, et piloté par GitHub Actions.

---

## Vision d'ensemble

```
Utilisateur pousse PDF + config.json
          │
          ▼
    GitHub Actions
          │
    ┌─────┴──────────────────────────┐
    │  1. pdftotext (extraction)     │  ← outil système, pas d'IA
    │  2. split.js  (paragraphes)    │  ← script Node.js
    │  3. translate.js (DeepL API)   │  ← API, pas d'IA générative
    │  4. annotate.py (spaCy)        │  ← NLP local, pas d'IA générative
    │  5. generate.js (→ .ts)        │  ← script Node.js
    └─────────────────────────────────┘
          │
          ▼
    Commit automatique des fichiers .ts
          │
          ▼
    Pull Request créée automatiquement
          │
          ▼
    Utilisateur merge → livre disponible dans l'app
```

Tout se passe sur GitHub. L'utilisateur n'a besoin que d'un navigateur.

---

## PARTIE 1 — Configuration universelle des langues

### 1.1 `scripts/config/langues.js`

```javascript
// Langues supportées par le pipeline
// Ajouter une langue = ajouter une entrée ici

module.exports = {
  ru: {
    nom: 'Russe',
    deeplCode: 'RU',
    spaCyModel: 'ru_core_news_sm',
    installCmd: 'python -m spacy download ru_core_news_sm',
  },
  en: {
    nom: 'Anglais',
    deeplCode: 'EN',
    spaCyModel: 'en_core_web_sm',
    installCmd: 'python -m spacy download en_core_web_sm',
  },
  fr: {
    nom: 'Français',
    deeplCode: 'FR',
    spaCyModel: 'fr_core_news_sm',
    installCmd: 'python -m spacy download fr_core_news_sm',
  },
  de: {
    nom: 'Allemand',
    deeplCode: 'DE',
    spaCyModel: 'de_core_news_sm',
    installCmd: 'python -m spacy download de_core_news_sm',
  },
  es: {
    nom: 'Espagnol',
    deeplCode: 'ES',
    spaCyModel: 'es_core_news_sm',
    installCmd: 'python -m spacy download es_core_news_sm',
  },
  it: {
    nom: 'Italien',
    deeplCode: 'IT',
    spaCyModel: 'it_core_news_sm',
    installCmd: 'python -m spacy download it_core_news_sm',
  },
  pt: {
    nom: 'Portugais',
    deeplCode: 'PT',
    spaCyModel: 'pt_core_news_sm',
    installCmd: 'python -m spacy download pt_core_news_sm',
  },
  nl: {
    nom: 'Néerlandais',
    deeplCode: 'NL',
    spaCyModel: 'nl_core_news_sm',
    installCmd: 'python -m spacy download nl_core_news_sm',
  },
  zh: {
    nom: 'Chinois',
    deeplCode: 'ZH',
    spaCyModel: 'zh_core_web_sm',
    installCmd: 'python -m spacy download zh_core_web_sm',
  },
  ja: {
    nom: 'Japonais',
    deeplCode: 'JA',
    spaCyModel: 'ja_core_news_sm',
    installCmd: 'python -m spacy download ja_core_news_sm',
  },
};
```

### 1.2 `scripts/config/niveaux.js`

```javascript
module.exports = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
```

### 1.3 `scripts/config/index.js`

```javascript
const langues = require('./langues');
const niveaux = require('./niveaux');

module.exports = {
  langues,
  niveaux,
  tmpDir: './scripts/tmp',
  dataDir: './data',
  pendingDir: './_source/pending',
  processedDir: './_source/processed',
};
```

---

## PARTIE 2 — Fichier de configuration d'un livre

Pour ajouter un livre, l'utilisateur crée deux fichiers dans `_source/pending/` :
- `mon-livre.pdf` — le PDF du livre
- `mon-livre.json` — les métadonnées

### Format de `mon-livre.json`

```json
{
  "slug": "mon-livre",
  "titre": "Mon Livre",
  "titreOriginal": "My Book",
  "auteur": "L'Auteur",
  "auteurOriginal": "The Author",
  "langueSource": "en",
  "langueCible": "fr",
  "niveau": "B2",
  "niveauNote": "Prose narrative claire, vocabulaire courant",
  "gratuit": false,
  "couvertureCouleur": "#e8f4f8"
}
```

### Validation du JSON

Crée `scripts/validate-config.js` qui vérifie :
- Tous les champs requis sont présents
- `langueSource` et `langueCible` sont dans `config/langues.js`
- `niveau` est dans `config/niveaux.js`
- `slug` correspond bien au nom du fichier PDF
- Affiche une erreur claire si quelque chose manque

---

## PARTIE 3 — Scripts avec reprise automatique sur limite d'API

### 3.1 Système de checkpoint `scripts/lib/checkpoint.js`

```javascript
// Gestion des points de sauvegarde pour reprendre après une interruption

const fs = require('fs');
const path = require('path');

class Checkpoint {
  constructor(slug, etape) {
    this.slug = slug;
    this.etape = etape;
    this.dir = path.join('./scripts/tmp', slug);
    this.fichier = path.join(this.dir, `checkpoint-${etape}.json`);
    fs.mkdirSync(this.dir, { recursive: true });
  }

  // Charger l'état sauvegardé (ou null si première fois)
  charger() {
    if (!fs.existsSync(this.fichier)) return null;
    try {
      return JSON.parse(fs.readFileSync(this.fichier, 'utf-8'));
    } catch {
      return null;
    }
  }

  // Sauvegarder l'état actuel
  sauvegarder(etat) {
    fs.writeFileSync(this.fichier, JSON.stringify(etat, null, 2));
  }

  // Supprimer le checkpoint (étape terminée avec succès)
  terminer() {
    if (fs.existsSync(this.fichier)) fs.unlinkSync(this.fichier);
  }
}

module.exports = Checkpoint;
```

### 3.2 Gestion des rate limits `scripts/lib/retry.js`

```javascript
// Retry avec backoff exponentiel pour toutes les APIs

const CODES_RATE_LIMIT = [429, 456, 503]; // 456 = DeepL quota dépassé

async function avecRetry(fn, options = {}) {
  const {
    maxTentatives = 10,
    delaiInitial = 2000,      // 2 secondes
    delaiMax = 300000,        // 5 minutes
    facteur = 2,
    onRateLimit = null,       // callback appelé à chaque rate limit
  } = options;

  let delai = delaiInitial;

  for (let tentative = 1; tentative <= maxTentatives; tentative++) {
    try {
      return await fn();
    } catch (err) {
      const estRateLimit =
        CODES_RATE_LIMIT.includes(err.status) ||
        CODES_RATE_LIMIT.includes(err.statusCode) ||
        err.message?.includes('quota') ||
        err.message?.includes('rate limit') ||
        err.message?.includes('Too Many Requests');

      if (!estRateLimit || tentative === maxTentatives) {
        throw err;
      }

      const attente = Math.min(delai, delaiMax);
      const minutes = Math.round(attente / 60000);
      const secondes = Math.round((attente % 60000) / 1000);

      console.log(`\n⏳ Limite d'API atteinte (tentative ${tentative}/${maxTentatives})`);
      console.log(`   Reprise automatique dans ${minutes > 0 ? minutes + 'min ' : ''}${secondes}s...`);

      // Écrire l'heure de reprise dans un fichier pour GitHub Actions
      fs.writeFileSync(
        './scripts/tmp/rate-limit-status.json',
        JSON.stringify({
          tentative,
          maxTentatives,
          repriseAt: new Date(Date.now() + attente).toISOString(),
          attente,
        })
      );

      if (onRateLimit) onRateLimit({ tentative, attente });

      await new Promise(r => setTimeout(r, attente));
      delai = Math.min(delai * facteur, delaiMax);
    }
  }
}

module.exports = { avecRetry };
```

### 3.3 Script de traduction `scripts/3-translate.js` (avec reprise)

```javascript
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const config = require('./config');
const Checkpoint = require('./lib/checkpoint');
const { avecRetry } = require('./lib/retry');
const langues = require('./config/langues');

const [,, slug, langueSource, langueCible] = process.argv;

// Validation des langues
if (!langues[langueSource]) {
  console.error(`❌ Langue source inconnue: ${langueSource}`);
  console.error(`   Langues disponibles: ${Object.keys(langues).join(', ')}`);
  process.exit(1);
}
if (!langues[langueCible]) {
  console.error(`❌ Langue cible inconnue: ${langueCible}`);
  process.exit(1);
}

const DEEPL_KEY = process.env.DEEPL_API_KEY;
if (!DEEPL_KEY) {
  console.error('❌ DEEPL_API_KEY manquante. Ajoute-la dans .env ou dans les secrets GitHub.');
  process.exit(1);
}

const deeplSource = langues[langueSource].deeplCode;
const deeplCible = langues[langueCible].deeplCode;

const inputPath = path.join(config.tmpDir, slug, 'split.json');
const outputPath = path.join(config.tmpDir, slug, 'translated.json');
const checkpoint = new Checkpoint(slug, 'translate');

// Charger les données (depuis checkpoint si existant, sinon depuis split.json)
let data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
if (fs.existsSync(outputPath)) {
  data = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  console.log('♻️  Reprise depuis la sauvegarde existante');
}

async function traduire(texte) {
  return avecRetry(async () => {
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        auth_key: DEEPL_KEY,
        text: texte,
        source_lang: deeplSource,
        target_lang: deeplCible,
        formality: 'prefer_more', // style soutenu pour la littérature
      }).toString(),
    });

    if (!response.ok) {
      const err = new Error(`DeepL HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const json = await response.json();
    return json.translations[0].text;
  }, {
    maxTentatives: 10,
    delaiInitial: 5000,
    onRateLimit: ({ tentative, attente }) => {
      // Sauvegarder immédiatement avant d'attendre
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log('   💾 Progression sauvegardée');
    },
  });
}

async function main() {
  const paras = data.flatMap(ch => ch.paragraphes);
  const total = paras.length;
  let traduits = paras.filter(p => p[langueCible]).length;

  console.log(`📝 ${traduits}/${total} paragraphes déjà traduits`);

  for (const chapitre of data) {
    for (const para of chapitre.paragraphes) {
      if (para[langueCible]) continue; // déjà traduit

      para[langueCible] = await traduire(para[langueSource]);
      traduits++;
      process.stdout.write(`\r   ${traduits}/${total} paragraphes traduits`);

      // Sauvegarde toutes les 5 traductions
      if (traduits % 5 === 0) {
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      }

      // Pause légère entre requêtes (respecter rate limits)
      await new Promise(r => setTimeout(r, 300));
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  checkpoint.terminer();
  console.log(`\n✅ Traduction terminée`);
}

main().catch(err => {
  console.error('\n❌ Erreur fatale:', err.message);
  // Sauvegarder avant de quitter
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  process.exit(1);
});
```

---

## PARTIE 4 — GitHub Actions

### 4.1 Structure des workflows

```
.github/
└── workflows/
    ├── add-book.yml          ← pipeline principal
    └── validate-config.yml   ← validation au push
```

### 4.2 `.github/workflows/validate-config.yml`

Se déclenche immédiatement quand un JSON est poussé dans `_source/pending/`.
Vérifie que la config est valide avant de lancer le pipeline.

```yaml
name: Validate Book Config

on:
  push:
    paths:
      - '_source/pending/*.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Validate config files
        run: |
          for f in _source/pending/*.json; do
            echo "Validating $f..."
            node scripts/validate-config.js "$f"
          done
```

### 4.3 `.github/workflows/add-book.yml`

Pipeline complet. Se déclenche quand un PDF ET son JSON sont poussés ensemble.

```yaml
name: Add Book Pipeline

on:
  push:
    paths:
      - '_source/pending/*.pdf'
  workflow_dispatch:
    inputs:
      slug:
        description: 'Slug du livre à traiter (ex: mon-livre)'
        required: true

jobs:
  pipeline:
    runs-on: ubuntu-latest
    # Timeout long pour les gros livres (6 heures max)
    timeout-minutes: 360

    steps:
      # ── Setup ──────────────────────────────────────────────────────────────
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      # ── Cache pour accélérer les relances ──────────────────────────────────
      - name: Cache node modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}

      - name: Cache spaCy models
        uses: actions/cache@v4
        with:
          path: ~/.local/lib/python3.11/site-packages
          key: ${{ runner.os }}-spacy-models-v2

      - name: Cache pipeline progress
        uses: actions/cache@v4
        with:
          path: scripts/tmp
          key: pipeline-${{ github.run_id }}
          restore-keys: |
            pipeline-

      # ── Installation ───────────────────────────────────────────────────────
      - name: Install Node dependencies
        run: npm ci

      - name: Install system tools
        run: sudo apt-get install -y poppler-utils

      - name: Install Python dependencies
        run: |
          pip install spacy
          # Installer les modèles pour toutes les langues supportées
          python scripts/install-spacy-models.py

      # ── Détection du livre à traiter ───────────────────────────────────────
      - name: Find book to process
        id: find-book
        run: |
          if [ -n "${{ github.event.inputs.slug }}" ]; then
            echo "slug=${{ github.event.inputs.slug }}" >> $GITHUB_OUTPUT
          else
            # Trouver le PDF le plus récemment poussé
            PDF=$(git diff --name-only HEAD~1 HEAD -- '_source/pending/*.pdf' | head -1)
            SLUG=$(basename "$PDF" .pdf)
            echo "slug=$SLUG" >> $GITHUB_OUTPUT
          fi
          echo "📚 Livre à traiter: $SLUG"

      - name: Validate config
        run: node scripts/validate-config.js "_source/pending/${{ steps.find-book.outputs.slug }}.json"

      # ── Pipeline ───────────────────────────────────────────────────────────
      - name: Step 1 - Extract text from PDF
        run: |
          bash scripts/1-extract.sh \
            "_source/pending/${{ steps.find-book.outputs.slug }}.pdf" \
            "${{ steps.find-book.outputs.slug }}"

      - name: Step 2 - Split into paragraphs
        run: |
          CONFIG=$(cat "_source/pending/${{ steps.find-book.outputs.slug }}.json")
          LANGUE_SOURCE=$(echo $CONFIG | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).langueSource))")
          node scripts/2-split.js \
            "${{ steps.find-book.outputs.slug }}" \
            "$LANGUE_SOURCE"

      - name: Step 3 - Translate (with auto-retry on rate limits)
        env:
          DEEPL_API_KEY: ${{ secrets.DEEPL_API_KEY }}
        run: |
          CONFIG=$(cat "_source/pending/${{ steps.find-book.outputs.slug }}.json")
          LANGUE_SOURCE=$(echo $CONFIG | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).langueSource))")
          LANGUE_CIBLE=$(echo $CONFIG | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).langueCible))")
          node scripts/3-translate.js \
            "${{ steps.find-book.outputs.slug }}" \
            "$LANGUE_SOURCE" \
            "$LANGUE_CIBLE"

      - name: Step 4 - Grammatical annotation
        run: |
          CONFIG=$(cat "_source/pending/${{ steps.find-book.outputs.slug }}.json")
          LANGUE_SOURCE=$(echo $CONFIG | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).langueSource))")
          LANGUE_CIBLE=$(echo $CONFIG | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).langueCible))")
          python scripts/4-annotate.py \
            "${{ steps.find-book.outputs.slug }}" \
            "$LANGUE_SOURCE" \
            "$LANGUE_CIBLE"

      - name: Step 5 - Generate TypeScript files
        run: |
          node scripts/5-generate.js \
            "_source/pending/${{ steps.find-book.outputs.slug }}.json"

      # ── Déplacer le PDF dans processed/ ────────────────────────────────────
      - name: Move PDF to processed
        run: |
          mkdir -p _source/processed
          mv "_source/pending/${{ steps.find-book.outputs.slug }}.pdf" _source/processed/
          mv "_source/pending/${{ steps.find-book.outputs.slug }}.json" _source/processed/

      # ── Créer une Pull Request ──────────────────────────────────────────────
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "feat: add book ${{ steps.find-book.outputs.slug }}"
          branch: "add-book/${{ steps.find-book.outputs.slug }}"
          title: "📚 Nouveau livre : ${{ steps.find-book.outputs.slug }}"
          body: |
            ## Nouveau livre ajouté automatiquement

            **Slug :** `${{ steps.find-book.outputs.slug }}`

            ### Avant de merger
            - [ ] Vérifier la qualité de la traduction sur quelques paragraphes
            - [ ] Vérifier les annotations grammaticales (S/V/C)
            - [ ] S'assurer que `data/bibliotheque.ts` a bien été mis à jour
            - [ ] Tester l'app avec `npx expo start`

            ### Ce qui a été généré
            - Fichiers TypeScript dans `data/${{ steps.find-book.outputs.slug }}/`
            - Le livre a été ajouté à `data/bibliotheque.ts`

          labels: "nouveau-livre"

      # ── Notification en cas d'échec ─────────────────────────────────────────
      - name: Save progress on failure
        if: failure()
        uses: actions/cache/save@v4
        with:
          path: scripts/tmp
          key: pipeline-${{ github.run_id }}-failed
```

### 4.4 Script `scripts/install-spacy-models.py`

Installe uniquement les modèles des langues listées dans la config :

```python
# Lit langues.js et installe uniquement les modèles nécessaires
import subprocess
import json
import os

# Langues supportées (à maintenir en sync avec scripts/config/langues.js)
MODELS = {
    'ru': 'ru_core_news_sm',
    'en': 'en_core_web_sm',
    'fr': 'fr_core_news_sm',
    'de': 'de_core_news_sm',
    'es': 'es_core_news_sm',
    'it': 'it_core_news_sm',
    'pt': 'pt_core_news_sm',
    'nl': 'nl_core_news_sm',
}

for lang, model in MODELS.items():
    try:
        import importlib
        importlib.import_module(model.replace('-', '_'))
        print(f"✅ {model} déjà installé")
    except ImportError:
        print(f"📥 Installation de {model}...")
        subprocess.run(['python', '-m', 'spacy', 'download', model], check=True)
```

---

## PARTIE 5 — Script `5-generate.js` universel

Ce script lit le JSON de config pour tout déterminer automatiquement :

```javascript
// Usage: node scripts/5-generate.js <chemin-config.json>

const fs = require('fs');
const path = require('path');
const config = require('./config');

const configPath = process.argv[2];
const livreConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const { slug, titre, titreOriginal, auteur, auteurOriginal,
  langueSource, langueCible, niveau, niveauNote, gratuit,
  couvertureCouleur } = livreConfig;

const inputPath = path.join(config.tmpDir, slug, 'annotated.json');
const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
const outputDir = path.join(config.dataDir, slug);
fs.mkdirSync(outputDir, { recursive: true });

function tokenToTs(token) {
  const type = token.type ? `'${token.type}'` : 'null';
  return `        { text: ${JSON.stringify(token.text)}, type: ${type} }`;
}

function camelCase(str) {
  return str.replace(/-([a-z0-9])/g, (_, l) => l.toUpperCase());
}

// Générer un fichier TypeScript par chapitre
for (const chapitre of data) {
  const paragraphesTs = chapitre.paragraphes.map(para => {
    const tokensSource = (para[`tokens_${langueSource}`] || [])
      .map(tokenToTs).join(',\n');
    const tokensCible = (para[`tokens_${langueCible}`] || [])
      .map(tokenToTs).join(',\n');

    return `    {
      id: '${para.id}',
      textes: {
        ${langueSource}: [
${tokensSource},
        ],
        ${langueCible}: [
${tokensCible},
        ],
      },
    }`;
  }).join(',\n');

  const content =
`import { Chapitre } from '../types';

const ${camelCase(chapitre.id)}: Chapitre = {
  id: '${chapitre.id}',
  titre: ${JSON.stringify(chapitre.titre)},
  titreCyrilique: ${JSON.stringify(chapitre.titre)},
  paragraphes: [
${paragraphesTs},
  ],
};

export default ${camelCase(chapitre.id)};
`;
  fs.writeFileSync(path.join(outputDir, `${chapitre.id}.ts`), content);
  console.log(`   ✅ ${chapitre.id}.ts`);
}

// Générer index.ts
const imports = data.map(ch =>
  `import ${camelCase(ch.id)} from './${ch.id}';`
).join('\n');
const chapArray = data.map(ch => `    ${camelCase(ch.id)}`).join(',\n');

const indexContent =
`import { Livre } from '../types';
${imports}

const ${camelCase(slug)}: Livre = {
  id: '${slug}',
  titre: ${JSON.stringify(titre)},
  titreOriginal: ${JSON.stringify(titreOriginal)},
  auteur: ${JSON.stringify(auteur)},
  auteurOriginal: ${JSON.stringify(auteurOriginal)},
  langueSource: '${langueSource}',
  langueCible: '${langueCible}',
  niveau: '${niveau}',
  niveauNote: ${JSON.stringify(niveauNote || '')},
  gratuit: ${gratuit},
  couvertureCouleur: ${JSON.stringify(couvertureCouleur || '#f5efe3')},
  chapitres: [
${chapArray},
  ],
};

export default ${camelCase(slug)};
`;
fs.writeFileSync(path.join(outputDir, 'index.ts'), indexContent);

// Mettre à jour data/bibliotheque.ts automatiquement
const bibPath = path.join(config.dataDir, 'bibliotheque.ts');
let bibContent = fs.readFileSync(bibPath, 'utf-8');

const importLine = `import ${camelCase(slug)} from './${slug}';`;
const itemLine = `  ${camelCase(slug)},`;

if (!bibContent.includes(importLine)) {
  // Ajouter l'import après le dernier import existant
  bibContent = bibContent.replace(
    /(import .+ from '.+';)\n(\nexport)/,
    `$1\n${importLine}\n$2`
  );
  // Ajouter le livre dans le tableau
  bibContent = bibContent.replace(
    /\];\s*$/,
    `${itemLine}\n];`
  );
  fs.writeFileSync(bibPath, bibContent);
  console.log(`   ✅ data/bibliotheque.ts mis à jour`);
}

console.log('\n✅ Génération terminée');
```

---

## PARTIE 6 — Secrets GitHub à configurer

Dans votre dépôt GitHub : **Settings → Secrets and variables → Actions → New repository secret**

| Nom | Valeur | Obligatoire |
|-----|--------|-------------|
| `DEEPL_API_KEY` | Votre clé DeepL | ✅ |

---

## PARTIE 7 — Workflow utilisateur final

Une fois le pipeline en place, ajouter un livre se fait **entièrement depuis GitHub** :

```
1. Créer _source/pending/mon-livre.json  (métadonnées)
2. Uploader _source/pending/mon-livre.pdf
3. git add . && git commit && git push
        │
        ▼
   GitHub Actions se déclenche automatiquement
        │
        ▼
   Pipeline tourne (extraction → traduction → annotation → génération)
        │
        ▼
   Pull Request créée automatiquement
        │
        ▼
   Vous relisez, puis vous mergez
        │
        ▼
   Livre disponible dans l'app
```

---

## Ordre de construction

```
1.  scripts/config/langues.js
2.  scripts/config/niveaux.js
3.  scripts/config/index.js
4.  scripts/lib/checkpoint.js
5.  scripts/lib/retry.js
6.  scripts/validate-config.js
7.  scripts/install-spacy-models.py
8.  scripts/1-extract.sh
9.  scripts/2-split.js
10. scripts/3-translate.js  (avec retry intégré)
11. scripts/4-annotate.py   (universel, toutes langues)
12. scripts/5-generate.js   (lit le JSON de config)
13. .github/workflows/validate-config.yml
14. .github/workflows/add-book.yml
15. Tester en local avec un petit PDF (2-3 pages)
16. Configurer le secret DEEPL_API_KEY sur GitHub
17. Tester le pipeline GitHub Actions complet
18. Mettre à jour CONTEXTE.md
```

---

## Notes importantes

- **Les PDFs ne doivent pas être committés** si ils sont volumineux ou protégés.
  Ajouter `_source/pending/*.pdf` et `_source/processed/*.pdf` au `.gitignore` si nécessaire.
  Dans ce cas, l'upload se fait directement via l'interface GitHub (drag & drop).

- **Le cache GitHub Actions** conserve la progression entre les relances.
  Si le pipeline échoue à l'étape traduction (quota DeepL), il suffit de le relancer :
  il reprendra exactement où il s'était arrêté.

- **La Pull Request** permet de vérifier la qualité avant publication.
  Ne pas merger sans avoir relu quelques paragraphes.
