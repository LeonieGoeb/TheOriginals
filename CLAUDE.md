# CLAUDE.md — Spec complète de l'application

> Ce fichier est la référence unique pour construire l'application.
> Lis-le entièrement avant d'écrire la moindre ligne de code.

---

## 1. Contexte du projet

Application mobile d'apprentissage des langues construite avec **Expo (SDK 52+)** et **Expo Router**.
Le MVP se concentre sur un seul livre : **Anna Karénine de Tolstoï**, avec le texte russe et sa traduction française.

L'utilisateur peut :
- Lire le texte russe phrase par phrase
- Afficher/masquer la traduction française (globalement ou par paragraphe)
- Activer un mode "analyse grammaticale" qui colorie les mots selon leur fonction (Sujet / Verbe / Complément)
- Naviguer entre les chapitres
- (à terme) Acheter des livres via les achats in-app — **pas à implémenter dans le MVP**

---

## 2. Stack technique

- **Expo SDK 52+** avec **Expo Router v4** (file-based routing)
- **TypeScript** strict partout
- **React Native** (pas de bibliothèque UI externe — styles faits à la main)
- **expo-sqlite** ou **AsyncStorage** pour la persistance locale (progression, préférences)
- Pas de backend, pas d'authentification, pas de serveur

### Installation des dépendances nécessaires
```bash
npx expo install @react-native-async-storage/async-storage
npx expo install expo-font
npx expo install @expo-google-fonts/cormorant-garamond
```

---

## 3. Design & couleurs

Reproduis fidèlement le style de l'app web existante.

```typescript
export const COLORS = {
  bg:        '#f5efe3',   // fond principal (beige chaud)
  bgBar:     '#ede3d0',   // fond barre sticky
  border:    '#c9b99a',   // bordures
  textDark:  '#1a1208',   // texte principal
  textMid:   '#4a3520',   // traduction (italique)
  textLight: '#7a6040',   // texte secondaire
  accent:    '#5c4a2a',   // accent brun

  // Analyse grammaticale
  subjectBg:     '#fdecea',
  subjectBorder: '#cc2020',
  subjectText:   '#7a0000',

  verbBg:        '#e8eeff',
  verbBorder:    '#1a40bb',
  verbText:      '#0d2a8a',

  complBg:       '#e6f4e8',
  complBorder:   '#1a7a30',
  complText:     '#0f5020',
};
```

Typographie : utilise la police système (San Francisco sur iOS, Roboto sur Android) pour le MVP.
Si tu veux aller plus loin, installe `@expo-google-fonts/cormorant-garamond`.

---

## 4. Structure des données

### 4.1 Type Token

Chaque paragraphe est composé de **tokens** — des morceaux de texte avec un type grammatical optionnel.

```typescript
// data/types.ts

export type TokenType = 's' | 'v' | 'c' | null;

export interface Token {
  text: string;
  type: TokenType; // 's'=Sujet, 'v'=Verbe, 'c'=Complément, null=texte normal
}

export interface Paragraphe {
  id: string;          // ex: "p1", "p2"
  ru: Token[];         // tokens en russe
  fr: Token[];         // tokens en français
}

export interface Chapitre {
  id: string;          // ex: "chapitre-01"
  titre: string;       // ex: "Partie I — Ch. 1"
  titreCyrilique: string; // ex: "Часть первая · I"
  paragraphes: Paragraphe[];
}

export interface Livre {
  id: string;           // ex: "anna-karenine"
  titre: string;        // ex: "Anna Karénine"
  titreOriginal: string;// ex: "Анна Каренина"
  auteur: string;       // ex: "Léon Tolstoï"
  auteurOriginal: string; // ex: "Лев Николаевич Толстой"
  langueSource: string; // ex: "ru"
  langueCible: string;  // ex: "fr"
  chapitres: Chapitre[];
  gratuit: boolean;     // true = accessible sans achat
}
```

### 4.2 Règle de conversion HTML → Token[]

L'HTML source contient des `<span class="s|v|c">` pour marquer les fonctions grammaticales.
Voici comment lire ces spans et les convertir en Token[] :

