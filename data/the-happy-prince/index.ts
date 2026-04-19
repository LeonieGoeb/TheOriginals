import { Livre } from '../types';
import chapitre00 from './chapitre-00';

const theHappyPrince: Livre = {
  id: 'the-happy-prince',
  titre: "The Happy Prince",
  titreOriginal: "The Happy Prince",
  auteur: "Oscar Wilde",
  auteurOriginal: "Oscar Wilde",
  langueSource: 'en',
  langueCible: 'fr',
  niveau: 'B1',
  niveauNote: "Accessible vocabulary but occasionally complex syntax with subordinate clauses and literary descriptions.",
  gratuit: true,
  couvertureCouleur: "#A599C2",
  chapitres: [
    chapitre00,
  ],
};

export default theHappyPrince;
