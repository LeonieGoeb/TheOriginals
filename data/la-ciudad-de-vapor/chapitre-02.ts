import { Chapitre } from '../types';

const chapitre02: Chapitre = {
  id: 'chapitre-02',
  titre: "Chapitre 22",
  titreOriginal: "22",
  paragraphes: [
    {
      id: 'p1',
      textes: {
        es: [
          { text: "T-La", type: 'c' },
          { text: " ", type: null },
          { text: "Ciudad", type: 's' },
          { text: " ", type: null },
          { text: "de", type: 'c' },
          { text: " ", type: null },
          { text: "Vapor.indd", type: 's' },
          { text: " ", type: null },
          { text: "22", type: 'c' },
          { text: " ", type: null },
          { text: "5/10/20", type: 'v' },
          { text: " ", type: null },
          { text: "11:08", type: 'c' },
        ],
        en: [
          { text: "T", type: 's' },
          { text: "-", type: null },
          { text: "The", type: 's' },
          { text: " ", type: null },
          { text: "City", type: 'v' },
          { text: " ", type: null },
          { text: "of Steam.indd 22 5/10/20 11:08", type: 'c' },
        ],
      },
    },
  ],
};

export default chapitre02;
