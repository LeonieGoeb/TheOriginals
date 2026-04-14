import { Livre } from '../types';
import chapitre00 from './chapitre-00';

const theHappyPrince-Fr: Livre = {
  id: 'the-happy-prince--fr',
  titre: "THE HAPPY PRINCE",
  titreOriginal: "THE HAPPY PRINCE",
  auteur: "Oscar Wilde",
  auteurOriginal: "Oscar Wilde",
  langueSource: 'en',
  langueCible: 'fr',
  niveau: 'B1',
  niveauNote: "Vocabulaire accessible mais syntaxe parfois complexe avec des phrases longues et des subordonnées.",
  gratuit: true,
  couvertureCouleur: "#006400",
  chapitres: [
    chapitre00,
  ],
};

export default theHappyPrince-Fr;
