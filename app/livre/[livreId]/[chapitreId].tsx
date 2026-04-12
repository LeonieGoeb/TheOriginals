import React, { useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { BIBLIOTHEQUE } from '@/data/bibliotheque';
import { useLecteur } from '@/hooks/useLecteur';
import BarreOutils from '@/components/BarreOutils';
import ParagraphePaire from '@/components/ParagraphePaire';

export default function LecteurScreen() {
  const { livreId, chapitreId } = useLocalSearchParams<{ livreId: string; chapitreId: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const livre = BIBLIOTHEQUE.find(l => l.id === livreId);
  const chapitreIndex = livre?.chapitres.findIndex(c => c.id === chapitreId) ?? -1;
  const chapitre = chapitreIndex >= 0 ? livre!.chapitres[chapitreIndex] : undefined;
  const chapitresSuivant = chapitreIndex >= 0 && chapitreIndex < (livre?.chapitres.length ?? 0) - 1
    ? livre!.chapitres[chapitreIndex + 1]
    : null;

  const {
    analyseModeGlobal,
    traductionModeGlobal,
    toggleAnalyseGlobal,
    toggleTraductionGlobal,
    isAnalyseActive,
    isTraductionVisible,
    toggleAnalyseParagraphe,
    toggleTraductionParagraphe,
  } = useLecteur(chapitreId ?? '');

  useEffect(() => {
    if (chapitre) {
      navigation.setOptions({ title: chapitre.titre });
    }
  }, [chapitre, navigation]);

  if (!livre || !chapitre) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Chapitre introuvable</Text>
      </View>
    );
  }

  const chapitresNav = livre.chapitres.map(c => ({ id: c.id, titre: c.titre }));

  function handleChangerChapitre(id: string) {
    router.replace(`/livre/${livreId}/${id}`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <BarreOutils
        analyseActive={analyseModeGlobal}
        traductionActive={traductionModeGlobal}
        onToggleAnalyse={toggleAnalyseGlobal}
        onToggleTraduction={toggleTraductionGlobal}
        chapitres={chapitresNav}
        chapitreActuelId={chapitreId ?? ''}
        onChangerChapitre={handleChangerChapitre}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.chapitreTitle}>{chapitre.titreCyrilique}</Text>
        {chapitre.paragraphes.map(para => (
          <ParagraphePaire
            key={para.id}
            paragraphe={para}
            analyseActive={isAnalyseActive(para.id)}
            traductionVisible={isTraductionVisible(para.id)}
            onToggleAnalyse={() => toggleAnalyseParagraphe(para.id)}
            onToggleTraduction={() => toggleTraductionParagraphe(para.id)}
          />
        ))}
        <View style={styles.footer}>
          {chapitresSuivant ? (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => router.replace(`/livre/${livreId}/${chapitresSuivant.id}`)}
              activeOpacity={0.75}
            >
              <Text style={styles.nextBtnText}>
                {chapitresSuivant.titre} →
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.finText}>Fin du livre</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
  scroll: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
  },
  chapitreTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  nextBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  finText: {
    fontSize: 16,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
});
