import { CodeNiveau } from '../constants/niveaux';

export type TokenType = 's' | 'v' | 'c' | null;

export interface Token {
  text: string;
  type: TokenType;
}

export interface Paragraphe {
  id: string;
  // Textes par code de langue (clé = code ISO : 'ru', 'en', 'fr', 'de')
  textes: Record<string, Token[]>;
}

export interface Chapitre {
  id: string;
  titre: string;
  titreOriginal: string;
  paragraphes: Paragraphe[];
}

export interface Livre {
  id: string;
  titre: string;
  titreOriginal: string;
  auteur: string;
  auteurOriginal: string;
  langueSource: string;
  langueCible: string;
  chapitres: Chapitre[];
  gratuit: boolean;
  couvertureCouleur: string;
  niveau: CodeNiveau;
  niveauNote: string;
}
