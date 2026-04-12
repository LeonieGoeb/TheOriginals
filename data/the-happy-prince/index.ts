import { Livre } from '../types';
import chapitre01 from './chapitre-01';

const theHappyPrince: Livre = {
  id: 'the-happy-prince',
  titre: 'Le Prince Heureux',
  titreOriginal: 'The Happy Prince',
  auteur: 'Oscar Wilde',
  auteurOriginal: 'Oscar Wilde',
  langueSource: 'en',
  langueCible: 'fr',
  gratuit: true,
  couvertureCouleur: '#fef0c8',
  chapitres: [chapitre01],
};

export default theHappyPrince;
