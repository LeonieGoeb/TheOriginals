import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { BIBLIOTHEQUE } from '@/data/bibliotheque';
import { LANGUES } from '@/constants/langues';
import { NIVEAUX, CodeNiveau } from '@/constants/niveaux';
import CarteLivre from '@/components/CarteLivre';

const STORAGE_KEY_LANGUE_CIBLE  = 'app_langue_cible';
const STORAGE_KEY_LANGUE_SOURCE = 'app_langue_source';
const STORAGE_KEY_NIVEAU        = 'app_niveau_choisi';

const CIBLES  = ['all', 'fr', 'de'] as const;
const SOURCES = ['all', 'ru', 'en'] as const;
const NIVEAUX_CODES = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

function nomLangue(code: string): string {
  if (code === 'all') return 'Toutes';
  return LANGUES.find(l => l.code === code)?.nom ?? code;
}

function nomNiveau(code: string): string {
  if (code === 'all') return 'Tous';
  return NIVEAUX.find(n => n.code === code)?.code ?? code;
}

export default function BibliothequeScreen() {
  const router = useRouter();
  const [langueCible, setLangueCible] = useState<string>('all');
  const [langueSource, setLangueSource] = useState<string>('all');
  const [niveauChoisi, setNiveauChoisi] = useState<string>('all');

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEY_LANGUE_CIBLE, STORAGE_KEY_LANGUE_SOURCE, STORAGE_KEY_NIVEAU])
      .then(([cible, source, niveau]) => {
        if (cible[1]) setLangueCible(cible[1]);
        if (source[1]) setLangueSource(source[1]);
        if (niveau[1]) setNiveauChoisi(niveau[1]);
      })
      .catch(() => {});
  }, []);

  const handleSetCible = useCallback((code: string) => {
    setLangueCible(code);
    AsyncStorage.setItem(STORAGE_KEY_LANGUE_CIBLE, code).catch(() => {});
  }, []);

  const handleSetSource = useCallback((code: string) => {
    setLangueSource(code);
    AsyncStorage.setItem(STORAGE_KEY_LANGUE_SOURCE, code).catch(() => {});
  }, []);

  const handleSetNiveau = useCallback((code: string) => {
    setNiveauChoisi(code);
    AsyncStorage.setItem(STORAGE_KEY_NIVEAU, code).catch(() => {});
  }, []);

  const livresFiltres = BIBLIOTHEQUE.filter(l => {
    const matchCible  = langueCible  === 'all' || l.langueCible  === langueCible;
    const matchSource = langueSource === 'all' || l.langueSource === langueSource;
    const matchNiveau = niveauChoisi === 'all' || l.niveau       === niveauChoisi;
    return matchCible && matchSource && matchNiveau;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.header}>Ma bibliothèque</Text>

        {/* Filtre langue cible (langue parlée par l'utilisateur) */}
        <View style={styles.filtreSection}>
          <Text style={styles.filtreLabel}>Je parle le</Text>
          <View style={styles.pills}>
            {CIBLES.map(code => (
              <TouchableOpacity
                key={code}
                style={[styles.pill, langueCible === code && styles.pillActive]}
                onPress={() => handleSetCible(code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, langueCible === code && styles.pillTextActive]}>
                  {nomLangue(code)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Filtre langue source (langue apprise) */}
        <View style={styles.filtreSection}>
          <Text style={styles.filtreLabel}>Et j'apprends le</Text>
          <View style={styles.pills}>
            {SOURCES.map(code => (
              <TouchableOpacity
                key={code}
                style={[styles.pill, langueSource === code && styles.pillActive]}
                onPress={() => handleSetSource(code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, langueSource === code && styles.pillTextActive]}>
                  {nomLangue(code)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Filtre niveau */}
        <View style={styles.filtreSection}>
          <Text style={styles.filtreLabel}>Au niveau</Text>
          <View style={styles.pills}>
            {NIVEAUX_CODES.map(code => (
              <TouchableOpacity
                key={code}
                style={[styles.pill, niveauChoisi === code && styles.pillActive]}
                onPress={() => handleSetNiveau(code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, niveauChoisi === code && styles.pillTextActive]}>
                  {nomNiveau(code)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Liste des livres */}
        {livresFiltres.length > 0 ? (
          livresFiltres.map(livre => (
            <CarteLivre
              key={livre.id}
              livre={livre}
              onPress={() => router.push(`/livre/${livre.id}`)}
            />
          ))
        ) : (
          <Text style={styles.empty}>
            Aucun livre disponible pour cette combinaison. Essayez d'élargir vos filtres.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  filtreSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  filtreLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    width: 120,
    paddingTop: 7,
  },
  pills: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  pillActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  pillText: {
    fontSize: 13,
    color: COLORS.textMid,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontStyle: 'italic',
    fontSize: 15,
    marginTop: 40,
    paddingHorizontal: 24,
  },
});
