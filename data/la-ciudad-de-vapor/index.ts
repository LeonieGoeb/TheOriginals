import { Livre } from '../types';
import chapitre01 from './chapitre-01';

const laCiudadDeVapor: Livre = {
  id: 'la-ciudad-de-vapor',
  titre: "La Cité de Vapeur",
  titreOriginal: "La Ciudad de Vapor",
  auteur: "Carlos Ruiz Zafón",
  auteurOriginal: "Carlos Ruiz Zafón",
  langueSource: 'es',
  langueCible: 'en',
  niveau: 'B2',
  niveauNote: "Espagnol littéraire contemporain de Ruiz Zafón — style vivant, dialogues naturels, quelques tournures idiomatiques.",
  gratuit: true,
  couvertureCouleur: "#e8f0f8",
  chapitres: [
    chapitre01,
  ],
};

export default laCiudadDeVapor;
