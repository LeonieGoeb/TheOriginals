export interface DefinitionLangue {
  code: string;
  nom: string;
  drapeau: string;
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
