import { Locale } from './strings';

export interface DefinitionLangue {
  code: string;
  nom: Record<Locale, string>;
  drapeau: string;
}

export const LANGUES: DefinitionLangue[] = [
  { code: 'fr', nom: { fr: 'Français',  en: 'French'   }, drapeau: '🇫🇷' },
  { code: 'de', nom: { fr: 'Allemand',  en: 'German'   }, drapeau: '🇩🇪' },
  { code: 'en', nom: { fr: 'Anglais',   en: 'English'  }, drapeau: '🇬🇧' },
  { code: 'ru', nom: { fr: 'Russe',     en: 'Russian'  }, drapeau: '🇷🇺' },
  { code: 'es', nom: { fr: 'Espagnol',  en: 'Spanish'  }, drapeau: '🇪🇸' },
];

export function getLangue(code: string): DefinitionLangue {
  return LANGUES.find(l => l.code === code) ?? LANGUES[0];
}

export function nomLangue(code: string, locale: Locale): string {
  const langue = LANGUES.find(l => l.code === code);
  return langue?.nom[locale] ?? code;
}
