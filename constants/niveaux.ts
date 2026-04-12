export type CodeNiveau = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface DefinitionNiveau {
  code: CodeNiveau;
  nom: string;
  description: string;
  couleur: string;
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
