import { Livre } from '../types';
import chapitre01 from './chapitre-01';
import chapitre02 from './chapitre-02';

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
  chapitres: [chapitre01, chapitre02],
};

export default annaKarenine;
