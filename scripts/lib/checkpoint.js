// Gestion des points de sauvegarde pour reprendre après une interruption

const fs = require('fs');
const path = require('path');

class Checkpoint {
  constructor(slug, etape) {
    this.slug = slug;
    this.etape = etape;
    this.dir = path.join('./scripts/tmp', slug);
    this.fichier = path.join(this.dir, `checkpoint-${etape}.json`);
    fs.mkdirSync(this.dir, { recursive: true });
  }

  // Charger l'état sauvegardé (ou null si première fois)
  charger() {
    if (!fs.existsSync(this.fichier)) return null;
    try {
      return JSON.parse(fs.readFileSync(this.fichier, 'utf-8'));
    } catch {
      return null;
    }
  }

  // Sauvegarder l'état actuel
  sauvegarder(etat) {
    fs.writeFileSync(this.fichier, JSON.stringify(etat, null, 2));
  }

  // Supprimer le checkpoint (étape terminée avec succès)
  terminer() {
    if (fs.existsSync(this.fichier)) fs.unlinkSync(this.fichier);
  }
}

module.exports = Checkpoint;
