export type Locale = 'fr' | 'en';

export const STRINGS = {
  fr: {
    // Bibliothèque
    maLibrairie: 'Ma bibliothèque',
    contact: 'Contact',
    preferences: 'Préférences',
    jeParle: 'Je parle',
    jApprends: "J'apprends",
    niveau: 'Niveau',
    toutesLangues: 'Toutes',
    tousNiveaux: 'Tous',
    aucunLivre: "Aucun livre disponible pour cette combinaison. Essayez d'élargir vos filtres.",
    gratuit: 'Gratuit',
    verrouille: 'Verrouillé 🔒',

    // CarteLivre / Chapitres
    livreNonTelecharge: 'Livre non téléchargé',
    livreNonTelchargeSub: "Ce livre n'est pas encore disponible hors-ligne.",
    telecharger: '⬇ Télécharger',
    livreIntrouvable: 'Livre introuvable',

    // Onboarding
    bienvenueIn: 'Bienvenue dans',
    accroche: 'Lisez vos auteurs préférés dans leur langue originale.',
    corpsAvec: 'Avec ',
    corpsTexte: ', apprenez des langues en vous immergeant dans les contes et romans en VO, avec la traduction et l\'analyse grammaticale à portée de doigt.',
    commentCaMarche: 'Comment ça marche',
    features: [
      {
        emoji: '📖',
        titre: 'Texte original',
        description: "Lisez les classiques tels qu'ils ont été écrits, dans leur texte original.",
      },
      {
        emoji: '💬',
        titre: 'Traduction intégrée',
        description: 'Affichez la traduction phrase à phrase dans votre langue maternelle (bouton 💬 Traduction).',
      },
      {
        emoji: '🔍',
        titre: 'Analyse grammaticale',
        description: 'Colorez sujets, verbes et compléments pour comprendre la structure de la phrase (bouton 🔍 Analyse).',
      },
    ],
    vosPreferences: 'Vos préférences',
    preferencesModif: 'Modifiables à tout moment depuis la bibliothèque.',
    langueQueVousParlez: 'Langues que vous parlez',
    langueASouhaiter: 'Langues que vous souhaitez lire',
    votreNiveau: 'Votre niveau',
    passer: 'Passer',
    suivant: 'Suivant',
    commencer: 'Commencer',
  },

  en: {
    // Library
    maLibrairie: 'My library',
    contact: 'Contact',
    preferences: 'Preferences',
    jeParle: 'I speak',
    jApprends: "I'm learning",
    niveau: 'Level',
    toutesLangues: 'All',
    tousNiveaux: 'All',
    aucunLivre: 'No books available for this combination. Try widening your filters.',
    gratuit: 'Free',
    verrouille: 'Locked 🔒',

    // CarteLivre / Chapters
    livreNonTelecharge: 'Book not downloaded',
    livreNonTelchargeSub: 'This book is not yet available offline.',
    telecharger: '⬇ Download',
    livreIntrouvable: 'Book not found',

    // Onboarding
    bienvenueIn: 'Welcome to',
    accroche: 'Read your favorite authors in their original language.',
    corpsAvec: 'With ',
    corpsTexte: ', learn languages by immersing yourself in short stories in their original language, with translation and grammatical analysis at your fingertips.',
    commentCaMarche: 'How it works',
    features: [
      {
        emoji: '📖',
        titre: 'Original text',
        description: 'Read the classics as they were written, in their original language.',
      },
      {
        emoji: '💬',
        titre: 'Built-in translation',
        description: 'Show the translation sentence by sentence in your native language (💬 Translation button).',
      },
      {
        emoji: '🔍',
        titre: 'Grammar analysis',
        description: 'Highlight subjects, verbs and complements to understand sentence structure (🔍 Analysis button).',
      },
    ],
    vosPreferences: 'Your preferences',
    preferencesModif: 'Can be changed at any time from the library.',
    langueQueVousParlez: 'Languages you speak',
    langueASouhaiter: 'Languages you want to read',
    votreNiveau: 'Your level',
    passer: 'Skip',
    suivant: 'Next',
    commencer: 'Get started',
  },
} as const;

export function t(locale: Locale, key: keyof typeof STRINGS['fr']): string {
  return (STRINGS[locale] as Record<string, unknown>)[key] as string;
}
