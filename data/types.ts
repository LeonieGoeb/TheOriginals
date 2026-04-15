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

// Métadonnées seules (sans contenu des chapitres) — utilisées pour le catalogue CDN
export interface LivreInfo {
  id: string;
  titre: string;
  titreOriginal: string;
  auteur: string;
  auteurOriginal: string;
  langueSource: string;
  langueCible: string;
  gratuit: boolean;
  couvertureCouleur: string;
  niveau: CodeNiveau;
  niveauNote: string;
  /** Timestamp Unix (ms) de la dernière génération — utilisé pour invalider le cache local */
  version?: number;
}

// Livre complet avec chapitres — chargé individuellement depuis le CDN
export interface Livre extends LivreInfo {
  chapitres: Chapitre[];
}
