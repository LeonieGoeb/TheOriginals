import { Livre } from '../types';
import chapitre00 from './chapitre-00';

const theHappyPrince: Livre = {
  id: 'the-happy-prince',
  titre: "THE HAPPY PRINCE",
  titreOriginal: "THE HAPPY PRINCE",
  auteur: "Oscar Wilde",
  auteurOriginal: "Oscar Wilde",
  langueSource: 'en',
  langueCible: 'fr',
  niveau: 'B1',
  niveauNote: "Vocabulaire accessible mais syntaxe parfois complexe avec des phrases subordonnées et des descriptions littéraires.",
  gratuit: true,
  couvertureCouleur: "#A599C2",
  chapitres: [
    chapitre00,
  ],
};

export default theHappyPrince;
