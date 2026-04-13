import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { COLORS } from '@/constants/colors';
import { BIBLIOTHEQUE } from '@/data/bibliotheque';
import { getLangue } from '@/constants/langues';
import NiveauBadge from '@/components/NiveauBadge';

export default function ChapitresScreen() {
  const { livreId } = useLocalSearchParams<{ livreId: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const livre = BIBLIOTHEQUE.find(l => l.id === livreId);

  useEffect(() => {
    if (livre) {
      navigation.setOptions({ title: livre.titre });
    }
  }, [livre, navigation]);

  if (!livre) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Livre introuvable</Text>
      </View>
    );
  }

  const drapeauSource = getLangue(livre.langueSource).drapeau;
  const drapeauCible  = getLangue(livre.langueCible).drapeau;
  const langueSourceNom = getLangue(livre.langueSource).nom;
  const langueCibleNom  = getLangue(livre.langueCible).nom;
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.titreOriginal}>{livre.titreOriginal}</Text>
        <Text style={styles.auteur}>{livre.auteurOriginal}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaLangues}>
            {drapeauSource} {langueSourceNom} → {drapeauCible} {langueCibleNom}
          </Text>
          <Text style={styles.metaSeparateur}>·</Text>
          <NiveauBadge code={livre.niveau} />
        </View>
        <Text style={styles.niveauNote}>{livre.niveauNote}</Text>
        <View style={styles.divider} />
        {livre.chapitres.map((ch, index) => (
          <TouchableOpacity
            key={ch.id}
            style={styles.chapitreRow}
            onPress={() => router.push(`/livre/${livreId}/${ch.id}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.chapitreNum}>{index + 1}</Text>
            <View style={styles.chapitreInfo}>
              <Text style={styles.chapitreTitre}>{ch.titre}</Text>
              <Text style={styles.chapitreCyril}>{ch.titreCyrilique}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
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
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  errorText: {
    color: COLORS.textMid,
    fontSize: 16,
  },
  titreOriginal: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  auteur: {
    fontSize: 15,
    color: COLORS.textLight,
    marginBottom: 10,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  metaLangues: {
    fontSize: 14,
    color: COLORS.textMid,
  },
  metaSeparateur: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  niveauNote: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  chapitreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 14,
  },
  chapitreNum: {
    width: 28,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent,
    textAlign: 'center',
  },
  chapitreInfo: {
    flex: 1,
  },
  chapitreTitre: {
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  chapitreCyril: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  arrow: {
    fontSize: 22,
    color: COLORS.textLight,
  },
});
