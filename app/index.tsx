import CarteLivre from '@/components/CarteLivre';
import { COLORS } from '@/constants/colors';
import { nomLangue } from '@/constants/langues';
import { NIVEAUX } from '@/constants/niveaux';
import { STRINGS } from '@/constants/strings';
import { useLocale } from '@/contexts/LocaleContext';
import { useBibliotheque } from '@/hooks/useBibliotheque';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Modal, Pressable,
  ScrollView, StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ONBOARDING_KEY } from './_layout';

const STORAGE_KEY_LANGUE_CIBLE  = 'app_langue_cible';
const STORAGE_KEY_LANGUE_SOURCE = 'app_langue_source';
const STORAGE_KEY_NIVEAU        = 'app_niveau_choisi';

const CIBLES  = ['fr', 'de', 'en'] as const;
const SOURCES = ['ru', 'en', 'es', 'de'] as const;
const NIVEAUX_CODES = ['all', 'B1', 'B2', 'C1', 'C2'] as const;

// Parse a stored value: handles JSON array, legacy plain string, or null.
// "all" is a legacy sentinel meaning "no filter" → treated as empty array.
function parseStoredLangues(val: string | null): string[] {
  if (!val || val === 'all') return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return (parsed as string[]).filter(c => c !== 'all');
    if (parsed === 'all') return [];
    return [String(parsed)];
  } catch {
    return [val];
  }
}

// ─── Multi-select dropdown ────────────────────────────────────────────────────

interface MultiDropdownProps {
  values: string[];
  options: readonly string[];
  labelFn: (code: string) => string;
  allLabel: string;
  onChange: (values: string[]) => void;
}

