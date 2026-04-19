import React, { useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { useLivreTelecharge } from '@/hooks/useLivreTelecharge';
import { useLecteur } from '@/hooks/useLecteur';
import { useProgressLecture } from '@/hooks/useProgressLecture';
import BarreOutils from '@/components/BarreOutils';
import ParagraphePaire from '@/components/ParagraphePaire';

function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

export default function LecteurScreen() {
  const { livreId, chapitreId } = useLocalSearchParams<{ livreId: string; chapitreId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const contentReady = useRef(false);
  const savedScrollY = useRef<number | null>(null);

  const { livre, chargement } = useLivreTelecharge(livreId ?? '');
  const { sauvegarder, charger } = useProgressLecture(livreId ?? '');

  const chapitreIndex = livre?.chapitres.findIndex(c => c.id === chapitreId) ?? -1;
  const chapitre = chapitreIndex >= 0 ? livre!.chapitres[chapitreIndex] : undefined;
  const chapitreSuivant =
    chapitreIndex >= 0 && chapitreIndex < (livre?.chapitres.length ?? 0) - 1
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
    isPending,
  } = useLecteur(chapitreId ?? '');

  // Load saved scroll position for this chapter
  useEffect(() => {
    charger().then(p => {
      if (p && p.chapitreId === chapitreId && p.scrollY > 0) {
        savedScrollY.current = p.scrollY;
        // If content already rendered, scroll immediately
        if (contentReady.current) {
          scrollRef.current?.scrollTo({ y: p.scrollY, animated: false });
        }
      }
    }).catch(() => {});
  }, [chapitreId]);

  useEffect(() => {
    if (chapitreIndex >= 0) navigation.setOptions({ title: toRoman(chapitreIndex + 1) });
  }, [chapitreIndex, navigation]);

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }, []);

  const handleScrollEnd = useCallback(() => {
    if (chapitreId) {
      sauvegarder(chapitreId, scrollY.current);
    }
  }, [chapitreId, sauvegarder]);

  const handleContentSizeChange = useCallback(() => {
    contentReady.current = true;
    if (savedScrollY.current !== null) {
      scrollRef.current?.scrollTo({ y: savedScrollY.current, animated: false });
      savedScrollY.current = null;
    }
  }, []);

  // Save progress when leaving the screen (back navigation, tab switch, etc.)
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (chapitreId && scrollY.current > 0) {
          sauvegarder(chapitreId, scrollY.current);
        }
      };
    }, [chapitreId, sauvegarder])
  );

  if (chargement) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

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
        isPending={isPending}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        scrollEventThrottle={200}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        onContentSizeChange={handleContentSizeChange}
      >
        <Text style={styles.chapitreTitle}>{toRoman(chapitreIndex + 1)}</Text>
        {chapitre.paragraphes.map(para => (
          <ParagraphePaire
            key={para.id}
            paragraphe={para}
            langueSource={livre.langueSource}
            langueCible={livre.langueCible}
            analyseActive={isAnalyseActive(para.id)}
            traductionVisible={isTraductionVisible(para.id)}
            onToggleAnalyse={toggleAnalyseParagraphe}
            onToggleTraduction={toggleTraductionParagraphe}
          />
        ))}
        <View style={styles.footer}>
          {chapitreSuivant ? (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => router.replace(`/livre/${livreId}/${chapitreSuivant.id}`)}
              activeOpacity={0.75}
            >
              <Text style={styles.nextBtnText}>
                {toRoman(chapitreIndex + 2)} →
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