```
HTML: <span class="s">Все счастливые семьи</span> <span class="v">похожи</span> <span class="c">друг на друга</span>, каждая...

Token[]: [
  { text: "Все счастливые семьи", type: "s" },
  { text: " ", type: null },
  { text: "похожи", type: "v" },
  { text: " ", type: null },
  { text: "друг на друга", type: "c" },
  { text: ", каждая...", type: null },
]
```

**Règle importante** : le texte entre les spans (sans balise) devient un token avec `type: null`.
Conserve la ponctuation et les espaces exactement.

### 4.3 Données du Chapitre 1

Convertis le contenu HTML des fichiers `chapitre-01.html` et `chapitre-02.html` fournis ci-dessous
en fichiers TypeScript de données.

**Fichier à créer : `data/anna-karenine/chapitre-01.ts`**

Voici les 3 premiers paragraphes pour illustrer le format attendu :

```typescript
import { Chapitre } from '../types';

const chapitre01: Chapitre = {
  id: 'chapitre-01',
  titre: 'Partie I — Ch. 1',
  titreCyrilique: 'Часть первая · I',
  paragraphes: [
    {
      id: 'p1',
      ru: [
        { text: 'Все счастливые семьи', type: 's' },
        { text: ' ', type: null },
        { text: 'похожи', type: 'v' },
        { text: ' ', type: null },
        { text: 'друг на друга', type: 'c' },
        { text: ', ', type: null },
        { text: 'каждая несчастливая семья', type: 's' },
        { text: ' ', type: null },
        { text: 'несчастлива', type: 'v' },
        { text: ' ', type: null },
        { text: 'по-своему', type: 'c' },
        { text: '.', type: null },
      ],
      fr: [
        { text: 'Toutes les familles heureuses', type: 's' },
        { text: ' ', type: null },
        { text: 'se ressemblent', type: 'v' },
        { text: ' ', type: null },
        { text: 'entre elles', type: 'c' },
        { text: ', ', type: null },
        { text: 'chaque famille malheureuse', type: 's' },
        { text: ' ', type: null },
        { text: 'est malheureuse', type: 'v' },
        { text: ' ', type: null },
        { text: 'à sa façon', type: 'c' },
        { text: '.', type: null },
      ],
    },
    {
      id: 'p2',
      ru: [
        { text: 'Всё', type: 'c' },
        { text: ' ', type: null },
        { text: 'смешалось', type: 'v' },
        { text: ' ', type: null },
        { text: 'в доме Облонских', type: 'c' },
        { text: '.', type: null },
      ],
      fr: [
        { text: 'Tout', type: 'c' },
        { text: ' ', type: null },
        { text: "s'était mêlé", type: 'v' },
        { text: ' ', type: null },
        { text: 'dans la maison des Oblonski', type: 'c' },
        { text: '.', type: null },
      ],
    },
    // ... continue pour tous les paragraphes p3 à p60
  ],
};

export default chapitre01;
```

**Tu dois convertir TOUS les paragraphes** des deux chapitres HTML fournis.
Lis attentivement les fichiers HTML source pour extraire chaque `<span class="s|v|c">` et chaque morceau de texte entre les spans.

### 4.4 Données du livre

**Fichier à créer : `data/anna-karenine/index.ts`**

```typescript
import { Livre } from '../types';
import chapitre01 from './chapitre-01';
import chapitre02 from './chapitre-02';

const annaKarenine: Livre = {
  id: 'anna-karenine',
  titre: 'Anna Karénine',
  titreOriginal: 'Анна Каренина',
  auteur: 'Léon Tolstoï',
  auteurOriginal: 'Лев Николаевич Толстой',
  langueSource: 'ru',
  langueCible: 'fr',
  gratuit: true,
  chapitres: [chapitre01, chapitre02],
};

export default annaKarenine;
```

**Fichier à créer : `data/bibliotheque.ts`** (liste de tous les livres disponibles)

```typescript
import { Livre } from './types';
import annaKarenine from './anna-karenine';

export const BIBLIOTHEQUE: Livre[] = [annaKarenine];
```

---

## 5. Structure des fichiers