function MultiDropdown({ values, options, labelFn, allLabel, onChange }: MultiDropdownProps) {
  const [open, setOpen] = useState(false);

  const safe = Array.isArray(values) ? values : [];

  const summaryLabel =
    safe.length === 0
      ? allLabel
      : safe.length === 1
        ? labelFn(safe[0])
        : safe.map(labelFn).join(', ');

  function toggle(code: string) {
    onChange(safe.includes(code) ? safe.filter(c => c !== code) : [...safe, code]);
  }

  return (
    <>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.dropdownBtnText} numberOfLines={1}>{summaryLabel}</Text>
        <Text style={styles.dropdownArrow}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.modalMenu}>
            {options.map(code => {
              const selected = safe.includes(code);
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.modalItem, selected && styles.modalItemActive]}
                  onPress={() => toggle(code)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalItemText, selected && styles.modalItemTextActive]}>
                    {selected ? '✓  ' : '    '}{labelFn(code)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Écran bibliothèque ───────────────────────────────────────────────────────

export default function BibliothequeScreen() {
  const router = useRouter();
  const locale = useLocale();
  const s = STRINGS[locale];
  const { livres } = useBibliotheque();

  const labelLangue = (code: string) => nomLangue(code, locale);
  const labelNiveau = (code: string) =>
    code === 'all' ? s.tousNiveaux : (NIVEAUX.find(n => n.code === code)?.code ?? code);

  const [languesCibles, setLanguesCibles] = useState<string[]>([]);
  const [languesSources, setLanguesSources] = useState<string[]>([]);
  const [niveauChoisi, setNiveauChoisi] = useState<string>('all');

  useEffect(() => {
    AsyncStorage.multiGet([ONBOARDING_KEY, STORAGE_KEY_LANGUE_CIBLE, STORAGE_KEY_LANGUE_SOURCE, STORAGE_KEY_NIVEAU])
      .then(([onboarding, cible, source, niveau]) => {
        if (!onboarding[1]) { router.replace('/onboarding'); return; }
        setLanguesCibles(parseStoredLangues(cible[1]));
        setLanguesSources(parseStoredLangues(source[1]));
        if (niveau[1]) setNiveauChoisi(niveau[1]);
      })
      .catch(() => {});
  }, []);

  const handleSetCibles = useCallback((codes: string[]) => {
    setLanguesCibles(codes);
    AsyncStorage.setItem(STORAGE_KEY_LANGUE_CIBLE, JSON.stringify(codes)).catch(() => {});
  }, []);

  const handleSetSources = useCallback((codes: string[]) => {
    setLanguesSources(codes);
    AsyncStorage.setItem(STORAGE_KEY_LANGUE_SOURCE, JSON.stringify(codes)).catch(() => {});
  }, []);

  const handleSetNiveau = useCallback((code: string) => {
    setNiveauChoisi(code);
    AsyncStorage.setItem(STORAGE_KEY_NIVEAU, code).catch(() => {});
  }, []);

  const livresFiltres = livres.filter(l => {
    const matchCible  = languesCibles.length  === 0 || languesCibles.includes(l.langueCible);
    const matchSource = languesSources.length === 0 || languesSources.includes(l.langueSource);
    const matchNiveau = niveauChoisi === 'all' || l.niveau === niveauChoisi;
    return matchCible && matchSource && matchNiveau;
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Bandeau sticky filtres */}
      <View style={styles.sticky}>
        {/* Ligne 1 : titre + contact + préférences */}
        <View style={styles.headerRow}>
          <Text style={styles.header}>{s.maLibrairie}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push('/onboarding')} activeOpacity={0.7}>
              <Text style={styles.contact}>⚙ {s.preferences}</Text>
            </TouchableOpacity>
            <Text style={styles.headerSep}>·</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:mytheoriginalsapp@gmail.com')}
              activeOpacity={0.7}
            >
              <Text style={styles.contact}><Text style={styles.contactIcon}>✉</Text> {s.contact}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ligne 2 : deux dropdowns côte à côte */}
        <View style={styles.filtresRow}>
          <View style={styles.filtreItem}>
            <Text style={styles.filtreLabel}>{s.jeParle}</Text>
            <MultiDropdown
              values={languesCibles}
              options={CIBLES}
              labelFn={labelLangue}
              allLabel={s.toutesLangues}
              onChange={handleSetCibles}
            />
          </View>
          <View style={styles.filtreSep} />
          <View style={styles.filtreItem}>
            <Text style={styles.filtreLabel}>{s.jApprends}</Text>
            <MultiDropdown
              values={languesSources}
              options={SOURCES}
              labelFn={labelLangue}
              allLabel={s.toutesLangues}
              onChange={handleSetSources}
            />
          </View>
        </View>

        {/* Ligne 3 : pills niveau */}
        <View style={styles.pillsRow}>
          <Text style={styles.filtreLabel}>{s.niveau}</Text>
          {NIVEAUX_CODES.map(code => (
            <TouchableOpacity
              key={code}
              style={[styles.pill, niveauChoisi === code && styles.pillActive]}
              onPress={() => handleSetNiveau(code)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, niveauChoisi === code && styles.pillTextActive]}>
                {labelNiveau(code)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />
      </View>

      {/* Liste scrollable */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {livresFiltres.length > 0 ? (
          livresFiltres.map(livre => (
            <CarteLivre
              key={livre.id}
              livre={livre}
              onPress={() => router.push(`/livre/${livre.id}`)}
            />
          ))
        ) : (
          <Text style={styles.empty}>{s.aucunLivre}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  sticky: {
    backgroundColor: COLORS.bgBar,
    paddingTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSep: {
    fontSize: 12,
    color: COLORS.border,
  },
  contact: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  contactIcon: {
    fontSize: 18,
  },
  filtresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 0,
  },
  filtreItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  filtreSep: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  filtreLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 8,
  },
  // Dropdown
  dropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    minWidth: 0,
  },
  dropdownBtnText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMid,
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  // Modal dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMenu: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 180,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemActive: {
    backgroundColor: COLORS.bgBar,
  },
  modalItemText: {
    fontSize: 15,
    color: COLORS.textMid,
  },
  modalItemTextActive: {
    color: COLORS.textDark,
    fontWeight: '600',
  },
  // Pills niveau
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    fontSize: 11,
    color: COLORS.textMid,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 40,
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
