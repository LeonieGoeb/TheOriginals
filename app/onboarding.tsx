import { COLORS } from '@/constants/colors';
import { LANGUES } from '@/constants/langues';
import { NIVEAUX } from '@/constants/niveaux';
import { STRINGS } from '@/constants/strings';
import { useLocale } from '@/contexts/LocaleContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ONBOARDING_KEY } from './_layout';

const { width } = Dimensions.get('window');

const STORAGE_KEY_LANGUE_SOURCE = 'app_langue_source';
const STORAGE_KEY_LANGUE_CIBLE  = 'app_langue_cible';
const STORAGE_KEY_NIVEAU        = 'app_niveau_choisi';

// ── Écran 1 — Présentation ─────────────────────────────────────────────────

function EcranPresentation() {
  const locale = useLocale();
  const s = STRINGS[locale];
  return (
    <View style={ecrans.container}>
      <Text style={ecrans.surtitre}>{s.bienvenueIn}</Text>
      <Text style={ecrans.titre}>TheOriginals</Text>
      <Text style={ecrans.accroche}>{s.accroche}</Text>
      <View style={ecrans.separateur} />
      <Text style={ecrans.corps}>
        {s.corpsAvec}
        <Text style={ecrans.gras}>TheOriginals</Text>
        {s.corpsTexte}
      </Text>
    </View>
  );
}

// ── Écran 2 — Fonctionnalités ──────────────────────────────────────────────

function EcranFonctionnalites() {
  const locale = useLocale();
  const s = STRINGS[locale];
  return (
    <View style={ecrans.container}>
      <Text style={ecrans.titre}>{s.commentCaMarche}</Text>
      <View style={ecrans.features}>
        {s.features.map(f => (
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
  languesCibles: string[];
  languesSources: string[];
  niveau: string;
  onToggleLangueCible: (code: string) => void;
  onToggleLangueSource: (code: string) => void;
  onChangerNiveau: (code: string) => void;
}

function EcranPreferences({
  languesCibles, languesSources, niveau,
  onToggleLangueCible, onToggleLangueSource, onChangerNiveau,
}: EcranPreferencesProps) {
  const locale = useLocale();
  const s = STRINGS[locale];
  return (
    <ScrollView style={ecrans.scroll} contentContainerStyle={ecrans.container}>
      <Text style={ecrans.titre}>{s.vosPreferences}</Text>
      <Text style={ecrans.sousTitre}>{s.preferencesModif}</Text>

      <Text style={ecrans.label}>{s.langueQueVousParlez}</Text>
      <View style={ecrans.chips}>
        {LANGUES.map(l => {
          const actif = languesCibles.includes(l.code);
          return (
            <TouchableOpacity
              key={l.code}
              style={[ecrans.chip, actif && ecrans.chipActif]}
              onPress={() => onToggleLangueCible(l.code)}
            >
              <Text style={[ecrans.chipTexte, actif && ecrans.chipTexteActif]}>
                {l.drapeau} {l.nom[locale]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[ecrans.label, { marginTop: 24 }]}>{s.langueASouhaiter}</Text>
      <View style={ecrans.chips}>
        {LANGUES.map(l => {
          const actif = languesSources.includes(l.code);
          return (
            <TouchableOpacity
              key={l.code}
              style={[ecrans.chip, actif && ecrans.chipActif]}
              onPress={() => onToggleLangueSource(l.code)}
            >
              <Text style={[ecrans.chipTexte, actif && ecrans.chipTexteActif]}>
                {l.drapeau} {l.nom[locale]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[ecrans.label, { marginTop: 24 }]}>{s.votreNiveau}</Text>
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
    </ScrollView>
  );
}

// ── Composant principal ────────────────────────────────────────────────────

function toggle(arr: string[], code: string): string[] {
  return arr.includes(code) ? arr.filter(c => c !== code) : [...arr, code];
}

const NB_ECRANS = 3;

export default function OnboardingScreen() {
  const locale = useLocale();
  const s = STRINGS[locale];
  const [ecranActuel, setEcranActuel] = useState(0);
  const [languesCibles, setLanguesCibles] = useState<string[]>([]);
  const [languesSources, setLanguesSources] = useState<string[]>([]);
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
      [STORAGE_KEY_LANGUE_CIBLE,  JSON.stringify(languesCibles)],
      [STORAGE_KEY_LANGUE_SOURCE, JSON.stringify(languesSources)],
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
          <Text style={styles.passerTexte}>{s.passer}</Text>
        </TouchableOpacity>
      )}

      {/* Contenu */}
      <Animated.View style={[styles.contenu, { opacity: fadeAnim }]}>
        {ecranActuel === 0 && <EcranPresentation />}
        {ecranActuel === 1 && <EcranFonctionnalites />}
        {ecranActuel === 2 && (
          <EcranPreferences
            languesCibles={languesCibles}
            languesSources={languesSources}
            niveau={niveau}
            onToggleLangueCible={code => setLanguesCibles(prev => toggle(prev, code))}
            onToggleLangueSource={code => setLanguesSources(prev => toggle(prev, code))}
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
            {dernier ? s.commencer : s.suivant}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles écrans ──────────────────────────────────────────────────────────

const ecrans = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
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
