import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, Pressable, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { BIBLIOTHEQUE } from '@/data/bibliotheque';
import { LANGUES } from '@/constants/langues';
import { NIVEAUX } from '@/constants/niveaux';
import CarteLivre from '@/components/CarteLivre';

const STORAGE_KEY_LANGUE_CIBLE  = 'app_langue_cible';
const STORAGE_KEY_LANGUE_SOURCE = 'app_langue_source';
const STORAGE_KEY_NIVEAU        = 'app_niveau_choisi';

const CIBLES  = ['all', 'fr', 'de', 'en'] as const;
const SOURCES = ['all', 'ru', 'en', 'es'] as const;
const NIVEAUX_CODES = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

function nomLangue(code: string): string {
  if (code === 'all') return 'Toutes';
  return LANGUES.find(l => l.code === code)?.nom ?? code;
}

function nomNiveau(code: string): string {
  if (code === 'all') return 'Tous';
  return NIVEAUX.find(n => n.code === code)?.code ?? code;
}

// ─── Composant dropdown ───────────────────────────────────────────────────────

interface DropdownOption { code: string; label: string; }

interface DropdownProps {
  value: string;
  options: readonly string[];
  labelFn: (code: string) => string;
  onChange: (code: string) => void;
}

function Dropdown({ value, options, labelFn, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);

  const items: DropdownOption[] = options.map(c => ({ code: c, label: labelFn(c) }));

  return (
    <>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.dropdownBtnText}>{labelFn(value)}</Text>
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
            {items.map(item => (
              <TouchableOpacity
                key={item.code}
                style={[styles.modalItem, item.code === value && styles.modalItemActive]}
                onPress={() => { onChange(item.code); setOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalItemText, item.code === value && styles.modalItemTextActive]}>
                  {item.code === value ? '✓  ' : '    '}{item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Écran bibliothèque ───────────────────────────────────────────────────────

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
      {/* Bandeau sticky filtres */}
      <View style={styles.sticky}>
        <Text style={styles.header}>Ma bibliothèque</Text>

        <View style={styles.filtreSection}>
          <Text style={styles.filtreLabel}>Je parle le</Text>
          <Dropdown
            value={langueCible}
            options={CIBLES}
            labelFn={nomLangue}
            onChange={handleSetCible}
          />
        </View>

        <View style={styles.filtreSection}>
          <Text style={styles.filtreLabel}>Et j'apprends le</Text>
          <Dropdown
            value={langueSource}
            options={SOURCES}
            labelFn={nomLangue}
            onChange={handleSetSource}
          />
        </View>

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
          <Text style={styles.empty}>
            Aucun livre disponible pour cette combinaison. Essayez d'élargir vos filtres.
          </Text>
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
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 14,
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
  // Dropdown
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  dropdownBtnText: {
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
  pills: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    fontSize: 12,
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
