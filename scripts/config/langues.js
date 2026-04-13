// Langues supportées par le pipeline
// Ajouter une langue = ajouter une entrée ici

module.exports = {
  ru: {
    nom: 'Russe',
    deeplCode: 'RU',
    spaCyModel: 'ru_core_news_sm',
    installCmd: 'python -m spacy download ru_core_news_sm',
  },
  en: {
    nom: 'Anglais',
    deeplCode: 'EN',
    spaCyModel: 'en_core_web_sm',
    installCmd: 'python -m spacy download en_core_web_sm',
  },
  fr: {
    nom: 'Français',
    deeplCode: 'FR',
    spaCyModel: 'fr_core_news_sm',
    installCmd: 'python -m spacy download fr_core_news_sm',
  },
  de: {
    nom: 'Allemand',
    deeplCode: 'DE',
    spaCyModel: 'de_core_news_sm',
    installCmd: 'python -m spacy download de_core_news_sm',
  },
  es: {
    nom: 'Espagnol',
    deeplCode: 'ES',
    spaCyModel: 'es_core_news_sm',
    installCmd: 'python -m spacy download es_core_news_sm',
  },
  it: {
    nom: 'Italien',
    deeplCode: 'IT',
    spaCyModel: 'it_core_news_sm',
    installCmd: 'python -m spacy download it_core_news_sm',
  },
  pt: {
    nom: 'Portugais',
    deeplCode: 'PT',
    spaCyModel: 'pt_core_news_sm',
    installCmd: 'python -m spacy download pt_core_news_sm',
  },
  nl: {
    nom: 'Néerlandais',
    deeplCode: 'NL',
    spaCyModel: 'nl_core_news_sm',
    installCmd: 'python -m spacy download nl_core_news_sm',
  },
  zh: {
    nom: 'Chinois',
    deeplCode: 'ZH',
    spaCyModel: 'zh_core_web_sm',
    installCmd: 'python -m spacy download zh_core_web_sm',
  },
  ja: {
    nom: 'Japonais',
    deeplCode: 'JA',
    spaCyModel: 'ja_core_news_sm',
    installCmd: 'python -m spacy download ja_core_news_sm',
  },
};