```
app/
├── _layout.tsx                  ← Layout racine (Stack navigator)
├── index.tsx                    ← Écran bibliothèque (liste des livres)
└── livre/
    └── [livreId]/
        ├── _layout.tsx          ← Layout du livre (Stack)
        ├── index.tsx            ← Liste des chapitres du livre
        └── [chapitreId].tsx     ← Lecteur de chapitre

components/
├── TokenTexte.tsx               ← Texte avec coloration grammaticale
├── ParagraphePaire.tsx          ← Un bloc ru + fr avec ses boutons
├── BarreOutils.tsx              ← Barre sticky (toggles globaux)
├── CarteLivre.tsx               ← Carte d'un livre dans la bibliothèque
└── LegendePills.tsx             ← Légende S/V/C

data/
├── types.ts
├── bibliotheque.ts
└── anna-karenine/
    ├── index.ts
    ├── chapitre-01.ts
    └── chapitre-02.ts

hooks/
├── usePreferences.ts            ← Persistance AsyncStorage des préférences
└── useLecteur.ts               ← État local du lecteur (toggles)

constants/
└── colors.ts                    ← Toutes les couleurs (voir section 3)
```

---

## 6. Écrans

### 6.1 Écran Bibliothèque — `app/index.tsx`

- Header : "Ma bibliothèque"
- Liste de `CarteLivre` pour chaque livre de `BIBLIOTHEQUE`
- Au tap sur un livre → navigation vers `app/livre/[livreId]/index.tsx`

**`CarteLivre`** affiche :
- Le titre original (cyrillique) en grand
- Le titre français en dessous
- L'auteur
- Un badge "Gratuit" ou "Verrouillé 🔒" selon `livre.gratuit`
- Fond `COLORS.bg`, bordure `COLORS.border`

---

### 6.2 Écran Chapitres — `app/livre/[livreId]/index.tsx`

- Header : titre du livre
- Liste des chapitres sous forme de boutons/lignes
- Chaque ligne : numéro + titre du chapitre
- Au tap → navigation vers `app/livre/[livreId]/[chapitreId].tsx`

---

### 6.3 Écran Lecteur — `app/livre/[livreId]/[chapitreId].tsx`

C'est l'écran principal. Il reproduit fidèlement le comportement de l'app web.

**Structure de l'écran :**
```
┌─────────────────────────────┐
│  BarreOutils (sticky)       │  ← Légende S/V/C + boutons globaux
├─────────────────────────────┤
│  ScrollView                 │
│  ┌─────────────────────┐   │
│  │ ParagraphePaire p1  │   │
│  ├─────────────────────┤   │
│  │ ParagraphePaire p2  │   │
│  │ ...                 │   │
│  └─────────────────────┘   │
│  [Bouton chapitre suivant]  │
└─────────────────────────────┘
```

**État local de l'écran (useLecteur hook) :**
```typescript
interface EtatLecteur {
  analyseModeGlobal: boolean;          // Analyse grammaticale globale ON/OFF
  traductionModeGlobal: boolean;       // Traduction globale ON/OFF
  analyseParParagraphe: Record<string, boolean>;    // overrides par paragraphe
  traductionParParagraphe: Record<string, boolean>; // overrides par paragraphe
}
```

