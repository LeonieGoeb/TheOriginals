# CONTEXTE.md — Rappel de contexte pour Claude Code

> Lis ce fichier en premier à chaque nouvelle session ou après un compactage de contexte.
> Il résume l'état complet du projet.

---

## Ce qu'est ce projet

Application mobile d'apprentissage des langues, construite avec **Expo (SDK 52+)** et **Expo Router v4**.
Langage : **TypeScript strict**.
Pas de backend, pas d'authentification — tout est local sur l'appareil.

L'utilisateur lit un texte dans une langue étrangère (russe, anglais…),
avec la traduction disponible à la demande,
et un mode "analyse grammaticale" qui colorie les mots (Sujet / Verbe / Complément).

Cible : **Android uniquement** pour le MVP. Publication via Google Play (25$ unique).

---

## Ce qui a été construit

### ✅ Phase 1 — MVP Anna Karénine
- `data/types.ts` — types TypeScript (Token, Paragraphe, Chapitre, Livre)
- `data/anna-karenine/chapitre-01.ts` et `chapitre-02.ts`
- `data/anna-karenine/index.ts` + `data/bibliotheque.ts`
- `constants/colors.ts` — palette de couleurs
- `constants/langues.ts` — codes, noms, drapeaux des langues
- `constants/niveaux.ts` — niveaux CECRL (A1 → C2) avec couleurs
- `components/TokenTexte.tsx` — texte avec coloration grammaticale
- `components/ParagraphePaire.tsx` — bloc source + cible avec boutons toggle
- `components/BarreOutils.tsx` — barre sticky avec toggles globaux
- `components/CarteLivre.tsx` — carte dans la bibliothèque (avec drapeaux + badge niveau)
- `components/NiveauBadge.tsx` — badge coloré du niveau CECRL
- `hooks/useLecteur.ts` — logique des toggles (global + par paragraphe)
- `app/index.tsx` — écran bibliothèque avec 3 filtres
- `app/livre/[livreId]/index.tsx` — liste des chapitres avec info niveau
- `app/livre/[livreId]/[chapitreId].tsx` — lecteur de chapitre

### ✅ Phase 2 — Deuxième livre + filtres
- Nouveau livre en anglais → français ajouté (depuis PDF)
- Filtres sur la bibliothèque : "Je parle le" / "J'apprends le" / "Au niveau"
- Préférences persistées avec AsyncStorage

### ✅ Phase 3 — Extension des livres
- Chapitre supplémentaire ajouté à Anna Karénine
- Nouvelle anglaise complétée jusqu'à la fin

### ✅ Phase 4 — Pipeline automatisé
- Scripts dans `scripts/` pour ajouter un livre sans intervention manuelle
- GitHub Actions pour tout piloter depuis GitHub
- Reprise automatique sur les limites d'API (DeepL)

---

## Architecture des données

```typescript
// Un morceau de texte avec sa fonction grammaticale
interface Token {
  text: string;
  type: 's' | 'v' | 'c' | null; // Sujet / Verbe / Complément / texte normal
}

// Un paragraphe contient les textes dans toutes les langues du livre
interface Paragraphe {
  id: string;                        // 'p1', 'p2'...
  textes: Record<string, Token[]>;   // { 'ru': [...], 'fr': [...] }
}

interface Chapitre {
  id: string;            // 'chapitre-01'
  titre: string;         // 'Partie I — Ch. 1'
  titreCyrilique: string;
  paragraphes: Paragraphe[];
}

interface Livre {
  id: string;
  titre: string;
  titreOriginal: string;
  auteur: string;
  auteurOriginal: string;
  langueSource: string;      // 'ru' | 'en' | ...
  langueCible: string;       // 'fr' | 'de' | ...
  niveau: CodeNiveau;        // 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  niveauNote: string;
  gratuit: boolean;
  couvertureCouleur: string;
  chapitres: Chapitre[];
}
```

---

## Palette de couleurs

```
bg:        '#f5efe3'   fond principal (beige chaud)
bgBar:     '#ede3d0'   barre sticky
border:    '#c9b99a'   bordures
textDark:  '#1a1208'   texte principal
textMid:   '#4a3520'   traduction (italique)
textLight: '#7a6040'   texte secondaire
accent:    '#5c4a2a'   accent brun

Sujet :      bg #fdecea / border #cc2020 / text #7a0000
Verbe :      bg #e8eeff / border #1a40bb / text #0d2a8a
Complément : bg #e6f4e8 / border #1a7a30 / text #0f5020
```

