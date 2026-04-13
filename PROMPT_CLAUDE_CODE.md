# Mission : Deux nouvelles fonctionnalités

Tu vas accomplir deux tâches dans cet ordre précis.
Lis ce fichier entièrement avant de commencer.

---

## TÂCHE 1 — Ajouter un nouveau livre depuis le PDF fourni

### 1.1 Le PDF source

Un fichier PDF est fourni dans le dossier `_source/`.
C'est une nouvelle en **anglais**. Tu dois :

1. **Lire le PDF** et en extraire le texte intégral
2. **Découper le texte** en paragraphes (respecte les paragraphes originaux)
3. Pour chaque paragraphe, faire **deux choses simultanément** :
   - **Traduire** le paragraphe en français, de façon littéraire et fidèle
   - **Annoter grammaticalement** le texte anglais ET le texte français en identifiant :
     - `"s"` → le **sujet** (groupe nominal sujet)
     - `"v"` → le **verbe** (groupe verbal, auxiliaire inclus)
     - `"c"` → le **complément** (COD, COI, CC, attribut)
4. **Créer le fichier de données TypeScript** correspondant

### 1.2 Règles d'annotation grammaticale

- Un token de type `null` = texte ordinaire sans fonction grammaticale marquée
- Ne sur-annote pas : si un mot est ambigu, laisse-le en `null`
- Les articles et prépositions font partie du groupe qu'ils introduisent
  - ex: "the old man" → un seul token `"s"`, pas trois tokens séparés
- La ponctuation (`.`, `,`, `;`, `—`) → token `null` séparé
- Les dialogues commençant par `"` ou `—` → token `null` pour le marqueur de dialogue

**Exemple attendu (anglais → français) :**

Texte anglais : `The old man was alone in his skiff`

```typescript
{
  id: 'p1',
  ru: [], // vide car livre anglais
  en: [
    { text: 'The old man', type: 's' },
    { text: ' ', type: null },
    { text: 'was', type: 'v' },
    { text: ' ', type: null },
    { text: 'alone in his skiff', type: 'c' },
  ],
  fr: [
    { text: 'Le vieux', type: 's' },
    { text: ' ', type: null },
    { text: 'était', type: 'v' },
    { text: ' ', type: null },
    { text: 'seul dans sa barque', type: 'c' },
  ],
}
```

### 1.3 Modifications du type `Paragraphe`

Le type actuel dans `data/types.ts` a `ru` et `fr`.
Tu dois le faire évoluer pour supporter plusieurs langues sources :

```typescript
// data/types.ts — REMPLACE le type Paragraphe existant

export interface Paragraphe {
  id: string;
  // Textes par code de langue (clé = code ISO : 'ru', 'en', 'fr', 'de')
  textes: Record<string, Token[]>;
}
```

Et mets à jour `Livre` :

```typescript
export interface Livre {
  id: string;
  titre: string;
  titreOriginal: string;
  auteur: string;
  auteurOriginal: string;
  langueSource: string;   // ex: 'en', 'ru'
  langueCible: string;    // ex: 'fr', 'de'
  chapitres: Chapitre[];
  gratuit: boolean;
  couvertureCouleur: string; // couleur de fond de la carte (hex)
}
```

⚠️ **Après avoir modifié les types**, mets à jour les données existantes d'Anna Karénine pour
utiliser le nouveau format `textes: { ru: [...], fr: [...] }` à la place de `ru: [...]` et `fr: [...]`.

### 1.4 Fichiers à créer pour le nouveau livre

```
data/
└── [slug-du-livre]/
    ├── index.ts         ← métadonnées du livre
    ├── chapitre-01.ts   ← données du chapitre 1
    └── ...              ← un fichier par chapitre
```

Le `slug` = titre en minuscules, sans accents, tirets à la place des espaces.
ex: "The Old Man and the Sea" → `the-old-man-and-the-sea`

Dans `data/bibliotheque.ts`, ajoute le nouveau livre à la liste `BIBLIOTHEQUE`.

---

## TÂCHE 2 — Sélecteur de langue sur l'écran bibliothèque

### 2.1 Comportement attendu

Quand l'utilisateur arrive sur l'écran bibliothèque (`app/index.tsx`), il voit :

```
┌─────────────────────────────────────┐
│         Ma bibliothèque             │
│                                     │
│  J'apprends le  [Français ▾]        │
│  depuis le      [Toutes ▾]          │
│                                     │
│  ┌─────────────┐  ┌─────────────┐  │
│  │ Anna        │  │ [Nouveau    │  │
│  │ Karénine    │  │  livre]     │  │
│  │ 🇷🇺 → 🇫🇷   │  │ 🇬🇧 → 🇫🇷  │  │
│  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────┘
```

