import { Livre } from '../types';
import chapitre00 from './chapitre-00';
import chapitre01 from './chapitre-01';
import chapitre02 from './chapitre-02';

const hadjiMurat: Livre = {
  id: 'hadji-murat',
  titre: "Хаджи-Мурат",
  titreOriginal: "Хаджи-Мурат",
  auteur: "Léon Tolstoï",
  auteurOriginal: "Лев Толстой",
  langueSource: 'ru',
  langueCible: 'fr',
  niveau: 'B2',
  niveauNote: "Vocabulaire riche et descriptif, phrases complexes avec subordonnées, style littéraire exigeant.",
  gratuit: true,
  couvertureCouleur: "#C9A87C",
  chapitres: [
    chapitre00,
    chapitre01,
    chapitre02,
  ],
};

export default hadjiMurat;
