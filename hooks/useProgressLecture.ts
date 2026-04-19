import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

export interface ProgressLecture {
  chapitreId: string;
  scrollY: number;
}

function clé(livreId: string) {
  return `progress_v1_${livreId}`;
}

export function useProgressLecture(livreId: string) {
  const sauvegarder = useCallback(async (chapitreId: string, scrollY: number) => {
    try {
      await AsyncStorage.setItem(clé(livreId), JSON.stringify({ chapitreId, scrollY }));
    } catch {}
  }, [livreId]);

  const charger = useCallback(async (): Promise<ProgressLecture | null> => {
    try {
      const brut = await AsyncStorage.getItem(clé(livreId));
      if (!brut) return null;
      return JSON.parse(brut) as ProgressLecture;
    } catch {
      return null;
    }
  }, [livreId]);

  return { sauvegarder, charger };
}