---

## Langues supportées

| Code | Nom       | Drapeau | Rôle dans le MVP |
|------|-----------|---------|------------------|
| ru   | Russe     | 🇷🇺     | Langue source     |
| en   | Anglais   | 🇬🇧     | Langue source     |
| fr   | Français  | 🇫🇷     | Langue cible      |
| de   | Allemand  | 🇩🇪     | Langue cible      |

Le pipeline supporte aussi : es, it, pt, nl, zh, ja (ajouter dans `scripts/config/langues.js`).

---

## Filtres de la bibliothèque

Trois filtres pills sur `app/index.tsx`, persistés via AsyncStorage :

| Libellé        | Clé AsyncStorage        | Valeurs possibles         |
|----------------|-------------------------|---------------------------|
| Je parle le    | `app_langue_source`     | `'all'` \| code langue    |
| J'apprends le  | `app_langue_cible`      | `'all'` \| code langue    |
| Au niveau      | `app_niveau_choisi`     | `'all'` \| code CECRL     |

---

## Pipeline d'ajout de livre

### Workflow utilisateur
```
1. Créer _source/pending/mon-livre.json  (métadonnées)
2. Uploader _source/pending/mon-livre.pdf
3. git push
   → GitHub Actions se déclenche automatiquement
   → extraction → traduction (DeepL) → annotation (spaCy) → génération .ts
   → Pull Request créée automatiquement
4. Vérifier la PR, merger
   → livre disponible dans l'app
```

### Scripts
```
scripts/
├── config/
│   ├── index.js       ← config centrale
│   ├── langues.js     ← langues supportées + modèles spaCy + codes DeepL
│   └── niveaux.js     ← niveaux CECRL
├── lib/
│   ├── checkpoint.js  ← sauvegarde de progression
│   └── retry.js       ← retry avec backoff exponentiel sur rate limits
├── 1-extract.sh       ← PDF → texte brut (pdftotext)
├── 2-split.js         ← texte → paragraphes JSON
├── 3-translate.js     ← traduction DeepL (avec reprise automatique)
├── 4-annotate.py      ← annotation grammaticale spaCy
├── 5-generate.js      ← génération fichiers TypeScript
├── validate-config.js ← validation du JSON de config
└── install-spacy-models.py
```

### Format du JSON de config livre
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

### Reprise sur limite d'API
- La traduction sauvegarde toutes les 5 phrases dans `scripts/tmp/<slug>/translated.json`
- Au redémarrage, les paragraphes déjà traduits sont sautés automatiquement
- Le cache GitHub Actions préserve `scripts/tmp/` entre les relances
- Backoff exponentiel : 5s → 10s → 20s → ... → 5min max

### Secret GitHub requis
- `DEEPL_API_KEY` → Settings → Secrets and variables → Actions

---

## Ce qui n'est PAS encore implémenté

- Paiements in-app (RevenueCat) — architecture prévue, non implémentée
- Development build (nécessaire pour RevenueCat)
- Audio / enregistrement vocal
- Authentification / comptes utilisateurs
- Backend ou API

---

## Structure complète du projet

```
mon-app-langues/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx                          ← bibliothèque avec filtres
│   └── livre/[livreId]/
│       ├── _layout.tsx
│       ├── index.tsx                      ← liste des chapitres
│       └── [chapitreId].tsx               ← lecteur
├── components/
│   ├── BarreOutils.tsx
│   ├── CarteLivre.tsx
│   ├── NiveauBadge.tsx
│   ├── ParagraphePaire.tsx
│   └── TokenTexte.tsx
├── constants/
│   ├── colors.ts
│   ├── langues.ts
│   └── niveaux.ts
├── data/
│   ├── types.ts
│   ├── bibliotheque.ts
│   ├── anna-karenine/
│   └── [slug-nouvelle]/
├── hooks/
│   └── useLecteur.ts
├── scripts/                               ← pipeline d'ajout de livre
├── _source/
│   ├── pending/                           ← PDFs + JSONs à traiter
│   └── processed/                         ← PDFs déjà traités
└── .github/workflows/
    ├── add-book.yml
    └── validate-config.yml
```

---

## Si tu ne sais pas où tu en es

1. Lis ce fichier
2. Liste les fichiers existants dans `data/`, `components/`, `scripts/`
3. Lance `npx tsc --noEmit` pour voir s'il y a des erreurs TypeScript
4. Reprends la première tâche non terminée
