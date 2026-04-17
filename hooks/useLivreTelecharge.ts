import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Livre, LivreInfo } from '@/data/types';
import { BIBLIOTHEQUE } from '@/data/bibliotheque';
import { CDN_BASE_URL } from '@/constants/api';

const CATALOG_CACHE_KEY = 'cdn_catalog_v1';

const isWeb = Platform.OS === 'web';

// Cache mémoire partagé entre tous les écrans (survit à la navigation, pas au redémarrage)
const memoireCache = new Map<string, Livre>();

// expo-file-system n'est pas disponible sur web
let FileSystem: typeof import('expo-file-system/legacy') | null = null;
if (!isWeb) {
  FileSystem = require('expo-file-system/legacy');
}

async function getVersionCatalog(livreId: string): Promise<number | null> {
  try {
    const brut = await AsyncStorage.getItem(CATALOG_CACHE_KEY);
    if (!brut) return null;
    const { data } = JSON.parse(brut) as { ts: number; data: LivreInfo[] };
    return data.find(l => l.id === livreId)?.version ?? null;
  } catch {
    return null;
  }
}

function cheminLocal(livreId: string): string {
  return `${FileSystem!.documentDirectory}books/${livreId}/book.json`;
}

async function telechargerDepuisCDN(livreId: string): Promise<Livre> {
  if (isWeb || !FileSystem) {
    // Sur web : fetch direct, pas de cache fichier
    const rep = await fetch(`${CDN_BASE_URL}/${livreId}/book.json`);
    if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
    return rep.json() as Promise<Livre>;
  }

  const chemin = cheminLocal(livreId);
  const repertoire = chemin.substring(0, chemin.lastIndexOf('/'));
  await FileSystem.makeDirectoryAsync(repertoire, { intermediates: true });

  const resultat = await FileSystem.downloadAsync(
    `${CDN_BASE_URL}/${livreId}/book.json`,
    chemin,
  );
  if (resultat.status !== 200) throw new Error(`HTTP ${resultat.status}`);

  const contenu = await FileSystem.readAsStringAsync(chemin);
  return JSON.parse(contenu) as Livre;
}

interface EtatLivreTelecharge {
  livre: Livre | null;
  chargement: boolean;
  /** true si le livre n'est pas disponible localement et doit être téléchargé */
  telechargeNecessaire: boolean;
  erreur: string | null;
  telecharger: () => void;
}

export function useLivreTelecharge(livreId: string): EtatLivreTelecharge {
  const [livre, setLivre] = useState<Livre | null>(null);
  const [chargement, setChargement] = useState(true);
  const [telechargeNecessaire, setTelechargeNecessaire] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;

    async function verifier() {
      setChargement(true);
      setErreur(null);
      setLivre(null);
      setTelechargeNecessaire(false);

      // 0. Cache mémoire — évite de re-télécharger lors d'une navigation entre écrans
      if (memoireCache.has(livreId)) {
        const livreMemo = memoireCache.get(livreId)!;
        const versionCatalog = await getVersionCatalog(livreId);
        const estPerime =
          versionCatalog !== null &&
          livreMemo.version !== undefined &&
          versionCatalog > livreMemo.version;
        if (!estPerime) {
          if (!annule) { setLivre(livreMemo); setChargement(false); }
          return;
        }
        // Version périmée → re-télécharger silencieusement
        try {
          const livreNeuf = await telechargerDepuisCDN(livreId);
          memoireCache.set(livreId, livreNeuf);
          if (!annule) { setLivre(livreNeuf); setChargement(false); }
        } catch {
          // Échec réseau → garder la version en cache plutôt que de bloquer
          if (!annule) { setLivre(livreMemo); setChargement(false); }
        }
        return;
      }

      // 1. Vérifier le cache local (FileSystem) — mobile uniquement
      try {
        if (isWeb || !FileSystem) throw new Error('web');
        const info = await FileSystem.getInfoAsync(cheminLocal(livreId));
        if (info.exists) {
          const contenu = await FileSystem.readAsStringAsync(cheminLocal(livreId));
          const livreCache = JSON.parse(contenu) as Livre;

          // Vérification de version : si le catalogue a une version plus récente → re-télécharger
          const versionCatalog = await getVersionCatalog(livreId);
          const estPerime =
            versionCatalog !== null &&
            livreCache.version !== undefined &&
            versionCatalog > livreCache.version;

          if (estPerime) {
            try {
              const livreNeuf = await telechargerDepuisCDN(livreId);
              memoireCache.set(livreId, livreNeuf);
              if (!annule) { setLivre(livreNeuf); setChargement(false); }
            } catch {
              memoireCache.set(livreId, livreCache);
              if (!annule) { setLivre(livreCache); setChargement(false); }
            }
          } else {
            memoireCache.set(livreId, livreCache);
            if (!annule) { setLivre(livreCache); setChargement(false); }
          }
          return;
        }
      } catch {
        // fichier illisible, on continue
      }

      // 2. Repli sur le bundle TypeScript (livres embarqués)
      const bundle = BIBLIOTHEQUE.find(l => l.id === livreId);
      if (bundle) {
        memoireCache.set(livreId, bundle);
        if (!annule) { setLivre(bundle); setChargement(false); }
        return;
      }

      // 3. Livre non disponible localement — téléchargement requis
      if (!annule) { setTelechargeNecessaire(true); setChargement(false); }
    }

    verifier();
    return () => { annule = true; };
  }, [livreId]);

  const telecharger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const livreNeuf = await telechargerDepuisCDN(livreId);
      memoireCache.set(livreId, livreNeuf);
      setLivre(livreNeuf);
      setTelechargeNecessaire(false);
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : 'Erreur de téléchargement');
    } finally {
      setChargement(false);
    }
  }, [livreId]);

  return { livre, chargement, telechargeNecessaire, erreur, telecharger };
}