**Logique des toggles (identique à l'app web) :**

- **Bouton global Traduction** : affiche/masque TOUTES les traductions
- **Bouton 🇫🇷 par paragraphe** :
  - Si traduction globale OFF → affiche UNIQUEMENT ce paragraphe
  - Si traduction globale ON → masque UNIQUEMENT ce paragraphe
- **Bouton global Analyse** : active/désactive la colorisation sur TOUS les paragraphes
- **Bouton 👁 par paragraphe** : toggle la colorisation pour CE paragraphe uniquement

**Navigation chapitres :**
- Un bouton "Chapitre suivant →" en bas de page
- Si c'est le dernier chapitre → affiche "Fin du livre" sans bouton suivant

---

## 7. Composants

### 7.1 `TokenTexte.tsx`

Affiche une séquence de tokens en inline (comme du texte normal).
Chaque token coloré est un `<Text>` imbriqué dans un `<Text>` parent.

```typescript
interface TokenTexteProps {
  tokens: Token[];
  analyseActive: boolean;  // si false, aucune couleur, texte normal
  style?: TextStyle;       // style du texte parent (ex: italique pour fr)
}
```

Rendu d'un token coloré quand `analyseActive === true` :
- type `'s'` → fond `subjectBg`, texte `subjectText`, border-bottom simulée via `borderBottomWidth: 2, borderBottomColor: subjectBorder`
- type `'v'` → fond `verbBg`, texte `verbText`, border-bottom `verbBorder`
- type `'c'` → fond `complBg`, texte `complText`, border-bottom `complBorder`
- type `null` → aucun style particulier

⚠️ En React Native, les `<Text>` imbriqués supportent les styles inline. Utilise :
```tsx
<Text style={parentStyle}>
  {tokens.map((token, i) => (
    <Text key={i} style={getTokenStyle(token, analyseActive)}>
      {token.text}
    </Text>
  ))}
</Text>
```

---

### 7.2 `ParagraphePaire.tsx`

Un bloc représentant un paragraphe avec son texte russe, sa traduction, et ses boutons.

```typescript
interface ParagraphePaireProps {
  paragraphe: Paragraphe;
  analyseActive: boolean;       // état combiné global + override paragraphe
  traductionVisible: boolean;   // état combiné global + override paragraphe
  onToggleAnalyse: () => void;
  onToggleTraduction: () => void;
}
```

**Layout :**
```
┌────────────────────────────┬──────┐
│ Texte russe (TokenTexte)   │  👁  │
│ Texte français (TokenTexte)│  🇫🇷 │
└────────────────────────────┴──────┘
```
- Bordure dashed en bas (`borderBottomWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border`)
- La traduction est masquée/visible via `traductionVisible`
- Quand masquée : hauteur 0 ou `display: 'none'` — utilise un fade avec `Animated.Value` si tu veux reproduire la transition CSS

---

### 7.3 `BarreOutils.tsx`

Barre d'outils en haut de l'écran lecteur.

```typescript
interface BarreOutilsProps {
  analyseActive: boolean;
  traductionActive: boolean;
  onToggleAnalyse: () => void;
  onToggleTraduction: () => void;
  chapitres: { id: string; titre: string }[];
  chapitreActuelId: string;
  onChangerChapitre: (chapitreId: string) => void;
}
```

**Contenu :**
- Légende : `[S] Sujet` `[V] Verbe` `[C] Compl.` (pills colorées)
- Séparateur
- Bouton `🔍 Analyse` (actif = fond `COLORS.border`)
- Séparateur
- Bouton `🇫🇷 Traduction` (actif = fond `COLORS.border`)
- Sélecteur de chapitre (utilise `Picker` de `@react-native-picker/picker` ou des boutons simples)

La barre est **sticky en haut** : utilise `position: 'absolute'` ou place-la en dehors du `ScrollView` dans le layout de l'écran.

---

### 7.4 `LegendePills.tsx`

Trois pills colorées affichant S / V / C avec leur légende.
Composant simple, extrait de `BarreOutils` pour la lisibilité.

---

## 8. Hook `useLecteur`

```typescript
// hooks/useLecteur.ts

export function useLecteur(chapitreId: string) {
  const [analyseModeGlobal, setAnalyseModeGlobal] = useState(false);
  const [traductionModeGlobal, setTraductionModeGlobal] = useState(false);
  const [analyseParId, setAnalyseParId] = useState<Record<string, boolean>>({});
  const [traductionParId, setTraductionParId] = useState<Record<string, boolean>>({});

  // Reset les overrides par paragraphe quand on change de chapitre
  useEffect(() => {
    setAnalyseParId({});
    setTraductionParId({});
  }, [chapitreId]);

  function isAnalyseActive(paragrapheId: string): boolean {
    // Si un override existe → utilise-le, sinon → état global
    if (paragrapheId in analyseParId) return analyseParId[paragrapheId];
    return analyseModeGlobal;
  }

  function isTraductionVisible(paragrapheId: string): boolean {
    if (paragrapheId in traductionParId) return traductionParId[paragrapheId];
    return traductionModeGlobal;
  }

  function toggleAnalyseGlobal() {
    setAnalyseModeGlobal(v => !v);
    setAnalyseParId({}); // reset overrides
  }

  function toggleTraductionGlobal() {
    setTraductionModeGlobal(v => !v);
    setTraductionParId({}); // reset overrides
  }

  function toggleAnalyseParagraphe(id: string) {
    setAnalyseParId(prev => {
      const actuel = id in prev ? prev[id] : analyseModeGlobal;
      return { ...prev, [id]: !actuel };
    });
  }

  function toggleTraductionParagraphe(id: string) {
    setTraductionParId(prev => {
      const actuel = id in prev ? prev[id] : traductionModeGlobal;
      return { ...prev, [id]: !actuel };
    });
  }

  return {
    analyseModeGlobal,
    traductionModeGlobal,
    toggleAnalyseGlobal,
    toggleTraductionGlobal,
    isAnalyseActive,
    isTraductionVisible,
    toggleAnalyseParagraphe,
    toggleTraductionParagraphe,
  };
}
```

---

## 9. Navigation (Expo Router)

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Ma bibliothèque' }} />
      <Stack.Screen name="livre/[livreId]/index" options={{ title: '' }} />
      <Stack.Screen name="livre/[livreId]/[chapitreId]" options={{ title: '' }} />
    </Stack>
  );
}
```

Navigation entre écrans :
```typescript
// Depuis la bibliothèque vers un livre
router.push(`/livre/${livre.id}`);

