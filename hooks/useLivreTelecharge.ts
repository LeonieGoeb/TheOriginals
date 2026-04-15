import { useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { Livre } from '@/data/types';
import { BIBLIOTHEQUE } from '@/data/bibliotheque';
import { CDN_BASE_URL } from '@/constants/api';

function cheminLocal(livreId: string): string {
  return `${FileSystem.documentDirectory}books/${livreId}/book.json`;
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

      // 1. Vérifier le cache local (FileSystem)
      try {
        const info = await FileSystem.getInfoAsync(cheminLocal(livreId));
        if (info.exists) {
          const contenu = await FileSystem.readAsStringAsync(cheminLocal(livreId));
          if (!annule) {
            setLivre(JSON.parse(contenu) as Livre);
            setChargement(false);
          }
          return;
        }
      } catch {
        // fichier illisible, on continue
      }

      // 2. Repli sur le bundle TypeScript (livres embarqués)
      const bundle = BIBLIOTHEQUE.find(l => l.id === livreId);
      if (bundle) {
        if (!annule) {
          setLivre(bundle);
          setChargement(false);
        }
        return;
      }

      // 3. Livre non disponible localement — téléchargement requis
      if (!annule) {
        setTelechargeNecessaire(true);
        setChargement(false);
      }
    }

    verifier();
    return () => { annule = true; };
  }, [livreId]);

  const telecharger = useCallback(async () => {
    setChargement(true);
    setErreur(null);

    try {
      const url = `${CDN_BASE_URL}/${livreId}/book.json`;
      const chemin = cheminLocal(livreId);

      // Créer le répertoire si nécessaire
      const repertoire = chemin.substring(0, chemin.lastIndexOf('/'));
      await FileSystem.makeDirectoryAsync(repertoire, { intermediates: true });

      // Télécharger le fichier
      const resultat = await FileSystem.downloadAsync(url, chemin);
      if (resultat.status !== 200) {
        throw new Error(`HTTP ${resultat.status}`);
      }

      const contenu = await FileSystem.readAsStringAsync(chemin);
      setLivre(JSON.parse(contenu) as Livre);
      setTelechargeNecessaire(false);
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : 'Erreur de téléchargement');
    } finally {
      setChargement(false);
    }
  }, [livreId]);

  return { livre, chargement, telechargeNecessaire, erreur, telecharger };
}
