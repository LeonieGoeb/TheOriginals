import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { LANGUES } from '@/constants/langues';
import { NIVEAUX } from '@/constants/niveaux';
import { ONBOARDING_KEY } from './_layout';

const { width } = Dimensions.get('window');

const STORAGE_KEY_LANGUE_SOURCE = 'app_langue_source';
const STORAGE_KEY_NIVEAU        = 'app_niveau_choisi';

const LANGUES_SOURCE = LANGUES.filter(l => l.code !== 'fr');

// ── Écran 1 — Présentation ─────────────────────────────────────────────────

function EcranPresentation() {
  return (
    <View style={ecrans.container}>
      <Text style={ecrans.surtitre}>Bienvenue dans</Text>
      <Text style={ecrans.titre}>The Originals</Text>
      <Text style={ecrans.accroche}>
        La littérature mondiale dans sa langue originale.
      </Text>
      <View style={ecrans.separateur} />
      <Text style={ecrans.corps}>
        Les grandes œuvres perdent leur saveur dans la traduction. Avec{' '}
        <Text style={ecrans.gras}>The Originals</Text>, lisez Tolstoï en russe,
        Cervantes en espagnol, Goethe en allemand — avec la traduction et
        l'analyse grammaticale à portée de doigt, quand vous en avez besoin.
      </Text>
    </View>
  );
}

// ── Écran 2 — Fonctionnalités ──────────────────────────────────────────────

const FEATURES = [
  {
    emoji: '📖',
    titre: 'Texte original',
    description: "Lisez les classiques tels qu'ils ont été écrits, sans compromis.",
  },
  {
    emoji: '💬',
    titre: 'Traduction intégrée',
    description: 'Affichez la traduction phrase par phrase, globalement ou paragraphe par paragraphe.',
  },
  {
    emoji: '🔍',
    titre: 'Analyse grammaticale',
    description: 'Colorez sujets, verbes et compléments pour comprendre la structure de la phrase.',
  },
];

function EcranFonctionnalites() {
  return (
    <View style={ecrans.container}>
      <Text style={ecrans.titre}>Comment ça marche</Text>
      <View style={ecrans.features}>
        {FEATURES.map(f => (
          <View key={f.titre} style={ecrans.featureRow}>
            <Text style={ecrans.featureEmoji}>{f.emoji}</Text>
            <View style={ecrans.featureTexte}>
              <Text style={ecrans.featureTitre}>{f.titre}</Text>
              <Text style={ecrans.featureDesc}>{f.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Écran 3 — Préférences ──────────────────────────────────────────────────

interface EcranPreferencesProps {
  langueSource: string;
  niveau: string;
  onChangerLangue: (code: string) => void;
  onChangerNiveau: (code: string) => void;
}

function EcranPreferences({
  langueSource, niveau, onChangerLangue, onChangerNiveau,
}: EcranPreferencesProps) {
  return (
    <View style={ecrans.container}>
      <Text style={ecrans.titre}>Vos préférences</Text>
      <Text style={ecrans.sousTitre}>Modifiables à tout moment depuis la bibliothèque.</Text>

      <Text style={ecrans.label}>Langue que vous souhaitez lire</Text>
      <View style={ecrans.chips}>
        {LANGUES_SOURCE.map(l => (
          <TouchableOpacity
            key={l.code}
            style={[ecrans.chip, langueSource === l.code && ecrans.chipActif]}
            onPress={() => onChangerLangue(l.code)}
          >
            <Text style={[ecrans.chipTexte, langueSource === l.code && ecrans.chipTexteActif]}>
              {l.drapeau} {l.nom}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[ecrans.label, { marginTop: 24 }]}>Votre niveau</Text>
      <View style={ecrans.chips}>
        {NIVEAUX.map(n => (
          <TouchableOpacity
            key={n.code}
            style={[ecrans.chip, niveau === n.code && ecrans.chipActif]}
            onPress={() => onChangerNiveau(n.code)}
          >
            <Text style={[ecrans.chipTexte, niveau === n.code && ecrans.chipTexteActif]}>
              {n.code}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Composant principal ────────────────────────────────────────────────────

const NB_ECRANS = 3;

export default function OnboardingScreen() {
  const [ecranActuel, setEcranActuel] = useState(0);
  const [langueSource, setLangueSource] = useState('ru');
  const [niveau, setNiveau] = useState('B1');
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function allerA(index: number) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setEcranActuel(index);
    scrollRef.current?.scrollTo({ x: index * width, animated: false });
  }

  async function terminer() {
    await AsyncStorage.multiSet([
      [ONBOARDING_KEY, '1'],
      [STORAGE_KEY_LANGUE_SOURCE, langueSource],
      [STORAGE_KEY_NIVEAU, niveau],
    ]);
    router.replace('/');
  }

  function passer() {
    terminer();
  }

  const dernier = ecranActuel === NB_ECRANS - 1;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Bouton Passer */}
      {!dernier && (
        <TouchableOpacity style={styles.passer} onPress={passer}>
          <Text style={styles.passerTexte}>Passer</Text>
        </TouchableOpacity>
      )}

      {/* Contenu */}
      <Animated.View style={[styles.contenu, { opacity: fadeAnim }]}>
        {ecranActuel === 0 && <EcranPresentation />}
        {ecranActuel === 1 && <EcranFonctionnalites />}
        {ecranActuel === 2 && (
          <EcranPreferences
            langueSource={langueSource}
            niveau={niveau}
            onChangerLangue={setLangueSource}
            onChangerNiveau={setNiveau}
          />
        )}
      </Animated.View>

      {/* Bas : points + bouton */}
      <View style={styles.bas}>
        <View style={styles.points}>
          {Array.from({ length: NB_ECRANS }).map((_, i) => (
            <TouchableOpacity key={i} onPress={() => allerA(i)}>
              <View style={[styles.point, i === ecranActuel && styles.pointActif]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.btnSuivant}
          onPress={dernier ? terminer : () => allerA(ecranActuel + 1)}
          activeOpacity={0.8}
        >
          <Text style={styles.btnSuivantTexte}>
            {dernier ? 'Commencer' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles écrans ──────────────────────────────────────────────────────────

const ecrans = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  surtitre: {
    fontSize: 15,
    color: COLORS.textLight,
    marginBottom: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titre: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  accroche: {
    fontSize: 18,
    fontStyle: 'italic',
    color: COLORS.textMid,
    lineHeight: 26,
    marginBottom: 24,
  },
  separateur: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 24,
  },
  corps: {
    fontSize: 16,
    color: COLORS.textMid,
    lineHeight: 26,
  },
  gras: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
  features: {
    marginTop: 24,
    gap: 28,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  featureEmoji: {
    fontSize: 32,
    marginTop: 2,
  },
  featureTexte: {
    flex: 1,
  },
  featureTitre: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: COLORS.textMid,
    lineHeight: 21,
  },
  sousTitre: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 28,
    fontStyle: 'italic',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  chipActif: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipTexte: {
    fontSize: 14,
    color: COLORS.textDark,
  },
  chipTexteActif: {
    color: '#fff',
    fontWeight: '600',
  },
});

// ── Styles navigation ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  passer: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  passerTexte: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  contenu: {
    flex: 1,
  },
  bas: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    gap: 20,
  },
  points: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  point: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  pointActif: {
    width: 24,
    backgroundColor: COLORS.accent,
  },
  btnSuivant: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSuivantTexte: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