// Depuis la liste chapitres vers un chapitre
router.push(`/livre/${livreId}/${chapitre.id}`);

// Chapitre suivant
router.replace(`/livre/${livreId}/${chapitreIdSuivant}`);
```

---

## 10. Ordre de développement recommandé

Construis dans cet ordre pour pouvoir tester à chaque étape :

1. **`data/types.ts`** — types TypeScript
2. **`constants/colors.ts`** — palette de couleurs
3. **`data/anna-karenine/chapitre-01.ts`** — données du chapitre 1 (tous les paragraphes)
4. **`data/anna-karenine/chapitre-02.ts`** — données du chapitre 2 (tous les paragraphes)
5. **`data/anna-karenine/index.ts`** + **`data/bibliotheque.ts`**
6. **`components/TokenTexte.tsx`** — tester avec un exemple simple
7. **`hooks/useLecteur.ts`**
8. **`components/ParagraphePaire.tsx`**
9. **`components/LegendePills.tsx`** + **`components/BarreOutils.tsx`**
10. **`app/livre/[livreId]/[chapitreId].tsx`** — l'écran lecteur complet
11. **`app/livre/[livreId]/index.tsx`** — liste des chapitres
12. **`components/CarteLivre.tsx`**
13. **`app/index.tsx`** — bibliothèque

---

## 11. Contraintes et règles

- **TypeScript strict** : pas de `any`, pas de `@ts-ignore`
- **Pas de bibliothèque UI externe** (pas de NativeBase, Tamagui, etc.)
- **Styles inline ou StyleSheet.create** uniquement
- **Pas de console.log** en production
- Chaque composant dans son propre fichier
- Les données (chapitres) ne doivent **jamais** être dans les composants
- Teste mentalement chaque toggle : global ON + individuel OFF doit masquer ce paragraphe

---

## 12. Ce qui n'est PAS à implémenter dans le MVP

- Système de paiement (RevenueCat)
- Authentification / comptes utilisateurs
- Backend ou API
- Notifications push
- Mode hors-ligne avancé (l'app fonctionne déjà hors-ligne car les données sont bundlées)
- Audio / enregistrement vocal
- Plus de 2 chapitres (même si l'architecture doit le supporter facilement)

---

## 13. Fichiers HTML source à convertir

Les fichiers HTML source (`chapitre-01.html` et `chapitre-02.html`) se trouvent dans le dossier du projet.
Lis-les entièrement pour extraire tous les paragraphes `<div class="pair">` et convertir
chaque `<span class="s|v|c">` en token TypeScript.

La structure à lire dans le HTML :
```html
<div class="pair" id="p1">
  <div class="ru">
    <span class="s">texte sujet</span> <span class="v">verbe</span> texte libre
  </div>
  <div class="fr">
    <span class="s">texte sujet fr</span> <span class="v">verbe fr</span> texte libre fr
  </div>
  <!-- ignorer les .pair-btns, c'est de l'UI HTML -->
</div>
```

⚠️ Attention aux cas particuliers dans le HTML :
- Tirets de dialogue : `— texte` → token null avec le tiret inclus
- Ponctuation collée aux spans : `, ` ou `.` après une span → token null séparé
- Plusieurs spans de même type à la suite → tokens séparés
- Texte entre deux spans → token null
