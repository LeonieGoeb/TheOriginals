import { Chapitre } from '../types';

const chapitre00: Chapitre = {
  id: 'chapitre-00',
  titre: "Préface",
  titreOriginal: "Préface",
  paragraphes: [
    {
      id: 'p1',
      textes: {
        ru: [
          { text: "Лев", type: 's' },
          { text: " ", type: null },
          { text: "Толстой", type: 's' },
        ],
        fr: [
          { text: "Léon", type: 's' },
          { text: " ", type: null },
          { text: "Tolstoï", type: 's' },
        ],
      },
    },
  ],
};

export default chapitre00;
