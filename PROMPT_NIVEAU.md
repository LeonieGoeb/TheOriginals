# PROMPT_NIVEAU.md — Ajouter le filtre de niveau de langue

> Lis CONTEXTE.md en premier pour te rappeler l'architecture du projet.

---

## Contexte de la fonctionnalité

L'écran bibliothèque permet déjà de filtrer par langue source et langue cible.
On ajoute un troisième filtre : le **niveau de langue** du livre.

L'utilisateur peut ainsi trouver des textes adaptés à son niveau,
du débutant (textes courts, vocabulaire simple) à l'avancé (littérature classique non simplifiée).

---

## TÂCHE 1 — Définir les niveaux

### 1.1 Créer les niveaux dans `constants/niveaux.ts`

```typescript
// constants/niveaux.ts

export type CodeNiveau = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface DefinitionNiveau {
  code: CodeNiveau;
  nom: string;        // ex: "Débutant"
  description: string;// ex: "Phrases courtes, vocabulaire du quotidien"
  couleur: string;    // couleur de la pill (hex)
  couleurTexte: string;
}

export const NIVEAUX: DefinitionNiveau[] = [
  {
    code: 'A1',
    nom: 'A1 · Débutant',
    description: 'Phrases très courtes, vocabulaire essentiel',
    couleur: '#e8f5e9',
    couleurTexte: '#1b5e20',
  },
  {
    code: 'A2',
    nom: 'A2 · Élémentaire',
    description: 'Phrases simples, situations du quotidien',
    couleur: '#f1f8e9',
    couleurTexte: '#33691e',
  },
  {
    code: 'B1',
    nom: 'B1 · Intermédiaire',
    description: 'Textes courants, sujets familiers',
    couleur: '#fff8e1',
    couleurTexte: '#e65100',
  },
  {
    code: 'B2',
    nom: 'B2 · Avancé',
    description: 'Textes complexes, nuances de sens',
    couleur: '#fff3e0',
    couleurTexte: '#bf360c',
  },
  {
    code: 'C1',
    nom: 'C1 · Autonome',
    description: 'Littérature et textes spécialisés',
    couleur: '#fce4ec',
    couleurTexte: '#880e4f',
  },
  {
    code: 'C2',
    nom: 'C2 · Maîtrise',
    description: 'Textes littéraires denses, classiques non simplifiés',
    couleur: '#ede7f6',
    couleurTexte: '#4a148c',
  },
];

export function getNiveau(code: CodeNiveau): DefinitionNiveau {
  return NIVEAUX.find(n => n.code === code) ?? NIVEAUX[0];
}
```

### 1.2 Ajouter le niveau aux livres (`data/types.ts`)

Ajoute le champ `niveau` au type `Livre` :

```typescript
import { CodeNiveau } from '../constants/niveaux';

export interface Livre {
  // ... champs existants ...
  niveau: CodeNiveau;
  niveauNote: string; // explication courte pourquoi ce niveau
                      // ex: "Syntaxe russe complexe, phrases longues de Tolstoï"
}
```

### 1.3 Attribuer un niveau aux livres existants

**Anna Karénine** → `niveau: 'C2'`
`niveauNote: "Syntaxe russe classique très dense, phrases longues, vocabulaire littéraire du XIXe"`

**La nouvelle en anglais** → détermine toi-même le niveau approprié en lisant les premiers
paragraphes déjà traduits. Justifie ton choix dans `niveauNote`.

---

## TÂCHE 2 — Ajouter le filtre sur l'écran bibliothèque

### 2.1 Nouveau layout de l'écran `app/index.tsx`

```
┌──────────────────────────────────────┐
│           Ma bibliothèque            │
│                                      │
│  Je parle le    [Toutes][RU][EN]     │  ← filtre langue source (existant)
│  J'apprends le  [Toutes][FR][DE]     │  ← filtre langue cible (existant)
│  Au niveau      [Tous][A1][A2][B1]   │  ← NOUVEAU filtre niveau
│                 [B2][C1][C2]         │
│                                      │
│  ┌──────────┐  ┌──────────┐         │
│  │ Anna K.  │  │ Nouvelle │         │
│  │ C2 · 🇷🇺→🇫🇷│  │ B2 · 🇬🇧→🇫🇷│         │
│  └──────────┘  └──────────┘         │
└──────────────────────────────────────┘
```

