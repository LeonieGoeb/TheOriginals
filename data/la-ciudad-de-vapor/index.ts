import { Livre } from '../types';
import chapitre00 from './chapitre-00';
import chapitre01 from './chapitre-01';
import chapitre02 from './chapitre-02';
import chapitre03 from './chapitre-03';

const laCiudadDeVapor: Livre = {
  id: 'la-ciudad-de-vapor',
  titre: "Blanca et l'Adieu",
  titreOriginal: "Blanca y el Adiós",
  auteur: "Carlos Ruiz Zafón",
  auteurOriginal: "Carlos Ruiz Zafón",
  langueSource: 'es',
  langueCible: 'en',
  niveau: 'B2',
  niveauNote: "Espagnol littéraire contemporain de Ruiz Zafón — style vivant, dialogues naturels, quelques tournures idiomatiques.",
  gratuit: true,
  couvertureCouleur: "#e8f0f8",
  chapitres: [
    chapitre00,
    chapitre01,
    chapitre02,
    chapitre03,
  ],
};

export default laCiudadDeVapor;
