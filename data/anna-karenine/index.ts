import { Livre } from '../types';
import chapitre01 from './chapitre-01';
import chapitre02 from './chapitre-02';
import chapitre03 from './chapitre-03';

const annaKarenine: Livre = {
  id: 'anna-karenine',
  titre: 'Anna Karénine',
  titreOriginal: 'Анна Каренина',
  auteur: 'Léon Tolstoï',
  auteurOriginal: 'Лев Николаевич Толстой',
  langueSource: 'ru',
  langueCible: 'fr',
  gratuit: true,
  couvertureCouleur: '#ede0c8',
  niveau: 'C2',
  niveauNote: 'Dense 19th-century Russian prose — long sentences, literary vocabulary, complex syntax.',
  chapitres: [chapitre01, chapitre02, chapitre03],
};

export default annaKarenine;
