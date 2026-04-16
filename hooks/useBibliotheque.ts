import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LivreInfo } from '@/data/types';
import { BIBLIOTHEQUE } from '@/data/bibliotheque';
import { CDN_BASE_URL } from '@/constants/api';

const CACHE_KEY = 'cdn_catalog_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures

// Catalogue de repli : métadonnées des livres embarqués dans le bundle
const REPLI: LivreInfo[] = BIBLIOTHEQUE.map(({ chapitres: _chapitres, ...info }) => info);

export function useBibliotheque() {
  const [livres, setLivres] = useState<LivreInfo[]>(REPLI);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;

    async function charger() {
      // 1. Lire le cache AsyncStorage
      try {
        const brut = await AsyncStorage.getItem(CACHE_KEY);
        if (brut) {
          const { ts, data: cached } = JSON.parse(brut) as { ts: number; data: LivreInfo[] };
          if (Date.now() - ts < CACHE_TTL_MS) {
            // Fusionner le cache avec le bundle pour ne jamais perdre un livre
            const idsCached = new Set(cached.map((l: LivreInfo) => l.id));
            const data = [...cached, ...REPLI.filter(l => !idsCached.has(l.id))];
            if (!annule) {
              setLivres(data);
              setChargement(false);
            }
            return;
          }
        }
      } catch {
        // cache illisible, on continue
      }

      // 2. Récupérer le catalogue depuis le CDN
      try {
        const rep = await fetch(`${CDN_BASE_URL}/catalog.json`);
        if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
        const cdn = (await rep.json()) as LivreInfo[];
        // Fusionner : garder les livres CDN + ajouter les livres bundle absents du CDN
        const idsCdn = new Set(cdn.map(l => l.id));
        const data = [...cdn, ...REPLI.filter(l => !idsCdn.has(l.id))];
        if (!annule) setLivres(data);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
      } catch (e: unknown) {
        if (!annule) setErreur(e instanceof Error ? e.message : 'Erreur réseau');
        // On garde le repli déjà affiché
      } finally {
        if (!annule) setChargement(false);
      }
    }

    charger();
    return () => { annule = true; };
  }, []);

  return { livres, chargement, erreur };
}