### 2.2 Logique de filtrage

```typescript
const livresFiltres = BIBLIOTHEQUE.filter(livre => {
  const matchCible  = langueCible  === 'all' || livre.langueCible  === langueCible;
  const matchSource = langueSource === 'all' || livre.langueSource === langueSource;
  const matchNiveau = niveauChoisi === 'all' || livre.niveau       === niveauChoisi;
  return matchCible && matchSource && matchNiveau;
});
```

### 2.3 Persistance AsyncStorage

Ajoute la persistance du niveau choisi aux préférences existantes :

```typescript
const STORAGE_KEY_NIVEAU = 'app_niveau_choisi'; // 'all' | 'A1' | 'A2' | ...
```

Charge et sauvegarde cette valeur exactement comme les deux filtres de langue existants.

---

## TÂCHE 3 — Afficher le niveau sur les cartes de livre

### 3.1 Mise à jour de `CarteLivre.tsx`

Les libellés des trois filtres dans le code :
- `"Je parle le"` → `langueSource`
- `"J'apprends le"` → `langueCible`
- `"Au niveau"` → `niveauChoisi`

Ajoute un badge de niveau en bas de la carte :

```
┌──────────────────────┐
│  Анна Каренина       │
│  Anna Karénine       │
│  Léon Tolstoï        │
│                      │
│  🇷🇺 → 🇫🇷            │
│  ┌────────┐ [Gratuit]│
│  │C2·Maît.│          │  ← badge coloré avec couleur du niveau
│  └────────┘          │
└──────────────────────┘
```

Le badge utilise `niveau.couleur` comme fond et `niveau.couleurTexte` comme couleur de texte.
Affiche `niveau.code` + `" · "` + une version courte de `niveau.nom` (ex: "Maîtrise").

### 3.2 Mise à jour de `components/LegendePills.tsx` (ou création de `NiveauBadge.tsx`)

Crée un composant `NiveauBadge.tsx` réutilisable :

```typescript
interface NiveauBadgeProps {
  code: CodeNiveau;
  style?: ViewStyle;
}
```

Utilisé à la fois dans `CarteLivre` et potentiellement dans l'écran de détail d'un livre.

---

## TÂCHE 4 — Afficher le niveau dans l'écran liste des chapitres

Dans `app/livre/[livreId]/index.tsx`, ajoute une ligne d'info en haut :

```
Anna Karénine — Léon Tolstoï
🇷🇺 Russe → 🇫🇷 Français  ·  C2 · Maîtrise
"Syntaxe russe classique très dense..."
```

---

## Ordre d'exécution

```
1. Créer constants/niveaux.ts
2. Mettre à jour data/types.ts (ajouter niveau + niveauNote)
3. Mettre à jour data/anna-karenine/index.ts (niveau: 'C2')
4. Mettre à jour data/[slug-nouvelle]/index.ts (niveau selon analyse)
5. Créer components/NiveauBadge.tsx
6. Mettre à jour components/CarteLivre.tsx (ajouter le badge)
7. Mettre à jour app/index.tsx (ajouter les pills de niveau + filtre + persistance)
8. Mettre à jour app/livre/[livreId]/index.tsx (afficher niveau + note)
9. npx tsc --noEmit — vérifier zéro erreur TypeScript
10. Mettre à jour CONTEXTE.md
```

---

## Contraintes

- Les pills de niveau sur l'écran bibliothèque peuvent être sur **deux lignes** si nécessaire
  (A1 A2 B1 B2 sur la première, C1 C2 sur la seconde) pour éviter le scroll horizontal
- Si aucun livre ne correspond aux trois filtres combinés → message :
  *"Aucun livre disponible pour cette combinaison. Essayez d'élargir vos filtres."*
- TypeScript strict, pas de `any`
- Pas de régression sur les filtres de langue existants
