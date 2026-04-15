// Usage: npx tsx scripts/sync-cdn.ts
// Génère data/json/<slug>/book.json et data/json/catalog.json
// à partir des livres TypeScript déjà embarqués dans le bundle.

import fs from 'fs';
import path from 'path';
import { BIBLIOTHEQUE } from '../data/bibliotheque';
import type { Livre, LivreInfo } from '../data/types';

const JSON_DIR = path.join(process.cwd(), 'data', 'json');
fs.mkdirSync(JSON_DIR, { recursive: true });

const catalog: LivreInfo[] = [];

for (const livre of BIBLIOTHEQUE) {
  const { chapitres: _chapitres, ...info } = livre as Livre;
  // version 1 pour les livres initiaux — le pipeline incrémente via Date.now()
  const infoAvecVersion: LivreInfo = { ...info, version: info.version ?? 1 };
  catalog.push(infoAvecVersion);

  const slugDir = path.join(JSON_DIR, livre.id);
  fs.mkdirSync(slugDir, { recursive: true });

  fs.writeFileSync(
    path.join(slugDir, 'book.json'),
    JSON.stringify({ ...livre, version: (livre as Livre).version ?? 1 }, null, 2),
  );
  console.log(`✅ data/json/${livre.id}/book.json`);
}

fs.writeFileSync(path.join(JSON_DIR, 'catalog.json'), JSON.stringify(catalog, null, 2));
console.log(`✅ data/json/catalog.json (${catalog.length} livre(s))`);
