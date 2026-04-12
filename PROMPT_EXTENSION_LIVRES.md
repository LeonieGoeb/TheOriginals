# PROMPT_EXTENSION_LIVRES.md — Compléter les livres existants

> Lis CONTEXTE.md en premier pour te rappeler l'architecture du projet.
> Puis exécute les deux tâches ci-dessous dans l'ordre.

---

## Avant de commencer : état des lieux

Commence par faire un état des lieux complet :

1. Lis `data/anna-karenine/` et liste les chapitres déjà présents (ex: chapitre-01.ts, chapitre-02.ts)
2. Lis `data/[slug-nouvelle]/` et identifie jusqu'où le texte a été traité (dernier paragraphe du dernier chapitre)
3. Note ces deux points de reprise — tu en auras besoin pour savoir exactement où commencer dans les PDFs

---

## TÂCHE 1 — Ajouter le chapitre suivant à Anna Karénine

### Source
Le PDF d'Anna Karénine se trouve dans `_source/`. 

### Ce que tu dois faire

1. **Identifier le chapitre suivant** à ajouter (le premier absent de `data/anna-karenine/`)
2. **Localiser ce chapitre dans le PDF** — cherche le marqueur de chapitre correspondant
3. **Extraire le texte russe** de ce chapitre uniquement (pas les suivants)
4. **Traduire** chaque paragraphe en français de façon littéraire et fidèle
5. **Annoter grammaticalement** le texte russe ET français (tokens s/v/c)
6. **Créer** `data/anna-karenine/chapitre-0X.ts` avec tous les paragraphes
7. **Mettre à jour** `data/anna-karenine/index.ts` pour importer et inclure le nouveau chapitre
8. **Mettre à jour** `BarreOutils.tsx` si elle contient une liste statique des chapitres

### Règles de conversion (rappel)

Le format attendu pour chaque paragraphe :

```typescript
{
  id: 'p1',
  textes: {
    ru: [
      { text: 'Степан Аркадьич', type: 's' },
      { text: ' ', type: null },
      { text: 'был', type: 'v' },
      { text: ' ', type: null },
      { text: 'человек правдивый', type: 'c' },
      { text: '.', type: null },
    ],
    fr: [
      { text: 'Stépane Arcadiévitch', type: 's' },
      { text: ' ', type: null },
      { text: 'était', type: 'v' },
      { text: ' ', type: null },
      { text: 'un homme honnête', type: 'c' },
      { text: '.', type: null },
    ],
  },
},
```

### Règles spécifiques au russe

- Les dialogues commencent par `—` (tiret cadratin) → token `null`
- Les incises comme `— сказал он` → annote normalement (s/v)
- Conserve la ponctuation russe exacte (`;` fréquent en russe)
- Les noms propres russes translittérés en français : utilise les translittérations déjà présentes dans les chapitres existants pour être cohérent (ex: Стива → Stiva, Облонский → Oblonski)

### Attention aux artefacts PDF

Les PDFs de livres classiques contiennent souvent :
- Des numéros de page → **ignorer**
- Des en-têtes répétés (titre du livre, nom de l'auteur) → **ignorer**
- Des coupures de mots en fin de ligne (ex: `пра-\nвдивый`) → **réunir**
- Des notes de bas de page numérotées → **ignorer**

---

## TÂCHE 2 — Compléter la nouvelle en anglais

### Source
Le PDF de la nouvelle se trouve dans `_source/`.

### Ce que tu dois faire

1. **Identifier le dernier paragraphe traité** dans `data/[slug-nouvelle]/` en lisant le dernier fichier de chapitre existant
2. **Localiser la suite dans le PDF** — commence exactement après le dernier paragraphe déjà converti
3. **Extraire la suite du texte** jusqu'à la fin du chapitre en cours (ou la fin du livre si c'est court)
4. Pour chaque nouveau paragraphe :
   - **Traduire** en français de façon littéraire
   - **Annoter** grammaticalement en anglais ET en français (tokens s/v/c)
5. **Ajouter les paragraphes manquants** dans le fichier de chapitre existant, à la suite des paragraphes déjà présents (ne pas écraser — compléter)
6. Si la suite du texte dépasse la fin du chapitre en cours → créer un nouveau fichier `chapitre-0X.ts` pour chaque nouveau chapitre
7. **Mettre à jour** `data/[slug-nouvelle]/index.ts` si de nouveaux chapitres ont été créés

### Règles de continuité narrative

- Lis les derniers paragraphes déjà traduits pour t'imprégner du **style de traduction** utilisé
- Garde le même registre de langue, les mêmes choix de vocabulaire, la même voix narrative
- Si un personnage a déjà été nommé d'une certaine façon → conserve ce choix

### Règles d'annotation pour l'anglais

- Les contractions (`he's`, `don't`, `I'd`) → un seul token, type selon la fonction du groupe
- Les verbes composés (`had been walking`) → un seul token `'v'`
- Les phrasal verbs (`give up`, `look at`) → un seul token `'v'`
- Texte entre guillemets `"..."` → annote l'intérieur normalement

---

## Ordre d'exécution

```
1. Lire CONTEXTE.md
2. État des lieux : chapitres existants dans les deux livres
3. [Anna Karénine] Localiser le chapitre suivant dans le PDF
4. [Anna Karénine] Extraire, traduire, annoter
5. [Anna Karénine] Créer chapitre-0X.ts
6. [Anna Karénine] Mettre à jour index.ts
7. [Nouvelle] Identifier le dernier paragraphe traité
8. [Nouvelle] Extraire la suite, traduire, annoter
9. [Nouvelle] Compléter/créer les fichiers de chapitre
10. [Nouvelle] Mettre à jour index.ts si nécessaire
11. Vérifier que l'app compile sans erreur TypeScript (npx tsc --noEmit)
12. Mettre à jour CONTEXTE.md pour refléter les nouveaux chapitres ajoutés
```

---

## Vérification finale

Une fois les deux tâches terminées, vérifie :

- [ ] `npx tsc --noEmit` passe sans erreur
- [ ] Le nouveau chapitre d'Anna Karénine apparaît dans la liste des chapitres
- [ ] La nouvelle complétée se lit sans coupure entre l'ancien et le nouveau contenu
- [ ] Les IDs de paragraphes sont bien séquentiels (pas de trous, pas de doublons)
- [ ] Le bouton "Chapitre suivant" fonctionne jusqu'au nouveau chapitre
