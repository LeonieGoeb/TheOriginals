import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { BIBLIOTHEQUE } from '@/data/bibliotheque';
import { LANGUES } from '@/constants/langues';
import CarteLivre from '@/components/CarteLivre';

const STORAGE_KEY_LANGUE_CIBLE  = 'app_langue_cible';
const STORAGE_KEY_LANGUE_SOURCE = 'app_langue_source';

const CIBLES  = ['all', 'fr', 'de'] as const;
const SOURCES = ['all', 'ru', 'en'] as const;

function nomLangue(code: string): string {
  if (code === 'all') return 'Toutes';
  return LANGUES.find(l => l.code === code)?.nom ?? code;
}

export default function BibliothequeScreen() {
  const router = useRouter();
  const [langueCible, setLangueCible] = useState<string>('all');
  const [langueSource, setLangueSource] = useState<string>('all');

  // Chargement des préférences persistées
  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEY_LANGUE_CIBLE, STORAGE_KEY_LANGUE_SOURCE])
      .then(([cible, source]) => {
        if (cible[1]) setLangueCible(cible[1]);
        if (source[1]) setLangueSource(source[1]);
      })
      .catch(() => {/* premier lancement, pas de préférences */});
  }, []);

  const handleSetCible = useCallback((code: string) => {
    setLangueCible(code);
    AsyncStorage.setItem(STORAGE_KEY_LANGUE_CIBLE, code).catch(() => {});
  }, []);

  const handleSetSource = useCallback((code: string) => {
    setLangueSource(code);
    AsyncStorage.setItem(STORAGE_KEY_LANGUE_SOURCE, code).catch(() => {});
  }, []);

  const livresFiltres = BIBLIOTHEQUE.filter(l => {
    const matchCible  = langueCible  === 'all' || l.langueCible  === langueCible;
    const matchSource = langueSource === 'all' || l.langueSource === langueSource;
    return matchCible && matchSource;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.header}>Ma bibliothèque</Text>

        {/* Filtre langue cible */}
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

        {/* Filtre langue source */}
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
          <Text style={styles.empty}>Aucun livre disponible pour cette combinaison.</Text>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  filtreLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    width: 120,
  },
  pills: {
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
