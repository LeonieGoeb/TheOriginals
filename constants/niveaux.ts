import { Locale } from './strings';

export type CodeNiveau = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface DefinitionNiveau {
  code: CodeNiveau;
  nom: Record<Locale, string>;
  description: Record<Locale, string>;
  couleur: string;
  couleurTexte: string;
}

export const NIVEAUX: DefinitionNiveau[] = [
  {
    code: 'A1',
    nom:         { fr: 'A1 · Débutant',      en: 'A1 · Beginner'          },
    description: { fr: 'Phrases très courtes, vocabulaire essentiel',
                   en: 'Very short sentences, essential vocabulary'         },
    couleur: '#e8f5e9',
    couleurTexte: '#1b5e20',
  },
  {
    code: 'A2',
    nom:         { fr: 'A2 · Élémentaire',   en: 'A2 · Elementary'        },
    description: { fr: 'Phrases simples, situations du quotidien',
                   en: 'Simple sentences, everyday situations'              },
    couleur: '#f1f8e9',
    couleurTexte: '#33691e',
  },
  {
    code: 'B1',
    nom:         { fr: 'B1 · Intermédiaire', en: 'B1 · Intermediate'      },
    description: { fr: 'Textes courants, sujets familiers',
                   en: 'Everyday texts, familiar topics'                    },
    couleur: '#fff8e1',
    couleurTexte: '#e65100',
  },
  {
    code: 'B2',
    nom:         { fr: 'B2 · Avancé',        en: 'B2 · Upper-Intermediate' },
    description: { fr: 'Textes complexes, nuances de sens',
                   en: 'Complex texts, nuanced meaning'                     },
    couleur: '#fff3e0',
    couleurTexte: '#bf360c',
  },
  {
    code: 'C1',
    nom:         { fr: 'C1 · Autonome',      en: 'C1 · Advanced'          },
    description: { fr: 'Littérature et textes spécialisés',
                   en: 'Literature and specialised texts'                   },
    couleur: '#fce4ec',
    couleurTexte: '#880e4f',
  },
  {
    code: 'C2',
    nom:         { fr: 'C2 · Maîtrise',      en: 'C2 · Mastery'           },
    description: { fr: 'Textes littéraires denses, classiques non simplifiés',
                   en: 'Dense literary texts, unsimplified classics'        },
    couleur: '#ede7f6',
    couleurTexte: '#4a148c',
  },
];

export function getNiveau(code: CodeNiveau): DefinitionNiveau {
  return NIVEAUX.find(n => n.code === code) ?? NIVEAUX[0];
}