- **Filtre 1 — "J'apprends le"** : langue cible (ce que l'utilisateur veut apprendre)
  - Options MVP : `Français`, `Allemand`, `Toutes`
  
- **Filtre 2 — "depuis le"** : langue source (la langue que l'utilisateur connaît déjà)
  - Options MVP : `Russe`, `Anglais`, `Toutes`

- La liste des livres se **filtre en temps réel** selon les deux sélecteurs
- Si aucun livre ne correspond → afficher un message : *"Aucun livre disponible pour cette combinaison."*

### 2.2 Persistance des préférences

Sauvegarde les préférences de langue avec `AsyncStorage` pour les retrouver à la prochaine ouverture :

```typescript
const STORAGE_KEY_LANGUE_CIBLE  = 'app_langue_cible';   // 'fr' | 'de' | 'all'
const STORAGE_KEY_LANGUE_SOURCE = 'app_langue_source';  // 'ru' | 'en' | 'all'
```

### 2.3 Implémentation des sélecteurs

Utilise deux `Picker` (de `@react-native-picker/picker`) ou deux rangées de boutons-pills.

**Préfère les pills** si tu veux rester cohérent avec le design de l'app :

```
[Toutes]  [Français]  [Allemand]   ← rangée 1 (langue cible)
[Toutes]  [Russe]  [Anglais]       ← rangée 2 (langue source)
```

Pill active = fond `COLORS.accent`, texte blanc
Pill inactive = fond `COLORS.bg`, texte `COLORS.textMid`, bordure `COLORS.border`

### 2.4 Constantes de langues

Crée un fichier `constants/langues.ts` :

```typescript
export interface DefinitionLangue {
  code: string;      // code ISO : 'fr', 'ru', 'en', 'de'
  nom: string;       // nom affiché : 'Français', 'Russe'...
  drapeau: string;   // emoji drapeau : '🇫🇷', '🇷🇺'...
}

export const LANGUES: DefinitionLangue[] = [
  { code: 'fr', nom: 'Français',  drapeau: '🇫🇷' },
  { code: 'de', nom: 'Allemand',  drapeau: '🇩🇪' },
  { code: 'ru', nom: 'Russe',     drapeau: '🇷🇺' },
  { code: 'en', nom: 'Anglais',   drapeau: '🇬🇧' },
];

export function getLangue(code: string): DefinitionLangue {
  return LANGUES.find(l => l.code === code) ?? LANGUES[0];
}
```

### 2.5 Mise à jour de `CarteLivre`

Affiche les drapeaux sur la carte :

```
┌──────────────────────┐
│  Анна Каренина       │
│  Anna Karénine       │
│  Léon Tolstoï        │
│                      │
│  🇷🇺 → 🇫🇷  [Gratuit]│
└──────────────────────┘
```

Utilise `getLangue(livre.langueSource).drapeau` et `getLangue(livre.langueCible).drapeau`.

### 2.6 Mise à jour du lecteur de chapitre

L'écran lecteur doit maintenant lire les textes via `paragraphe.textes[langueSource]`
et `paragraphe.textes[langueCible]` plutôt que `paragraphe.ru` et `paragraphe.fr`.

Le `livreId` est déjà dans l'URL. Récupère `langueSource` et `langueCible`
depuis les métadonnées du livre dans `BIBLIOTHEQUE`.

---

## Ordre d'exécution

```
1. Modifier data/types.ts (nouveau format Paragraphe + Livre)
2. Migrer data/anna-karenine/ vers le nouveau format textes: {}
3. Créer constants/langues.ts
4. Lire le PDF et créer data/[slug]/chapitre-XX.ts (avec traduction + annotation)
5. Créer data/[slug]/index.ts
6. Mettre à jour data/bibliotheque.ts
7. Mettre à jour CarteLivre (drapeaux)
8. Mettre à jour app/index.tsx (filtres de langue + persistance)
9. Mettre à jour app/livre/[livreId]/[chapitreId].tsx (nouveau format textes)
10. Tester les filtres : RU→FR, EN→FR, Toutes→Toutes
```

---

## Contraintes

- TypeScript strict, pas de `any`
- Pas de régression sur Anna Karénine (vérifie que l'app fonctionne encore après la migration)
- La traduction doit être **littéraire**, pas une traduction automatique mot à mot
- L'annotation grammaticale doit être **cohérente** : si tu marques le sujet d'une phrase, marque aussi verbe et complément
- Le PDF peut contenir des artefacts de mise en page (numéros de page, en-têtes) — **ignore-les**
