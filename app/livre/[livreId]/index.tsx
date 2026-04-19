import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { getLangue } from '@/constants/langues';
import { STRINGS } from '@/constants/strings';
import { useLocale } from '@/contexts/LocaleContext';
import NiveauBadge from '@/components/NiveauBadge';
import { useLivreTelecharge } from '@/hooks/useLivreTelecharge';
import { useProgressLecture } from '@/hooks/useProgressLecture';
import type { ProgressLecture } from '@/hooks/useProgressLecture';

function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

export default function ChapitresScreen() {
  const { livreId } = useLocalSearchParams<{ livreId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const locale = useLocale();
  const s = STRINGS[locale];

  const { livre, chargement, telechargeNecessaire, erreur, telecharger } =
    useLivreTelecharge(livreId ?? '');
  const { charger } = useProgressLecture(livreId ?? '');
  const [progress, setProgress] = useState<ProgressLecture | null>(null);

  useEffect(() => {
    if (livre) navigation.setOptions({ title: livre.titre });
  }, [livre, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      charger().then(setProgress).catch(() => {});
    }, [livreId])
  );

  if (chargement) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (telechargeNecessaire) {
    return (
      <View style={styles.center}>
        <Text style={styles.downloadTitle}>{s.livreNonTelecharge}</Text>
        <Text style={styles.downloadSub}>{s.livreNonTelchargeSub}</Text>
        {erreur && <Text style={styles.erreurText}>{erreur}</Text>}
        <TouchableOpacity style={styles.downloadBtn} onPress={telecharger} activeOpacity={0.75}>
          <Text style={styles.downloadBtnText}>{s.telecharger}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!livre) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{s.livreIntrouvable}</Text>
      </View>
    );
  }

  const drapeauSource = getLangue(livre.langueSource).drapeau;
  const drapeauCible  = getLangue(livre.langueCible).drapeau;
  const langueSourceNom = getLangue(livre.langueSource).nom[locale];
  const langueCibleNom  = getLangue(livre.langueCible).nom[locale];

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
        {progress && (() => {
          const idx = livre.chapitres.findIndex(c => c.id === progress.chapitreId);
          if (idx < 0) return null;
          return (
            <TouchableOpacity
              style={styles.resumeBtn}
              onPress={() => router.push(`/livre/${livreId}/${progress.chapitreId}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.resumeBtnText}>
                ▶ {s.continuerLecture} — {s.chapitre} {toRoman(idx + 1)}
              </Text>
            </TouchableOpacity>
          );
        })()}
        {livre.chapitres.map((ch, index) => (
          <TouchableOpacity
            key={ch.id}
            style={styles.chapitreRow}
            onPress={() => router.push(`/livre/${livreId}/${ch.id}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.chapitreNum}>{toRoman(index + 1)}</Text>
            <View style={styles.chapitreInfo} />
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
    padding: 24,
    gap: 12,
  },
  errorText: {
    color: COLORS.textMid,
    fontSize: 16,
  },
  downloadTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  downloadSub: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  erreurText: {
    fontSize: 13,
    color: '#cc2020',
    textAlign: 'center',
  },
  downloadBtn: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 8,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
  resumeBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  resumeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
